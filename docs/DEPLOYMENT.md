# Hosting the gallery

JAS runs locally. Public sharing uses an independent, model-free gallery;
users do not deploy a server or configure a connection to browse it.
This page is for maintainers and self-hosters.

## Service and storage

```sh
docker build --build-arg JAS_IMAGE_TARGET=gallery -t jas-gallery .
```

Use one process/replica, a persistent volume at `/app/data`, port 8080 and health
path `/api/health`. Configure these service-only variables in a secret manager:

- `JAS_GALLERY_ORIGIN`: the public HTTPS origin.
- `JAS_GALLERY_DATA=/app/data`.
- `JAS_GITHUB_CLIENT_ID` and `JAS_GITHUB_CLIENT_SECRET`: a GitHub OAuth app with
  callback `<origin>/auth/github/callback`; request public identity only.
- `JAS_GALLERY_S3_*`: private S3-compatible storage; see [.env.example](../.env.example).
  Choose `virtual` or `path` addressing if the storage endpoint requires it.
- `JAS_ALLOWED_HOSTS`: optional explicit additional hostnames for health probes.

Never attach a workspace volume, copy provider keys or expose the underlying
bucket. All record reads pass through the publication-status gate. SQLite has
one writer; keep database and object-store backups together. Public origins refuse
filesystem object storage. No hosted experiment runner or PostgreSQL is needed.

The image normally runs as UID/GID 10001. If a host mounts a new volume as root,
start the entrypoint as root: it prepares only `/app/data`, clears supplementary
groups and drops privileges before starting the app. It never recursively rewrites
files, repairs old ownership or resets a database.

## Verification and maintenance

```sh
python3 .github/scripts/gallery_smoke.py jas-gallery
docker build -t jas-workspace-check .
python3 .github/scripts/deployment_smoke.py jas-workspace-check
```

These checks create disposable keyless containers and never target user data.
The workspace image remains available for local Docker use; see
[installation](INSTALLATION.md). Exposing a private workspace requires explicit
allowed hosts, HTTPS and owner authentication.

Before declaring a release live, verify deployment success, health, anonymous
browsing, real GitHub/device approval, private object writes/reads, unpublish and
cross-machine fork/replay. Automated fixtures do not prove live integrations.
See [gallery operations](GALLERY_OPERATIONS.md) for moderation and launch gates.
