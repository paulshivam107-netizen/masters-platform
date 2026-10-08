"""Admin pilot regressions against a disposable DB; no provider calls."""
import json
import tempfile
import unittest
from datetime import datetime, timedelta
from unittest.mock import patch

import httpx
from fastapi import FastAPI
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
from auth import create_access_token
from database import Base, get_db
from models import User, PilotFeedback, InterviewSession, InterviewOperation, AdminEvent, ResumeQuestionSet
from routers.admin_operations import router
from services.migrations import run_admin_operations_migrations
from services.interviews import run_step
from services.interview_provider import ProviderFailure


class AdminOperationsTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.engine = create_engine('sqlite:///' + self.tmp.name + '/admin.sqlite', connect_args={'check_same_thread': False})
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        with self.Session() as db:
            db.add_all([User(id=1, email='admin@example.test', role='admin', is_active=True),
                        User(id=2, email='member@example.test', role='user', is_active=True),
                        User(id=3, email='other-admin@example.test', role='admin', is_active=True),
                        User(id=4, email='disabled@example.test', role='admin', is_active=False)])
            db.add(PilotFeedback(id=1, user_id=2, category='bug', message='My interview stopped'))
            db.commit()
        def get_test_db():
            with self.Session() as db:
                yield db
        self.app = FastAPI()
        self.app.include_router(router, prefix='/admin')
        self.app.dependency_overrides[get_db] = get_test_db
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app), base_url='http://testserver')
        self.headers = self.auth(1)

    def auth(self, user):
        return {'Authorization': 'Bearer ' + create_access_token({'sub': str(user)})}

    async def asyncTearDown(self):
        await self.client.aclose()
        self.engine.dispose()
        self.tmp.cleanup()

    def seed_session(self, db, sid, provider='openai'):
        row = InterviewSession(id=sid, user_id=2, create_request_id=sid, create_fingerprint='test',
            context_json='{"private":"resume detail"}', transcript_json='[{"text":"private answer"}]',
            provider=provider, mode='chat', question_limit=5)
        db.add(row)
        db.flush()
        return row

    async def test_every_endpoint_requires_active_admin(self):
        requests = [('GET', 'interviews', None), ('GET', 'usage', None), ('GET', 'feedback', None),
                    ('GET', 'economics', None), ('PUT', 'economics', {'revision':0,'assumptions':{}}),
                    ('PATCH', 'feedback/1', {'revision':0,'status':'resolved','note':'fixed'})]
        for method, path, payload in requests:
            for headers in ({}, self.auth(2), self.auth(4)):
                response = await self.client.request(method, '/admin/pilot/' + path, headers=headers, json=payload)
                self.assertIn(response.status_code, (401,403), response.text)

    async def test_feedback_resolution_audit_reopen_and_conflict(self):
        initial = await self.client.get('/admin/pilot/feedback', headers=self.headers)
        self.assertEqual(initial.headers['cache-control'], 'no-store')
        self.assertEqual(initial.json()['counts']['open'], 1)
        bad = await self.client.patch('/admin/pilot/feedback/1', headers=self.headers,
            json={'status':'resolved','revision':0,'note':'   '})
        self.assertEqual(bad.status_code, 422)
        saved = await self.client.patch('/admin/pilot/feedback/1', headers=self.headers,
            json={'status':'resolved','revision':0,'note':'Explained retry steps'})
        self.assertEqual(saved.status_code, 200, saved.text)
        self.assertEqual(saved.json()['revision'], 1)
        conflict = await self.client.patch('/admin/pilot/feedback/1', headers=self.auth(3),
            json={'status':'open','revision':0,'note':''})
        self.assertEqual(conflict.status_code,409)
        opened = await self.client.patch('/admin/pilot/feedback/1', headers=self.headers,
            json={'status':'in_progress','revision':1,'note':'Investigating again'})
        self.assertEqual(opened.status_code,200)
        with self.Session() as db:
            self.assertEqual(db.get(PilotFeedback,1).handled_by,1)
            events=db.query(AdminEvent).all()
            self.assertEqual(len(events),2)
            self.assertNotIn('Explained',events[0].payload_json)
        rows = await self.client.get('/admin/pilot/feedback?q=member%40example.test',headers=self.headers)
        self.assertEqual(rows.json()['total'],1)
        empty = await self.client.get('/admin/pilot/feedback?state=resolved',headers=self.headers)
        self.assertEqual(empty.json()['total'],0)

    async def test_feedback_pagination_and_literal_search(self):
        with self.Session() as db:
            db.add_all([PilotFeedback(user_id=2,message='report '+str(i)) for i in range(23)])
            db.commit()
        a=await self.client.get('/admin/pilot/feedback',headers=self.headers)
        b=await self.client.get('/admin/pilot/feedback?offset=20',headers=self.headers)
        self.assertEqual(a.json()['total'],24)
        self.assertEqual(len(a.json()['items']),20)
        self.assertEqual(len(b.json()['items']),4)
        escaped=await self.client.get('/admin/pilot/feedback?q=%25',headers=self.headers)
        self.assertEqual(escaped.json()['total'],0)

    async def test_failures_stalled_and_no_private_content(self):
        with self.Session() as db:
            session=self.seed_session(db,'failed')
            session.pending_token='lease'
            session.pending_until=datetime.utcnow()+timedelta(minutes=3)
            op=InterviewOperation(id='op',session_id=session.id,request_id='r',fingerprint='f',kind='answer')
            db.add(op);db.commit()
            def action(): raise ProviderFailure('secret provider detail',code='provider_timeout')
            with self.assertRaises(Exception): run_step(db,session,op,'lease',action)
            stale=self.seed_session(db,'stale')
            stale.pending_until=datetime.utcnow()-timedelta(minutes=1)
            db.add(InterviewOperation(id='stalled',session_id='stale',request_id='s',fingerprint='f',kind='feedback'))
            active=self.seed_session(db,'busy')
            active.pending_until=datetime.utcnow()+timedelta(minutes=1)
            db.add(InterviewOperation(id='busy',session_id='busy',request_id='b',fingerprint='f',kind='feedback'))
            db.commit()
        response=await self.client.get('/admin/pilot/interviews',headers=self.headers)
        self.assertEqual(response.json()['total'],2)
        self.assertNotIn('private',response.text)
        self.assertNotIn('secret provider detail',response.text)
        self.assertEqual({r['status'] for r in response.json()['items']},{'failed','stalled'})
        self.assertIn('provider_timeout',response.text)
        with self.Session() as db:
            db.get(InterviewOperation,'op').status='succeeded';db.commit()
        recovered=await self.client.get('/admin/pilot/interviews',headers=self.headers)
        self.assertEqual(recovered.json()['total'],1)

    async def test_usage_excludes_demo_failed_and_old_and_includes_resumes(self):
        with self.Session() as db:
            self.seed_session(db,'live');self.seed_session(db,'demo','demo')
            for oid,sid,state,raw,created in [
                ('live','live','succeeded',{'model':'model-a','input_tokens':100,'output_tokens':20},datetime.utcnow()),
                ('demo','demo','succeeded',{'model':'model-a','input_tokens':900},datetime.utcnow()),
                ('bad','live','failed',{'model':'model-a','input_tokens':900},datetime.utcnow()),
                ('old','live','succeeded',{'model':'model-a','input_tokens':900},datetime.utcnow()-timedelta(days=40)),
                ('audio','live','succeeded',{'model':'speech','characters':150},datetime.utcnow()),
                ('missing','live','succeeded',{},datetime.utcnow())]:
                db.add(InterviewOperation(id=oid,session_id=sid,request_id=oid,fingerprint='f',kind='answer',status=state,usage_json=json.dumps(raw),created_at=created))
            db.add(ResumeQuestionSet(id='resume',user_id=2,request_id='resume',fingerprint='r',context_json='{}',status='completed',usage_json='{"model":"model-a","input_tokens":50,"output_tokens":10}'))
            db.commit()
        response=await self.client.get('/admin/pilot/usage',headers=self.headers)
        rows=response.json()['models']
        self.assertEqual(sum(r['input_tokens'] for r in rows),150)
        self.assertEqual(sum(r['characters'] for r in rows),150)
        self.assertEqual(response.json()['missing_usage'],1)

    async def test_scenario_persistence_isolation_validation_and_conflicts(self):
        defaults=await self.client.get('/admin/pilot/economics',headers=self.headers)
        self.assertEqual(defaults.json()['revision'],0)
        changed={**defaults.json()['assumptions'],'price':700}
        saved=await self.client.put('/admin/pilot/economics',headers=self.headers,json={'assumptions':changed,'revision':0})
        self.assertEqual(saved.status_code,200,saved.text)
        again=await self.client.get('/admin/pilot/economics',headers=self.headers)
        self.assertEqual(again.json()['assumptions']['price'],700)
        other=await self.client.get('/admin/pilot/economics',headers=self.auth(3))
        self.assertEqual(other.json()['assumptions']['price'],599)
        stale=await self.client.put('/admin/pilot/economics',headers=self.headers,json={'assumptions':changed,'revision':0})
        self.assertEqual(stale.status_code,409)
        bad=await self.client.put('/admin/pilot/economics',headers=self.headers,json={'assumptions':{'tax':101},'revision':1})
        self.assertEqual(bad.status_code,422)
        updated=await self.client.put('/admin/pilot/economics',headers=self.headers,json={'assumptions':changed,'revision':1})
        self.assertEqual(updated.json()['revision'],2)

    async def test_existing_database_migration_is_repeatable_and_preserves_data(self):
        old=create_engine('sqlite:///'+self.tmp.name+'/old.sqlite')
        with old.begin() as conn:
            conn.execute(text('CREATE TABLE pilot_feedback (id INTEGER PRIMARY KEY, message TEXT)'))
            conn.execute(text("INSERT INTO pilot_feedback VALUES (1, 'existing feedback')"))
            conn.execute(text('CREATE TABLE interview_operations (id VARCHAR PRIMARY KEY)'))
        run_admin_operations_migrations(old);run_admin_operations_migrations(old)
        with old.connect() as conn:
            row=conn.execute(text('SELECT message,status,revision FROM pilot_feedback')).one()
            self.assertEqual(tuple(row),('existing feedback','open',0))
            self.assertIn('failure_code',{c['name'] for c in inspect(conn).get_columns('interview_operations')})
        old.dispose()
