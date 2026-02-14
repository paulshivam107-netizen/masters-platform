#!/usr/bin/env python3
import argparse
import shutil
import sqlite3
import sys
from datetime import datetime
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_DB_PATH = ROOT_DIR / "mba_platform.db"
DEFAULT_BACKUP_DIR = ROOT_DIR / "backups"


def ensure_sqlite_integrity(db_path: Path):
    if not db_path.exists():
        raise FileNotFoundError(f"Database file not found: {db_path}")
    with sqlite3.connect(db_path) as conn:
        row = conn.execute("PRAGMA integrity_check").fetchone()
        status = row[0] if row else "failed"
        if status != "ok":
            raise RuntimeError(f"SQLite integrity check failed for {db_path}: {status}")


def backup_db(db_path: Path, output_dir: Path, label: str):
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    backup_file = output_dir / f"{db_path.stem}-{label}-{timestamp}.sqlite3"
    shutil.copy2(db_path, backup_file)
    ensure_sqlite_integrity(backup_file)
    return backup_file


def restore_db(db_path: Path, backup_file: Path, force: bool):
    if not backup_file.exists():
        raise FileNotFoundError(f"Backup file not found: {backup_file}")
    if db_path.exists() and not force:
        raise RuntimeError(f"Refusing to overwrite existing DB without --force: {db_path}")
    db_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(backup_file, db_path)
    ensure_sqlite_integrity(db_path)


def run_drill(db_path: Path, output_dir: Path):
    label = "drill"
    backup_file = backup_db(db_path, output_dir, label=label)
    restore_target = output_dir / f"restore-drill-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}.sqlite3"
    restore_db(restore_target, backup_file, force=True)
    ensure_sqlite_integrity(restore_target)
    return backup_file, restore_target


def main():
    parser = argparse.ArgumentParser(description="SQLite backup/restore/drill utility for pilot environments.")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB_PATH, help="Path to sqlite database file.")
    parser.add_argument("--backup-dir", type=Path, default=DEFAULT_BACKUP_DIR, help="Directory for backup artifacts.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    backup_parser = subparsers.add_parser("backup", help="Create a verified backup.")
    backup_parser.add_argument("--label", default="manual", help="Backup label.")

    restore_parser = subparsers.add_parser("restore", help="Restore database from a backup.")
    restore_parser.add_argument("--from", dest="backup_file", type=Path, required=True, help="Backup file to restore from.")
    restore_parser.add_argument("--force", action="store_true", help="Allow overwriting the target DB file.")

    subparsers.add_parser("drill", help="Run backup+restore verification drill into backup dir.")

    args = parser.parse_args()
    db_path = args.db.resolve()
    backup_dir = args.backup_dir.resolve()

    try:
        if args.command == "backup":
            backup_file = backup_db(db_path, backup_dir, label=args.label)
            print(f"Backup created: {backup_file}")
            return 0
        if args.command == "restore":
            restore_db(db_path, args.backup_file.resolve(), force=args.force)
            print(f"Database restored to: {db_path}")
            return 0
        if args.command == "drill":
            backup_file, restore_target = run_drill(db_path, backup_dir)
            print(f"Drill backup: {backup_file}")
            print(f"Drill restore copy: {restore_target}")
            return 0
        raise RuntimeError(f"Unknown command: {args.command}")
    except Exception as exc:
        print(f"Operation failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
