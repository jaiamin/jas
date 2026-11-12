"""Initialize a root-owned container volume, then exec the app without privileges."""

import os
import sys


def main() -> None:
    if not sys.argv[1:]:
        raise SystemExit("A container command is required")
    if os.geteuid() == 0:
        # Only the mount itself changes ownership. Existing files are never rewritten.
        directory = os.open("/app/data", os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
        try:
            if os.fstat(directory).st_uid not in (0, 10001):
                raise SystemExit("/app/data must be owned by root or the app user (10001)")
            os.fchown(directory, 10001, 10001)
        finally:
            os.close(directory)
        os.setgroups([])
        os.setgid(10001)
        os.setuid(10001)
    os.execvp(sys.argv[1], sys.argv[1:])


if __name__ == "__main__":
    main()
