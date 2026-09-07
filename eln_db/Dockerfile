FROM python:3.14-slim

# uv 本体を公式イメージからコピー
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app

# 依存だけ先に入れる。pyproject/uv.lock が変わらない限りこの層はキャッシュされる
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# アプリ本体
COPY eln_db/ ./eln_db/

# 仮想環境の bin を PATH に通し、uv run を介さず直接呼べるようにする
ENV PATH="/app/.venv/bin:$PATH"

WORKDIR /app/eln_db
EXPOSE 8000

# 起動時にマイグレーションを流してからサーバーを立ち上げる
# exec で uvicorn を PID 1 にし、停止シグナルが正しく届くようにする
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn main:app --host 0.0.0.0 --port 8000"]