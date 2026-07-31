from fastapi import Header, HTTPException

from .config import get_settings


def require_internal_secret(x_internal_secret: str | None = Header(default=None)) -> None:
    expected = get_settings().internal_secret
    if expected and x_internal_secret != expected:
        raise HTTPException(status_code=401, detail="Invalid internal service secret.")
