from collections import defaultdict, deque
from time import monotonic
from fastapi import HTTPException, status

_WINDOW_SECONDS = 60
_MAX_REQUESTS = 30
_requests: dict[str, deque[float]] = defaultdict(deque)

def enforce_rate_limit(identity: str, limit: int = _MAX_REQUESTS) -> None:
    now = monotonic()
    bucket = _requests[identity]
    while bucket and now - bucket[0] > _WINDOW_SECONDS:
        bucket.popleft()
    if len(bucket) >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again shortly.",
            headers={"Retry-After": str(_WINDOW_SECONDS)},
        )
    bucket.append(now)
