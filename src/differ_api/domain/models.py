from __future__ import annotations

import json
import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from differ_api.db.base import Base, utcnow


class SessionStatus(StrEnum):
    ACTIVE = "active"
    ARCHIVED = "archived"


class CommentStatus(StrEnum):
    OPEN = "open"
    RESOLVED = "resolved"


class RepoRecord(Base):
    __tablename__ = "repos"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    path: Mapped[str] = mapped_column(String(2048), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        onupdate=utcnow,
        nullable=False,
    )


class SessionRecord(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    repo_id: Mapped[str] = mapped_column(String(36), ForeignKey("repos.id"), nullable=False, index=True)
    base_ref: Mapped[str] = mapped_column(String(255), nullable=False)
    head_ref: Mapped[str | None] = mapped_column(String(255), nullable=True)
    path_filters_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default=SessionStatus.ACTIVE.value)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        onupdate=utcnow,
        nullable=False,
    )

    @property
    def path_filters(self) -> list[str]:
        return json.loads(self.path_filters_json)

    @path_filters.setter
    def path_filters(self, value: list[str]) -> None:
        self.path_filters_json = json.dumps(value)


class CommentRecord(Base):
    __tablename__ = "comments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("sessions.id"), nullable=False, index=True)
    head_commit_sha: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    base_commit_sha: Mapped[str | None] = mapped_column(String(64), nullable=True)
    file_path: Mapped[str] = mapped_column(String(2048), nullable=False)
    line_side: Mapped[str] = mapped_column(String(8), nullable=False)
    line_number: Mapped[int] = mapped_column(nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default=CommentStatus.OPEN.value)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        onupdate=utcnow,
        nullable=False,
    )
