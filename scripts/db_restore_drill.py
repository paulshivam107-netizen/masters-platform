#!/usr/bin/env python3
"""PostgreSQL backup -> encrypted dump -> restore drill (R06).

Restores an encrypted logical backup into a *scratch* database and proves it is usable:
schema at head with no drift, row counts per table match the source, per-user ownership
queries return the same answers, the AI-cost ledger reconciles, sequences continue (new rows
get fresh ids) and account export/deletion still work. The scratch database is always dropped.

Synthetic mode (default; safe on any disposable server):
    DRILL_ADMIN_URL=postgresql://postgres:pw@127.0.0.1:5433/postgres python scripts/db_restore_drill.py
  Creates a uniquely named source DB, migrates and seeds two synthetic users, backs it up with
  scripts/db_backup_pg.sh, restores into a second uniquely named DB, verifies, drops both.

Real backup mode (e.g. monthly restore test of production backups):
    DRILL_ADMIN_URL=... BACKUP_ENCRYPTION_KEY=... \
      python scripts/db_restore_drill.py --dump backups/pg/<file>.dump.enc [--source-url <db url>]
  Restores the given file into a scratch DB on DRILL_ADMIN_URL's server (use a Neon branch or a
  local server, never the production database) and verifies schema and ownership queries. With
  --source-url, row counts are also compared against that database (only meaningful if it has
  not changed since the dump). Prints counts only, never row content.

Exit status 0 = drill passed. Output is safe to paste into evidence (no secrets, no content).
"""
from __future__ import annotations

import argparse
import json
import os
import secrets
import subprocess
import sys
import tempfile
import uuid
from datetime import date, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
os.environ.setdefault("SECRET_KEY", "restore-drill-secret-key-not-used-for-anything-123")

from sqlalchemy import create_engine, func, inspect, pool, text  # noqa: E402
from sqlalchemy.engine import make_url  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

OWNED = ("applications", "essays", "interview_sessions", "resume_question_sets", "pilot_feedback",
         "refresh_tokens", "auth_tokens")


def admin_engine(url):
    return create_engine(url, isolation_level="AUTOCOMMIT", poolclass=pool.NullPool)


def create_db(admin_url, name):
    with admin_engine(admin_url).connect() as conn:
        conn.execute(text(f'CREATE DATABASE "{name}"'))
    return make_url(admin_url).set(database=name).render_as_string(hide_password=False)


def drop_db(admin_url, name):
    with admin_engine(admin_url).connect() as conn:
        conn.execute(text(f'DROP DATABASE IF EXISTS "{name}" WITH (FORCE)'))


def seed(url):
    """Two synthetic users with content in every user-owned table plus cost ledger rows."""
    from services.schema import migrate_to_head
    from models import (AdminEvent, ApplicationTracker, Essay, InterviewOperation, InterviewQuota,
                        InterviewSession, PilotFeedback, ResumeQuestionSet, User)

    engine = create_engine(url, poolclass=pool.NullPool)
    migrate_to_head(engine)
    with Session(engine) as db:
        for n, email in enumerate(("drill-a@example.test", "drill-b@example.test"), start=1):
            user = User(email=email, name=f"Drill {n}", hashed_password=None, role="user")
            db.add(user)
            db.flush()
            app = ApplicationTracker(user_id=user.id, school_name=f"School {n}", program_name="MBA",
                                     deadline=date(2027, 1, n))
            db.add(app)
            db.flush()
            for v in range(n + 1):
                db.add(Essay(user_id=user.id, school_name=f"School {n}", program_type="MBA", essay_prompt="Why?",
                             essay_content=f"synthetic essay {n}.{v}", application_id=app.id))
            sid = str(uuid.uuid4())
            db.add(InterviewSession(id=sid, user_id=user.id, create_request_id=str(uuid.uuid4()),
                                    create_fingerprint="0" * 64, context_json="{}", provider="demo", mode="text",
                                    question_limit=3, transcript_json="[]"))
            db.flush()
            db.add(InterviewOperation(id=str(uuid.uuid4()), session_id=sid, request_id=str(uuid.uuid4()),
                                      kind="answer", fingerprint="0" * 64, status="succeeded", result_json="{}",
                                      usage_json=json.dumps({"model": "drill-model", "input_tokens": 100 * n,
                                                             "output_tokens": 10 * n})))
            db.add(ResumeQuestionSet(id=str(uuid.uuid4()), user_id=user.id, request_id=str(uuid.uuid4()),
                                     fingerprint="0" * 64, context_json="{}", questions_json="[]", status="completed",
                                     usage_json=json.dumps({"model": "drill-model", "input_tokens": 7})))
            db.add(PilotFeedback(user_id=user.id, message=f"synthetic feedback {n}"))
            db.add(AdminEvent(user_id=user.id, event_name="view_home", payload_json="{}"))
            db.add(InterviewQuota(id=f"ai:user:{user.id}:2026-10-15", calls=n))
        db.add(InterviewQuota(id="ai:global:2026-10-15", calls=3))
        db.commit()
    engine.dispose()


