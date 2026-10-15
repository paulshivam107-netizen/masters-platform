# Production API image (also used for local docker-compose development).
#
# Release flow on any container host (Railway, Render, Fly...):
#   1. pre-deploy / release command:  python manage_db.py      (MIGRATION_DATABASE_URL = owner)
#   2. start (this CMD), healthcheck:  GET /health/db            (DATABASE_URL = runtime role)
# The API refuses to start in pilot/staging/production if migrations have not run.
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# psycopg2-binary ships its own libpq, so no compiler or system packages are needed.
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# Run as an unprivileged user; the app never needs to write to its own code directory.
RUN useradd --system --uid 10001 --home /app app && chown -R app /app
USER app

EXPOSE 8000

# One worker per container until shared rate limiting lands (R05): the auth limiter is
# in-process. --proxy-headers trusts the platform proxy for the client IP and scheme.
# Graceful shutdown lets in-flight requests finish during a redeploy.
CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*' --timeout-graceful-shutdown 20 --no-server-header"]
