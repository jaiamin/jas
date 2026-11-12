<img src="frontend/public/logo.svg" width="40" height="40" alt="JAS logo" />

# JAS

Design experiments on model-agent behavior, run matched trials, and inspect the evidence.
The Agent drafts reviewable protocols and answers questions about recorded runs.

- **Design:** choose enforced mechanics, participant models, information access,
  treatments, seeds and spending limits. Saving freezes an immutable revision.
- **Run:** explicitly start model-controlled participants; inspect actions, messages,
  artifact versions and costs. Pause and resume without losing committed work.
- **Understand:** declare executable outcomes, inspect evidence-linked findings and
  missingness, compare matched conditions, and investigate cutoff-scoped evidence.
  Findings and exact replay need no model calls; interpretation remains explicit.

Reusable environments define rules separately from experiments. New executable mechanics
require an explicit reviewed contract and independent admission.

Share complete evidence as [self-contained JSON](docs/DEVELOPMENT.md#evidence-downloads),
with repeated values stored once and a readable overview for external review.

```sh
cp .env.example .env
# Add provider keys to .env, then:
docker compose up --build
```

Open [localhost:8080](http://localhost:8080). Requires Docker Compose; data persists
in a named volume. The Agent defaults to OpenAI; configured Agent and participant models
also support Anthropic. See [.env.example](.env.example) for model and budget settings.
Manual setup, saved evidence and replay work without provider keys. For native development,
see [setup and checks](docs/DEVELOPMENT.md) (Python 3.13+, Node 24+, uv and pnpm 12).

For private hosted use, follow the [Railway guide](docs/DEPLOYMENT.md) for persistent
storage and password protection. Local use needs no login. Protocol checks
verify mechanics, not scientific conclusions. Model responses remain fallible; app and
harness improvements do not train model weights or establish general intelligence.

[Docs](docs/README.md) · [Development](docs/DEVELOPMENT.md) · [Architecture](docs/ARCHITECTURE.md) ·
[Research](docs/RESEARCH.md) · [Benchmarks](benchmarks/README.md) · [MIT License](LICENSE)
