import os


def setting(name: str, default: str) -> str:
    return os.getenv(f"JAS_{name}") or default
