<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/readme-dark.png" />
  <img src="docs/assets/readme-light.png" alt="JAS, with its pixel logo and cloud background" width="1200" />
</picture>

Controlled, replayable experiments on AI agents. Compare matched conditions,
inspect what each agent saw, and share evidence others can replay and fork.

[Documentation](https://jas.mintlify.site) · [Quickstart](https://jas.mintlify.site/quickstart) ·
[Replay](docs/assets/replay.gif) · [Development](docs/DEVELOPMENT.md) · [MIT License](LICENSE)

## Run locally

Install and start [Docker Desktop](https://www.docker.com/products/docker-desktop/).
[Download JAS](https://github.com/jaiamin/jas/archive/refs/heads/t3/ponytail-full-1.zip),
extract it, and open a terminal in that folder:

```sh
docker compose up --build
```

Open [localhost:8080](http://localhost:8080). Docker builds and runs the app;
no Python, Node or `.env` setup needed. Your workspace persists when you stop it.
Explore eight examples without a key or account, then add models and spending
limits in Settings. Saving never starts a run.

[Setup and backups](docs/INSTALLATION.md) · [Contributing](docs/DEVELOPMENT.md)

Publishing sends reviewed evidence to a separate gallery, excluding provider keys
and Assistant chats. Replay checks consequences without model calls; findings do
not establish human validity.
