import copy

import pytest
from agent_sim.gallery_api import create_gallery_app
from fastapi.testclient import TestClient


@pytest.fixture
def gallery(tmp_path):
    app = create_gallery_app(tmp_path / "gallery", static_dir=tmp_path / "static")
    (tmp_path / "static").mkdir()
    (tmp_path / "static" / "index.html").write_text(
        '<html><head></head><body><div id="root"></div></body></html>'
    )
    service = app.state.gallery
    account = service.account(
        {"id": 17, "login": "researcher", "created_at": "2020-01-01T00:00:00Z"}
    )
    token = service.issue_token(account, "publish")
    with TestClient(app, base_url="http://localhost") as client:
        yield client, service, token


def test_publish_public_read_split_files_social_metadata_and_unpublish(gallery, publication):
    client, service, token = gallery
    record = publication[0]
    assert client.post("/api/gallery", json=record).status_code == 401
    response = client.post(
        "/api/gallery", json=record, headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200, response.text
    card = response.json()
    path = f"/api/gallery/researcher/{card['slug']}"
    assert client.get("/api/gallery").json() == []  # default unlisted
    index = client.get(path).json()
    assert all(row["verified"] for row in index["verification"])
    assert "record" not in index["runs"][0]
    rid = index["runs"][0]["id"]
    assert (
        client.get(f"{path}/runs/{rid}?version=1").json()["record"] == record["runs"][0]["record"]
    )
    assert client.get(f"{path}/record?version=1").json() == record
    assert client.get(f"/social/researcher/{card['slug']}/v1.png").content.startswith(b"\x89PNG")
    page = client.get(f"/p/researcher/{card['slug']}/v1")
    assert 'property="og:image"' in page.text and "noindex,nofollow" in page.text
    assert "no-store" in page.headers["cache-control"]
    assert (
        client.delete(path + "?version=1", headers={"Authorization": f"Bearer {token}"}).status_code
        == 200
    )
    for suffix in ("", "/record?version=1", f"/runs/{rid}?version=1"):
        assert client.get(path + suffix).status_code == 404
    assert client.get(f"/social/researcher/{card['slug']}/v1.png").status_code == 404
    assert client.get(f"/p/researcher/{card['slug']}/v1").status_code == 404
    row = service.publication("researcher", card["slug"], 1, allow_removed=True)
    assert row["content_hash"] == card["sha256"]


def test_independent_replay_does_not_trust_client_badges(gallery, publication):
    client, _, token = gallery
    record = copy.deepcopy(publication[0])
    record["runs"][0]["evidence"][1]["state_hash"] = "forged"
    record["description"]["visibility"] = "public"
    response = client.post(
        "/api/gallery", json=record, headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200, response.text
    card = response.json()
    assert not card["verified"]
    index = client.get(f"/api/gallery/researcher/{card['slug']}").json()
    assert "State mismatch" in index["verification"][0]["reason"]
    assert len(client.get("/api/gallery?world=commons").json()) == 1
    assert client.get("/api/gallery?tag=absent").json() == []


def test_my_publications_only_lists_the_authenticated_owners_records(gallery, publication):
    client, service, token = gallery
    record = copy.deepcopy(publication[0])
    record["description"]["visibility"] = "public"
    headers = {"Authorization": f"Bearer {token}"}
    own = client.post("/api/gallery", json=record, headers=headers).json()
    other = service.account({"id": 18, "login": "other", "created_at": "2020-01-01T00:00:00Z"})
    other_headers = {"Authorization": f"Bearer {service.issue_token(other, 'publish')}"}
    public = client.post("/api/gallery", json=record, headers=other_headers).json()
    record["description"]["visibility"] = "unlisted"
    private = client.post("/api/gallery", json=record, headers=headers).json()
    assert {row["id"] for row in client.get("/api/gallery").json()} == {own["id"], public["id"]}
    assert {row["id"] for row in client.get("/api/gallery/mine", headers=headers).json()} == {
        own["id"],
        private["id"],
    }
    assert [row["id"] for row in client.get("/api/gallery/mine", headers=other_headers).json()] == [
        public["id"]
    ]


def test_scans_and_permissions_cannot_be_bypassed(gallery, publication):
    client, service, token = gallery
    record = copy.deepcopy(publication[0])
    record["description"]["notes"] = "sk-proj-canary_real_credential_1234567890"
    headers = {"Authorization": f"Bearer {token}"}
    assert client.post("/api/gallery", json=record, headers=headers).status_code == 422
    assert client.get("/api/gallery-account/tokens", headers=headers).status_code == 401
    assert (
        client.post(
            "/api/gallery",
            json=publication[0],
            headers={**headers, "Origin": "https://evil.example"},
        ).status_code
        == 403
    )
    other = service.account({"id": 18, "login": "other", "created_at": "2020-01-01T00:00:00Z"})
    other_token = service.issue_token(other, "publish")
    card = client.post("/api/gallery", json=publication[0], headers=headers).json()
    assert (
        client.delete(
            f"/api/gallery/researcher/{card['slug']}?version=1",
            headers={"Authorization": f"Bearer {other_token}"},
        ).status_code
        == 401
    )
    with pytest.raises(ValueError, match="seven days"):
        from datetime import UTC, datetime

        service.account({"id": 19, "login": "new", "created_at": datetime.now(UTC).isoformat()})


def test_publications_are_immutable_and_daily_limit_includes_unpublished(gallery, publication):
    client, service, token = gallery
    headers = {"Authorization": f"Bearer {token}"}
    cards = [
        client.post("/api/gallery", json=publication[0], headers=headers).json() for _ in range(10)
    ]
    assert [card["version"] for card in cards] == list(range(1, 11))
    assert (
        client.delete(
            f"/api/gallery/researcher/{cards[0]['slug']}?version=1", headers=headers
        ).status_code
        == 200
    )
    assert client.post("/api/gallery", json=publication[0], headers=headers).status_code == 422


def test_device_login_requires_browser_approval_and_tokens_are_revocable(gallery, monkeypatch):
    client, service, _ = gallery
    monkeypatch.setenv("JAS_GITHUB_CLIENT_ID", "public-test-client-id")
    device = client.post("/auth/device").json()
    assert (
        client.post("/auth/device/token", json={"device_code": device["device_code"]}).status_code
        == 202
    )
    assert (
        client.post(
            "/api/gallery-account/device-approval", json={"user_code": device["user_code"]}
        ).status_code
        == 401
    )
    session = service.issue_token(17, "session")
    client.cookies.set("jas_gallery_session", session)
    assert (
        client.post(
            "/api/gallery-account/device-approval", json={"user_code": device["user_code"]}
        ).status_code
        == 200
    )
    with service.connect() as db:
        db.execute("UPDATE devices SET polled=0")
    result = client.post("/auth/device/token", json={"device_code": device["device_code"]})
    assert result.status_code == 200
    token = result.json()["access_token"]
    assert service.authenticate(token)["scope"] == "publish"
    tokens = client.get("/api/gallery-account/tokens").json()
    token_id = next(
        row["id"]
        for row in tokens
        if row["id"] == __import__("hashlib").sha256(token.encode()).hexdigest()
    )
    assert client.delete(f"/api/gallery-account/tokens/{token_id}").status_code == 200
    with pytest.raises(PermissionError):
        service.authenticate(token)
    assert (
        client.post("/auth/device/token", json={"device_code": device["device_code"]}).status_code
        == 422
    )


def test_gallery_never_initializes_runner_or_model_services(gallery):
    client, service, _ = gallery
    assert not hasattr(client.app.state, "engine")
    assert not hasattr(client.app.state, "models")
    assert client.post("/api/studies", json={}).status_code == 405
    assert client.get("/api/settings").status_code == 404


def test_fork_on_a_separate_machine_preserves_protocol_lineage_without_spending(
    gallery, publication, tmp_path
):
    from agent_sim.db import Database
    from agent_sim.llm import LanguageModels
    from agent_sim.public_records import verify_record
    from agent_sim.publishing import PublicationReceipts, fork_record
    from agent_sim.research import Research

    client, _, token = gallery
    source = publication[0]
    card = client.post(
        "/api/gallery", json=source, headers={"Authorization": f"Bearer {token}"}
    ).json()
    downloaded = client.get(f"/api/gallery/researcher/{card['slug']}/record?version=1").json()
    assert all(row["verified"] for row in verify_record(downloaded))
    db = Database(f"sqlite:///{tmp_path}/other-machine/workspace.sqlite3", ceiling=0)
    models = LanguageModels(db)
    research = Research(db, models)
    lineage = {"author": "researcher", "slug": card["slug"], "version": 1, "sha256": card["sha256"]}
    try:
        sid = fork_record(research, downloaded, lineage)
        assert research.study(sid)["design"] == source["experiment"]["design"]
        assert models.usage()["requests"] == 0
        assert PublicationReceipts(db.engine.url.database).get(sid, "lineage") == lineage
    finally:
        research.environments.close()
        research.extensions.close()
        db.close()
