from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

ASYMMETRIC_ALGS = ["ES256", "RS256"]
LEGACY_ALGS = ["HS256"]
VALID_ROLES = {"family", "counsellor", "admin"}
_bearer = HTTPBearer(auto_error=False)

@dataclass(frozen=True)
class CurrentUser:
    id: str
    role: str
    is_anonymous: bool
    token: str

def _settings() -> tuple[str, str | None]:
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    if not url:
        raise RuntimeError("SUPABASE_URL is not set")
    return url, os.environ.get("SUPABASE_JWT_SECRET") or None

@lru_cache(maxsize=1)
def _jwks_client() -> PyJWKClient:
    url, _ = _settings()
    return PyJWKClient(f"{url}/auth/v1/.well-known/jwks.json", cache_keys=True, lifespan=600)

def _unauthorized(detail: str = "Invalid or expired token") -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, detail, headers={"WWW-Authenticate": "Bearer"})

def decode_token(token: str) -> dict:
    url, legacy_secret = _settings()
    try:
        algorithm = jwt.get_unverified_header(token).get("alg")
        common = dict(audience="authenticated", issuer=f"{url}/auth/v1", options={"require": ["exp", "sub", "aud", "iss"]})
        if algorithm in ASYMMETRIC_ALGS:
            key = _jwks_client().get_signing_key_from_jwt(token).key
            return jwt.decode(token, key, algorithms=ASYMMETRIC_ALGS, **common)
        if algorithm in LEGACY_ALGS and legacy_secret:
            return jwt.decode(token, legacy_secret, algorithms=LEGACY_ALGS, **common)
    except jwt.PyJWTError:
        raise _unauthorized()
    except Exception:
        raise _unauthorized("Authentication service unavailable")
    raise _unauthorized()

def to_user(claims: dict, token: str) -> CurrentUser:
    role = (claims.get("app_metadata") or {}).get("role", "family")
    if role not in VALID_ROLES:
        role = "family"
    return CurrentUser(claims["sub"], role, bool(claims.get("is_anonymous", False)), token)

async def get_current_user(creds: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> CurrentUser:
    if creds is None or creds.scheme.lower() != "bearer":
        raise _unauthorized("Missing bearer token")
    return to_user(decode_token(creds.credentials), creds.credentials)

def require_role(*roles: str):
    async def dependency(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient permissions")
        return user
    return dependency

family_user = require_role("family")
counsellor_user = require_role("counsellor")
admin_user = require_role("admin")
