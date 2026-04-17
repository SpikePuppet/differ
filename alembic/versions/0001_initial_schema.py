"""Initial schema."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "repos",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("path", sa.String(length=2048), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "sessions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("repo_id", sa.String(length=36), sa.ForeignKey("repos.id"), nullable=False),
        sa.Column("base_ref", sa.String(length=255), nullable=False),
        sa.Column("head_ref", sa.String(length=255), nullable=True),
        sa.Column("path_filters_json", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_sessions_repo_id", "sessions", ["repo_id"])
    op.create_table(
        "comments",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("session_id", sa.String(length=36), sa.ForeignKey("sessions.id"), nullable=False),
        sa.Column("head_commit_sha", sa.String(length=64), nullable=False),
        sa.Column("base_commit_sha", sa.String(length=64), nullable=True),
        sa.Column("file_path", sa.String(length=2048), nullable=False),
        sa.Column("line_side", sa.String(length=8), nullable=False),
        sa.Column("line_number", sa.Integer(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_comments_session_id", "comments", ["session_id"])
    op.create_index("ix_comments_head_commit_sha", "comments", ["head_commit_sha"])


def downgrade() -> None:
    op.drop_index("ix_comments_head_commit_sha", table_name="comments")
    op.drop_index("ix_comments_session_id", table_name="comments")
    op.drop_table("comments")
    op.drop_index("ix_sessions_repo_id", table_name="sessions")
    op.drop_table("sessions")
    op.drop_table("repos")
