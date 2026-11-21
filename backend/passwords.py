from base64 import urlsafe_b64encode
from hashlib import pbkdf2_hmac
from hmac import compare_digest
from secrets import token_hex


def hash_password(password: str, salt: str | None = None) -> str:
    salt = salt or token_hex(16)
    digest = pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 600_000)
    return f"pbkdf2${salt}${urlsafe_b64encode(digest).decode()}"


def verify_password(password: str, stored: str) -> bool:
    if stored.startswith("pbkdf2$"):
        _, salt, _ = stored.split("$", 2)
        return compare_digest(hash_password(password, salt), stored)
    return compare_digest(password.encode(), stored.encode())
