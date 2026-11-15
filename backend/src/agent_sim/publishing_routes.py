"""Review and publish from the private app; gallery credentials never reach the browser."""

import hashlib

from fastapi import APIRouter, HTTPException
from pydantic import Field

from .dependencies import DatabaseDep, LanguageModelsDep, ResearchDep
from .domain import Strict
from .public_records import (
    PublicationDescription,
    encode_record,
    public_record,
    scan_record,
    verify_record,
)
from .publishing import (
    GalleryError,
    KeychainUnavailable,
    PublicationReceipts,
    Publisher,
    download_fork,
)

router = APIRouter(prefix="/api")


def client(models) -> Publisher:
    return Publisher(models.registry.configuration.preferences.gallery_url)


def prepare(
    research, models, study_id: str, revision: int, description: PublicationDescription
) -> tuple[dict, list[dict]]:
    lineage = PublicationReceipts(research.db.engine.url.database).get(study_id, "lineage")
    record = public_record(research, study_id, revision, description, lineage=lineage)
    keys = [
        provider.api_key
        for provider in models.registry.configuration.providers.values()
        if provider.api_key
    ]
    for name in ("openai", "anthropic", "openrouter"):
        key = models.registry.provider(name).api_key
        if key:
            keys.append(key)
    hits = scan_record(record, secrets=keys, reviews=description.email_reviews)
    return record, hits


class ReviewPublication(Strict):
    revision: int = Field(ge=1)
    description: PublicationDescription


class PublishPublication(ReviewPublication):
    reviewed: bool
    sha256: str = Field(pattern=r"^[a-f0-9]{64}$")


class PollLogin(Strict):
    device_code: str = Field(min_length=32, max_length=100)


class ForkPublication(Strict):
    target: str = Field(min_length=3, max_length=120)


@router.get("/publishing")
def status(*, models: LanguageModelsDep):
    publisher = client(models)
    identity = None
    error = None
    error_code = None
    try:
        if publisher.token():
            identity = publisher.request("GET", "/api/gallery-identity", authenticated=True)
    except KeychainUnavailable as failure:
        error = str(failure)
        error_code = "keychain_unavailable"
    except GalleryError as failure:
        error = None if failure.status_code == 401 else str(failure)
    except ValueError as failure:
        error = str(failure)
    return {
        "origin": publisher.origin,
        "identity": identity,
        "error": error,
        "error_code": error_code,
    }


@router.post("/publishing/login")
def login(*, models: LanguageModelsDep):
    publisher = client(models)
    # Fail before creating a device request when secure local token storage is unavailable.
    publisher.token()
    return publisher.request("POST", "/auth/device", body={})


@router.post("/publishing/login/poll")
def poll(body: PollLogin, *, models: LanguageModelsDep):
    publisher = client(models)
    result = publisher.request("POST", "/auth/device/token", body=body.model_dump())
    assert isinstance(result, dict)
    if result.get("access_token"):
        publisher.save_token(result["access_token"])
        return {"status": "signed_in"}
    return {"status": "pending"}


@router.post("/publishing/sign-out")
def sign_out(*, models: LanguageModelsDep):
    client(models).sign_out()
    return {"signed_out": True}


@router.post("/studies/{study_id}/publication/review")
def review(
    study_id: str, body: ReviewPublication, *, research: ResearchDep, models: LanguageModelsDep
):
    record, hits = prepare(research, models, study_id, body.revision, body.description)
    raw = encode_record(record)
    return {
        "sha256": hashlib.sha256(raw).hexdigest(),
        "bytes": len(raw),
        "scan": hits,
        "verification": verify_record(record),
        "record": record,
    }


@router.post("/studies/{study_id}/publication")
def publish(
    study_id: str, body: PublishPublication, *, research: ResearchDep, models: LanguageModelsDep
):
    if not body.reviewed:
        raise ValueError("Review the exact public record before publishing")
    record, hits = prepare(research, models, study_id, body.revision, body.description)
    if any(not hit["resolved"] for hit in hits):
        raise HTTPException(422, "Resolve all publication scan findings first")
    if hashlib.sha256(encode_record(record)).hexdigest() != body.sha256:
        raise ValueError("The public record changed. Review it again before publishing")
    card = client(models).request("POST", "/api/gallery", body=record, authenticated=True)
    assert isinstance(card, dict)
    PublicationReceipts(research.db.engine.url.database).save(
        study_id, f"publication:{body.revision}", card
    )
    return card


@router.get("/studies/{study_id}/publication")
def receipt(study_id: str, revision: int, *, db: DatabaseDep):
    return PublicationReceipts(db.engine.url.database).get(study_id, f"publication:{revision}")


@router.get("/community")
def community(
    *,
    models: LanguageModelsDep,
    world: str = "",
    model: str = "",
    tag: str = "",
    sort: str = "newest",
    offset: int = 0,
):
    from urllib.parse import urlencode

    return client(models).request(
        "GET",
        "/api/gallery?"
        + urlencode({"world": world, "model": model, "tag": tag, "sort": sort, "offset": offset}),
    )


@router.get("/community/filters")
def gallery_filters(*, models: LanguageModelsDep):
    return client(models).request("GET", "/api/gallery/filters")


@router.get("/community/mine")
def mine(*, models: LanguageModelsDep):
    return client(models).request("GET", "/api/gallery/mine", authenticated=True)


@router.delete("/community/{author}/{slug}")
def unpublish(author: str, slug: str, version: int, *, models: LanguageModelsDep):
    return client(models).request(
        "DELETE", f"/api/gallery/{author}/{slug}?version={version}", authenticated=True
    )


@router.post("/community/fork")
def fork(body: ForkPublication, *, research: ResearchDep, models: LanguageModelsDep):
    return {"id": download_fork(client(models), body.target, research)}
