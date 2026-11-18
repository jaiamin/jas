"""Local gallery client: OS-keychain tokens and explicit, bounded network requests."""

import json
import os
import sqlite3
from pathlib import Path
from urllib.parse import urlparse

import httpx
import keyring
from keyring.errors import KeyringError
from pydantic import AnyHttpUrl, BaseModel, Field, ValidationError

from .domain import Design
from .public_records import MAX_PUBLIC_BYTES, encode_record, validate_record
from .research import Research

DEFAULT_GALLERY_ORIGIN = "https://gallery-production-b7633fcd.up.railway.app"


class GalleryError(ValueError):
    def __init__(self, message: str, status_code: int = 503):
        super().__init__(message)
        self.status_code = status_code


class KeychainUnavailable(ValueError):
    pass


class DeviceAuthorization(BaseModel):
    device_code: str = Field(min_length=32, max_length=100)
    user_code: str = Field(min_length=1)
    verification_uri: AnyHttpUrl
    expires_in: int = Field(gt=0, strict=True)
    interval: int = Field(gt=0, strict=True)


def gallery_origin(value: str | None = None) -> str:
    configured = value or os.getenv("JAS_GALLERY_URL") or DEFAULT_GALLERY_ORIGIN
    origin = configured.rstrip("/")
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


class Publisher:
    def __init__(self, origin: str | None = None):
        self.origin = gallery_origin(origin)
        self.service = f"jas-gallery:{self.origin}"

    def token(self) -> str | None:
        try:
            return keyring.get_password(self.service, "publisher")
        except (KeyringError, RuntimeError) as error:
            raise KeychainUnavailable(
                "Enable a system keychain to save your publishing sign-in securely."
            ) from error

    def save_token(self, token: str) -> None:
        try:
            keyring.set_password(self.service, "publisher", token)
        except (KeyringError, RuntimeError) as error:
            raise KeychainUnavailable(
                "Sign-in wasn’t saved. Enable a system keychain and try again."
            ) from error

    def sign_out(self) -> None:
        try:
            if self.token():
                keyring.delete_password(self.service, "publisher")
        except KeyringError as error:
            raise ValueError(
                "Could not remove the local gallery token from the OS keychain"
            ) from error

    def begin_login(self) -> DeviceAuthorization:
        # Check that secure storage is available before creating a device request.
        self.token()
        result = self.request("POST", "/auth/device", body={})
        try:
            return DeviceAuthorization.model_validate(result)
        except ValidationError as error:
            raise GalleryError("The gallery returned invalid sign-in details.") from error

    def poll_login(self, device_code: str) -> bool:
        result = self.request_object(
            "POST", "/auth/device/token", body={"device_code": device_code}
        )
        if "access_token" not in result and result.get("status") == "pending":
            return False
        token = result.get("access_token")
        if (
            not isinstance(token, str)
            or not token
            or not token.isascii()
            or not token.isprintable()
            or " " in token
        ):
            raise GalleryError("The gallery returned invalid sign-in details.")
        self.save_token(token)
        return True

    def request_object(
        self, method: str, path: str, *, body: object = None, authenticated: bool = False
    ) -> dict:
        result = self.request(method, path, body=body, authenticated=authenticated)
        if not isinstance(result, dict):
            raise GalleryError("The gallery returned an invalid response.")
        return result

    def request(
        self, method: str, path: str, *, body: object = None, authenticated: bool = False
    ) -> object:
        headers = {"Accept": "application/json", "Content-Type": "application/json"}
        if authenticated:
            token = self.token()
            if not token:
                raise GalleryError("Sign in with GitHub in Gallery to publish.", 401)
            headers["Authorization"] = f"Bearer {token}"
        try:
            with httpx.Client(
                timeout=httpx.Timeout(60, connect=5), follow_redirects=False
            ) as client:
                with client.stream(
                    method,
                    self.origin + path,
                    headers=headers,
                    content=encode_record(body) if body is not None else None,
                ) as response:
                    raw = bytearray()
                    for chunk in response.iter_bytes():
                        raw.extend(chunk)
                        if len(raw) > MAX_PUBLIC_BYTES:
                            raise ValueError("Gallery response exceeds 25 MB")
                    if response.status_code in {401, 403}:
                        raise GalleryError("Sign in with GitHub again to manage publications.", 401)
                    if response.status_code >= 500 or 300 <= response.status_code < 400:
                        raise GalleryError(
                            "The gallery is temporarily unavailable. Try again shortly."
                        )
                    data = json.loads(raw)
                    if response.status_code >= 400:
                        detail = data.get("detail") if isinstance(data, dict) else None
                        raise GalleryError(
                            detail
                            if isinstance(detail, str)
                            else "The gallery could not complete this request.",
                            response.status_code,
                        )
                    return data
        except (httpx.HTTPError, json.JSONDecodeError, UnicodeError, RecursionError) as error:
            raise GalleryError(
                "The gallery is temporarily unavailable. Your local experiments still work."
            ) from error


