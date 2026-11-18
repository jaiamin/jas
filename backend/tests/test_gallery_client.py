import httpx
import pytest
from agent_sim.api import create_app
from agent_sim.publishing import DEFAULT_GALLERY_ORIGIN, GalleryError, Publisher, download_fork
from fastapi.testclient import TestClient


def mock_gallery(monkeypatch, handler):
    client = httpx.Client
    monkeypatch.setattr(
        httpx, "Client", lambda **_kwargs: client(transport=httpx.MockTransport(handler))
    )


def test_anonymous_browsing_never_reads_or_sends_a_publishing_token(monkeypatch):
    def no_keychain(_self):
        pytest.fail("Anonymous reading must not touch the OS keychain")

    def response(request):
        assert "authorization" not in request.headers
        return httpx.Response(200, json=[])

    monkeypatch.setattr(Publisher, "token", no_keychain)
    mock_gallery(monkeypatch, response)
    assert Publisher("https://gallery.example").request("GET", "/api/gallery") == []


@pytest.mark.parametrize("upstream,expected", [(401, 401), (403, 401), (500, 503), (302, 503)])
def test_gallery_errors_classify_auth_and_unavailability_without_exposing_upstream_details(
    monkeypatch, upstream, expected
):
    mock_gallery(
        monkeypatch,
        lambda _request: httpx.Response(upstream, json={"detail": "private upstream diagnostic"}),
    )
    with pytest.raises(GalleryError) as failure:
        Publisher("https://gallery.example").request("GET", "/api/gallery")
    assert failure.value.status_code == expected
    assert "private upstream diagnostic" not in str(failure.value)


def test_gallery_transport_failure_is_recoverable_without_suggesting_local_setup(monkeypatch):
    def disconnected(request):
        raise httpx.ConnectError("private network diagnostic", request=request)

    mock_gallery(monkeypatch, disconnected)
    with pytest.raises(GalleryError, match="local experiments still work") as failure:
        Publisher("https://gallery.example").request("GET", "/api/gallery")
    assert failure.value.status_code == 503


def test_changing_gallery_origins_never_reuses_the_original_keychain_namespace(monkeypatch):
    seen = []
    monkeypatch.setattr(
        "agent_sim.publishing.keyring.get_password",
        lambda service, username: seen.append((service, username)),
    )
    Publisher("https://one.example").token()
    Publisher("https://two.example").token()
    assert seen == [
        ("jas-gallery:https://one.example", "publisher"),
        ("jas-gallery:https://two.example", "publisher"),
    ]


def test_gallery_uses_the_official_https_origin_with_explicit_overrides(monkeypatch):
    monkeypatch.delenv("JAS_GALLERY_URL", raising=False)
    assert Publisher().origin == DEFAULT_GALLERY_ORIGIN
    assert DEFAULT_GALLERY_ORIGIN.startswith("https://")
    monkeypatch.setenv("JAS_GALLERY_URL", "https://self-hosted.example/")
    assert Publisher().origin == "https://self-hosted.example"
    assert Publisher("http://localhost:18141").origin == "http://localhost:18141"


def test_workspace_device_login_saves_only_an_approved_token(monkeypatch, tmp_path):
    device = {
        "device_code": "d" * 40,
        "user_code": "ABCD1234",
        "verification_uri": "https://gallery.example/login?user_code=ABCD1234",
        "expires_in": 600,
        "interval": 5,
    }
    replies = iter([device, {"status": "pending"}, {"access_token": "approved-device-token"}])
    saved = []
    monkeypatch.setattr(Publisher, "token", lambda _self: None)
    monkeypatch.setattr(Publisher, "save_token", lambda _self, token: saved.append(token))
    mock_gallery(monkeypatch, lambda _request: httpx.Response(200, json=next(replies)))

    app = create_app(f"sqlite:///{tmp_path}/login.sqlite3")
    with TestClient(app, base_url="http://localhost") as client:
        assert client.post("/api/publishing/login", json={}).json() == device
        poll = {"device_code": device["device_code"]}
        assert client.post("/api/publishing/login/poll", json=poll).json() == {"status": "pending"}
        assert saved == []
        assert client.post("/api/publishing/login/poll", json=poll).json() == {
            "status": "signed_in"
        }
    assert saved == ["approved-device-token"]


@pytest.mark.parametrize("reply", [[], {}, {"access_token": 42}, {"access_token": "has a space"}])
def test_workspace_device_poll_rejects_invalid_success_responses(monkeypatch, tmp_path, reply):
    def save_token(_self, _token):
        pytest.fail("Invalid token must never reach the keychain")

    monkeypatch.setattr(Publisher, "save_token", save_token)
    mock_gallery(monkeypatch, lambda _request: httpx.Response(200, json=reply))

    app = create_app(f"sqlite:///{tmp_path}/login.sqlite3")
    with TestClient(app, base_url="http://localhost") as client:
        response = client.post("/api/publishing/login/poll", json={"device_code": "d" * 40})
    assert response.status_code == 503
    assert "invalid" in response.json()["detail"]


def test_device_login_rejects_a_non_http_approval_url(monkeypatch):
    monkeypatch.setattr(Publisher, "token", lambda _self: None)
    mock_gallery(
        monkeypatch,
        lambda _request: httpx.Response(
            200,
            json={
                "device_code": "d" * 40,
                "user_code": "ABCD1234",
                "verification_uri": "file:///tmp/approval",
                "expires_in": 600,
                "interval": 5,
            },
        ),
    )
    with pytest.raises(GalleryError, match="invalid sign-in details"):
        Publisher("https://gallery.example").begin_login()


def test_fork_rejects_a_different_version_before_requesting_evidence(monkeypatch, runtime):
    paths = []

    def response(request):
        paths.append(str(request.url))
        return httpx.Response(200, json={"publication": {"version": 2}})

    mock_gallery(monkeypatch, response)
    _, _, research, _ = runtime
    with pytest.raises(GalleryError, match="different publication version"):
        download_fork(Publisher("https://gallery.example"), "author/example/v1", research)
    assert paths == ["https://gallery.example/api/gallery/author/example?version=1"]
