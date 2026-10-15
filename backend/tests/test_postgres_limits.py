"""R05 race tests against PostgreSQL: shared limits across workers and no overspend.

Skipped unless TEST_POSTGRES_ADMIN_URL points at a disposable server (see test_postgres_runtime.py).
Each "worker" has its own engine/connection pool; the rate-limit test uses separate OS processes.
Runs under the restricted runtime role, so the new tables' grants are exercised too.
"""
import multiprocessing
import os
import sys
import threading
import unittest
import uuid
from datetime import datetime
from pathlib import Path
from unittest.mock import patch

from sqlalchemy import create_engine, pool, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

from models import AiCostEntry, AiSpendCounter, User  # noqa: E402
from services import ai_costs, rate_limit  # noqa: E402
from services.schema import migrate_to_head, schema_drift  # noqa: E402

ADMIN_URL = os.environ.get("TEST_POSTGRES_ADMIN_URL")
RUNTIME_ROLE = "app_runtime_r05_" + uuid.uuid4().hex[:6]
RUNTIME_PASSWORD = "runtime-r05-" + uuid.uuid4().hex


def _process_worker(url, key, attempts, start, results):
    engine = create_engine(url, poolclass=pool.NullPool)
    start.wait(30)
    allowed = sum(rate_limit.hit(key, limit=10, window_seconds=3600, db=engine)[0] for _ in range(attempts))
    engine.dispose()
    results.put(allowed)


