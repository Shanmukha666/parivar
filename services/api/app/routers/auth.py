from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Any, List
from passlib.context import CryptContext
try:
    import jwt
    JWTError = jwt.PyJWTError
except ImportError:
    from jose import JWTError, jwt
from datetime import datetime, timedelta

from app.database import get_db
from app.models.models import User
from app.schemas.schemas import UserLogin, TokenResponse
from app.config import settings
from app.core.supabase_auth import decode_token as decode_supabase_token, to_user as to_supabase_user

router = APIRouter()

SECRET_KEY = settings.JWT_SECRET
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    if settings.AUTH_PROVIDER == "supabase":
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Use Supabase Auth for staff login")

    stmt = select(User).where(User.email == data.email)
    result = await db.execute(stmt)
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

    if not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

    token = create_access_token({"sub": user.email, "role": user.role, "id": user.id})
    return {"access_token": token, "token_type": "bearer"}

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if settings.AUTH_PROVIDER == "supabase":
        return to_supabase_user(decode_supabase_token(token), token)

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    stmt = select(User).where(User.email == email)
    result = await db.execute(stmt)
    user = result.scalars().first()
    if user is None:
        raise credentials_exception
    return user

def require_role(allowed_roles: List[str]):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted"
            )
        return current_user
    return role_checker


import uuid as _uuid

class AnonymousUser:
    """Dummy user for anonymous/demo access."""
    def __init__(self):
        self.id = _uuid.UUID("00000000-0000-0000-0000-000000000000")
        self.email = "anonymous@demo"
        self.role = "family"


async def family_user(token: str = Depends(OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)), db: AsyncSession = Depends(get_db)):
    """Allow anonymous access for hackathon demo; authenticate if token provided."""
    if not token:
        return AnonymousUser()
    try:
        return await get_current_user(token, db)
    except HTTPException:
        return AnonymousUser()

@router.get("/me")
async def get_me(current_user: Any = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": getattr(current_user, "email", None),
        "role": current_user.role
    }
