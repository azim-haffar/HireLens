"""Synthetic documents and mocked network responses; no external requests."""
import asyncio
import io
import socket
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from fastapi import HTTPException, UploadFile
from starlette.datastructures import Headers

from app.services import safe_fetch, pdf_validation


def synthetic_pdf(page_count=1, text="Synthetic applicant: Python internship"):
    """Small native PDF fixture with explicit xref offsets and no personal data."""
    objects = [b"<< /Type /Catalog /Pages 2 0 R >>", b""]
    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    kids = []
    for _ in range(page_count):
        page_id = len(objects) + 1
        kids.append(f"{page_id} 0 R")
        objects.append(f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents {page_id + 1} 0 R >>".encode())
        stream = f"BT /F1 12 Tf 50 700 Td ({text}) Tj ET".encode()
        objects.append(f"<< /Length {len(stream)} >>\nstream\n".encode() + stream + b"\nendstream")
    objects[1] = f"<< /Type /Pages /Kids [{' '.join(kids)}] /Count {page_count} >>".encode()
    data = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for i, obj in enumerate(objects, 1):
        offsets.append(len(data))
        data.extend(f"{i} 0 obj\n".encode() + obj + b"\nendobj\n")
    start = len(data)
    data.extend(f"xref\n0 {len(offsets)}\n0000000000 65535 f \n".encode())
    for offset in offsets[1:]:
        data.extend(f"{offset:010d} 00000 n \n".encode())
    data.extend(f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{start}\n%%EOF\n".encode())
    return bytes(data)


class FetchTests(unittest.TestCase):
    def setUp(self):
        self.dns = patch.object(safe_fetch.socket, "getaddrinfo", return_value=[
            (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 443)),
        ])
        self.resolve = self.dns.start()
        self.pool_patch = patch.object(safe_fetch.urllib3, "HTTPSConnectionPool")
        self.factory = self.pool_patch.start()
        self.pool = self.factory.return_value
        self.response = MagicMock(status=200, headers={"Content-Type": "text/html"})
        self.response.read.return_value = b"<main>Synthetic internship</main>"
        self.pool.urlopen.return_value = self.response
        self.addCleanup(self.dns.stop)
        self.addCleanup(self.pool_patch.stop)

    def test_public_https_is_pinned_with_hostname_verification(self):
        body = safe_fetch.fetch_job_html("https://jobs.example.invalid/role?q=intern", {})
        self.assertIn(b"Synthetic", body)
        self.factory.assert_called_once()
        args, kwargs = self.factory.call_args
        self.assertEqual(args, ("93.184.216.34", 443))
        self.assertEqual(kwargs["server_hostname"], "jobs.example.invalid")
        self.assertEqual(kwargs["assert_hostname"], "jobs.example.invalid")
        self.assertEqual(kwargs["cert_reqs"], "CERT_REQUIRED")
        options = self.pool.urlopen.call_args.kwargs
        self.assertFalse(options["redirect"])
        self.assertFalse(options["retries"])
        self.assertEqual(options["headers"]["Host"], "jobs.example.invalid")
        self.resolve.assert_called_once()  # connection uses numeric IP, not another hostname lookup
        self.response.close.assert_called_once()
        self.pool.close.assert_called_once()

    def test_nonpublic_addresses_never_create_a_connection(self):
        for address in ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1",
                        "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1",
                        "::1", "fc00::1", "fe80::1", "::ffff:127.0.0.1", "2002:7f00:1::",
                        "64:ff9b::7f00:1", "64:ff9b:1::a00:1"]:
            with self.subTest(address=address):
                self.resolve.return_value = [(0, 0, 0, "", (address, 443))]
                with self.assertRaises(safe_fetch.JobFetchError):
                    safe_fetch.fetch_job_html("https://jobs.example.invalid", {})
        self.factory.assert_not_called()

    def test_mixed_dns_answers_are_rejected(self):
        self.resolve.return_value += [(0, 0, 0, "", ("10.0.0.1", 443))]
        with self.assertRaises(safe_fetch.JobFetchError):
            safe_fetch.fetch_job_html("https://jobs.example.invalid", {})
        self.factory.assert_not_called()

    def test_unsafe_url_forms_are_rejected_before_dns(self):
        for url in ["file:///etc/passwd", "ftp://example.com", "http://user:pass@example.com",
                    "http://example.com:8080", "https://example.com:80", "https://", "http://[::1%25eth0]",
                    "https://example.com\\@127.0.0.1", "https://example.com/\r\nheader"]:
            with self.subTest(url=url), self.assertRaises(safe_fetch.JobFetchError):
                safe_fetch.fetch_job_html(url, {})
        self.resolve.assert_not_called()

    def test_private_redirect_is_rejected_before_second_connection(self):
        self.response.status = 302
        self.response.headers = {"Location": "http://169.254.169.254/latest/meta-data"}
        self.resolve.side_effect = [self.resolve.return_value, [(0, 0, 0, "", ("169.254.169.254", 80))]]
        with patch.object(safe_fetch.urllib3, "HTTPConnectionPool") as http:
            with self.assertRaises(safe_fetch.JobFetchError):
                safe_fetch.fetch_job_html("https://jobs.example.invalid", {})
            http.assert_not_called()
        self.factory.assert_called_once()
        self.response.close.assert_called_once()

    def test_relative_redirect_is_revalidated_and_bounded(self):
        self.response.status = 302
        self.response.headers = {"Location": "/another"}
        with self.assertRaises(safe_fetch.JobFetchError):
            safe_fetch.fetch_job_html("https://jobs.example.invalid/role", {})
        self.assertEqual(self.resolve.call_count, safe_fetch.MAX_REDIRECTS + 1)

    def test_response_limits_and_types(self):
        for headers, data in [
            ({"Content-Type": "application/pdf"}, b"%PDF"),
            ({"Content-Type": "text/html", "Content-Encoding": "gzip"}, b"compressed"),
            ({"Content-Type": "text/html"}, b"x" * (safe_fetch.MAX_RESPONSE_BYTES + 1)),
        ]:
            self.response.headers = headers
            self.response.read.return_value = data
            with self.assertRaises(safe_fetch.JobFetchError):
                safe_fetch.fetch_job_html("https://jobs.example.invalid", {})

    def test_network_errors_do_not_expose_internal_details(self):
        self.pool.urlopen.side_effect = safe_fetch.urllib3.exceptions.HTTPError("private internal detail")
        with self.assertRaises(safe_fetch.JobFetchError) as error:
            safe_fetch.fetch_job_html("https://jobs.example.invalid", {})
        self.assertNotIn("private internal detail", str(error.exception))
        self.pool.close.assert_called_once()


