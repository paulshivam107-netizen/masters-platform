"""Shared, database-backed request throttling (R05).

Counters live in ``rate_limit_buckets`` so every worker and replica enforces the same limits.
Each check is one atomic ``INSERT .. ON CONFLICT DO UPDATE .. WHERE count < cap RETURNING``
(PostgreSQL and SQLite), run on its own short connection so a later rollback of the request's
transaction (for example a failed login) never refunds the attempt.

Windows are fixed but smoothed with the previous window's weighted count, which avoids a 2x burst
at window boundaries. Keys are hashed: no raw e-mail address or IP is stored. Expired rows are
purged in bounded batches.

Client IP: only ``TRUSTED_PROXY_HOPS`` proxies are trusted. With N > 0 the client is the N-th
entry from the right of X-Forwarded-For (entries a client adds itself sit further left and are
ignored). uvicorn's ``--forwarded-allow-ips='*'`` takes the *leftmost* entry, which a client
controls, so the socket peer seen by the app is never used when N > 0.
"""
import hashlib
import ipaddress
import time
from datetime import datetime, timedelta
from typing import Optional

from fastapi import HTTPException, Request, status
from sqlalchemy import delete, select

from config import get_settings
from models import RateLimitBucket

# An address shared by many legitimate people (campus, office, mobile NAT) gets more headroom
# than one account or mailbox, but a single address cannot spray unlimited accounts.
IP_LAYER_MULTIPLIER = 5
PURGE_INTERVAL_SECONDS = 60
PURGE_BATCH = 1000
_last_purge = 0.0
TABLE = RateLimitBucket.__table__


def _engine(db=None):
    if db is not None:
        return db.get_bind() if hasattr(db, "get_bind") else db  # a Session or an Engine
    from database import engine
    return engine


def _insert(dialect: str):
    if dialect == "postgresql":
        from sqlalchemy.dialects.postgresql import insert
    elif dialect == "sqlite":
        from sqlalchemy.dialects.sqlite import insert
    else:  # pragma: no cover - only PostgreSQL and SQLite are supported
        raise RuntimeError(f"Unsupported database for rate limiting: {dialect}")
    return insert


