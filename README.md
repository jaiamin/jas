<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/readme-dark.png" />
  <img src="docs/assets/readme-light.png" alt="JAS, with its pixel logo and cloud background" width="1200" height="200" />
</picture>
<br><br>

Controlled, replayable experiments on AI agents. Compare matched conditions,
inspect what each agent saw, and share evidence others can replay and fork.

[Documentation](https://jas.mintlify.site) · [Quickstart](https://jas.mintlify.site/quickstart) ·
[Replay](docs/assets/replay.gif) · [Development](docs/DEVELOPMENT.md) · [MIT License](LICENSE)

## Run locally

```sh
docker compose up --build
```

Open [localhost:8080](http://localhost:8080). Your workspace persists when you stop it.
Explore eight examples without a key or account, then add models and spending
limits in Settings.

[Setup and backups](docs/INSTALLATION.md) · [Contributing](docs/DEVELOPMENT.md)

Publishing sends reviewed evidence to a separate gallery, excluding provider keys
and Assistant chats. Replay checks consequences without model calls; findings do
not establish human validity.
