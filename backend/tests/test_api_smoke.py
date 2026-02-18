import sys
import unittest
import uuid
from datetime import date, timedelta
from pathlib import Path

import httpx

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from database import SessionLocal  # noqa: E402
from main import app  # noqa: E402
from models import AdminEvent, User  # noqa: E402
from services.rate_limit import rate_limiter  # noqa: E402


class ApiSmokeTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        rate_limiter._events.clear()
        self.transport = httpx.ASGITransport(app=app)
        self.client = httpx.AsyncClient(transport=self.transport, base_url="http://testserver")

    async def asyncTearDown(self):
        await self.client.aclose()

    async def _signup_and_get_headers(self, name_prefix: str = "Smoke User"):
        email = f"smoke-{uuid.uuid4().hex[:12]}@example.com"
        signup = await self.client.post(
            "/auth/signup",
            json={
                "email": email,
                "name": f"{name_prefix} {uuid.uuid4().hex[:4]}",
                "password": "strong-password-123",
            },
        )
        self.assertEqual(signup.status_code, 201, signup.text)
        token = signup.json()["access_token"]
        return email, {"Authorization": f"Bearer {token}"}

    async def test_health_endpoint(self):
        response = await self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload.get("status"), "healthy")
        self.assertIn("db_status", payload)
        self.assertIn("mock_mode", payload)
        self.assertIn("app_env", payload)

        google_config = await self.client.get("/auth/google/config")
        self.assertEqual(google_config.status_code, 200, google_config.text)
        google_payload = google_config.json()
        self.assertIn("enabled", google_payload)
        self.assertIn("client_id", google_payload)

        programs = await self.client.get("/programs")
        self.assertEqual(programs.status_code, 200, programs.text)
        programs_payload = programs.json()
        self.assertIn("total", programs_payload)
        self.assertIn("items", programs_payload)
        self.assertIsInstance(programs_payload["items"], list)
        if programs_payload["items"]:
            first_id = programs_payload["items"][0]["id"]
            first_item = await self.client.get(f"/programs/{first_id}")
            self.assertEqual(first_item.status_code, 200, first_item.text)

    async def test_auth_applications_essays_flow(self):
        email = f"smoke-{uuid.uuid4().hex[:12]}@example.com"
        signup_payload = {"email": email, "name": "Smoke User", "password": "strong-password-123"}
        signup = await self.client.post("/auth/signup", json=signup_payload)
        self.assertEqual(signup.status_code, 201, signup.text)
        token = signup.json()["access_token"]
        refresh_token = signup.json()["refresh_token"]
        headers = {"Authorization": f"Bearer {token}"}

        me = await self.client.get("/auth/me", headers=headers)
        self.assertEqual(me.status_code, 200, me.text)
        self.assertEqual(me.json()["email"], email)

        app_payload = {
            "school_name": "Smoke University",
            "program_name": "MBA",
            "application_round": "Round 1",
            "deadline": str(date.today() + timedelta(days=45)),
            "application_fee": 100,
            "program_total_fee": 100000,
            "fee_currency": "USD",
            "essays_required": 1,
            "lors_required": 2,
            "lors_submitted": 1,
            "interview_required": False,
            "interview_completed": False,
            "decision_status": "Pending",
            "requirements_notes": "Smoke test requirements",
            "status": "Planning"
        }
        create_app = await self.client.post("/applications/", json=app_payload, headers=headers)
        self.assertEqual(create_app.status_code, 201, create_app.text)
        application_id = create_app.json()["id"]

        essay_payload = {
            "school_name": "Smoke University",
            "program_type": "MBA",
            "essay_prompt": "Why this program?",
            "essay_content": "I am excited about this program because of curriculum and outcomes.",
            "parent_essay_id": None,
            "application_id": application_id
        }
        create_essay = await self.client.post("/essays/", json=essay_payload, headers=headers)
        self.assertEqual(create_essay.status_code, 200, create_essay.text)
        essay_id = create_essay.json()["id"]

        essays = await self.client.get("/essays/", headers=headers)
        self.assertEqual(essays.status_code, 200, essays.text)
        self.assertTrue(any(item["id"] == essay_id for item in essays.json()))

        review = await self.client.post(
            f"/essays/{essay_id}/review",
            json={"focus_areas": ["content"]},
            headers=headers,
        )
        self.assertEqual(review.status_code, 200, review.text)
        self.assertEqual(review.json()["essay_id"], essay_id)

        assist_outline = await self.client.post(
            "/essays/assist/outline",
            json={
                "school_name": "Smoke University",
                "program_type": "MBA",
                "essay_prompt": "Why this program?",
                "skeleton_points": [
                    "Led a cross-functional launch under deadline pressure",
                    "Learned to influence without formal authority",
                    "Need structured leadership training for next scope",
                ],
                "target_word_count": 550,
            },
            headers=headers,
        )
        self.assertEqual(assist_outline.status_code, 200, assist_outline.text)
        assist_payload = assist_outline.json()
        self.assertIn("outline_markdown", assist_payload)
        self.assertIn("next_steps", assist_payload)
        self.assertIn(assist_payload.get("mode"), ("mock", "ai"))

        reminders = await self.client.get("/reminders/preview", headers=headers)
        self.assertEqual(reminders.status_code, 200, reminders.text)
        self.assertIn("total_matches", reminders.json())

        feedback = await self.client.post(
            "/feedback/",
            json={
                "category": "ux",
                "message": "Pilot smoke feedback for dashboard discoverability.",
                "page_context": "home"
            },
            headers=headers
        )
        self.assertEqual(feedback.status_code, 201, feedback.text)
        self.assertEqual(feedback.json()["category"], "ux")

        telemetry = await self.client.post(
            "/telemetry/events",
            json={
                "event_name": "ui_create_essay_clicked",
                "payload_json": "{\"source\":\"smoke\"}"
            },
            headers=headers
        )
        self.assertEqual(telemetry.status_code, 201, telemetry.text)

        admin_forbidden = await self.client.get("/admin/overview", headers=headers)
        self.assertEqual(admin_forbidden.status_code, 403, admin_forbidden.text)

        db = SessionLocal()
        try:
            db_user = db.query(User).filter(User.email == email).first()
            self.assertIsNotNone(db_user)
            db_user.role = "admin"
            db.commit()
        finally:
            db.close()

        admin_overview = await self.client.get("/admin/overview", headers=headers)
        self.assertEqual(admin_overview.status_code, 200, admin_overview.text)
        self.assertIn("total_users", admin_overview.json())

        admin_events = await self.client.get("/admin/events", headers=headers)
        self.assertEqual(admin_events.status_code, 200, admin_events.text)
        self.assertTrue(any(item["event_name"] == "ui_create_essay_clicked" for item in admin_events.json()))
        admin_coverage = await self.client.get("/admin/events/coverage", headers=headers)
        self.assertEqual(admin_coverage.status_code, 200, admin_coverage.text)
        self.assertIn("missing_events", admin_coverage.json())

        second_email = f"smoke2-{uuid.uuid4().hex[:10]}@example.com"
        second_signup = await self.client.post(
            "/auth/signup",
            json={"email": second_email, "name": "Second User", "password": "strong-password-123"}
        )
        self.assertEqual(second_signup.status_code, 201, second_signup.text)
        second_user_id = second_signup.json()["user"]["id"]

        role_update = await self.client.patch(
            f"/admin/users/{second_user_id}/role",
            json={"role": "admin"},
            headers=headers
        )
        self.assertEqual(role_update.status_code, 200, role_update.text)
        self.assertEqual(role_update.json()["role"], "admin")

        catalog_id = f"smoke-{uuid.uuid4().hex[:8]}"
        catalog_create = await self.client.post(
            "/admin/programs",
            json={
                "id": catalog_id,
                "school_name": "Smoke Test School",
                "program_name": "Pilot MBA",
                "degree": "MBA",
                "country": "USA",
                "city": "Austin",
                "application_fee": 180,
                "fee_currency": "USD",
                "deadline_round_1": "2026-09-01",
                "deadline_round_2": "2027-01-10",
                "source_url": "https://example.com/program",
                "last_updated": "2026-02-14",
                "confidence": "medium"
            },
            headers=headers
        )
        self.assertEqual(catalog_create.status_code, 201, catalog_create.text)
        self.assertEqual(catalog_create.json()["id"], catalog_id)

        catalog_update = await self.client.put(
            f"/admin/programs/{catalog_id}",
            json={
                "school_name": "Smoke Test School",
                "program_name": "Pilot MBA",
                "degree": "MBA",
                "country": "USA",
                "city": "Austin",
                "application_fee": 190,
                "fee_currency": "USD",
                "deadline_round_1": "2026-09-02",
                "deadline_round_2": "2027-01-11",
                "source_url": "https://example.com/program-updated",
                "last_updated": "2026-02-14",
                "confidence": "high"
            },
            headers=headers
        )
        self.assertEqual(catalog_update.status_code, 200, catalog_update.text)
        self.assertEqual(catalog_update.json()["application_fee"], 190)

        catalog_get = await self.client.get(f"/programs/{catalog_id}")
        self.assertEqual(catalog_get.status_code, 200, catalog_get.text)
        self.assertEqual(catalog_get.json()["confidence"], "high")

        catalog_delete = await self.client.delete(f"/admin/programs/{catalog_id}", headers=headers)
        self.assertEqual(catalog_delete.status_code, 200, catalog_delete.text)

        catalog_get_deleted = await self.client.get(f"/programs/{catalog_id}")
        self.assertEqual(catalog_get_deleted.status_code, 404, catalog_get_deleted.text)

        self_demote = await self.client.patch(
            f"/admin/users/{me.json()['id']}/role",
            json={"role": "user"},
            headers=headers
        )
        self.assertEqual(self_demote.status_code, 400, self_demote.text)

        delete_essay = await self.client.delete(f"/essays/{essay_id}", headers=headers)
        self.assertEqual(delete_essay.status_code, 200, delete_essay.text)

        delete_app = await self.client.delete(f"/applications/{application_id}", headers=headers)
        self.assertEqual(delete_app.status_code, 200, delete_app.text)

        refreshed = await self.client.post("/auth/refresh", json={"refresh_token": refresh_token})
        self.assertEqual(refreshed.status_code, 200, refreshed.text)
        new_access = refreshed.json()["access_token"]
        new_refresh = refreshed.json()["refresh_token"]
        new_headers = {"Authorization": f"Bearer {new_access}"}
        me_refreshed = await self.client.get("/auth/me", headers=new_headers)
        self.assertEqual(me_refreshed.status_code, 200, me_refreshed.text)

        logout = await self.client.post(
            "/auth/logout",
            json={"refresh_token": new_refresh, "all_sessions": False},
            headers=new_headers
        )
        self.assertEqual(logout.status_code, 200, logout.text)

        verify_request = await self.client.post(
            "/auth/request-email-verification",
            json={"email": email}
        )
        self.assertEqual(verify_request.status_code, 200, verify_request.text)
        verify_token = verify_request.json().get("dev_token")
        if verify_token:
            verify_confirm = await self.client.post("/auth/verify-email", json={"token": verify_token})
            self.assertEqual(verify_confirm.status_code, 200, verify_confirm.text)

        forgot = await self.client.post("/auth/forgot-password", json={"email": email})
        self.assertEqual(forgot.status_code, 200, forgot.text)
        reset_token = forgot.json().get("dev_token")
        if reset_token:
            reset = await self.client.post(
                "/auth/reset-password",
                json={"token": reset_token, "new_password": "strong-password-456"}
            )
            self.assertEqual(reset.status_code, 200, reset.text)

    async def test_validation_errors_include_request_id(self):
        unauthorized = await self.client.get("/auth/me")
        self.assertEqual(unauthorized.status_code, 403, unauthorized.text)
        unauthorized_payload = unauthorized.json()
        self.assertIn("detail", unauthorized_payload)
        self.assertIn("request_id", unauthorized_payload)
        self.assertTrue(unauthorized_payload["request_id"])

        invalid_signup = await self.client.post(
            "/auth/signup",
            json={"email": "invalid", "name": "x", "password": "123"},
        )
        self.assertEqual(invalid_signup.status_code, 422, invalid_signup.text)
        invalid_payload = invalid_signup.json()
        self.assertIn("detail", invalid_payload)
        self.assertIn("request_id", invalid_payload)
        self.assertTrue(invalid_payload["request_id"])

    async def test_application_validation_and_user_isolation(self):
        _, headers_a = await self._signup_and_get_headers("Alpha")
        _, headers_b = await self._signup_and_get_headers("Beta")

        invalid_application = await self.client.post(
            "/applications/",
            json={
                "school_name": "Validation University",
                "program_name": "MBA",
                "deadline": str(date.today() + timedelta(days=30)),
                "fee_currency": "USD",
                "lors_required": 1,
                "lors_submitted": 2,
                "interview_required": False,
                "interview_completed": True,
                "decision_status": "Pending",
                "status": "Planning",
            },
            headers=headers_a,
        )
        self.assertEqual(invalid_application.status_code, 422, invalid_application.text)
        invalid_payload = invalid_application.json()
        self.assertIn("detail", invalid_payload)
        self.assertIn("request_id", invalid_payload)

        valid_application = await self.client.post(
            "/applications/",
            json={
                "school_name": "Isolation University",
                "program_name": "MSCS",
                "deadline": str(date.today() + timedelta(days=45)),
                "fee_currency": "usd",
                "lors_required": 2,
                "lors_submitted": 1,
                "interview_required": True,
                "interview_completed": False,
                "decision_status": "Pending",
                "status": "Planning",
            },
            headers=headers_a,
        )
        self.assertEqual(valid_application.status_code, 201, valid_application.text)
        application_id = valid_application.json()["id"]
        self.assertEqual(valid_application.json()["fee_currency"], "USD")

        cross_user_read = await self.client.get(f"/applications/{application_id}", headers=headers_b)
        self.assertEqual(cross_user_read.status_code, 404, cross_user_read.text)
        cross_user_payload = cross_user_read.json()
        self.assertIn("detail", cross_user_payload)
        self.assertIn("request_id", cross_user_payload)

    async def test_signup_rate_limit_returns_retry_after(self):
        email = f"limit-{uuid.uuid4().hex[:12]}@example.com"
        payload = {
            "email": email,
            "name": "Rate Limit User",
            "password": "strong-password-123",
        }

        for _ in range(10):
            response = await self.client.post("/auth/signup", json=payload)
            self.assertIn(response.status_code, (201, 400), response.text)

        limited = await self.client.post("/auth/signup", json=payload)
        self.assertEqual(limited.status_code, 429, limited.text)
        self.assertIn("Retry-After", limited.headers)
        limited_payload = limited.json()
        self.assertIn("request_id", limited_payload)
        self.assertIn("Rate limit exceeded", limited_payload.get("detail", ""))

    async def test_telemetry_event_normalization_and_validation(self):
        _, headers = await self._signup_and_get_headers("Telemetry")

        telemetry = await self.client.post(
            "/telemetry/events",
            json={"event_name": "  Ui_Create_Application_Clicked  ", "payload_json": "{\"source\":\"api-smoke\"}"},
            headers=headers,
        )
        self.assertEqual(telemetry.status_code, 201, telemetry.text)
        event_id = telemetry.json()["event_id"]

        db = SessionLocal()
        try:
            row = db.query(AdminEvent).filter(AdminEvent.id == event_id).first()
            self.assertIsNotNone(row)
            self.assertEqual(row.event_name, "ui_create_application_clicked")
        finally:
            db.close()

        invalid = await self.client.post(
            "/telemetry/events",
            json={"event_name": " ", "payload_json": "{}"},
            headers=headers,
        )
        self.assertEqual(invalid.status_code, 422, invalid.text)
        invalid_payload = invalid.json()
        self.assertIn("request_id", invalid_payload)


if __name__ == "__main__":
    unittest.main()
