from __future__ import annotations

from sqlalchemy import select

from differ_api.domain.models import RepoRecord


class RepoRepository:
    def __init__(self, session_factory) -> None:
        self.session_factory = session_factory

    def create(self, *, name: str, path: str) -> RepoRecord:
        with self.session_factory() as session:
            repo = RepoRecord(name=name, path=path)
            session.add(repo)
            session.commit()
            session.refresh(repo)
            return repo

    def get(self, repo_id: str) -> RepoRecord | None:
        with self.session_factory() as session:
            return session.get(RepoRecord, repo_id)

    def get_by_path(self, path: str) -> RepoRecord | None:
        with self.session_factory() as session:
            return session.scalar(select(RepoRecord).where(RepoRecord.path == path))

    def list(self) -> list[RepoRecord]:
        with self.session_factory() as session:
            statement = select(RepoRecord).order_by(RepoRecord.created_at)
            return list(session.scalars(statement))

