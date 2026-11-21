"""Run with the backend environment to set the cashier's private password."""

from getpass import getpass
import os

from database import Base, SessionLocal, engine
from models import LoginSession, User
from passwords import hash_password


def main():
    configured_url = os.getenv("DATABASE_URL", "").strip()
    if configured_url and not configured_url.startswith("sqlite") and engine.dialect.name == "sqlite":
        raise SystemExit("The configured database is unavailable. No account was changed.")

    password = getpass("Cashier password (at least 14 characters): ")
    if len(password) < 14 or password != password.strip():
        raise SystemExit("Use at least 14 characters with no leading or trailing whitespace.")
    if password != getpass("Confirm cashier password: "):
        raise SystemExit("Passwords do not match.")

    Base.metadata.create_all(bind=engine)
    with SessionLocal.begin() as db:
        user = db.query(User).filter_by(username="cashier").first()
        if user is None:
            user = User(username="cashier", full_name="Society Cashier", role="CASHIER")
            db.add(user)
        elif user.role != "CASHIER":
            raise SystemExit("The username cashier belongs to another role.")
        else:
            db.query(LoginSession).filter_by(user_id=user.id).delete()
        user.password = hash_password(password)
    print("Cashier login is ready. Username: cashier")


if __name__ == "__main__":
    main()
