from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models import EditLock
from schemas import EditLockRequest, EditLockStatus

router = APIRouter(prefix="/edit-locks", tags=["edit-locks"])

TTL_SECONDS = 300  # a stale lease can be taken over after 5 minutes


def _utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _find(db, entity_type: str, entity_id: int):
    return db.query(EditLock).filter(
        EditLock.entity_type == entity_type,
        EditLock.entity_id == entity_id,
    ).first()


@router.post("/acquire", response_model=EditLockStatus)
def acquire_edit_lock(payload: EditLockRequest, db: Session = Depends(get_db)):
    """Try to become THE editor of a record. Returns locked=True (blocked) when
    another member holds a fresh lease; a stale (5 min) lease is taken over."""
    now = _utcnow()
    row = _find(db, payload.entity_type, payload.entity_id)

    if row is None:
        row = EditLock(
            entity_type=payload.entity_type,
            entity_id=payload.entity_id,
            locked_by=payload.locked_by,
            locked_at=now,
        )
        db.add(row)
        try:
            db.commit()
        except IntegrityError:
            # another worker created it in the same instant — re-read and evaluate
            db.rollback()
            row = _find(db, payload.entity_type, payload.entity_id)
            if row is None:
                raise HTTPException(status_code=500, detail="Could not create edit lock")

    if row.locked_by == payload.locked_by:
        row.locked_at = now
        db.commit()
        return EditLockStatus(locked=False, locked_by=payload.locked_by,
                              locked_at=row.locked_at, seconds_remaining=TTL_SECONDS)

    age = (now - row.locked_at).total_seconds() if row.locked_at else TTL_SECONDS + 1
    if age > TTL_SECONDS:
        row.locked_by = payload.locked_by
        row.locked_at = now
        db.commit()
        return EditLockStatus(locked=False, locked_by=payload.locked_by,
                              locked_at=row.locked_at, seconds_remaining=TTL_SECONDS)

    return EditLockStatus(locked=True, locked_by=row.locked_by, locked_at=row.locked_at,
                          seconds_remaining=max(0, TTL_SECONDS - int(age)))


@router.post("/release", response_model=EditLockStatus)
def release_edit_lock(payload: EditLockRequest, db: Session = Depends(get_db)):
    """Release your own lease (called on save/cancel). Another member's lease is not touched."""
    row = _find(db, payload.entity_type, payload.entity_id)
    if row and row.locked_by == payload.locked_by:
        db.delete(row)
        db.commit()
    return EditLockStatus(locked=False, locked_by=payload.locked_by,
                          locked_at=None, seconds_remaining=0)
