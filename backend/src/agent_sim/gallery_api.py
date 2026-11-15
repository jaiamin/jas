"""Public gallery ASGI app, deliberately separate from the private workspace app."""

import asyncio
import base64
import hashlib
import hmac
import html
import os
import secrets
import time
from datetime import UTC, datetime, timedelta
from pathlib import Path
from urllib.parse import urlencode, urlparse

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, RedirectResponse, Response
from pydantic import Field
from starlette.middleware.trustedhost import TrustedHostMiddleware

from .api import SameOriginMiddleware, invalid, invalid_request
from .domain import Strict
from .gallery import Gallery, token_hash
from .gallery_storage import FileObjects, S3Objects
from .paths import static_directory
from .public_records import MAX_PUBLIC_BYTES, decode_record


class Report(Strict):
    reason: str = Field(min_length=10, max_length=2000)


class DevicePoll(Strict):
    device_code: str = Field(min_length=32, max_length=100)


def create_gallery_app(
    directory: Path | None = None, *, origin: str | None = None, static_dir: Path | None = None
) -> FastAPI:
    origin = (origin or os.getenv("JAS_GALLERY_ORIGIN", "http://127.0.0.1:8081")).rstrip("/")
    parsed = urlparse(origin)
    if (
        parsed.scheme not in {"http", "https"}
        or not parsed.hostname
        or parsed.path
        or parsed.username
        or parsed.password
        or parsed.query
        or parsed.fragment
    ):
        raise ValueError("JAS_GALLERY_ORIGIN must be an absolute origin without a path")
    local = parsed.hostname in {"127.0.0.1", "localhost", "::1", "testserver"}
    if not local and parsed.scheme != "https":
        raise ValueError("A public gallery requires HTTPS")
    directory = directory or Path(os.getenv("JAS_GALLERY_DATA", "data/gallery"))
    objects = (
        S3Objects() if os.getenv("JAS_GALLERY_S3_BUCKET") else FileObjects(directory / "objects")
    )
    if not local and isinstance(objects, FileObjects):
        raise ValueError(
            "Public gallery hosting requires private object storage; see deployment docs"
        )
    gallery = Gallery(directory / "gallery.sqlite3", objects, origin)
    app = FastAPI(title="JAS Gallery", docs_url=None, redoc_url=None)
    app.state.gallery = gallery
    app.state.frontend = (static_dir or static_directory()).resolve()
    app.add_middleware(SameOriginMiddleware)
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=[
            parsed.hostname,
            "localhost",
            "127.0.0.1",
            "[::1]",
            *(
                host.strip()
                for host in os.getenv("JAS_ALLOWED_HOSTS", "").split(",")
                if host.strip()
            ),
        ],
        www_redirect=False,
    )
    app.add_exception_handler(ValueError, invalid)
    from fastapi.exceptions import RequestValidationError

    app.add_exception_handler(RequestValidationError, invalid_request)
    capacity = asyncio.Semaphore(2)
    report_salt = secrets.token_bytes(32)

    @app.middleware("http")
    async def headers(request: Request, call_next):
        # Public reading needs no account; status is checked before every immutable object read.
        try:
            length = int(request.headers.get("content-length", "0"))
        except ValueError:
            return JSONResponse({"detail": "Invalid Content-Length"}, status_code=400)
        if length > MAX_PUBLIC_BYTES:
            return JSONResponse({"detail": "Publication exceeds 25 MB"}, status_code=413)
        response = await call_next(request)
        if not request.url.path.startswith("/assets/"):
            response.headers["Cache-Control"] = "no-store"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; img-src 'self' data: "
            "https://avatars.githubusercontent.com; style-src 'self' 'unsafe-"
            "inline'; script-src 'self'; connect-src 'self'; frame-ancestors "
            "'none'; base-uri 'self'; form-action 'self'"
        )
        return response

    @app.exception_handler(PermissionError)
    async def unauthorized(_request, error):
        return JSONResponse({"detail": str(error)}, status_code=401)

    @app.exception_handler(LookupError)
    async def unavailable(_request, error):
        return JSONResponse({"detail": str(error)}, status_code=404)

    def identity(request: Request, *, session: bool = False) -> dict:
        authorization = request.headers.get("authorization", "")
        if session:
            token = request.cookies.get("jas_gallery_session", "")
        else:
            scheme, _, token = authorization.partition(" ")
            if scheme.lower() != "bearer":
                token = request.cookies.get("jas_gallery_session", "")
        return gallery.authenticate(token, session=session)

    def publication(author: str, slug: str, version: int | None) -> dict:
        return gallery.publication(author, slug, version)

    @app.get("/api/health")
    def health():
        return {"status": "ok", "surface": "gallery"}

    @app.get("/api/gallery")
    def listing(
        world: str = "", model: str = "", tag: str = "", sort: str = "newest", offset: int = 0
    ):
        return gallery.listing(world=world, model=model, tag=tag, sort=sort, offset=max(0, offset))

    @app.get("/api/gallery/filters")
    def filters():
        return gallery.filters()

    @app.get("/api/gallery/mine")
    def mine(request: Request):
        return gallery.listing(owner=identity(request)["id"])

    @app.get("/api/gallery/{author}/{slug}")
    def index(author: str, slug: str, version: int | None = None):
        return gallery.manifest(publication(author, slug, version))

    @app.get("/api/gallery/{author}/{slug}/runs/{run_id}")
    def recording(author: str, slug: str, run_id: str, version: int):
        row = publication(author, slug, version)
        manifest = gallery.manifest(row)
        if run_id not in {item["id"] for item in manifest["runs"]}:
            raise LookupError("Run is not part of this publication")
        return Response(
            gallery.objects.get(f"{row['prefix']}/runs/{run_id}.json.gz"),
            media_type="application/json",
            headers={"Content-Encoding": "gzip"},
        )

    @app.get("/api/gallery/{author}/{slug}/record")
    def download(author: str, slug: str, version: int):
        row = publication(author, slug, version)
        return Response(
            gallery.objects.get(f"{row['prefix']}/record.json.gz"),
            media_type="application/json",
            headers={
                "Content-Encoding": "gzip",
                "Content-Disposition": 'attachment; filename="jas-public-record.json"',
            },
        )

    @app.get("/social/{author}/{slug}/v{version}.png")
    def social(author: str, slug: str, version: int):
        row = publication(author, slug, version)
        return Response(gallery.objects.get(f"{row['prefix']}/social.png"), media_type="image/png")

    @app.post("/api/gallery")
    async def publish(request: Request):
        account = identity(request)
        raw = bytearray()
        async for chunk in request.stream():
            raw.extend(chunk)
            if len(raw) > MAX_PUBLIC_BYTES:
                raise HTTPException(413, "Publication exceeds 25 MB")
        try:
            record = decode_record(bytes(raw))
            async with capacity:
                row = await asyncio.to_thread(gallery.publish, account, record)
        except (KeyError, TypeError, RecursionError) as error:
            raise ValueError("Malformed public record") from error
        return gallery.card(row)

    @app.delete("/api/gallery/{author}/{slug}")
    def unpublish(request: Request, author: str, slug: str, version: int):
        row = publication(author, slug, version)
        gallery.unpublish(identity(request), row)
        return {"unpublished": True}

    @app.post("/api/gallery/{author}/{slug}/fork")
    def fork(author: str, slug: str, version: int, body: dict):
        nonce = str(body.get("nonce", ""))
        if not 16 <= len(nonce) <= 100:
            raise ValueError("Fork requires a stable installation receipt")
        row = publication(author, slug, version)
        with gallery.connect() as db:
            db.execute(
                "INSERT OR IGNORE INTO forks VALUES (?,?,?)",
                (row["id"], token_hash(nonce), datetime.now(UTC).isoformat()),
            )
        return {
            "record": f"{origin}/api/gallery/{author}/{slug}/record?version={version}",
            "lineage": {
                "author": author,
                "slug": slug,
                "version": version,
                "sha256": row["content_hash"],
            },
        }

    @app.post("/api/gallery/{author}/{slug}/report")
    def report(request: Request, author: str, slug: str, version: int, body: Report):
        row = publication(author, slug, version)
        reporter = hmac.new(
            report_salt,
            (request.client.host if request.client else "unknown").encode(),
            hashlib.sha256,
        ).hexdigest()
        with gallery.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            if (
                db.execute(
                    "SELECT count(*) FROM reports WHERE reporter=? AND created>=?",
                    (reporter, datetime.now(UTC).date().isoformat()),
                ).fetchone()[0]
                >= 5
            ):
                raise HTTPException(
                    429, "Report limit reached; contact the operator through the repository"
                )
            db.execute(
                "INSERT INTO reports VALUES (?,?,?,?,?)",
                (
                    secrets.token_hex(16),
                    row["id"],
                    body.reason,
                    datetime.now(UTC).isoformat(),
                    reporter,
                ),
            )
        return {"reported": True}

    @app.get("/api/gallery-identity")
    def me(request: Request):
        account = identity(request)
        return {"handle": account["handle"], "scope": account["scope"]}

    @app.get("/api/gallery-account/tokens")
    def tokens(request: Request):
        account = identity(request, session=True)
        with gallery.connect() as db:
            return [
                dict(row)
                for row in db.execute(
                    "SELECT hash AS id,label,created FROM tokens WHERE account=? "
                    "AND scope='publish' AND revoked=0",
                    (account["id"],),
                )
            ]

    @app.delete("/api/gallery-account/tokens/{token_id}")
    def revoke(request: Request, token_id: str):
        account = identity(request, session=True)
        with gallery.connect() as db:
            db.execute(
                "UPDATE tokens SET revoked=1 WHERE hash=? AND account=? AND scope='publish'",
                (token_id, account["id"]),
            )
        return {"revoked": True}

    @app.post("/api/gallery-account/sign-out")
    def sign_out(request: Request):
        account = identity(request, session=True)
        with gallery.connect() as db:
            db.execute("UPDATE tokens SET revoked=1 WHERE hash=?", (account["token_hash"],))
        response = JSONResponse({"signed_out": True})
        response.delete_cookie("jas_gallery_session")
        return response

    @app.post("/auth/device")
    def device():
        if not os.getenv("JAS_GITHUB_CLIENT_ID"):
            raise ValueError("Gallery GitHub sign-in is not configured by the operator")
        raw, code = secrets.token_urlsafe(40), secrets.token_hex(4).upper()
        with gallery.connect() as db:
            db.execute("DELETE FROM devices WHERE expires<?", (datetime.now(UTC).isoformat(),))
            if db.execute("SELECT count(*) FROM devices").fetchone()[0] >= 1000:
                raise HTTPException(429, "Too many pending sign-ins; try again shortly")
            db.execute(
                "INSERT INTO devices(hash,code,expires) VALUES (?,?,?)",
                (token_hash(raw), code, (datetime.now(UTC) + timedelta(minutes=10)).isoformat()),
            )
        return {
            "device_code": raw,
            "user_code": code,
            "verification_uri": f"{origin}/login?user_code={code}",
            "expires_in": 600,
            "interval": 5,
        }

    @app.post("/auth/device/token")
    def poll(body: DevicePoll):
        with gallery.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute(
                "SELECT * FROM devices WHERE hash=?", (token_hash(body.device_code),)
            ).fetchone()
            if row is None or row["consumed"] or row["expires"] < datetime.now(UTC).isoformat():
                raise ValueError("Sign-in expired or already completed")
            if time.time() - row["polled"] < 4:
                raise HTTPException(429, "Wait five seconds before checking sign-in again")
            db.execute("UPDATE devices SET polled=? WHERE hash=?", (time.time(), row["hash"]))
            account = row["account"]
            if account is not None:
                db.execute("UPDATE devices SET consumed=1 WHERE hash=?", (row["hash"],))
        if account is None:
            return JSONResponse({"status": "pending"}, status_code=202)
        return {"access_token": gallery.issue_token(account, "publish"), "token_type": "Bearer"}

    @app.post("/api/gallery-account/device-approval")
    def approve(request: Request, body: dict):
        account = identity(request, session=True)
        code = str(body.get("user_code", "")).upper()
        with gallery.connect() as db:
            changed = db.execute(
                "UPDATE devices SET account=? WHERE code=? AND account IS NULL AND "
                "consumed=0 AND expires>?",
                (account["id"], code, datetime.now(UTC).isoformat()),
            ).rowcount
        if not changed:
            raise ValueError("The code has expired or was already approved")
        return {"approved": True}

    @app.get("/auth/github")
    def github_start(user_code: str = ""):
        client_id = os.getenv("JAS_GITHUB_CLIENT_ID")
        if not client_id or not os.getenv("JAS_GITHUB_CLIENT_SECRET"):
            raise ValueError("Gallery GitHub sign-in is not configured by the operator")
        if user_code and not all(c in "0123456789ABCDEF" for c in user_code):
            raise ValueError("Invalid device code")
        state, verifier = secrets.token_urlsafe(32), secrets.token_urlsafe(48)
        challenge = (
            base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest())
            .decode()
            .rstrip("=")
        )
        with gallery.connect() as db:
            db.execute("DELETE FROM oauth_states WHERE expires<?", (datetime.now(UTC).isoformat(),))
            db.execute(
                "INSERT INTO oauth_states VALUES (?,?,?,?)",
                (
                    token_hash(state),
                    verifier,
                    user_code or None,
                    (datetime.now(UTC) + timedelta(minutes=10)).isoformat(),
                ),
            )
        response = RedirectResponse(
            "https://github.com/login/oauth/authorize?"
            + urlencode(
                {
                    "client_id": client_id,
                    "redirect_uri": f"{origin}/auth/github/callback",
                    "state": state,
                    "code_challenge": challenge,
                    "code_challenge_method": "S256",
                }
            )
        )
        response.set_cookie(
            "jas_oauth_state", state, httponly=True, secure=not local, samesite="lax", max_age=600
        )
        return response

    @app.get("/auth/github/callback")
    async def callback(request: Request, state: str = "", code: str = ""):
        if not state or not hmac.compare_digest(request.cookies.get("jas_oauth_state", ""), state):
            raise ValueError("Sign-in state did not match; start sign-in again")
        with gallery.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            saved = db.execute(
                "SELECT * FROM oauth_states WHERE hash=? AND expires>?",
                (token_hash(state), datetime.now(UTC).isoformat()),
            ).fetchone()
            db.execute("DELETE FROM oauth_states WHERE hash=?", (token_hash(state),))
        if saved is None or not code:
            raise ValueError("Sign-in expired or was declined")
        async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
            response = await client.post(
                "https://github.com/login/oauth/access_token",
                headers={"Accept": "application/json"},
                data={
                    "client_id": os.environ["JAS_GITHUB_CLIENT_ID"],
                    "client_secret": os.environ["JAS_GITHUB_CLIENT_SECRET"],
                    "code": code,
                    "code_verifier": saved["verifier"],
                    "redirect_uri": f"{origin}/auth/github/callback",
                },
            )
            response.raise_for_status()
            github_token = response.json().get("access_token")
            if not github_token:
                raise ValueError("GitHub declined sign-in; try again")
            response = await client.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"Bearer {github_token}",
                    "Accept": "application/vnd.github+json",
                },
            )
            response.raise_for_status()
            account = gallery.account(response.json())
        # The GitHub access token is discarded; only a JAS-scoped session is retained.
        target = (
            "/login?" + urlencode({"user_code": saved["device"]})
            if saved["device"]
            else "/gallery/account"
        )
        response = RedirectResponse(target, status_code=303)
        response.set_cookie(
            "jas_gallery_session",
            gallery.issue_token(account, "session", "Gallery browser"),
            httponly=True,
            secure=not local,
            samesite="lax",
            max_age=604800,
        )
        response.delete_cookie("jas_oauth_state")
        return response

    @app.get("/p/{author}/{slug}/v{version}")
    def public_page(author: str, slug: str, version: int):
        row = publication(author, slug, version)
        card = gallery.card(row)
        text = app.state.frontend.joinpath("index.html").read_text()
        title = html.escape(card["title"], quote=True)
        finding = html.escape(card["finding"], quote=True)
        metadata = (
            f"<title>{title} · JAS</title>"
            f'<meta name="description" content="{finding}">'
            f'<meta property="og:title" content="{title}">'
            f'<meta property="og:description" content="{finding}">'
            f'<meta property="og:image" content="{origin}/social/{author}/{slug}/v{version}.png">'
            f'<meta property="og:url" content="{card["url"]}">'
            '<meta name="twitter:card" content="summary_large_image">'
        )
        if row["visibility"] == "unlisted":
            metadata += '<meta name="robots" content="noindex,nofollow">'
        return HTMLResponse(
            text.replace("<head>", '<head><meta name="jas-surface" content="gallery">' + metadata)
        )

    @app.get("/{path:path}")
    def frontend(path: str):
        if path.startswith("api/"):
            raise HTTPException(404, "Endpoint not found")
        asset = (app.state.frontend / path).resolve()
        if not asset.is_relative_to(app.state.frontend):
            raise HTTPException(404)
        if asset.is_file() and asset.name != "index.html":
            return FileResponse(asset)
        index = app.state.frontend / "index.html"
        if not index.is_file():
            raise HTTPException(503, "Build the frontend before starting the gallery")
        return HTMLResponse(
            index.read_text().replace("<head>", '<head><meta name="jas-surface" content="gallery">')
        )

    return app
