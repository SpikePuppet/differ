from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from differ_api.db.base import Base
from differ_api.domain.models import CommentRecord, RepoRecord, SessionRecord


class Database:
    def __init__(self, database_url: str) -> None:
        connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
        self.engine = create_engine(database_url, future=True, connect_args=connect_args)
        self.session_factory = sessionmaker(
            bind=self.engine,
            autoflush=False,
            expire_on_commit=False,
        )

    def create_all(self) -> None:
        Base.metadata.create_all(self.engine)

