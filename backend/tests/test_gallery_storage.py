import io

import pytest
from agent_sim.gallery_storage import S3Objects


def test_s3_uses_the_configured_addressing_and_conditional_private_writes(monkeypatch):
    pytest.importorskip("boto3")
    from botocore.response import StreamingBody
    from botocore.stub import Stubber

    for name, value in {
        "BUCKET": "records",
        "ENDPOINT": "https://objects.example",
        "REGION": "auto",
        "ADDRESSING_STYLE": "virtual",
        "ACCESS_KEY_ID": "test-key",
        "SECRET_ACCESS_KEY": "test-secret",
    }.items():
        monkeypatch.setenv(f"JAS_GALLERY_S3_{name}", value)
    objects = S3Objects()
    assert objects.client.meta.config.s3["addressing_style"] == "virtual"
    assert objects.client.meta.endpoint_url == "https://objects.example"
    with Stubber(objects.client) as stub:
        stub.add_response(
            "put_object",
            {},
            {
                "Bucket": "records",
                "Key": "record.json",
                "Body": b"{}",
                "ContentType": "application/json",
                "IfNoneMatch": "*",
            },
        )
        stub.add_response(
            "get_object",
            {"Body": StreamingBody(io.BytesIO(b"{}"), 2)},
            {"Bucket": "records", "Key": "record.json"},
        )
        objects.put("record.json", b"{}", "application/json")
        assert objects.get("record.json") == b"{}"
        stub.assert_no_pending_responses()
