"""Immutable publication objects; reads always pass through the publication gate."""

import gzip
import os
from pathlib import Path
from typing import Protocol


class ObjectStore(Protocol):
    def put(self, key: str, value: bytes, content_type: str) -> None: ...
    def get(self, key: str) -> bytes: ...


class FileObjects:
    def __init__(self, directory: Path):
        self.directory = directory
        directory.mkdir(parents=True, exist_ok=True)

    def put(self, key: str, value: bytes, content_type: str) -> None:
        path = self.directory / key
        path.parent.mkdir(parents=True, exist_ok=True)
        try:
            with path.open("xb") as output:
                output.write(value)
        except FileExistsError:
            if path.read_bytes() != value:
                raise ValueError("Immutable object already exists with different content") from None

    def get(self, key: str) -> bytes:
        return (self.directory / key).read_bytes()


class S3Objects:
    def __init__(self) -> None:
        try:
            import boto3
            from botocore.config import Config
        except ImportError as error:
            raise ValueError("Install jaslab[gallery] for S3 object storage") from error
        self.bucket = os.environ["JAS_GALLERY_S3_BUCKET"]
        self.client = boto3.client(
            "s3",
            endpoint_url=os.getenv("JAS_GALLERY_S3_ENDPOINT"),
            aws_access_key_id=os.environ["JAS_GALLERY_S3_ACCESS_KEY_ID"],
            aws_secret_access_key=os.environ["JAS_GALLERY_S3_SECRET_ACCESS_KEY"],
            region_name=os.getenv("JAS_GALLERY_S3_REGION", "auto"),
            config=Config(
                s3={"addressing_style": os.getenv("JAS_GALLERY_S3_ADDRESSING_STYLE", "auto")}
            ),
        )

    def put(self, key: str, value: bytes, content_type: str) -> None:
        self.client.put_object(
            Bucket=self.bucket, Key=key, Body=value, ContentType=content_type, IfNoneMatch="*"
        )

    def get(self, key: str) -> bytes:
        response = self.client.get_object(Bucket=self.bucket, Key=key)
        with response["Body"] as body:
            return body.read()


def compressed(value: bytes) -> bytes:
    return gzip.compress(value, mtime=0)
