from __future__ import annotations

import json

from sqlalchemy import select

from differ_api.db.base import utcnow
from differ_api.domain.models import SessionRecord, SessionStatus


class SessionRepository:
    def __init__(self, session_factory) -> None:
        self.session_factory = session_factory

    def create(
        self,
        *,
        repo_id: str,
        base_ref: str,
        head_ref: str | None,
        path_filters: list[str],
    ) -> SessionRecord:
        with self.session_factory() as session:
            record = SessionRecord(
                repo_id=repo_id,
                base_ref=base_ref,
                head_ref=head_ref,
                path_filters_json=json.dumps(path_filters),
            )
            session.add(record)
            session.commit()
            session.refresh(record)
            return record

    def get(self, session_id: str) -> SessionRecord | None:
        with self.session_factory() as session:
            return session.get(SessionRecord, session_id)

    def list(self) -> list[SessionRecord]:
        with self.session_factory() as session:
            statement = select(SessionRecord).order_by(SessionRecord.created_at)
            return list(session.scalars(statement))

    def archive(self, session_id: str) -> SessionRecord | None:
        with self.session_factory() as session:
            record = session.get(SessionRecord, session_id)
            if record is None:
                return None
            if record.status != SessionStatus.ARCHIVED.value:
                record.status = SessionStatus.ARCHIVED.value
                record.archived_at = utcnow()
            session.commit()
            session.refresh(record)
            return record

