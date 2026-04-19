from sqlalchemy import text
from app.db.base import engine


def test_db_connection():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1")).scalar()
    assert result == 1


def test_core_tables_exist():
    expected = {"cvs", "jobs", "analyses", "applications"}
    query = text(
        "SELECT table_name FROM information_schema.tables "
        "WHERE table_schema = 'public'"
    )
    with engine.connect() as conn:
        rows = conn.execute(query).fetchall()
    found = {row[0] for row in rows}
    missing = expected - found
    assert not missing, f"Missing tables: {missing}"