class PDFTests(unittest.TestCase):
    def upload(self, data, filename="synthetic.PDF", content_type="application/pdf"):
        return UploadFile(io.BytesIO(data), filename=filename, headers=Headers({"content-type": content_type}))

    def test_valid_pdf_and_uppercase_extension(self):
        upload = self.upload(synthetic_pdf())
        data = asyncio.run(pdf_validation.read_pdf_upload(upload))
        self.assertTrue(upload.file.closed)
        self.assertIn("Python internship", pdf_validation.extract_validated_text(data))

    def test_invalid_uploads_return_consistent_status_and_close(self):
        for data, filename, mime, limit, status in [
            (b"", "cv.pdf", "application/pdf", 100, 400),
            (b"plain text", "cv.pdf", "application/pdf", 100, 422),
            (b"%PDF-" + b"x" * 100, "cv.pdf", "application/pdf", 100, 413),
            (b"%PDF-", "cv.txt", "application/pdf", 100, 400),
            (b"%PDF-", "cv.pdf", "image/png", 100, 400),
            (b"%PDF-", None, "application/pdf", 100, 400),
        ]:
            upload = self.upload(data, filename, mime)
            with self.assertRaises(HTTPException) as error:
                asyncio.run(pdf_validation.read_pdf_upload(upload, max_bytes=limit))
            self.assertEqual(error.exception.status_code, status)
            self.assertTrue(upload.file.closed)

    def test_upload_read_is_bounded(self):
        upload = self.upload(b"%PDF-" + b"x" * 100)
        with patch.object(upload, "read", wraps=upload.read) as read:
            with self.assertRaises(HTTPException):
                asyncio.run(pdf_validation.read_pdf_upload(upload, max_bytes=10))
            read.assert_called_once_with(11)

    def test_malformed_empty_and_excessive_pages(self):
        for data in [b"%PDF-1.4\ninvalid", synthetic_pdf(0), synthetic_pdf(21), synthetic_pdf(text="")]:
            with self.assertRaises(HTTPException) as error:
                pdf_validation.extract_validated_text(data)
            self.assertEqual(error.exception.status_code, 422)

    def test_page_and_text_boundaries(self):
        self.assertIn("Synthetic", pdf_validation.extract_validated_text(synthetic_pdf(20)))
        with patch.object(pdf_validation, "MAX_TEXT_CHARS", 10):
            with self.assertRaises(HTTPException) as error:
                pdf_validation.extract_validated_text(synthetic_pdf())
            self.assertIn("too much text", error.exception.detail)

    def test_encrypted_pdf_is_rejected_before_text_extraction(self):
        pdf = MagicMock()
        pdf.doc.encryption = {"synthetic": True}
        with patch.object(pdf_validation.pdfplumber, "open") as open_pdf:
            open_pdf.return_value.__enter__.return_value = pdf
            with self.assertRaises(HTTPException) as error:
                pdf_validation.extract_validated_text(b"%PDF-1.4")
            self.assertIn("Encrypted", error.exception.detail)
            pdf.pages.__iter__.assert_not_called()
