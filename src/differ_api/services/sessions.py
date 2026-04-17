from __future__ import annotations

from differ_api.domain.models import SessionStatus
from differ_api.repositories.repos import RepoRepository
from differ_api.repositories.sessions import SessionRepository
from differ_api.services.errors import NotFoundError
from differ_api.services.validators import validate_path_filters


class SessionService:
    def __init__(self, *, repo_repository: RepoRepository, session_repository: SessionRepository, git_client) -> None:
        self.repo_repository = repo_repository
        self.session_repository = session_repository
        self.git_client = git_client

    def create_session(
        self,
        *,
        repo_id: str,
        base_ref: str,
        head_ref: str | None,
        path_filters: list[str],
    ):
        repo = self.repo_repository.get(repo_id)
        if repo is None:
            raise NotFoundError("Repository not found")
        self.git_client.ensure_ref_exists(repo.path, base_ref)
        if head_ref:
            self.git_client.ensure_ref_exists(repo.path, head_ref)
        normalized_filters = validate_path_filters(path_filters)
        return self.session_repository.create(
            repo_id=repo_id,
            base_ref=base_ref,
            head_ref=head_ref,
            path_filters=normalized_filters,
        )

    def get_session(self, session_id: str):
        session = self.session_repository.get(session_id)
        if session is None:
            raise NotFoundError("Session not found")
        return session

    def list_sessions(self):
        return self.session_repository.list()

    def archive_session(self, session_id: str):
        session = self.session_repository.archive(session_id)
        if session is None:
            raise NotFoundError("Session not found")
        return session

    @staticmethod
    def ensure_writable(session) -> None:
        if session.status == SessionStatus.ARCHIVED.value:
            from differ_api.services.errors import ConflictError

            raise ConflictError("Archived sessions are read-only")

