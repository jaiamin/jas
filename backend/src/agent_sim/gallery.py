"""Small gallery catalogue. It owns identities and immutable records, never a runner."""

import gzip
import hashlib
import json
import re
import secrets
import sqlite3
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from pathlib import Path

from .db import now
from .gallery_storage import ObjectStore, compressed
from .public_records import encode_record, scan_record, validate_record, verify_record
from .social_card import social_card


def token_hash(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


class Gallery:
    def __init__(self, database: Path, objects: ObjectStore, origin: str):
        database.parent.mkdir(parents=True, exist_ok=True)
        self.database, self.objects, self.origin = database, objects, origin.rstrip("/")
        with self.connect() as db:
            db.executescript("""
                PRAGMA journal_mode=WAL;
                CREATE TABLE IF NOT EXISTS accounts (
                    id INTEGER PRIMARY KEY, handle TEXT NOT NULL UNIQUE,
                    github_created TEXT NOT NULL, joined TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS tokens (
                    hash TEXT PRIMARY KEY, account INTEGER NOT NULL REFERENCES accounts(id),
                    scope TEXT NOT NULL, label TEXT NOT NULL, created TEXT NOT NULL,
                    revoked INTEGER NOT NULL DEFAULT 0
                );
                CREATE TABLE IF NOT EXISTS devices (
                    hash TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, expires TEXT NOT NULL,
                    account INTEGER REFERENCES accounts(id), consumed INTEGER NOT NULL DEFAULT 0,
                    polled REAL NOT NULL DEFAULT 0
                );
                CREATE TABLE IF NOT EXISTS oauth_states (
                    hash TEXT PRIMARY KEY, verifier TEXT NOT NULL,
                    device TEXT, expires TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS publications (
                    id TEXT PRIMARY KEY, account INTEGER NOT NULL REFERENCES accounts(id),
                    handle TEXT NOT NULL, slug TEXT NOT NULL, version INTEGER NOT NULL,
                    created TEXT NOT NULL, visibility TEXT NOT NULL, status TEXT NOT NULL,
                    content_hash TEXT NOT NULL, prefix TEXT NOT NULL, card TEXT NOT NULL,
                    lineage TEXT, featured INTEGER NOT NULL DEFAULT 0,
                    UNIQUE(account, slug, version)
                );
                CREATE TABLE IF NOT EXISTS forks (
                    publication TEXT NOT NULL REFERENCES publications(id),
                    nonce TEXT NOT NULL, created TEXT NOT NULL, PRIMARY KEY(publication, nonce)
                );
                CREATE TABLE IF NOT EXISTS reports (
                    id TEXT PRIMARY KEY, publication TEXT NOT NULL REFERENCES publications(id),
                    reason TEXT NOT NULL, created TEXT NOT NULL, reporter TEXT NOT NULL
                );
            """)

    @contextmanager
    def connect(self):
        with sqlite3.connect(self.database, timeout=15) as db:
            db.row_factory = sqlite3.Row
            db.execute("PRAGMA foreign_keys=ON")
            yield db

    def account(self, profile: dict) -> int:
        created = datetime.fromisoformat(profile["created_at"].replace("Z", "+00:00"))
        if datetime.now(UTC) - created < timedelta(days=7):
            raise ValueError("Publishing requires a GitHub account at least seven days old")
        handle = str(profile["login"]).lower()
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,38}", handle):
            raise ValueError("Invalid GitHub handle")
        with self.connect() as db:
            db.execute(
                "INSERT INTO accounts VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE"
                " SET handle=excluded.handle",
                (int(profile["id"]), handle, profile["created_at"], now()),
            )
        return int(profile["id"])

    def issue_token(self, account: int, scope: str, label: str = "JAS local app") -> str:
        raw = "jas_" + secrets.token_urlsafe(40)
        with self.connect() as db:
            db.execute(
                "INSERT INTO tokens(hash,account,scope,label,created) VALUES (?,?,?,?,?)",
                (token_hash(raw), account, scope, label, now()),
            )
        return raw

    def authenticate(self, token: str, *, session: bool = False) -> dict:
        with self.connect() as db:
            row = db.execute(
                "SELECT accounts.*, tokens.hash AS token_hash, tokens.scope, "
                "tokens.created AS token_created FROM tokens JOIN accounts ON "
                "tokens.account=accounts.id WHERE tokens.hash=? AND "
                "tokens.revoked=0",
                (token_hash(token),),
            ).fetchone()
        if row is None or (session and row["scope"] != "session"):
            raise PermissionError("Sign in to GitHub to publish")
        if row["scope"] == "session" and datetime.now(UTC) - datetime.fromisoformat(
            row["token_created"]
        ) > timedelta(days=7):
            raise PermissionError("Sign in again")
        return dict(row)

    def publish(self, account: dict, record: dict) -> dict:
        description = validate_record(record)
        hits = scan_record(record, reviews=description.email_reviews)
        if any(not hit["resolved"] for hit in hits):
            raise ValueError("Publication scan has unresolved findings; review the record locally")
        verification = verify_record(record)
        raw = encode_record(record)
        content_hash = hashlib.sha256(raw).hexdigest()
        slug = re.sub(r"[^a-z0-9]+", "-", description.title.lower()).strip("-")[:60] or "experiment"
        identity = secrets.token_hex(16)
        prefix = f"v1/{identity}"
        lineage = record.get("lineage")
        if lineage:
            source = self.publication(
                lineage["author"], lineage["slug"], lineage["version"], allow_removed=True
            )
            if lineage.get("sha256") != source["content_hash"]:
                raise ValueError("Fork lineage does not match the immutable source record")
        manifest = {key: value for key, value in record.items() if key != "runs"}
        manifest["verification"] = verification
        manifest["scan"] = hits
        manifest["runs"] = [
            {
                "id": item["record"]["summary"]["id"],
                "sha256": hashlib.sha256(encode_record(item)).hexdigest(),
            }
            for item in record["runs"]
        ]
        card = {
            "title": description.title,
            "finding": description.finding,
            "tags": description.tags,
            "world": record["experiment"]["design"]["environment"],
            "models": sorted(
                {model for run in record["runs"] for model in run["record"]["summary"]["models"]}
            ),
            "verified": bool(verification) and all(row["verified"] for row in verification),
        }
        # The quota transaction serializes concurrent publications, including unpublished attempts.
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            count = db.execute(
                "SELECT count(*) FROM publications WHERE account=? AND created>=?",
                (account["id"], datetime.now(UTC).date().isoformat()),
            ).fetchone()[0]
            if count >= 10:
                raise ValueError("Daily limit reached: ten publications per account")
            version = db.execute(
                "SELECT coalesce(max(version),0)+1 FROM publications WHERE account=? AND slug=?",
                (account["id"], slug),
            ).fetchone()[0]
            self.objects.put(f"{prefix}/record.json.gz", compressed(raw), "application/gzip")
            for item in record["runs"]:
                rid = item["record"]["summary"]["id"]
                if not re.fullmatch(r"[a-f0-9]{16}", rid):
                    raise ValueError("Invalid immutable run identifier")
                self.objects.put(
                    f"{prefix}/runs/{rid}.json.gz",
                    compressed(encode_record(item)),
                    "application/gzip",
                )
            self.objects.put(
                f"{prefix}/index.json.gz", compressed(encode_record(manifest)), "application/gzip"
            )
            self.objects.put(f"{prefix}/social.png", social_card(record), "image/png")
            db.execute(
                "INSERT INTO publications(id,account,handle,slug,version,created,vi"
                "sibility,status,content_hash,prefix,card,lineage) VALUES "
                "(?,?,?,?,?,?,?,?,?,?,?,?)",
                (
                    identity,
                    account["id"],
                    account["handle"],
                    slug,
                    version,
                    now(),
                    description.visibility,
                    "published",
                    content_hash,
                    prefix,
                    json.dumps(card),
                    json.dumps(lineage) if lineage else None,
                ),
            )
        return self.publication(account["handle"], slug, version)

    def publication(
        self, author: str, slug: str, version: int | None = None, *, allow_removed: bool = False
    ) -> dict:
        with self.connect() as db:
            row = db.execute(
                "SELECT * FROM publications WHERE handle=? AND slug=? AND (? IS "
                "NULL OR version=?) ORDER BY version DESC LIMIT 1",
                (author.lower(), slug, version, version),
            ).fetchone()
            if row is None:
                raise LookupError("Publication not found")
            result = dict(row)
            result["fork_count"] = db.execute(
                "SELECT count(*) FROM forks WHERE publication=?", (row["id"],)
            ).fetchone()[0]
        if result["status"] != "published" and not allow_removed:
            raise LookupError("This publication has been unpublished")
        return result

    def card(self, row: dict) -> dict:
        return {
            **json.loads(row["card"]),
            "id": row["id"],
            "author": row["handle"],
            "slug": row["slug"],
            "version": row["version"],
            "created": row["created"],
            "visibility": row["visibility"],
            "fork_count": row.get("fork_count", 0),
            "featured": bool(row["featured"]),
            "sha256": row["content_hash"],
            "url": f"{self.origin}/p/{row['handle']}/{row['slug']}/v{row['version']}",
        }

    def listing(
        self,
        *,
        author: str | None = None,
        owner: int | None = None,
        world: str = "",
        model: str = "",
        tag: str = "",
        sort: str = "newest",
        offset: int = 0,
    ) -> list[dict]:
        with self.connect() as db:
            rows = db.execute(
                "SELECT publications.*, (SELECT count(*) FROM forks WHERE "
                "publication=publications.id) AS fork_count FROM publications WHERE"
                " status='published' AND ((? IS NULL AND visibility='public') OR account=?) AND (? "
                "IS NULL OR handle=?) ORDER BY created DESC",
                (owner, owner, author, author),
            ).fetchall()
        cards = [self.card(dict(row)) for row in rows]
        cards = [
            card
            for card in cards
            if (not world or card["world"] == world)
            and (not model or model in card["models"])
            and (not tag or tag in card["tags"])
        ]
        if sort == "forks":
            cards.sort(key=lambda card: card["fork_count"], reverse=True)
        return cards[offset : offset + 60]

    def manifest(self, row: dict) -> dict:
        result = json.loads(gzip.decompress(self.objects.get(f"{row['prefix']}/index.json.gz")))
        result["publication"] = self.card(row)
        with self.connect() as db:
            # Never reveal unlisted descendants through a public source's lineage.
            children = db.execute(
                "SELECT * FROM publications WHERE status='published' AND "
                "visibility='public' AND json_extract(lineage,'$.sha256')=? ORDER "
                "BY created DESC LIMIT 50",
                (row["content_hash"],),
            ).fetchall()
        result["forks"] = [self.card(dict(child)) for child in children]
        return result

    def unpublish(self, account: dict, row: dict) -> None:
        if account["id"] != row["account"]:
            raise PermissionError("Only the author can unpublish this record")
        with self.connect() as db:
            db.execute("UPDATE publications SET status='unpublished' WHERE id=?", (row["id"],))
        # Objects remain immutable and private; every page/file request rechecks status.
