"""Initial schema — all 6 tables

Revision ID: 0001
Revises:
Create Date: 2026-04-19
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "profiles",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.Text(), nullable=False, unique=True),
        sa.Column("full_name", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "cvs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version_label", sa.Text()),
        sa.Column("file_url", sa.Text()),
        sa.Column("parsed_data", JSONB()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_cvs_user_id", "cvs", ["user_id"])

    op.create_table(
        "jobs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.Text()),
        sa.Column("source_url", sa.Text()),
        sa.Column("raw_description", sa.Text()),
        sa.Column("requirements", JSONB()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_jobs_user_id", "jobs", ["user_id"])

    op.create_table(
        "analyses",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("cv_id", UUID(as_uuid=True), sa.ForeignKey("cvs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("job_id", UUID(as_uuid=True), sa.ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ats_flags", JSONB()),
        sa.Column("match_score", sa.Integer()),
        sa.Column("verdict", sa.Text()),
        sa.Column("explanation", JSONB()),
        sa.Column("interview_questions", JSONB()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_analyses_cv_id", "analyses", ["cv_id"])
    op.create_index("idx_analyses_job_id", "analyses", ["job_id"])

    op.create_table(
        "applications",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("job_id", UUID(as_uuid=True), sa.ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("cv_id", UUID(as_uuid=True), sa.ForeignKey("cvs.id", ondelete="SET NULL"), nullable=True),
        sa.Column("status", sa.Text(), server_default="saved"),
        sa.Column("notes", sa.Text()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index("idx_applications_user_id", "applications", ["user_id"])

    op.create_table(
        "cv_comparisons",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("cv_v1_id", UUID(as_uuid=True), sa.ForeignKey("cvs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("cv_v2_id", UUID(as_uuid=True), sa.ForeignKey("cvs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("job_id", UUID(as_uuid=True), sa.ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("score_delta", sa.Integer()),
        sa.Column("diff_summary", JSONB()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("cv_comparisons")
    op.drop_index("idx_applications_user_id", "applications")
    op.drop_table("applications")
    op.drop_index("idx_analyses_job_id", "analyses")
    op.drop_index("idx_analyses_cv_id", "analyses")
    op.drop_table("analyses")
    op.drop_index("idx_jobs_user_id", "jobs")
    op.drop_table("jobs")
    op.drop_index("idx_cvs_user_id", "cvs")
    op.drop_table("cvs")
    op.drop_table("profiles")
