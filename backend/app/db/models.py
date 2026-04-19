import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Text, DateTime, ForeignKey, Index
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.base import Base


def _uuid():
    return str(uuid.uuid4())


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(Text, nullable=False, unique=True)
    full_name = Column(Text)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    cvs = relationship("CV", back_populates="owner", cascade="all, delete-orphan")
    jobs = relationship("Job", back_populates="owner", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="owner", cascade="all, delete-orphan")


class CV(Base):
    __tablename__ = "cvs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    version_label = Column(Text)
    file_url = Column(Text)
    parsed_data = Column(JSONB)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    owner = relationship("Profile", back_populates="cvs")
    analyses = relationship("Analysis", back_populates="cv", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="cv")
    comparisons_v1 = relationship("CVComparison", foreign_keys="CVComparison.cv_v1_id", back_populates="cv_v1")
    comparisons_v2 = relationship("CVComparison", foreign_keys="CVComparison.cv_v2_id", back_populates="cv_v2")

    __table_args__ = (Index("idx_cvs_user_id", "user_id"),)


class Job(Base):
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    title = Column(Text)
    source_url = Column(Text)
    raw_description = Column(Text)
    requirements = Column(JSONB)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    owner = relationship("Profile", back_populates="jobs")
    analyses = relationship("Analysis", back_populates="job", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="job")
    comparisons = relationship("CVComparison", back_populates="job", cascade="all, delete-orphan")

    __table_args__ = (Index("idx_jobs_user_id", "user_id"),)


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cv_id = Column(UUID(as_uuid=True), ForeignKey("cvs.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    ats_flags = Column(JSONB)
    match_score = Column(Integer)
    verdict = Column(Text)
    explanation = Column(JSONB)
    interview_questions = Column(JSONB)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    cv = relationship("CV", back_populates="analyses")
    job = relationship("Job", back_populates="analyses")

    __table_args__ = (
        Index("idx_analyses_cv_id", "cv_id"),
        Index("idx_analyses_job_id", "job_id"),
    )


class Application(Base):
    __tablename__ = "applications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    cv_id = Column(UUID(as_uuid=True), ForeignKey("cvs.id", ondelete="SET NULL"), nullable=True)
    status = Column(Text, default="saved")
    notes = Column(Text)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("Profile", back_populates="applications")
    job = relationship("Job", back_populates="applications")
    cv = relationship("CV", back_populates="applications")

    __table_args__ = (Index("idx_applications_user_id", "user_id"),)


class CVComparison(Base):
    __tablename__ = "cv_comparisons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cv_v1_id = Column(UUID(as_uuid=True), ForeignKey("cvs.id", ondelete="CASCADE"), nullable=False)
    cv_v2_id = Column(UUID(as_uuid=True), ForeignKey("cvs.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    score_delta = Column(Integer)
    diff_summary = Column(JSONB)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    cv_v1 = relationship("CV", foreign_keys=[cv_v1_id], back_populates="comparisons_v1")
    cv_v2 = relationship("CV", foreign_keys=[cv_v2_id], back_populates="comparisons_v2")
    job = relationship("Job", back_populates="comparisons")
