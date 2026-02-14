import time
from collections import defaultdict, deque
from threading import Lock
from typing import Optional

from fastapi import HTTPException, Request, status


class InMemoryRateLimiter:
    def __init__(self):
        self._events = defaultdict(deque)
        self._lock = Lock()

    def allow(self, key: str, limit: int, window_seconds: int) -> tuple[bool, int]:
        now = time.time()
        window_start = now - window_seconds
        with self._lock:
            queue = self._events[key]
            while queue and queue[0] <= window_start:
                queue.popleft()
            if len(queue) >= limit:
                retry_after = max(1, int(queue[0] + window_seconds - now))
                return False, retry_after
            queue.append(now)
        return True, 0


rate_limiter = InMemoryRateLimiter()


def build_rate_limit_key(
    request: Request,
    action: str,
    user_id: Optional[int] = None,
    email: Optional[str] = None
) -> str:
    ip = (request.client.host if request.client else "unknown").strip().lower()
    if user_id is not None:
        actor = f"user:{user_id}"
    elif email:
        actor = f"email:{email.strip().lower()}"
    else:
        actor = f"ip:{ip}"
    return f"{action}:{actor}"


def enforce_rate_limit(request: Request, *, action: str, limit: int, window_seconds: int, user_id: Optional[int] = None, email: Optional[str] = None):
    key = build_rate_limit_key(request, action=action, user_id=user_id, email=email)
    allowed, retry_after = rate_limiter.allow(key, limit=limit, window_seconds=window_seconds)
    if allowed:
        return
    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail=f"Rate limit exceeded for {action}. Try again in {retry_after} seconds.",
        headers={"Retry-After": str(retry_after)},
    )
