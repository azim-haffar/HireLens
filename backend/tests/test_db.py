"""
Integration test: connects to the real DB (requires DATABASE_URL in .env),
inserts a profile row, reads it back, asserts fields match, then deletes it.

Run with:  pytest tests/test_db.py -v
"""
import uuid
import pytest
from sqlalchemy import text
from app.db.base import SessionLocal
from app.db.models import Profile


@pytest.fixture()
def db():
    session = SessionLocal()
    yield session
    session.close()


def test_profile_insert_read_delete(db):
    test_id = uuid.uuid4()
    test_email = f"test_{test_id}@hirelens-test.invalid"
    test_name = "Test User"

    profile = Profile(id=test_id, email=test_email, full_name=test_name)
    db.add(profile)
    db.commit()

    fetched = db.get(Profile, test_id)
    assert fetched is not None
    assert fetched.email == test_email
    assert fetched.full_name == test_name

    db.delete(fetched)
    db.commit()

    assert db.get(Profile, test_id) is None
