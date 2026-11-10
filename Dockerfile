FROM node:24-bookworm-slim AS frontend
WORKDIR /build
RUN npm install --global pnpm@12.18.0
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
COPY backend/tests/fixtures/t17_cosigned_escrow_contract.json /backend/tests/fixtures/
RUN pnpm build

FROM python:3.13-slim-bookworm
WORKDIR /app
ENV PYTHONUNBUFFERED=1 UV_LINK_MODE=copy UV_COMPILE_BYTECODE=1 \
    PATH="/app/.venv/bin:$PATH" JAS_STATIC_DIR=/app/frontend/dist
RUN pip install --no-cache-dir uv==0.13.7
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY backend/src/ backend/src/
RUN uv sync --frozen --no-dev && \
    groupadd --gid 10001 app && useradd --uid 10001 --gid app --no-create-home app && \
    mkdir -p /app/data && chown app:app /app/data
COPY --from=frontend /build/dist/ frontend/dist/
USER 10001:10001
EXPOSE 8080
HEALTHCHECK --interval=20s --timeout=3s --start-period=10s \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/api/health', timeout=2)"
CMD ["jas", "--host", "0.0.0.0", "--port", "8080"]
