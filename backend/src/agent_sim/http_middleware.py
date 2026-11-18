"""HTTP middleware and validation handling shared by the workspace and Gallery."""

from urllib.parse import urlparse

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.datastructures import Headers, MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send


class SameOriginMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def secure_send(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers["X-Content-Type-Options"] = "nosniff"
                headers["Referrer-Policy"] = "same-origin"
            await send(message)

        headers = Headers(scope=scope)
        origin = headers.get("origin")
        if scope["method"] not in ("GET", "HEAD", "OPTIONS") and origin:
            allowed = {headers.get("host"), "localhost:5173", "127.0.0.1:5173"}
            if urlparse(origin).netloc not in allowed:
                response = JSONResponse(
                    {"detail": "Cross-origin writes are not allowed"}, status_code=403
                )
                await response(scope, receive, secure_send)
                return
        await self.app(scope, receive, secure_send)


async def invalid(_request: Request, error: Exception) -> JSONResponse:
    return JSONResponse({"detail": str(error)}, status_code=422)


async def invalid_request(_request: Request, error: Exception) -> JSONResponse:
    if not isinstance(error, RequestValidationError):
        raise error
    return JSONResponse(
        {
            "detail": [
                {"loc": issue["loc"], "msg": issue["msg"], "type": issue["type"]}
                for issue in error.errors()
            ]
        },
        status_code=422,
    )
