# SQLAlchemy vs Supabase Client in HireLens

## Why HireLens uses the Supabase client for runtime queries

HireLens's API routes call Supabase via the `supabase-py` PostgREST client. This gives us:

- **Row-Level Security (RLS)** — Supabase enforces per-user policies at the DB level. The client forwards the user's JWT automatically, so every query is already scoped to the right user without extra WHERE clauses in Python.
- **Zero connection management** — PostgREST runs as a separate service; no connection pool to tune on the FastAPI side.
- **Realtime + Storage** — The Supabase client bundles auth, storage, and realtime subscriptions that SQLAlchemy cannot replicate.
- **Speed of iteration** — For a solo or small team, writing `supabase.table("cvs").select("*").eq("user_id", uid).execute()` is faster than defining SQLAlchemy queries and managing sessions.

## When you would switch to SQLAlchemy for runtime queries

| Signal | Why SQLAlchemy wins |
|---|---|
| Complex multi-table JOINs | SQLAlchemy ORM / Core produces readable, composable queries; PostgREST JOINs are limited |
| Bulk writes or upserts | SQLAlchemy's `bulk_insert_mappings` is far faster than looping PostgREST calls |
| Database portability | SQLAlchemy supports PostgreSQL, MySQL, SQLite — useful for local test DBs |
| Large team | Typed models + IDE autocompletion reduce onboarding time |
| Advanced transactions | SQLAlchemy gives explicit `session.begin()` / savepoints across multiple tables |

## How Alembic migrations work vs Supabase dashboard migrations

**Supabase dashboard migrations**
- Written as raw SQL in the Supabase UI or via `supabase/migrations/` SQL files.
- Applied manually or via the Supabase CLI (`supabase db push`).
- Tightly coupled to Supabase-specific features (RLS policies, triggers, `auth.users`).

**Alembic migrations**
- Python scripts (`alembic/versions/`) generated from SQLAlchemy model diffs.
- Tracked in a `alembic_version` table so Alembic knows which revision the DB is on.
- Database-agnostic; the same migration runs on local Postgres, staging, and production.
- Support `upgrade` (apply) and `downgrade` (rollback) in the same file.

HireLens keeps both: Alembic for schema evolution tracked in git, Supabase dashboard for RLS policy management.

## How to run the migration

1. Add `DATABASE_URL` to your `.env` (use the Supabase **direct connection** string, not the pooler):
   ```
   DATABASE_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Apply all pending migrations:
   ```bash
   cd backend
   alembic upgrade head
   ```

4. Roll back one step if needed:
   ```bash
   alembic downgrade -1
   ```

5. Generate a new migration after editing `app/db/models.py`:
   ```bash
   alembic revision --autogenerate -m "describe your change"
   ```
