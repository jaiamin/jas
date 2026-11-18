import os
from urllib.parse import urlparse

DEFAULT_GALLERY_ORIGIN = "https://gallery-production-b7633fcd.up.railway.app"


def setting(name: str, default: str) -> str:
    return os.getenv(f"JAS_{name}") or default


def gallery_origin(value: str | None = None) -> str:
    origin = (value or setting("GALLERY_URL", DEFAULT_GALLERY_ORIGIN)).rstrip("/")
    parsed = urlparse(origin)
    if (
        not parsed.hostname
        or parsed.scheme not in {"http", "https"}
        or parsed.path
        or parsed.query
        or parsed.fragment
        or parsed.username
        or parsed.password
        or (parsed.scheme != "https" and parsed.hostname not in {"localhost", "127.0.0.1", "::1"})
    ):
        raise ValueError(
            "Gallery URL must use HTTPS, or HTTP on localhost, without credentials or a path"
        )
    return origin