def snapshot(url):
    """Counts per table, per-user ownership answers and the usage ledger total."""
    engine = create_engine(url, poolclass=pool.NullPool)
    out = {"tables": {}, "ownership": {}, "usage_tokens": 0}
    with engine.connect() as conn:
        for table in sorted(inspect(conn).get_table_names()):
            out["tables"][table] = conn.execute(text(f'SELECT count(*) FROM "{table}"')).scalar()
        for email, uid in conn.execute(text("SELECT email, id FROM users ORDER BY id")):
            key = f"user#{uid}"
            out["ownership"][key] = {t: conn.execute(text(f'SELECT count(*) FROM "{t}" WHERE user_id = :u'), {"u": uid}).scalar()
                                     for t in OWNED}
            out["ownership"][key]["interview_operations"] = conn.execute(text(
                "SELECT count(*) FROM interview_operations o JOIN interview_sessions s ON s.id = o.session_id "
                "WHERE s.user_id = :u"), {"u": uid}).scalar()
        for (raw,) in conn.execute(text(
                "SELECT usage_json FROM interview_operations WHERE usage_json IS NOT NULL UNION ALL "
                "SELECT usage_json FROM resume_question_sets WHERE usage_json IS NOT NULL")):
            try:
                usage = json.loads(raw)
                out["usage_tokens"] += int(usage.get("input_tokens", 0)) + int(usage.get("output_tokens", 0))
            except (ValueError, TypeError, AttributeError):
                pass
    engine.dispose()
    return out


def run_backup(source_url, out_dir, key):
    env = dict(os.environ, BACKUP_DATABASE_URL=source_url, BACKUP_ENCRYPTION_KEY=key)
    subprocess.run(["bash", str(ROOT / "scripts" / "db_backup_pg.sh"), out_dir], check=True, env=env,
                   stdout=subprocess.DEVNULL)
    dumps = sorted(Path(out_dir).glob("*.dump.enc"))
    if not dumps:
        raise SystemExit("backup produced no file")
    return dumps[-1]


def restore(dump, target_url, key):
    env = dict(os.environ, BACKUP_ENCRYPTION_KEY=key)
    dec = subprocess.Popen(["openssl", "enc", "-d", "-aes-256-cbc", "-pbkdf2", "-iter", "200000",
                            "-pass", "env:BACKUP_ENCRYPTION_KEY", "-in", str(dump)], stdout=subprocess.PIPE, env=env)
    res = subprocess.run(["pg_restore", "--no-owner", "--no-privileges", "--exit-on-error",
                          "--dbname", target_url], stdin=dec.stdout, env=env)
    dec.stdout.close()
    if dec.wait() != 0 or res.returncode != 0:
        raise SystemExit("restore failed (wrong key or corrupt archive?)")


