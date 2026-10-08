"""Résumé extraction and private question-set tests; no real provider traffic."""
import io
import json
import unittest
import zipfile
from unittest.mock import patch
from uuid import uuid4
from datetime import datetime, timedelta

from fastapi import HTTPException
from pypdf import PdfWriter
from pypdf.generic import DictionaryObject, NameObject, DecodedStreamObject
from models import ResumeQuestionSet
from routers.resume_routes import router
from services import interview_provider as provider
from services.resume_questions import extract_document, generate_questions
from tests import test_interviews as interview_tests

TEXT = "Led a Java backend migration for a small product team. Built API monitoring and coordinated incident reviews. Studied computer science and mentored two graduates."


def draft():
    return {"profile": [{"category": "experience", "evidence_quote": "Built API monitoring"}, {"category": "education", "evidence_quote": "Studied computer science"}], "branches": [{key: {"question": f"For project {index}, what did you learn at stage {depth}?", "evidence_quote": "Built API monitoring"}
                          for depth, key in enumerate(("opening", "follow_up", "deeper_follow_up"), 1)} for index in range(1, 4)]}


def pdf(text=TEXT, pages=1, encrypted=False):
    writer = PdfWriter()
    for _ in range(pages):
        page = writer.add_blank_page(width=612, height=792)
        font = DictionaryObject({NameObject("/Type"): NameObject("/Font"), NameObject("/Subtype"): NameObject("/Type1"), NameObject("/BaseFont"): NameObject("/Helvetica")})
        page[NameObject("/Resources")] = DictionaryObject({NameObject("/Font"): DictionaryObject({NameObject("/F1"): writer._add_object(font)})})
        stream = DecodedStreamObject(); stream.set_data(f"BT /F1 12 Tf 20 760 Td ({text}) Tj ET".encode())
        page[NameObject("/Contents")] = writer._add_object(stream)
    if encrypted: writer.encrypt("synthetic-test-only")
    output = io.BytesIO(); writer.write(output); return output.getvalue()


def docx(xml=None):
    out = io.BytesIO()
    with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("word/document.xml", xml or f'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>{TEXT}</w:t></w:r></w:p></w:body></w:document>')
    return out.getvalue()


class ResumeParserTest(unittest.TestCase):
    def test_formats_extract_without_network(self):
        for data, kind in [(TEXT.encode(), "txt"), (pdf(), "pdf"), (docx(), "docx")]:
            with self.subTest(kind=kind): self.assertEqual(extract_document(data, kind), TEXT)

    def test_bad_scanned_encrypted_long_and_entity_documents_rejected(self):
        cases = [(b"not a pdf", "pdf"), (pdf(text=""), "pdf"), (pdf(encrypted=True), "pdf"),
                 (pdf(pages=11), "pdf"), (b"x" * 20001, "txt"), (b"\x00" * 90, "txt"),
                 (docx('<!DOCTYPE x [<!ENTITY bad SYSTEM "file:///nonexistent">]><x>&bad;</x>'), "docx"),
                 (b"PK\x03\x04bad", "docx")]
        for data, kind in cases:
            with self.subTest(kind=kind), self.assertRaises(HTTPException) as error:
                extract_document(data, kind)
            self.assertEqual(error.exception.status_code, 422)

    def test_graph_is_grounded_and_question_only(self):
        with patch.object(provider, "_structured", return_value=(draft(), {})):
            graph, _ = generate_questions(TEXT, {"route": "experienced"})
        self.assertEqual((len(graph["roots"]), len(graph["nodes"]), len(graph["edges"])), (3, 9, 6))
        self.assertTrue(all(n["evidence_quote"] in TEXT for n in graph["nodes"]))
        self.assertTrue(all("answer" not in n and "tips" not in n for n in graph["nodes"]))
        invalid = draft(); invalid["branches"][0]["opening"]["evidence_quote"] = "Invented promotion"
        with patch.object(provider, "_structured", return_value=(invalid, {})), self.assertRaises(provider.ProviderFailure):
            generate_questions(TEXT, {"route": "cat"})


class ResumeApiTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        await interview_tests.InterviewApiTest.asyncSetUp(self)
        self.app.include_router(router)
    async def asyncTearDown(self):
        await interview_tests.InterviewApiTest.asyncTearDown(self)
    def payload(self, **changes):
        return {"request_id": str(uuid4()), "route": "experienced", "resume_text": TEXT, "consent": True, **changes}
    async def post(self, payload, headers=None):
        return await self.client.post("/interviews/resume/question-sets", json=payload, headers=headers or self.headers)

    async def test_upload_is_authenticated_bounded_and_keyless(self):
        url = "/interviews/resume/extract?format=txt"
        unauth = await self.client.post(url, content=TEXT.encode())
        self.assertIn(unauth.status_code, (401, 403))
        ok = await self.client.post(url, content=TEXT.encode(), headers=self.headers)
        self.assertEqual(ok.status_code, 200, ok.text)
        self.assertEqual(ok.json()["text"], TEXT)
        self.assertEqual(ok.headers["cache-control"], "no-store")
        big = await self.client.post(url, content=b"x" * (5 * 1024 * 1024 + 1), headers=self.headers)
        self.assertEqual(big.status_code, 413)
        missing = await self.post(self.payload())
        self.assertEqual(missing.status_code, 503)
        with self.Session() as db: self.assertEqual(db.query(ResumeQuestionSet).count(), 0)

    async def test_private_idempotent_sets_and_interview_use(self):
        payload = self.payload()
        with patch.object(provider, "api_key", return_value="synthetic-key"), patch.object(provider, "_structured", return_value=(draft(), {})) as generate:
            created = await self.post(payload)
            self.assertEqual(created.status_code, 201, created.text)
            repeat = await self.post(payload)
            self.assertEqual(repeat.json(), created.json())
            self.assertEqual(generate.call_count, 1)
            conflict = await self.post({**payload, "route": "cat"})
            self.assertEqual(conflict.status_code, 409)
        item = created.json()
        with self.Session() as db:
            row = db.get(ResumeQuestionSet, item["id"])
            self.assertNotIn(TEXT, row.context_json + row.questions_json)
        private = await self.client.get("/interviews/resume/question-sets", headers=self.other)
        self.assertEqual(private.json()["items"], [])
        start = {"request_id": str(uuid4()), "route": "experienced", "provider": "demo", "question_limit": 3,
                 "question_set_id": item["id"], "question_id": item["graph"]["roots"][0]}
        denied = await self.client.post("/interviews/sessions", json=start, headers=self.other)
        self.assertEqual(denied.status_code, 404)
        session = await self.client.post("/interviews/sessions", json=start, headers=self.headers)
        self.assertEqual(session.status_code, 201, session.text)
        session = session.json()
        self.assertEqual(session["transcript"][0]["text"], item["graph"]["nodes"][0]["text"])
        answer = await self.client.post(f"/interviews/sessions/{session['id']}/answers", headers=self.headers,
            json={"request_id": str(uuid4()), "expected_version": session["version"], "text": "I coordinated a staged migration."})
        self.assertEqual(answer.json()["transcript"][-1]["text"], item["graph"]["nodes"][1]["text"])
        denied_delete = await self.client.delete(f"/interviews/resume/question-sets/{item['id']}", headers=self.other)
        self.assertEqual(denied_delete.status_code, 404)
        deleted = await self.client.delete(f"/interviews/resume/question-sets/{item['id']}", headers=self.headers)
        self.assertEqual(deleted.status_code, 204)
        preserved = await self.client.get(f"/interviews/sessions/{session['id']}", headers=self.headers)
        self.assertEqual(preserved.status_code, 200)

    async def test_consent_failure_retry_lease_and_daily_cap(self):
        with patch.object(provider, "api_key", return_value="synthetic-key"), patch.object(provider, "_structured", return_value=(draft(), {})) as generate:
            unconsented = await self.post(self.payload(consent=False))
            self.assertEqual(unconsented.status_code, 422)
            payload = self.payload()
            generate.side_effect = provider.ProviderFailure("Please retry.")
            failed = await self.post(payload)
            self.assertEqual(failed.status_code, 503)
            with self.Session() as db:
                row = db.query(ResumeQuestionSet).one()
                self.assertEqual(row.status, "failed")
                row.pending_token = "synthetic-lease"; row.pending_until = datetime.utcnow() + timedelta(minutes=1)
                db.commit(); set_id = row.id
            busy = await self.post(payload)
            self.assertEqual(busy.status_code, 409)
            cannot_delete = await self.client.delete(f"/interviews/resume/question-sets/{set_id}", headers=self.headers)
            self.assertEqual(cannot_delete.status_code, 409)
            with self.Session() as db:
                row = db.get(ResumeQuestionSet, set_id); row.pending_until = datetime.utcnow() - timedelta(seconds=1); db.commit()
            generate.side_effect = None
            retry = await self.post(payload)
            self.assertEqual(retry.status_code, 201, retry.text)
            for _ in range(4): self.assertEqual((await self.post(self.payload())).status_code, 201)
            limit = await self.post(self.payload())
            self.assertEqual(limit.status_code, 429)

    async def test_reviewed_profile_is_private_bounded_and_works_with_a_shared_opening(self):
        with patch.object(provider, "api_key", return_value="synthetic-key"), patch.object(provider, "_structured", return_value=(draft(), {})):
            created = (await self.post(self.payload())).json()
        payload = {"request_id": str(uuid4()), "route": "experienced", "provider": "demo", "profile_set_id": created["id"],
                   "profile_fact_ids": ["fact-1"], "programme_name": "Synthetic One-year MBA", "practice_focus": "resume", "question_id": "story"}
        denied = await self.client.post("/interviews/sessions", json=payload, headers=self.other)
        self.assertEqual(denied.status_code, 404)
        for changes in [{"profile_fact_ids": ["fact-999"]}, {"route": "cat"}, {"profile_fact_ids": []}]:
            bad = await self.client.post("/interviews/sessions", json={**payload, **changes}, headers=self.headers)
            self.assertEqual(bad.status_code, 422, bad.text)
        saved = await self.client.post("/interviews/sessions", json=payload, headers=self.headers)
        self.assertEqual(saved.status_code, 201, saved.text)
        context = saved.json()["context"]
        self.assertEqual(context["resume_profile"], [created["graph"]["profile"][0]])
        self.assertEqual(context["programme"], "Synthetic One-year MBA")
        self.assertEqual(context["interview_plan"]["max_follow_ups"], 4)
        self.assertNotIn(TEXT, json.dumps(context))
