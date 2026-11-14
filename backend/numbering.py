# -*- coding: utf-8 -*-
"""Concurrency-safe numbering: cross-worker advisory lock + exists-check bumps."""
from sqlalchemy import text


def acquire_numbering_lock(db) -> None:
    """Hold a transaction-scoped Postgres advisory lock so two workers never allocate
    the same serial at the same moment. Released automatically when the endpoint
    commits/rolls back. No-op on SQLite (single writer)."""
    try:
        if db.get_bind().dialect.name == "postgresql":
            db.execute(text("SELECT pg_advisory_xact_lock(hashtext('bgs_numbering'))"))
    except Exception:
        pass  # never block the business flow because of the lock itself


def ensure_free(db, model, column, value, regenerate, max_tries: int = 60):
    """Bump `value` through regenerate() while it already exists in model.column.
    Call while holding the numbering lock — then the result is guaranteed free."""
    tries = 0
    while value is not None and db.query(model.id).filter(column == value).first() is not None:
        if regenerate is None or tries >= max_tries:
            break
        value = regenerate()
        tries += 1
    return value


# ─── Preview number reservations ──────────────────────────────────────────────
from datetime import datetime, timezone, timedelta
from sqlalchemy.exc import IntegrityError
from models import NumberReservation

RESERVATION_TTL_MINUTES = 20


def _utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def reserve_sequential(db, kind: str, session_id: str, start: str, is_taken=None, max_tries: int = 500) -> str:
    """Return the next free number for `kind` and reserve it for this browser session.

    Considers real records (is_taken) and other sessions' unexpired reservations, so two
    members clicking Generate never see the same number. Race-safe via the unique
    (kind, number) constraint + retry — no lock needed."""
    try:
        expiry = _utcnow() - timedelta(minutes=RESERVATION_TTL_MINUTES)
        db.query(NumberReservation).filter(NumberReservation.created_at < expiry).delete(synchronize_session=False)
        db.commit()
    except Exception:
        db.rollback()

    digits = start.isdigit()
    n = int(start) if digits else 0
    width = len(start) if digits else 4

    for _ in range(max_tries):
        candidate = str(n).zfill(width) if digits else str(n)
        n += 1

        if is_taken and is_taken(candidate):
            continue

        held = db.query(NumberReservation).filter(
            NumberReservation.kind == kind,
            NumberReservation.number == candidate,
        ).first()
        if held is not None:
            if (held.session_id or "") == (session_id or ""):
                return candidate        # same browser pressing Generate again — same number is fine
            continue                    # reserved by someone else — take the next

        try:
            db.add(NumberReservation(
                kind=kind,
                number=candidate,
                session_id=session_id or "anon",
                created_at=_utcnow(),
            ))
            db.commit()
            return candidate
        except IntegrityError:
            db.rollback()               # raced with another request — try the next number

    return str(n).zfill(width) if digits else str(n)
