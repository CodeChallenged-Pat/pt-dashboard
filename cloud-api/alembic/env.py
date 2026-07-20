"""Alembic env.py — synchronous, using psycopg2."""
import sys
from pathlib import Path

# Ensure app is on path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
from app.models.all import Base
from app.config import settings

config = context.config
if config.config_file_name:
    fileConfig(config.config_file_name)

# Override sqlalchemy.url from our settings
config.set_main_option("sqlalchemy.url", settings.database_url)

target_metadata = Base.metadata


def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
