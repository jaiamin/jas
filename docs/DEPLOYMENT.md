# Hosting JAS

JAS runs locally without hosted infrastructure. Public sharing uses a separate
model-free gallery; never expose a runner database to implement public replay.
Private remote hosting remains optional for an owner's own workspace.

## Public gallery

Build the explicit gallery image, leaving the default workspace target unchanged:

```sh
docker build --target gallery -t jas-gallery .
```

Configure a separate service with `/app/data` persistent storage, one process and
health path `/api/health` on port 8080. Set `JAS_GALLERY_ORIGIN` to its HTTPS origin,
`JAS_GALLERY_DATA=/app/data`, GitHub OAuth client ID/secret, and the
`JAS_GALLERY_S3_*` private bucket settings from [.env.example](../.env.example).
Register the OAuth callback at `https://YOUR-GALLERY/auth/github/callback`.
The image includes the optional object-storage dependency. Public origins refuse
the local filesystem object store; localhost may use it for disposable testing.

Do not copy `.env`, provider keys, workspace credentials or the existing runner's
volume into this service. Reading is anonymous; publishing uses GitHub and scoped,
revocable device tokens. Keep objects private behind the publication-status gate.
The current small catalogue uses SQLite, so one gallery replica owns its volume.
No PostgreSQL or hosted execution service is required by the MVP.

Railway may host this service and its private bucket; use a separate gallery
service/volume and select this built image/target explicitly. Review service,
storage, egress and domain costs before provisioning. The initial $10/month target
is not a measured bill or a resource authorization. Preserve any existing private
service and its data until the owner has deliberately backed up and retired it.
This redesign performs no Railway redeploy or resource deletion.

See [gallery operations](GALLERY_OPERATIONS.md) for moderation, reporting,
takedown, caching and public-launch gates. A local gallery smoke is not a live
GitHub OAuth or hosted object-storage test.

## Optional private workspace on Railway


Connect the repository's `main` branch with the repository root as the service root.
The root Dockerfile builds the frontend and Python app. In service Settings, set
health-check path `/api/health`, one replica, and a 120-second draining allowance.
Leave custom build and start commands empty, and keep Serverless/sleep disabled:
runs must survive browser disconnects. Do not add workers or replicas against the
same SQLite file. Railway owns these service settings; the repository needs no
platform SDK or deprecated `railway.json`/`railway.toml` configuration.

1. Attach a volume at **`/app/data`**. Keep this volume across redeployments.
2. Add the following service variables. Enter passwords and provider keys in Railway's
   Variables tab, never in Git or chat:

   | Variable | Value |
   | --- | --- |
   | `JAS_DATABASE_URL` | `sqlite:////app/data/jas.sqlite3` |
   | `RAILWAY_RUN_UID` | `0` |
   | `JAS_AUTH_USERNAME` | Your chosen login name |
   | `JAS_AUTH_PASSWORD` | A strong unique password |
   | `JAS_ALLOWED_HOSTS` | `localhost,127.0.0.1,[::1],YOUR-DOMAIN.up.railway.app,healthcheck.railway.app` |
   | `OPENAI_API_KEY` | Your provider key, for Assistant drafting and OpenAI participants |
   | `ANTHROPIC_API_KEY` | Optional, for Anthropic models |

3. Generate a domain under Settings → Networking, with target port **8080**. Use
   HTTPS. `PORT` and `JAS_PORT` overrides are unnecessary; the image listens on 8080.
4. Deploy. Confirm deployment status **SUCCESS**, then open `/api/health` for
   `{"status":"ok","version":"0.2.0"}`. Opening the app should request your login.
   Confirm Settings shows the intended provider availability and spending ceiling
   before explicitly starting paid work.

Railway mounts volumes as root. `RAILWAY_RUN_UID=0` lets the container entrypoint
give **only the `/app/data` directory** to UID/GID 10001, clear supplementary groups,
and drop privileges before starting JAS. The server never runs as root. The
entrypoint does not recursively change ownership, follow a symlink mount, modify
existing files or reset a database. An existing database owned by another user
requires a deliberate operator repair, not automatic rewriting.

HTTP Basic authentication protects UI, assets, API, event streams, exports and model
actions. Only GET/HEAD `/api/health` bypasses authentication. Both auth settings must
be supplied together. Non-loopback or explicitly protected hosted workspaces refuse to start without them.
Browsers remember Basic credentials; close the browser session or clear that site's
credentials when finished on a shared computer. This is a single shared login, not
accounts, roles or a public signup system.

Provider defaults and concurrency remain in [.env.example](../.env.example). The
Assistant defaults to GPT-6.1 Sol; participant models are pinned by each experiment.
`JAS_BUDGET_USD` initializes a fresh workspace's ledger ceiling; inspect Settings
and recorded usage when operating an existing workspace. No deployment test needs
live model requests. Keep production and development volumes, credentials and
budgets separate. Back up the volume through Railway before maintenance; exports
are evidence documents, not a substitute for a database backup.

## Local development and deployment checks

Native development uses the [existing setup](DEVELOPMENT.md). Leave both auth
variables empty for localhost use. `docker compose up --build` runs the identical
image as UID/GID 10001, with its own named volume. Both auth variables can be set
locally to exercise hosted access. Never start two processes on the same database.

Before changing container startup or access control:

```sh
docker build -t jas-deployment-check .
python3 .github/scripts/deployment_smoke.py jas-deployment-check
```

The smoke test creates and removes its own keyless container and root-owned volume.
It checks authentication, actual non-root execution, production World containment,
saved studies and restart persistence. CI also runs the default non-root Compose
smoke. Neither test targets a user database or spends API credits.

Official references: [volumes](https://docs.railway.com/volumes),
[health checks](https://docs.railway.com/deployments/healthchecks), and
[configuration](https://docs.railway.com/config-as-code/reference).
