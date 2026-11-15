# Run JAS locally

JAS is a single-user workspace. You do not need Railway, a gallery account or
provider credentials to watch recorded starters, edit protocols or replay evidence.

## Release wheel

Install Python 3.13+ and [uv](https://docs.astral.sh/uv/getting-started/installation/).
From the directory containing the release wheel:

```sh
uvx --from ./jaslab-0.2.0-py3-none-any.whl jaslab
```

The bundled interface opens at http://localhost:8080. Once a package release is
published, `uvx jaslab` is the intended one-command installation. Package registry
publication has not been completed by this redesign.

Set a separate workspace or port when needed:

```sh
uvx --from ./jaslab-0.2.0-py3-none-any.whl jas --workspace ./my-workspace --port 8088
```

By default JAS uses your platform's app-data directory: `$XDG_DATA_HOME/jas`
(or `~/.local/share/jas`) on Linux, `~/Library/Application Support/jas` on macOS,
and `%LOCALAPPDATA%/jas` on Windows. `--workspace` overrides `JAS_WORKSPACE`.
An existing checkout `data/jas.sqlite3` is preserved and opened in place.
`JAS_DATABASE_URL` is an explicit override when `--workspace` is omitted.
Only one JAS process may own a workspace.

## First experiment

1. Open Learn → Examples to watch one of eight scripted recordings without a key:
   three work examples and five cooperation examples.
   Choose Use example to edit its protocol. Home's four Experiment ideas fill an
   Assistant draft without sending it.
2. Add a provider key or local endpoint in Settings. Keys stay on your machine.
3. Choose a starter or create an experiment in Quick. Review the free checks,
   run/call/cost bounds, seeds and spending caps.
4. Save to inspect the frozen protocol, or explicitly choose Save and run.
5. Open Results, a run or a same-seed matched comparison. Scrubbing and replay
   verification do not call a model.

Prices are editable estimates used for reservation/accounting, not your provider's
invoice. An unknown price stays unknown; supply a token ceiling before execution.
A token ceiling does not guarantee a dollar cost. Assistant replies show their
recorded cost, with request/token details on demand.

## Docker

```sh
cp .env.example .env
docker compose up --build
```

Open http://localhost:8080. Keys can be entered in Settings; they are optional for
recorded examples. SQLite and local configuration persist in the `jas-data` volume.
`docker compose down` stops the app and preserves data. Do not add `--volumes`
unless you deliberately intend to erase that workspace.

The default image is the private workspace. The separate `gallery` build target
serves public records and cannot run experiments. See [hosting](DEPLOYMENT.md).

## Data and access

Settings → Data downloads a consistent all-data ZIP, excluding provider keys.
It contains private observations and conversations; keep backups private. Stop
JAS before restoring to a separate directory, and preserve existing files first.

Localhost needs no login. LAN/private hosting requires explicit allowed hosts and
owner authentication. Keep the host/origin checks enabled. Do not expose your
local workspace as a public gallery.
