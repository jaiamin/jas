"""Optional single-user HTTP authentication for private hosted workspaces."""

import base64
import binascii
import os
import secrets

from starlette.datastructures import Headers, MutableHeaders
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send


def access_credentials() -> tuple[bytes, bytes] | None:
    username = os.getenv("JAS_AUTH_USERNAME", "")
    password = os.getenv("JAS_AUTH_PASSWORD", "")
    if bool(username) != bool(password):
        raise ValueError("Set both JAS_AUTH_USERNAME and JAS_AUTH_PASSWORD, or neither")
    hosts = {host.strip() for host in os.getenv("JAS_ALLOWED_HOSTS", "").split(",") if host.strip()}
    hosted = bool(hosts - {"localhost", "127.0.0.1", "[::1]"})
    if not username and (hosted or os.getenv("JAS_REQUIRE_AUTH", "").lower() in {"1", "true"}):
        raise ValueError("Set JAS_AUTH_USERNAME and JAS_AUTH_PASSWORD before private hosted access")
    if ":" in username:
        raise ValueError("JAS_AUTH_USERNAME cannot contain a colon")
    return (username.encode(), password.encode()) if username else None


class BasicAuthMiddleware:
    def __init__(self, app: ASGIApp, credentials: tuple[bytes, bytes] | None) -> None:
        self.app = app
        self.credentials = credentials

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or self.credentials is None:
            await self.app(scope, receive, send)
            return
        if scope["path"] == "/api/health" and scope["method"] in ("GET", "HEAD"):
            await self.app(scope, receive, send)
            return
        authorization = Headers(scope=scope).get("authorization", "")
        scheme, _, token = authorization.partition(" ")
        supplied = b""
        if scheme.lower() == "basic":
            try:
                supplied = base64.b64decode(token, validate=True)
            except (ValueError, binascii.Error):
                pass
        username, separator, password = supplied.partition(b":")
        expected_username, expected_password = self.credentials
        username_matches = secrets.compare_digest(username, expected_username)
        password_matches = secrets.compare_digest(password, expected_password)
        if separator and username_matches and password_matches:

            async def private_send(message: Message) -> None:
                if message["type"] == "http.response.start":
                    MutableHeaders(scope=message)["Cache-Control"] = "private, no-store"
                await send(message)

            await self.app(scope, receive, private_send)
            return
        response = JSONResponse(
            {"detail": "Authentication required"},
            status_code=401,
            headers={
                "WWW-Authenticate": 'Basic realm="JAS", charset="UTF-8"',
                "Cache-Control": "no-store",
            },
        )
        await response(scope, receive, send)
