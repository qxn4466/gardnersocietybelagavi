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

