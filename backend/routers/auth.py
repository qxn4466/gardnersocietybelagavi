from datetime import datetime, timedelta, timezone
from hashlib import sha256
from secrets import token_urlsafe

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from database import get_db
from models import LoginSession, User
from passwords import hash_password, verify_password
from schemas import LoginRequest, LoginResponse, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])
bearer = HTTPBearer(auto_error=False)


def require_session(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> LoginSession:
    if credentials:
        session = db.get(LoginSession, sha256(credentials.credentials.encode()).hexdigest())
        if session and session.expires_at > datetime.now(timezone.utc).replace(tzinfo=None):
            return session
    raise HTTPException(status_code=401, detail="Please sign in again", headers={"WWW-Authenticate": "Bearer"})


def require_user(
    session: LoginSession = Depends(require_session),
    db: Session = Depends(get_db),
) -> User:
    user = db.get(User, session.user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Please sign in again")
    return user


def require_transaction_user(user: User = Depends(require_user)) -> User:
    if user.role not in {"ACCOUNTS", "CASHIER"}:
        raise HTTPException(status_code=403, detail="Accountant or cashier access required")
    return user


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(username=payload.username.strip()).first()
    password = payload.password.strip()
    if not user or not verify_password(password, user.password) or (
        user.role == "CASHIER" and password == "pass123"
    ):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    # Upgrade existing credentials without requiring users to change their password.
    if user.password == password:
        user.password = hash_password(password)

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=12)
    token = token_urlsafe(32)
    db.query(LoginSession).filter(LoginSession.expires_at <= now.replace(tzinfo=None)).delete()
    db.add(LoginSession(token_hash=sha256(token.encode()).hexdigest(), user_id=user.id,
                        expires_at=expires_at.replace(tzinfo=None)))
    db.commit()
    return LoginResponse(
        **UserOut.model_validate(user).model_dump(),
        access_token=token,
        expires_at=expires_at,
    )


@router.post("/logout", status_code=204)
def logout(session: LoginSession = Depends(require_session), db: Session = Depends(get_db)):
    db.delete(session)
    db.commit()
    return Response(status_code=204)
