FROM python:3.11-slim

WORKDIR /app

# Install deps
RUN pip install fastapi uvicorn sqlalchemy psycopg2-binary pydantic-settings 'python-jose[cryptography]' bcrypt python-multipart alembic

COPY pyproject.toml uv.lock ./
COPY app/ ./app/
COPY alembic/ ./alembic/
COPY alembic.ini ./
COPY scripts/ ./scripts/

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
