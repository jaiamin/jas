import httpx
import pytest
from agent_sim.publishing import DEFAULT_GALLERY_ORIGIN, GalleryError, Publisher


def mock_gallery(monkeypatch, handler):
    client = httpx.Client(transport=httpx.MockTransport(handler))
    monkeypatch.setattr(httpx, "Client", lambda **_kwargs: client)


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
