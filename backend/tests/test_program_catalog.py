"""Programme catalogue durability and review workflow (R09); disposable SQLite DB."""
import json
import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path

import httpx
from fastapi import FastAPI
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from auth import create_access_token
from database import Base, get_db
from models import User
from routers.catalog_routes import admin_router, public_router
from services import program_catalog as catalog


def cycle_now() -> str:
    return catalog.current_cycle()


class ProgramCatalogTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.url = "sqlite:///" + self.tmp.name + "/catalog.sqlite"
        self.open_db()
        with self.Session() as db:
            db.add_all([User(id=1, email="admin@example.test", role="admin", is_active=True),
                        User(id=2, email="member@example.test", role="user", is_active=True)])
            db.commit()
        self.build_app()

    def open_db(self):
        self.engine = create_engine(self.url, connect_args={"check_same_thread": False})
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)

    def build_app(self):
        def get_test_db():
            with self.Session() as db:
                yield db
        app = FastAPI()
        app.include_router(public_router)
        app.include_router(admin_router, prefix="/admin")
        app.dependency_overrides[get_db] = get_test_db
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver")
        self.admin = {"Authorization": "Bearer " + create_access_token({"sub": "1"})}
        self.member = {"Authorization": "Bearer " + create_access_token({"sub": "2"})}

    async def asyncTearDown(self):
        await self.client.aclose()
        self.engine.dispose()
        self.tmp.cleanup()

    def body(self, **over):
        data = {"program_id": "test-school-mba", "school_name": "Test School", "program_name": "MBA",
                "degree": "MBA", "country": "India", "cycle": cycle_now(), "application_fee": 2000,
                "fee_currency": "INR", "rounds": [{"label": "Round 1", "deadline": "2026-12-01"}],
                "source_url": "https://example.edu/apply", "checked_at": date.today().isoformat()}
        data.update(over)
        return data

    async def publish(self, status="verified", **over):
        draft = await self.client.post("/admin/catalog/drafts", json=self.body(**over), headers=self.admin)
        self.assertEqual(draft.status_code, 201, draft.text)
        rid = draft.json()["id"]
        sub = await self.client.post(f"/admin/catalog/revisions/{rid}/submit", headers=self.admin)
        self.assertEqual(sub.status_code, 200, sub.text)
        pub = await self.client.post(f"/admin/catalog/revisions/{rid}/publish",
                                     json={"verification_status": status}, headers=self.admin)
        self.assertEqual(pub.status_code, 200, pub.text)
        return rid

    async def test_restart_preserves_changes(self):
        await self.publish()
        await self.client.aclose()
        self.engine.dispose()  # simulated process restart: new engine, new app, same database file
        self.open_db()
        self.build_app()
        item = (await self.client.get("/programs/test-school-mba")).json()
        self.assertEqual(item["verification_status"], "verified")
        self.assertTrue(item["autofill_allowed"])
        self.assertEqual(item["deadline_round_1"], "2026-12-01")

    async def test_unpublished_and_unverified_do_not_autofill(self):
        draft = await self.client.post("/admin/catalog/drafts", json=self.body(), headers=self.admin)
        self.assertEqual((await self.client.get("/programs/test-school-mba")).status_code, 404)
        self.assertEqual((await self.client.get("/programs")).json()["total"], 0)
        rid = draft.json()["id"]
        await self.client.post(f"/admin/catalog/revisions/{rid}/submit", headers=self.admin)
        await self.client.post(f"/admin/catalog/revisions/{rid}/publish",
                               json={"verification_status": "unverified"}, headers=self.admin)
        item = (await self.client.get("/programs/test-school-mba")).json()
        self.assertEqual(item["verification_status"], "unverified")
        self.assertFalse(item["autofill_allowed"])
        self.assertTrue(item["status_reason"])

    async def test_stale_and_wrong_cycle_do_not_autofill(self):
        await self.publish(checked_at=(date.today() - timedelta(days=400)).isoformat())
        item = (await self.client.get("/programs/test-school-mba")).json()
        self.assertEqual(item["verification_status"], "stale")
        self.assertFalse(item["autofill_allowed"])
        await self.publish(program_id="old-cycle-mba", school_name="Old School", cycle="2020-21")
        old = (await self.client.get("/programs/old-cycle-mba")).json()
        self.assertEqual(old["verification_status"], "stale")
        self.assertFalse(old["autofill_allowed"])
        self.assertFalse(old["is_current_cycle"])

    async def test_verified_requires_source_and_check_date(self):
        draft = await self.client.post("/admin/catalog/drafts",
                                       json=self.body(source_url=None, checked_at=None), headers=self.admin)
        rid = draft.json()["id"]
        await self.client.post(f"/admin/catalog/revisions/{rid}/submit", headers=self.admin)
        pub = await self.client.post(f"/admin/catalog/revisions/{rid}/publish",
                                     json={"verification_status": "verified"}, headers=self.admin)
        self.assertEqual(pub.status_code, 400, pub.text)

    async def test_corrections_keep_history(self):
        first = await self.publish()
        second = await self.publish(application_fee=2500, change_note="Fee raised on official page")
        self.assertNotEqual(first, second)
        item = (await self.client.get("/programs/test-school-mba")).json()
        self.assertEqual(item["application_fee"], 2500)
        self.assertEqual(item["revision_number"], 2)
        history = (await self.client.get("/admin/catalog/programs/test-school-mba/revisions",
                                         headers=self.admin)).json()
        self.assertEqual([(h["revision_number"], h["state"], h["application_fee"]) for h in history],
                         [(2, "published", 2500.0), (1, "superseded", 2000.0)])
        edit_published = await self.client.put(f"/admin/catalog/revisions/{second}", json=self.body(),
                                               headers=self.admin)
        self.assertEqual(edit_published.status_code, 409)

    async def test_workflow_is_admin_only_and_ordered(self):
        denied = await self.client.post("/admin/catalog/drafts", json=self.body(), headers=self.member)
        self.assertEqual(denied.status_code, 403)
        anon = await self.client.post("/admin/catalog/drafts", json=self.body())
        self.assertIn(anon.status_code, (401, 403))
        self.assertEqual((await self.client.get("/admin/catalog", headers=self.member)).status_code, 403)
        draft = await self.client.post("/admin/catalog/drafts", json=self.body(), headers=self.admin)
        rid = draft.json()["id"]
        for path, payload in (("submit", None), ("publish", {"verification_status": "verified"})):
            res = await self.client.post(f"/admin/catalog/revisions/{rid}/{path}", json=payload,
                                         headers=self.member)
            self.assertEqual(res.status_code, 403, path)
        early = await self.client.post(f"/admin/catalog/revisions/{rid}/publish",
                                       json={"verification_status": "verified"}, headers=self.admin)
        self.assertEqual(early.status_code, 409)  # must be submitted for review first
        dup = await self.client.post("/admin/catalog/drafts", json=self.body(), headers=self.admin)
        self.assertEqual(dup.status_code, 409)  # one open revision per cycle
        ok = await self.client.post(f"/admin/catalog/revisions/{rid}/submit", headers=self.admin)
        back = await self.client.post(f"/admin/catalog/revisions/{rid}/return", json={"note": "check fee"},
                                      headers=self.admin)
        self.assertEqual((ok.status_code, back.status_code, back.json()["state"]), (200, 200, "draft"))

    async def test_publish_records_reviewer_and_archive_hides(self):
        await self.publish()
        history = (await self.client.get("/admin/catalog/programs/test-school-mba/revisions",
                                         headers=self.admin)).json()
        self.assertEqual(history[0]["reviewer_user_id"], 1)
        listing = (await self.client.get("/admin/catalog", headers=self.admin)).json()
        cycle_id = listing["items"][0]["cycles"][0]["id"]
        arch = await self.client.post(f"/admin/catalog/cycles/{cycle_id}/archive", headers=self.admin)
        self.assertEqual(arch.status_code, 200)
        self.assertEqual((await self.client.get("/programs/test-school-mba")).status_code, 404)

    async def test_seed_import_is_idempotent_unverified_and_read_only(self):
        seed = Path(self.tmp.name) / "seed.json"
        seed.write_text(json.dumps([{"id": "seed-one", "school_name": "Seed School", "program_name": "PGP",
                                     "degree": "MBA", "country": "India", "application_fee": 1000,
                                     "fee_currency": "INR", "deadline_round_1": "2026-11-01",
                                     "source_url": "https://example.edu", "last_updated": "2026-02-14"}]))
        before = seed.read_text()
        with self.Session() as db:
            first = catalog.import_seed(db, seed)
            second = catalog.import_seed(db, seed)
            self.assertEqual((first["created"], second["created"], second["skipped"]),
                             (["seed-one"], [], ["seed-one"]))
            self.assertEqual(catalog.list_public(db)[0], 0)  # imported drafts are not public
            rev = catalog.history(db, "seed-one")[0]
            self.assertEqual((rev["state"], rev["verification_status"], rev["checked_at"]),
                             ("draft", "unverified", None))
        self.assertEqual(seed.read_text(), before)

    async def test_real_seed_file_imports(self):
        with self.Session() as db:
            result = catalog.import_seed(db)
        self.assertEqual(result["invalid"], [])
        self.assertTrue(result["created"])


if __name__ == "__main__":
    unittest.main()
