import base64

import pytest
from agent_sim.api import create_app
from fastapi.testclient import TestClient


@pytest.fixture
def protected(tmp_path, monkeypatch):
    monkeypatch.setenv("JAS_AUTH_USERNAME", "researcher")
    monkeypatch.setenv("JAS_AUTH_PASSWORD", "test-password:with-colon")
    static = tmp_path / "static"
    (static / "assets").mkdir(parents=True)
    (static / "index.html").write_text("<html>Private workspace</html>")
    (static / "assets" / "bundle.js").write_text("export default 1;")
    app = create_app(f"sqlite:///{tmp_path}/private.sqlite3", static_dir=static)
    with TestClient(app, base_url="http://localhost") as client:
        yield client


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("GET", "/"),
        ("GET", "/agent"),
        ("GET", "/assets/bundle.js"),
        ("GET", "/api/settings"),
        ("GET", "/api/studies/missing/export"),
        ("GET", "/api/chats/missing/events"),
        ("GET", "/api/docs"),
        ("GET", "/api/openapi.json"),
        ("POST", "/api/chats"),
        ("POST", "/api/health"),
        ("OPTIONS", "/api/settings"),
    ],
)
def test_unauthenticated_requests_cannot_read_or_start_work(protected, method, path):
    response = protected.request(method, path)
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == 'Basic realm="JAS", charset="UTF-8"'
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["x-content-type-options"] == "nosniff"
    protected.auth = ("researcher", "test-password:with-colon")
    assert protected.get("/api/settings").json()["usage"]["requests"] == 0
    assert protected.get("/api/chats").json() == []


@pytest.mark.parametrize(
    "authorization",
    [
        "Bearer other",
        "Basic !invalid-base64!",
        "Basic ü",
        "Basic " + base64.b64encode(b"researcher").decode(),
        "Basic " + base64.b64encode(b"researcher:wrong").decode(),
        "Basic " + base64.b64encode(b"other:test-password:with-colon").decode(),
        "Basic " + base64.b64encode(b"\xff:\xff").decode(),
    ],
)
def test_bad_credentials_are_rejected_without_server_errors(protected, authorization):
    # Latin-1 ASGI bytes also cover a malformed non-ASCII header from a raw client.
    response = protected.get(
        "/api/settings", headers={"Authorization": authorization.encode("latin-1")}
    )
    assert response.status_code == 401
    assert response.json() == {"detail": "Authentication required"}


def test_correct_credentials_cover_spa_api_assets_and_origin_guard(protected, design):
    protected.auth = ("researcher", "test-password:with-colon")
    assert "Private workspace" in protected.get("/agent").text
    assert protected.get("/assets/bundle.js").text == "export default 1;"
    assert protected.get("/api/settings").status_code == 200
    assert protected.get("/api/settings").headers["cache-control"] == "private, no-store"
    assert protected.get("/api/openapi.json").status_code == 200
    assert protected.post("/api/studies", json={"design": design.model_dump()}).status_code == 201
    assert (
        protected.post(
            "/api/studies",
            json={"design": design.model_dump()},
            headers={"Origin": "https://unrelated.example"},
        ).status_code
        == 403
    )
    assert protected.get("/api/settings", headers={"Host": "untrusted.example"}).status_code == 400


def test_health_remains_public_but_exemption_does_not_cover_other_paths(protected):
    assert protected.get("/api/health").json() == {"status": "ok", "version": "0.2.0"}
    assert protected.head("/api/health").status_code != 401
    assert protected.get("/api/health/").status_code == 401
    assert protected.get("/api/health/../settings").status_code == 401


@pytest.mark.parametrize(
    ("username", "password"), [("researcher", ""), ("", "password"), ("name:invalid", "pw")]
)
def test_incomplete_or_invalid_auth_configuration_fails_before_opening_database(
    tmp_path, monkeypatch, username, password
):
    monkeypatch.setenv("JAS_AUTH_USERNAME", username)
    monkeypatch.setenv("JAS_AUTH_PASSWORD", password)
    database = tmp_path / "not-created.sqlite3"
    with pytest.raises(ValueError, match="JAS_AUTH_"):
        create_app(f"sqlite:///{database}")
    assert not database.exists()


def test_local_use_without_auth_still_works(tmp_path, monkeypatch):
    monkeypatch.delenv("JAS_AUTH_USERNAME", raising=False)
    monkeypatch.delenv("JAS_AUTH_PASSWORD", raising=False)
    with TestClient(
        create_app(f"sqlite:///{tmp_path}/local.sqlite3"), base_url="http://localhost"
    ) as client:
        assert client.get("/api/settings").status_code == 200


@pytest.mark.parametrize(
    "configuration",
    [{"JAS_REQUIRE_AUTH": "1"}, {"JAS_ALLOWED_HOSTS": "localhost,workspace.example"}],
)
def test_hosted_service_requires_authentication(tmp_path, monkeypatch, configuration):
    monkeypatch.delenv("JAS_AUTH_USERNAME", raising=False)
    monkeypatch.delenv("JAS_AUTH_PASSWORD", raising=False)
    for key, value in configuration.items():
        monkeypatch.setenv(key, value)
    with pytest.raises(ValueError, match="before private hosted access"):
        create_app(f"sqlite:///{tmp_path}/public.sqlite3")
