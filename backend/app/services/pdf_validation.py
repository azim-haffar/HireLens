"""Shared upload and text validation before provider calls or persistence."""
import io
from contextlib import contextmanager

import pdfplumber
from fastapi import HTTPException, UploadFile

MAX_PDF_BYTES = 5 * 1024 * 1024
MAX_PDF_PAGES = 20
MAX_TEXT_CHARS = 100_000


async def read_pdf_upload(file: UploadFile, max_bytes: int = MAX_PDF_BYTES) -> bytes:
    try:
        if not file.filename or not file.filename.lower().endswith(".pdf"):
            raise HTTPException(400, "Only PDF files are supported.")
        if file.content_type not in (None, "application/pdf", "application/octet-stream"):
            raise HTTPException(400, "Only PDF files are supported.")
        data = await file.read(max_bytes + 1)
        if not data:
            raise HTTPException(400, "Uploaded file is empty.")
        if len(data) > max_bytes:
            raise HTTPException(413, f"File exceeds the {max_bytes // (1024 * 1024)} MB limit.")
        if not data.startswith(b"%PDF-"):
            raise HTTPException(422, "The uploaded file is not a valid PDF.")
        return data
    finally:
        await file.close()


@contextmanager
def open_validated_pdf(data: bytes):
    if not data.startswith(b"%PDF-"):
        raise HTTPException(422, "The uploaded file is not a valid PDF.")
    try:
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            if pdf.doc.encryption:
                raise HTTPException(422, "Encrypted PDFs are not supported. Upload an unencrypted copy.")
            if not pdf.pages:
                raise HTTPException(422, "The PDF has no pages.")
            if len(pdf.pages) > MAX_PDF_PAGES:
                raise HTTPException(422, f"PDFs may contain at most {MAX_PDF_PAGES} pages.")
            yield pdf
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(422, "Could not read this PDF. Upload a valid, unencrypted PDF.") from None


def extract_validated_text(data: bytes) -> str:
    with open_validated_pdf(data) as pdf:
        pages = []
        total = 0
        for page in pdf.pages:
            text = page.extract_text() or ""
            total += len(text) + 1
            if total > MAX_TEXT_CHARS:
                raise HTTPException(422, "The PDF contains too much text. Upload a shorter CV.")
            pages.append(text)
            page.flush_cache()
    text = "\n".join(pages).strip()
    if not text:
        raise HTTPException(422, "No readable text found. Upload a text-based PDF; scanned images are not supported.")
    return text
