# Site Agent — ProfitTrack → Cloud API Relay

Reads electronic journal data from ProfitTrack Firebird databases and relays it to the PT Dashboard cloud API.

## Prerequisites

- Python 3.8+
- Firebird 2.5 client library (fbclient.dll)
- ProfitTrack POS with PTPos.fdb database

## Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Copy and edit config
copy config.yaml.example config.yaml
# Edit config.yaml with your site details and API key
```

## Configuration

See `config.yaml.example` for all options. Key settings:

| Option | Description |
|--------|-------------|
| `cloud.api_url` | Cloud API URL |
| `cloud.api_key` | Site API key (from cloud dashboard) |
| `firebird.ptpos.database` | Path to PTPos.fdb |
| `sync.interval_seconds` | How often to check for new data |
| `sync.batch_size` | Records per POST batch |
| `sync.initial_days_back` | Days of history on first run |

## Running

```bash
# Run once (test)
python agent.py --once

# Run continuously (production)
python agent.py

# With custom config
python agent.py --config myconfig.yaml
```

## Windows Scheduled Task

To run the agent automatically on Windows:

1. Open Task Scheduler
2. Create Basic Task
3. Trigger: At startup
4. Action: Start a program
   - Program: `python`
   - Arguments: `C:\path\to\site-agent\agent.py --config C:\path\to\site-agent\config.yaml`
   - Start in: `C:\path\to\site-agent`

Or use the provided `run_agent.bat` script.

## Data Flow

```
PTPos.fdb (Firebird)
    ↓ read EJHEADER, EJPLUOBJECT, etc.
Site Agent (agent.py)
    ↓ POST /api/v1/ingest/batch
Cloud API (FastAPI)
    ↓ upsert into Postgres
Dashboard (React)
    ↓ query API
User views data
```

## State

Sync state is stored in `sync_state.db` (SQLite). This tracks:
- `last_ej_header_id` — last transaction ID synced
- `last_sync_ts` — timestamp of last sync
- `records_synced` — cumulative count