def verify_restored(url):
    """Checks that do not depend on the source: schema, sequences, export/delete work."""
    from services.account_data import build_export, delete_account
    from services.schema import schema_drift
    from models import Essay, User

    checks = {}
    engine = create_engine(url, poolclass=pool.NullPool)
    checks["schema_drift"] = len(schema_drift(engine))
    with Session(engine) as db:
        users = db.query(User).order_by(User.id).all()
        if len(users) >= 2:
            a, b = users[0], users[1]
            export = json.dumps(build_export(db, a))
            checks["export_isolated"] = b.email not in export and a.email in export
            new = Essay(user_id=b.id, school_name="Post-restore", program_type="MBA", essay_prompt="Why?",
                        essay_content="new row after restore")
            db.add(new)
            db.commit()
            checks["sequence_continues"] = new.id > db.query(func.max(Essay.id)).filter(Essay.id != new.id).scalar()
            a_id, b_id = a.id, b.id
            delete_account(db, a)
            db.expire_all()
            checks["delete_account_ok"] = (db.query(User).filter(User.id == a_id).count() == 0
                                           and db.query(Essay).filter(Essay.user_id == a_id).count() == 0
                                           and db.query(Essay).filter(Essay.user_id == b_id).count() > 0)
    engine.dispose()
    return checks


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dump", help="existing encrypted dump to restore (default: synthetic source)")
    parser.add_argument("--source-url", help="database the dump came from, for row-count comparison")
    parser.add_argument("--keep", action="store_true", help="do not drop the scratch database (debugging)")
    args = parser.parse_args()
    admin_url = os.environ.get("DRILL_ADMIN_URL") or os.environ.get("TEST_POSTGRES_ADMIN_URL")
    if not admin_url:
        raise SystemExit("set DRILL_ADMIN_URL to a server where you may create scratch databases")

    tag = uuid.uuid4().hex[:8]
    source_name, scratch_name = f"drill_src_{tag}", f"drill_restore_{tag}"
    created = []
    started = datetime.utcnow()
    try:
        with tempfile.TemporaryDirectory() as tmp:
            if args.dump:
                key = os.environ.get("BACKUP_ENCRYPTION_KEY") or sys.exit("set BACKUP_ENCRYPTION_KEY")
                dump, source_url = Path(args.dump), args.source_url
            else:
                key = secrets.token_urlsafe(32)
                source_url = create_db(admin_url, source_name)
                created.append(source_name)
                seed(source_url)
                dump = run_backup(source_url, tmp, key)
            scratch_url = create_db(admin_url, scratch_name)
            created.append(scratch_name)
            restore(dump, scratch_url, key)

            restored = snapshot(scratch_url)
            report = {"mode": "dump" if args.dump else "synthetic", "dump_bytes": dump.stat().st_size,
                      "restored_tables": restored["tables"], "restored_usage_tokens": restored["usage_tokens"]}
            ok = True
            if source_url:
                source = snapshot(source_url)
                report["row_counts_match"] = source["tables"] == restored["tables"]
                report["ownership_match"] = source["ownership"] == restored["ownership"]
                report["usage_ledger_match"] = source["usage_tokens"] == restored["usage_tokens"]
                ok &= report["row_counts_match"] and report["ownership_match"] and report["usage_ledger_match"]
            report["ownership_per_user"] = restored["ownership"]
            report["post_restore_checks"] = verify_restored(scratch_url)
            checks = report["post_restore_checks"]
            ok &= checks["schema_drift"] == 0 and all(v for k, v in checks.items() if k != "schema_drift")
            report["seconds"] = round((datetime.utcnow() - started).total_seconds(), 1)
            report["result"] = "PASS" if ok else "FAIL"
            print(json.dumps(report, indent=2, sort_keys=True))
            return 0 if ok else 1
    finally:
        if not args.keep:
            for name in created:
                drop_db(admin_url, name)


if __name__ == "__main__":
    sys.exit(main())
