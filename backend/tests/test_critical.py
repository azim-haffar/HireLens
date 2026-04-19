"""
Critical path tests covering the 5 key security/reliability fixes.
Run from the backend/ directory:  py -3.11 -m pytest tests/ -v
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# 1. SSRF — non-allowlisted domains must be blocked with HTTP 400
# ---------------------------------------------------------------------------

def test_ssrf_blocks_aws_metadata():
    from app.services.job_scraper import _validate_job_url
    with pytest.raises(HTTPException) as exc:
        _validate_job_url("http://169.254.169.254/latest/meta-data/")
    assert exc.value.status_code == 400


def test_ssrf_blocks_internal_ip():
    from app.services.job_scraper import _validate_job_url
    with pytest.raises(HTTPException) as exc:
        _validate_job_url("http://192.168.1.1/admin")
    assert exc.value.status_code == 400


def test_ssrf_blocks_random_domain():
    from app.services.job_scraper import _validate_job_url
    with pytest.raises(HTTPException) as exc:
        _validate_job_url("https://evil.example.com/steal-data")
    assert exc.value.status_code == 400


def test_ssrf_allows_linkedin():
    from app.services.job_scraper import _validate_job_url
    # Should not raise
    _validate_job_url("https://www.linkedin.com/jobs/view/123456789/")


def test_ssrf_allows_greenhouse():
    from app.services.job_scraper import _validate_job_url
    _validate_job_url("https://boards.greenhouse.io/company/jobs/12345")


# ---------------------------------------------------------------------------
# 2. Security headers — X-Frame-Options and friends must be present
# ---------------------------------------------------------------------------

def test_security_headers_present():
    # Mock settings to avoid needing a real .env in CI
    with patch("app.config.Settings.model_validate", side_effect=lambda d: d):
        with patch.dict("os.environ", {
            "SUPABASE_URL": "https://test.supabase.co",
            "SUPABASE_ANON_KEY": "test",
            "SUPABASE_SERVICE_KEY": "test",
            "GEMINI_API_KEY": "test",
            "SECRET_KEY": "a" * 32,
        }):
            from app.main import app
            client = TestClient(app, raise_server_exceptions=False)
            response = client.get("/health")
            assert response.headers.get("X-Frame-Options") == "DENY"
            assert response.headers.get("X-Content-Type-Options") == "nosniff"
            assert response.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"


# ---------------------------------------------------------------------------
# 3. PDF magic byte check — file without %PDF header must return HTTP 400
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_pdf_magic_byte_rejection():
    from app.services.cv_parser import parse_cv

    fake_file = MagicMock()
    fake_file.filename = "resume.pdf"
    fake_file.content_type = "application/pdf"
    fake_file.read = AsyncMock(return_value=b"This is not a PDF at all, just plain text.")

    with pytest.raises(HTTPException) as exc:
        await parse_cv(fake_file)
    assert exc.value.status_code == 400
    assert "magic bytes" in exc.value.detail.lower() or "invalid pdf" in exc.value.detail.lower()


@pytest.mark.asyncio
async def test_pdf_magic_byte_accepts_valid_pdf_header():
    from app.services.cv_parser import parse_cv

    # A real PDF starts with %PDF; mock the rest of the pipeline
    fake_pdf_bytes = b"%PDF-1.4 fake content that won't actually parse"
    fake_file = MagicMock()
    fake_file.filename = "resume.pdf"
    fake_file.read = AsyncMock(return_value=fake_pdf_bytes)

    # pdfplumber will fail on fake bytes — we only care that magic byte check passed (no 400)
    with pytest.raises(Exception) as exc:
        await parse_cv(fake_file)
    # Should NOT be a 400 magic-byte error
    if isinstance(exc.value, HTTPException):
        assert exc.value.status_code != 400 or "magic" not in exc.value.detail.lower()


# ---------------------------------------------------------------------------
# 4. Delete 404 — deleting a non-existent CV must return HTTP 404
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_delete_cv_returns_404_for_nonexistent():
    from app.routes.cv import delete_cv

    mock_db = MagicMock()
    mock_result = MagicMock()
    mock_result.data = []  # Supabase returns empty list when nothing was deleted

    # Chain: table().delete().eq().eq().execute()
    (mock_db.table.return_value
        .delete.return_value
        .eq.return_value
        .eq.return_value
        .execute.return_value) = mock_result

    with patch("app.routes.cv.get_supabase_service", return_value=mock_db):
        with pytest.raises(HTTPException) as exc:
            await delete_cv("nonexistent-uuid", {"id": "user-123"})
        assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_delete_application_returns_404_for_nonexistent():
    from app.routes.applications import delete_application

    mock_db = MagicMock()
    mock_result = MagicMock()
    mock_result.data = []

    (mock_db.table.return_value
        .delete.return_value
        .eq.return_value
        .eq.return_value
        .execute.return_value) = mock_result

    with patch("app.routes.applications.get_supabase_service", return_value=mock_db):
        with pytest.raises(HTTPException) as exc:
            await delete_application("nonexistent-uuid", {"id": "user-123"})
        assert exc.value.status_code == 404


# ---------------------------------------------------------------------------
# 5. Gemini JSON error — invalid AI response must surface as HTTP 502
# ---------------------------------------------------------------------------

def test_gemini_bad_json_raises_502():
    from app.services.gemini import _extract_json
    with pytest.raises(HTTPException) as exc:
        _extract_json("this is definitely not valid json {{{")
    assert exc.value.status_code == 502
    assert "invalid response" in exc.value.detail.lower()


def test_gemini_empty_string_raises_502():
    from app.services.gemini import _extract_json
    with pytest.raises(HTTPException) as exc:
        _extract_json("")
    assert exc.value.status_code == 502


def test_gemini_valid_json_parses_correctly():
    from app.services.gemini import _extract_json
    result = _extract_json('{"score": 85, "verdict": "strong"}')
    assert result["score"] == 85
    assert result["verdict"] == "strong"


def test_gemini_strips_markdown_fences():
    from app.services.gemini import _extract_json
    result = _extract_json('```json\n{"score": 75}\n```')
    assert result["score"] == 75
