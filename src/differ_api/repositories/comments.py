from __future__ import annotations

from sqlalchemy import select

from differ_api.domain.models import CommentRecord


class CommentRepository:
    def __init__(self, session_factory) -> None:
        self.session_factory = session_factory

    def create(
        self,
        *,
        session_id: str,
        head_commit_sha: str,
        base_commit_sha: str | None,
        file_path: str,
        line_side: str,
        line_number: int,
        body: str,
    ) -> CommentRecord:
        with self.session_factory() as session:
            record = CommentRecord(
                session_id=session_id,
                head_commit_sha=head_commit_sha,
                base_commit_sha=base_commit_sha,
                file_path=file_path,
                line_side=line_side,
                line_number=line_number,
                body=body,
            )
            session.add(record)
            session.commit()
            session.refresh(record)
            return record

    def get(self, comment_id: str) -> CommentRecord | None:
        with self.session_factory() as session:
            return session.get(CommentRecord, comment_id)

    def list(
        self,
        *,
        session_id: str,
        head_commit_sha: str | None = None,
        file_path: str | None = None,
        status: str | None = None,
    ) -> list[CommentRecord]:
        with self.session_factory() as session:
            statement = select(CommentRecord).where(CommentRecord.session_id == session_id)
            if head_commit_sha:
                statement = statement.where(CommentRecord.head_commit_sha == head_commit_sha)
            if file_path:
                statement = statement.where(CommentRecord.file_path == file_path)
            if status:
                statement = statement.where(CommentRecord.status == status)
            statement = statement.order_by(CommentRecord.created_at)
            return list(session.scalars(statement))

    def update(
        self,
        *,
        comment_id: str,
        body: str | None = None,
        file_path: str | None = None,
        line_side: str | None = None,
        line_number: int | None = None,
        status: str | None = None,
    ) -> CommentRecord | None:
        with self.session_factory() as session:
            record = session.get(CommentRecord, comment_id)
            if record is None:
                return None
            if body is not None:
                record.body = body
            if file_path is not None:
                record.file_path = file_path
            if line_side is not None:
                record.line_side = line_side
            if line_number is not None:
                record.line_number = line_number
            if status is not None:
                record.status = status
            session.commit()
            session.refresh(record)
            return record

