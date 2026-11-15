# Run JAS locally

## Start with Docker

Install and start [Docker Desktop](https://www.docker.com/products/docker-desktop/)
(or Docker Engine with the Compose plugin).
[Download JAS](https://github.com/jaiamin/jas/archive/refs/heads/t3/ponytail-full-1.zip),
extract it, and open a terminal in the extracted folder:

```sh
docker compose up --build
```

Open [localhost:8080](http://localhost:8080). Docker builds and runs the app; no
Python, Node or `.env` setup is needed. The first build can take a few minutes.
Provider keys are optional for recorded examples and can be entered in Settings.

Press **Ctrl+C** to stop, or run `docker compose down` from the same folder.
Start again with `docker compose up --build`. Your experiments, runs and settings
persist in Docker's `jas-data` volume. Do not use `down --volumes` unless you
intend to erase that workspace. Keep using the same extracted folder.

To change the port, add `JAS_PORT=8088` to an optional `.env` file before starting,
then open http://localhost:8088. No other configuration is required.

## First experiment

1. Open **Learn → Examples** to watch one of eight recordings without a key or
   account. Choose **Use example** to edit its protocol.
2. Add a provider key or local endpoint and choose models in **Settings**.
3. Create an experiment and review conditions, seeds, outcomes and spending limits.
4. Choose **Create** to inspect it, or explicitly choose **Create and run**.
5. Open **Results** and a run to inspect the evidence. Playback and replay
   verification do not call models.

## Back up your workspace

**Settings → Data** downloads a consistent backup without provider keys. It includes
private observations and conversations; keep it private. Stop JAS before restoring
into a separate workspace, and preserve existing files first.

Local use needs no login. Keep the workspace on your machine; the public gallery
is a separate service. [Hosting](DEPLOYMENT.md) is for maintainers and self-hosters.

## Other installation methods

Contributors should use [Development](DEVELOPMENT.md) for source setup and checks.

If you already have a built release wheel, install Python 3.13+ and
[uv](https://docs.astral.sh/uv/getting-started/installation/), then run:

```sh
uvx --from ./jaslab-0.2.0-py3-none-any.whl jaslab
```

The wheel includes the interface and opens http://localhost:8080. Package-registry
publication is pending. Its default workspace is your platform's app-data directory;
`--workspace ./my-workspace` selects another directory and `--port 8088` changes
the port. Run only one JAS process per workspace.
