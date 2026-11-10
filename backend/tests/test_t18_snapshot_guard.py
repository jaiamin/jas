"""Name/metadata-only guard checks; protected payloads are never created or read."""

import tarfile
from pathlib import Path

from benchmarks import research_baseline
from benchmarks.t18_snapshot_guard import protected_git_selection, safe_file


def test_frozen_snapshot_selects_safe_tracked_source_before_read(tmp_path, monkeypatch):
    source = tmp_path / "backend/src"
    source.mkdir(parents=True)
    (source / "allowed.py").write_text("# safe fixture\n")
    (source / ".env.directory").mkdir()
    # Empty protected names only: no synthetic configuration payload exists.
    (source / ".env.directory/hidden.py").touch()
    (source / "pbcopy").touch()
    (source / "link.py").symlink_to("allowed.py")
    (source / "linked").symlink_to(".env.directory", target_is_directory=True)
    output = tmp_path / "output"
    output.mkdir()
    monkeypatch.setattr(research_baseline, "ROOT", tmp_path)
    import benchmarks.t18_snapshot_guard as guard

    monkeypatch.setattr(guard, "ROOT", tmp_path)

    def git_metadata(command, *args, **kwargs):
        if command[1] == "ls-files":
            return (
                b"\0".join(
                    name.encode()
                    for name in (
                        "backend/src/allowed.py",
                        "backend/src/.env.directory/hidden.py",
                        "backend/src/pbcopy",
                        "backend/src/link.py",
                        "backend/src/linked/hidden.py",
                    )
                )
                + b"\0"
            )
        if command[1:3] == ["rev-parse", "HEAD"]:
            return b"0" * 40 + b"\n"
        assert command[1:3] == ["status", "--short"]
        return b""

    monkeypatch.setattr(guard, "CHECK_OUTPUT", git_metadata)
    read = Path.read_bytes
    seen = []

    def permitted(path):
        if path.is_relative_to(source):
            assert path == source / "allowed.py"
            seen.append(path)
        return read(path)

    monkeypatch.setattr(Path, "read_bytes", permitted)
    with protected_git_selection():
        result = research_baseline.snapshot(output)
    assert list(result["files"]) == ["backend/src/allowed.py"]
    with tarfile.open(output / "source.tar.gz") as archive:
        assert archive.getnames() == ["backend/src/allowed.py"]
    assert seen == [source / "allowed.py", source / "allowed.py"]


def test_protected_names_are_rejected_before_metadata_or_payload_lookup(monkeypatch, tmp_path):
    def forbidden(*args, **kwargs):
        raise AssertionError("Protected name reached a filesystem lookup")

    monkeypatch.setattr(Path, "lstat", forbidden)
    for name in ("backend/src/.env/x.py", "backend/pbcopy", "../other.py", "/absolute.py"):
        assert not safe_file(tmp_path, name)
