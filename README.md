<img src="frontend/public/logo.svg" width="40" height="40" alt="JAS logo" />

# JAS

Design agent experiments, run matched trials, inspect decisions and compare results.
AI helps draft protocols and investigate recorded evidence.

```sh
cp .env.example .env
# Add provider keys to .env, then:
docker compose up --build
```

Open [localhost:8080](http://localhost:8080). Requires Docker Compose; data persists
in a named volume. OpenAI powers the Agent; run participants also support Anthropic.
Manual setup, saved evidence and replay work without keys.

Work in progress. Single-user local app without authentication. Experiments measure
model behavior under stated rules, not validated human predictions.

[Development](docs/DEVELOPMENT.md) · [Architecture](docs/ARCHITECTURE.md) ·
[Research](docs/RESEARCH.md) · [Benchmarks](benchmarks/README.md) · [MIT License](LICENSE)
