#!/usr/bin/env python3
import argparse
import os
import sys
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from config import get_settings  # noqa: E402


def is_default_secret(secret: str) -> bool:
    normalized = (secret or "").strip().lower()
    return normalized in {"", "your-secret-key-change-in-production", "changeme", "secret", "default"}


def main():
    parser = argparse.ArgumentParser(description="Validate local/pilot environment configuration.")
    parser.add_argument("--strict", action="store_true", help="Treat warnings as errors.")
    args = parser.parse_args()

    settings = get_settings()
    errors = []
    warnings = []
    app_env = settings.app_env_normalized

    if is_default_secret(settings.SECRET_KEY) or len(settings.SECRET_KEY.strip()) < 32:
        errors.append("SECRET_KEY must be set to a non-default value with at least 32 characters.")

    if not settings.MOCK_MODE and not settings.ANTHROPIC_API_KEY:
        errors.append("MOCK_MODE=false requires ANTHROPIC_API_KEY.")

    has_smtp_any = any([settings.SMTP_HOST, settings.SMTP_USER, settings.SMTP_PASSWORD, settings.SMTP_FROM])
    has_smtp_min = bool(settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD)
    if has_smtp_any and not has_smtp_min:
        errors.append("SMTP configuration is partial. Set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD together.")
    if not has_smtp_any and settings.is_production_like_env:
        errors.append(f"SMTP must be configured when APP_ENV={app_env}.")
    if not has_smtp_any and not settings.is_production_like_env:
        warnings.append("SMTP is not configured. Reminder emails will run in dry-run mode.")

    if not settings.admin_email_list and settings.is_production_like_env:
        errors.append(f"ADMIN_EMAILS must be set when APP_ENV={app_env}.")
    if not settings.admin_email_list and not settings.is_production_like_env:
        warnings.append("ADMIN_EMAILS is empty. No automatic admin bootstrap email is configured.")

    if settings.is_production_like_env and settings.should_expose_dev_auth_tokens:
        errors.append(f"EXPOSE_DEV_AUTH_TOKENS cannot be enabled when APP_ENV={app_env}.")

    if not settings.cors_origins_list:
        errors.append("CORS_ORIGINS is empty.")

    db_url = settings.DATABASE_URL
    if db_url.startswith("sqlite:///"):
        sqlite_path = db_url.replace("sqlite:///", "", 1)
        sqlite_file = (ROOT_DIR / sqlite_path).resolve() if not os.path.isabs(sqlite_path) else Path(sqlite_path)
        if not sqlite_file.parent.exists():
            errors.append(f"SQLite directory does not exist: {sqlite_file.parent}")
    else:
        warnings.append("Non-SQLite DATABASE_URL detected. Ensure credentials/network are available in your environment.")

    print("Environment validation report")
    print(f"- App env: {app_env}")
    print(f"- Strict mode: {'on' if args.strict else 'off'}")
    print(f"- Errors: {len(errors)}")
    print(f"- Warnings: {len(warnings)}")

    if warnings:
        print("\nWarnings:")
        for warning in warnings:
            print(f"  - {warning}")

    if errors:
        print("\nErrors:")
        for error in errors:
            print(f"  - {error}")
        return 1

    if args.strict and warnings:
        print("\nStrict mode failed due to warnings.")
        return 1

    print("\nEnvironment looks good.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