class PublicationReceipts:
    """A separate local sidecar preserves lineage without changing experiment contracts."""

    def __init__(self, database: str | None):
        self.path = (
            Path(database).resolve().with_suffix(".publishing.sqlite3")
            if database and database != ":memory:"
            else None
        )

    def save(self, study_id: str, kind: str, value: dict) -> None:
        if self.path is None:
            return
        with sqlite3.connect(self.path) as db:
            db.execute(
                "CREATE TABLE IF NOT EXISTS receipts (study TEXT, kind TEXT, value "
                "TEXT, PRIMARY KEY(study,kind))"
            )
            db.execute(
                "INSERT INTO receipts VALUES (?,?,?) ON CONFLICT(study,kind) DO "
                "UPDATE SET value=excluded.value",
                (study_id, kind, json.dumps(value)),
            )

    def get(self, study_id: str, kind: str) -> dict | None:
        if self.path is None or not self.path.exists():
            return None
        with sqlite3.connect(self.path) as db:
            row = db.execute(
                "SELECT value FROM receipts WHERE study=? AND kind=?", (study_id, kind)
            ).fetchone()
        return json.loads(row[0]) if row else None


def fork_record(research: Research, record: dict, lineage: dict) -> str:
    validate_record(record)
    design = Design.model_validate(record["experiment"]["design"])
    if design.environment in {"sealed_relay", "reviewed_finite"}:
        source = design.environment_source
        package = source.definition.extension if source else None
        name = package.name if package else design.environment
        checksum = package.sha256 if package else "unavailable"
        raise ValueError(
            f"Install and independently review the required environment {name} ({checksum}) "
            "before forking. Nothing was installed or run."
        )
    sid = research.save_design(design)
    PublicationReceipts(research.db.engine.url.database).save(sid, "lineage", lineage)
    return sid


def download_fork(publisher: Publisher, target: str, research: Research) -> str:
    import hashlib
    import re
    import secrets

    if not re.fullmatch(r"[a-zA-Z0-9-]{1,39}/[a-z0-9-]{1,60}(?:/v[1-9][0-9]*)?", target):
        raise ValueError("Use jas fork author/name or author/name/v1")
    parts = target.split("/")
    author, slug = parts[:2]
    version = int(parts[2][1:]) if len(parts) == 3 else None
    path = f"/api/gallery/{author}/{slug}"
    manifest = publisher.request_object("GET", path + (f"?version={version}" if version else ""))
    publication = manifest.get("publication")
    if not isinstance(publication, dict):
        raise GalleryError("The gallery returned an invalid publication manifest.")
    published_version = publication.get("version")
    if type(published_version) is not int or published_version < 1:
        raise GalleryError("The gallery returned an invalid publication version.")
    if version is not None and published_version != version:
        raise GalleryError("The gallery returned a different publication version.")
    version = published_version
    record = publisher.request_object("GET", f"{path}/record?version={version}")
    checksum = hashlib.sha256(encode_record(record)).hexdigest()
    if checksum != publication.get("sha256"):
        raise ValueError("Downloaded record does not match the immutable publication hash")
    lineage = {"author": author.lower(), "slug": slug, "version": version, "sha256": checksum}
    sid = fork_record(research, record, lineage)
    # Count only after importing successfully. Counting failure cannot undo a saved local protocol.
    try:
        publisher.request(
            "POST", f"{path}/fork?version={version}", body={"nonce": secrets.token_hex(16)}
        )
    except ValueError:
        pass
    return sid
