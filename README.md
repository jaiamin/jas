<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/readme-dark.png" />
  <img src="docs/assets/readme-light.png" alt="JAS, with its pixel logo and cloud background" width="1200" />
</picture>

Controlled, replayable experiments on AI agents. Compare matched conditions,
inspect what each agent saw, and share evidence others can replay and fork.

[Documentation](https://jas.mintlify.site) · [Quickstart](https://jas.mintlify.site/quickstart) ·
[Replay](docs/assets/replay.gif) · [Development](docs/DEVELOPMENT.md) · [MIT License](LICENSE)

## Run locally

MVP preview on `t3/ponytail-full-1`. Requires Python 3.13+,
[uv](https://docs.astral.sh/uv/), Node.js 24+ and pnpm 12.

```sh
git clone --branch t3/ponytail-full-1 --single-branch https://github.com/jaiamin/jas.git
cd jas
uv sync --frozen
pnpm --dir frontend install --frozen-lockfile
pnpm --dir frontend build
uv run jas --workspace ./data/workspace
```

Open [localhost:8080](http://localhost:8080). Explore eight scripted examples
without a key or account, then bring your own models and spending limits.
Saving never starts a run. [Wheels and Docker](docs/INSTALLATION.md) are supported;
package-registry publication is pending.

Publishing sends reviewed evidence to a separate gallery, excluding provider keys
and Assistant chats. Replay checks consequences without model calls; findings do
not establish human validity.