def run_threads(count, target):
    barrier = threading.Barrier(count)
    threads = [threading.Thread(target=target, args=(i, barrier)) for i in range(count)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()


@unittest.skipUnless(ADMIN_URL, "set TEST_POSTGRES_ADMIN_URL to run PostgreSQL race tests")
class PostgresLimitsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import db_roles

        cls.db_name = "masters_r05_" + uuid.uuid4().hex[:10]
        admin = create_engine(ADMIN_URL, isolation_level="AUTOCOMMIT", poolclass=pool.NullPool)
        with admin.connect() as conn:
            conn.execute(text(f'CREATE DATABASE "{cls.db_name}"'))
        admin.dispose()
        owner_url = make_url(ADMIN_URL).set(database=cls.db_name)
        cls.owner_engine = create_engine(owner_url, poolclass=pool.NullPool)
        cls.status = migrate_to_head(cls.owner_engine)
        conn = db_roles.connect(owner_url.render_as_string(hide_password=False))
        try:
            db_roles.apply_runtime_role(conn, RUNTIME_ROLE, RUNTIME_PASSWORD)
        finally:
            conn.close()
        cls.runtime_url = owner_url.set(username=RUNTIME_ROLE, password=RUNTIME_PASSWORD)
        # Two independent "workers", each with its own pool.
        cls.workers = [create_engine(cls.runtime_url, pool_size=20, max_overflow=5) for _ in range(2)]
        cls.Sessions = [sessionmaker(bind=engine) for engine in cls.workers]
        with cls.Sessions[0]() as db:
            db.add_all([User(id=1000 + i, email=f"r05-{i}@example.com", name="R05", is_active=True) for i in range(40)])
            db.commit()

    @classmethod
    def tearDownClass(cls):
        for engine in cls.workers:
            engine.dispose()
        cls.owner_engine.dispose()
        admin = create_engine(ADMIN_URL, isolation_level="AUTOCOMMIT", poolclass=pool.NullPool)
        with admin.connect() as conn:
            conn.execute(text(f'DROP DATABASE IF EXISTS "{cls.db_name}" WITH (FORCE)'))
            conn.execute(text(f'DROP ROLE IF EXISTS "{RUNTIME_ROLE}"'))
        admin.dispose()

    def setUp(self):
        with self.owner_engine.begin() as conn:
            conn.execute(text("DELETE FROM ai_cost_entries"))
            conn.execute(text("DELETE FROM ai_spend_counters"))
            conn.execute(text("DELETE FROM rate_limit_buckets"))

    def test_schema_at_head_matches_models(self):
        self.assertEqual(self.status.current, "0005")
        self.assertEqual(schema_drift(self.owner_engine), [])

    def test_rate_limit_is_shared_by_two_worker_processes(self):
        ctx = multiprocessing.get_context("spawn")
        start, results = ctx.Event(), ctx.Queue()
        url = self.runtime_url.render_as_string(hide_password=False)
        key = "race:" + uuid.uuid4().hex
        procs = [ctx.Process(target=_process_worker, args=(url, key, 15, start, results)) for _ in range(2)]
        for proc in procs:
            proc.start()
        start.set()
        allowed = [results.get(timeout=60) for _ in procs]
        for proc in procs:
            proc.join(30)
        self.assertEqual(sum(allowed), 10, allowed)

    def test_rate_limit_threads_on_two_engines(self):
        key, allowed = "threads:" + uuid.uuid4().hex, []

        def worker(i, barrier):
            barrier.wait()
            if rate_limit.hit(key, limit=7, window_seconds=600, db=self.workers[i % 2])[0]:
                allowed.append(i)
        run_threads(30, worker)
        self.assertEqual(len(allowed), 7)

    def reserve_race(self, users, cap_env):
        successes, denied = [], []

        def worker(i, barrier):
            with self.Sessions[i % 2]() as db:
                barrier.wait()
                try:
                    entry = ai_costs.reserve(db, user_id=users(i), operation="race", model="gpt-4.1-mini",
                                             input_units=10_000, output_units=1_000)  # 51 paise
                    db.commit()
                    successes.append(entry.id)
                except ai_costs.Denied as exc:
                    denied.append(exc.reason)
        with patch.dict(os.environ, cap_env):
            run_threads(30, worker)
        return successes, denied

    def test_concurrent_reservations_cannot_overspend_global_cap(self):
        successes, denied = self.reserve_race(lambda i: 1000 + i, {
            "AI_GLOBAL_DAILY_CAP_PAISE": str(51 * 12), "AI_GLOBAL_MAX_IN_FLIGHT": "1000"})
        self.assertEqual(len(successes), 12)
        self.assertEqual(set(denied), {"global_daily_cap"})
        with self.Sessions[1]() as db:
            counter = db.get(AiSpendCounter, f"global:{datetime.utcnow().date()}")
            self.assertEqual(counter.committed_paise, 51 * 12)
            self.assertTrue(ai_costs.reconcile(db, datetime.utcnow().date())["balanced"])

    def test_concurrent_reservations_for_one_user_respect_user_cap(self):
        successes, denied = self.reserve_race(lambda i: 1000, {
            "AI_USER_DAILY_CAP_PAISE": str(51 * 5), "AI_USER_MAX_IN_FLIGHT": "100"})
        self.assertEqual(len(successes), 5)
        self.assertEqual(set(denied), {"user_daily_cap"})

    def test_concurrency_limit_holds_across_workers(self):
        successes, denied = self.reserve_race(lambda i: 1001, {"AI_USER_MAX_IN_FLIGHT": "2"})
        self.assertEqual(len(successes), 2)
        self.assertEqual(set(denied), {"user_concurrency"})

    def test_synthetic_ledger_with_concurrent_reconciliation_balances(self):
        successes, _ = self.reserve_race(lambda i: 1000 + i % 5, {"AI_USER_MAX_IN_FLIGHT": "100",
                                                                   "AI_GLOBAL_MAX_IN_FLIGHT": "1000"})
        self.assertEqual(len(successes), 30)
        outcomes = ["charged", "charged_unreported", "none", "unknown", "leave"]

        def worker(i, barrier):
            # Threads i and i + 30 close the same entry at the same moment from different workers;
            # the counters must be adjusted exactly once.
            entry_id, outcome = successes[i % 30], outcomes[(i % 30) % 5]
            with self.Sessions[i // 30]() as db:
                barrier.wait()
                if outcome == "charged":
                    ai_costs.finish(db, entry_id, "charged", {"input_tokens": 3_000, "output_tokens": 500})
                elif outcome == "charged_unreported":
                    ai_costs.finish(db, entry_id, "charged", {})
                elif outcome in ("none", "unknown"):
                    ai_costs.finish(db, entry_id, outcome, failure_code="race")
                db.commit()
        run_threads(60, worker)
        with self.Sessions[0]() as db:
            report = ai_costs.reconcile(db, datetime.utcnow().date())
            statuses = [row[0] for row in db.query(AiCostEntry.status).all()]
        self.assertTrue(report["balanced"], report)
        self.assertEqual(report["counts"], {"reserved": 6, "settled": 12, "released": 6, "unknown": 6})
        # 6 x ceil(10.8 + 7.2) + 6 x 51 settled; 6 reserved + 6 unknown at 51 still committed.
        self.assertEqual(report["settled_paise"], 6 * 18 + 6 * 51)
        self.assertEqual(report["committed_paise"], 6 * 18 + 6 * 51 + 12 * 51)
        self.assertEqual(len(statuses), 30)
        print("\nR05 synthetic ledger reconciliation:", report)


if __name__ == "__main__":
    unittest.main()