def _normalise_ip(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    value = value.strip().strip('"')
    if value.startswith("[") and "]" in value:  # "[2001:db8::1]:443"
        value = value[1:value.index("]")]
    elif value.count(":") == 1:  # "203.0.113.9:5123"
        value = value.split(":", 1)[0]
    try:
        address = ipaddress.ip_address(value)
    except ValueError:
        return None
    if address.version == 6 and address.ipv4_mapped:
        address = address.ipv4_mapped
    if address.version == 6:
        # One subscriber normally controls a whole /64; per-address limits would be trivial to evade.
        return str(ipaddress.ip_network(f"{address}/64", strict=False))
    return str(address)


def client_ip(request: Request) -> str:
    """The client address according to the explicitly trusted proxy chain."""
    hops = max(0, int(get_settings().TRUSTED_PROXY_HOPS or 0))
    if hops:
        chain = [part.strip() for header in request.headers.getlist("x-forwarded-for")
                 for part in header.split(",") if part.strip()]
        if len(chain) >= hops:
            return _normalise_ip(chain[-hops]) or "invalid"
        # Fewer entries than trusted proxies: the request bypassed the proxy. Its socket peer may
        # already be rewritten by uvicorn, so it is grouped rather than trusted.
        return "unproxied"
    return _normalise_ip(request.client.host if request.client else None) or "unknown"


def _digest(value: str) -> str:
    secret = (get_settings().SECRET_KEY or "").encode()
    return hashlib.blake2b(value.encode(), key=secret[:64], digest_size=16).hexdigest()


def _purge(conn, now: datetime) -> None:
    global _last_purge
    if time.monotonic() - _last_purge < PURGE_INTERVAL_SECONDS:
        return
    _last_purge = time.monotonic()
    expired = select(TABLE.c.id).where(TABLE.c.expires_at < now).limit(PURGE_BATCH).scalar_subquery()
    conn.execute(delete(TABLE).where(TABLE.c.id.in_(expired)))


def purge_expired(db=None) -> int:
    """Delete every expired bucket (maintenance/tests). Normal traffic purges in small batches."""
    with _engine(db).begin() as conn:
        return conn.execute(delete(TABLE).where(TABLE.c.expires_at < datetime.utcnow())).rowcount


def reset_rate_limits(db=None) -> None:
    """Remove all buckets. For tests and owner maintenance only."""
    _memory.clear()
    with _engine(db).begin() as conn:
        conn.execute(delete(TABLE))


def hit(key: str, *, limit: int, window_seconds: int, db=None, now: Optional[float] = None) -> tuple[bool, int]:
    """Count one event for ``key``. Returns (allowed, retry_after_seconds). Denied events are not counted."""
    now = time.time() if now is None else now
    window = int(now // window_seconds)
    elapsed = (now - window * window_seconds) / window_seconds
    retry_after = max(1, int((window + 1) * window_seconds - now))
    base = f"{key[:120]}:"
    current_id, previous_id = base + str(window), base + str(window - 1)
    expires = datetime.utcfromtimestamp((window + 2) * window_seconds)
    engine = _engine(db)
    with engine.begin() as conn:
        previous = conn.execute(select(TABLE.c.count).where(TABLE.c.id == previous_id)).scalar() or 0
        cap = limit - int(previous * (1 - elapsed))
        if cap <= 0:
            return False, retry_after
        insert = _insert(conn.dialect.name)
        statement = insert(TABLE).values(id=current_id, count=1, expires_at=expires)
        statement = statement.on_conflict_do_update(
            index_elements=[TABLE.c.id], set_={"count": TABLE.c.count + 1}, where=TABLE.c.count < cap,
        ).returning(TABLE.c.count)
        allowed = conn.execute(statement).first() is not None
        _purge(conn, datetime.utcfromtimestamp(now))
    return allowed, (0 if allowed else retry_after)


_memory = {}


def hit_memory(key, *, limit, window_seconds):
    """Per-process fixed-window counter for cheap reads. Not shared between workers (each allows ``limit``)."""
    window = int(time.time() // window_seconds)
    if len(_memory) > 10000:
        _memory.clear()
    count = _memory.get(key, (window, 0))
    count = count[1] if count[0] == window else 0
    if count >= limit:
        return False, max(1, int((window + 1) * window_seconds - time.time()))
    _memory[key] = (window, count + 1)
    return True, 0


def rate_limit_layers(request: Request, action: str, limit: int, user_id=None, email=None, ip_limit=None):
    ip = client_ip(request)
    if user_id is None and not email:
        return [(f"{action}:ip:{_digest(ip)}", limit)]
    account = f"user:{user_id}" if user_id is not None else "email:" + _digest(email.strip().lower())
    return [
        (f"{action}:ip:{_digest(ip)}", ip_limit or limit * IP_LAYER_MULTIPLIER),
        (f"{action}:{account}", limit),
    ]


def enforce_rate_limit(request: Request, *, action: str, limit: int, window_seconds: int,
                       user_id: Optional[int] = None, email: Optional[str] = None,
                       ip_limit: Optional[int] = None, db=None, memory=False):
    """Apply the IP layer and (when known) the account/e-mail layer; raise 429 when either is spent."""
    for key, cap in rate_limit_layers(request, action, limit, user_id, email, ip_limit):
        allowed, retry_after = (hit_memory(key, limit=cap, window_seconds=window_seconds) if memory else
                                hit(key, limit=cap, window_seconds=window_seconds, db=db))
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded for {action}. Try again in {retry_after} seconds.",
                headers={"Retry-After": str(retry_after)},
            )
