"""Offline API checks: synthetic identities, no provider calls or credentials."""
import sys
import unittest
from types import ModuleType, SimpleNamespace
from unittest.mock import MagicMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient


class BoundaryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Import routes with fake service clients, without reading local .env files.
        db = ModuleType("app.core.supabase_client")
        db.supabase = MagicMock()
        db.supabase_admin = MagicMock()
        groq = ModuleType("app.core.groq_client")
        groq.chat = MagicMock()
        groq.stream = MagicMock()
        email = ModuleType("app.services.email_service")
        email.send_status_notification = MagicMock()
        cls.modules = patch.dict(sys.modules, {
            "app.core.supabase_client": db, "app.core.groq_client": groq,
            "app.services.email_service": email,
        })
        cls.modules.start()
        from app.core import deps, ownership
        from app.routers import tracker, match, ats, comparison, cv, roast, jobs
        cls.deps, cls.ownership, cls.tracker, cls.ats = deps, ownership, tracker, ats
        cls.db, cls.groq = db, groq
        cls.cv, cls.roast, cls.jobs = cv, roast, jobs
        app = FastAPI()
        app.state.limiter = roast.limiter
        for route, prefix in [(tracker, "/tracker"), (match, "/match"),
                              (ats, "/ats"), (comparison, "/comparison"),
                              (cv, "/cv"), (roast, "/roast"), (jobs, "/jobs")]:
            app.include_router(route.router, prefix=prefix)
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()
        cls.modules.stop()

    def setUp(self):
        self.db.supabase.reset_mock()
        self.db.supabase_admin.reset_mock()
        self.groq.chat.reset_mock()
        self.db.supabase.auth.get_user.side_effect = None
        self.db.supabase.auth.get_user.return_value = SimpleNamespace(
            user=SimpleNamespace(id="synthetic-owner", email="applicant@example.invalid"))

    def test_missing_or_malformed_auth_is_401_before_database_access(self):
        for header in [None, "Basic token", "Bearer ", "Bearer"]:
            headers = {"Authorization": header} if header else {}
            response = self.client.get("/tracker/applications", headers=headers)
            self.assertEqual(response.status_code, 401)
            self.assertEqual(response.headers["www-authenticate"], "Bearer")
        self.db.supabase.auth.get_user.assert_not_called()
        self.db.supabase_admin.table.assert_not_called()

    def test_invalid_token_is_401(self):
        self.db.supabase.auth.get_user.side_effect = RuntimeError("synthetic failure")
        response = self.client.get("/tracker/applications", headers={"Authorization": "Bearer invalid"})
        self.assertEqual(response.status_code, 401)
        self.assertNotIn("synthetic failure", response.text)
        self.db.supabase_admin.table.assert_not_called()

    def test_foreign_or_missing_links_never_insert(self):
        for field, table in [("cv_id", "cv_versions"), ("analysis_id", "analyses")]:
            query = MagicMock()
            query.select.return_value = query
            query.eq.return_value = query
            query.limit.return_value = query
            query.execute.return_value = SimpleNamespace(data=[])
            self.db.supabase_admin.table.return_value = query
            response = self.client.post("/tracker/applications", json={
                "job_title": "Synthetic internship", "company": "Example", field: "foreign-id",
            }, headers={"Authorization": "Bearer synthetic"})
            self.assertEqual(response.status_code, 404)
            query.eq.assert_any_call("user_id", "synthetic-owner")
            query.insert.assert_not_called()
            self.db.supabase_admin.table.assert_called_with(table)

    def test_owned_links_can_be_saved(self):
        with patch.object(self.tracker, "get_owned_record", return_value={"id": "owned"}) as owned:
            response = self.client.post("/tracker/applications", json={
                "job_title": "Synthetic internship", "company": "Example",
                "cv_id": "owned-cv", "analysis_id": "owned-analysis",
            }, headers={"Authorization": "bearer synthetic"})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["user_id"], "synthetic-owner")
            self.assertEqual(owned.call_count, 2)
            self.db.supabase_admin.table.assert_called_once_with("applications")

    def test_missing_records_return_404_in_analysis_routes(self):
        query = MagicMock()
        query.select.return_value = query
        query.eq.return_value = query
        query.limit.return_value = query
        query.execute.return_value = SimpleNamespace(data=[])
        self.db.supabase_admin.table.return_value = query
        for path, body in [
            ("/match/score", {"cv_id": "foreign", "job_id": "job"}),
            ("/ats/check", {"cv_id": "foreign", "job_id": "job"}),
            ("/comparison/compare", {"cv_id_a": "a", "cv_id_b": "b", "job_id": "foreign"}),
        ]:
            response = self.client.post(path, json=body, headers={"Authorization": "Bearer synthetic"})
            self.assertEqual(response.status_code, 404)
        self.groq.chat.assert_not_called()

    def test_database_outage_is_not_disguised_as_missing_record(self):
        query = MagicMock()
        query.select.return_value = query
        query.eq.return_value = query
        query.limit.return_value = query
        query.execute.side_effect = RuntimeError("database unavailable")
        with patch.object(self.ownership, "supabase_admin") as admin:
            admin.table.return_value = query
            with self.assertRaises(RuntimeError):
                self.ownership.get_owned_record("jobs", "job", "synthetic-owner")

    def test_ats_receives_stored_cv_text(self):
        from app.services.ats_checker import run_ats_check
        with patch.object(self.ats, "get_owned_record", side_effect=[
            {"parsed_data": {"name": "Synthetic applicant", "skills": ["Python"]},
             "raw_text": "Synthetic applicant built a Python service."},
            {"parsed_data": {"title": "Intern", "company": "Example", "required_skills": ["Python"]},
             "raw_text": "Python internship"},
        ]), patch.object(self.ats, "run_ats_check", wraps=run_ats_check) as audit:
            response = self.client.post("/ats/check", json={"cv_id": "cv", "job_id": "job"},
                                        headers={"Authorization": "Bearer synthetic"})
            self.assertEqual(response.status_code, 200)
            self.assertIn("Python service", audit.call_args.args[0].raw_text)

    def test_invalid_pdfs_stop_all_upload_paths_before_provider_or_database(self):
        for path, field in [("/cv/upload", "file"), ("/roast/cv", "file"), ("/ats/deep-check", "cv")]:
            with self.subTest(path=path):
                response = self.client.post(path, files={field: ("synthetic.pdf", b"%PDF-1.4\ninvalid", "application/pdf")},
                                            headers={"Authorization": "Bearer synthetic"})
                self.assertEqual(response.status_code, 422)
                self.assertIn("PDF", response.json()["detail"])
        self.groq.chat.assert_not_called()
        self.db.supabase_admin.table.assert_not_called()

    def test_unsafe_job_url_stops_before_extraction_and_persistence(self):
        from app.services.safe_fetch import JobFetchError
        with patch.object(self.jobs, "scrape_job_url", side_effect=JobFetchError("Job URLs must resolve only to public internet addresses.")), \
                patch.object(self.jobs, "extract_job_with_groq") as extract:
            response = self.client.post("/jobs/ingest", json={"url": "http://127.0.0.1"},
                                        headers={"Authorization": "Bearer synthetic"})
            self.assertEqual(response.status_code, 422)
            extract.assert_not_called()
            self.db.supabase_admin.table.assert_not_called()

    def test_valid_pdf_upload_keeps_existing_response_and_owner(self):
        from test_ingestion import synthetic_pdf
        from app.models.cv import ParsedCV
        with patch.object(self.cv, "parse_cv_with_groq", return_value=ParsedCV(name="Synthetic applicant")) as parse:
            response = self.client.post("/cv/upload", files={"file": ("synthetic.PDF", synthetic_pdf(), "application/pdf")},
                                        headers={"Authorization": "Bearer synthetic"})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["parsed"]["name"], "Synthetic applicant")
            self.assertIn("Python internship", parse.call_args.args[0])
            row = self.db.supabase_admin.table.return_value.insert.call_args.args[0]
            self.assertEqual(row["user_id"], "synthetic-owner")

    def test_oversized_pdf_returns_413_before_provider(self):
        response = self.client.post("/cv/upload", files={"file": (
            "synthetic.pdf", b"%PDF-" + b"x" * (5 * 1024 * 1024), "application/pdf")},
            headers={"Authorization": "Bearer synthetic"})
        self.assertEqual(response.status_code, 413)
        self.groq.chat.assert_not_called()
        self.db.supabase_admin.table.assert_not_called()
