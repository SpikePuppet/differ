from __future__ import annotations

from differ_api.domain.models import CommentStatus
from differ_api.repositories.comments import CommentRepository
from differ_api.repositories.repos import RepoRepository
from differ_api.repositories.sessions import SessionRepository
from differ_api.services.errors import ConflictError, NotFoundError, ValidationError
from differ_api.services.sessions import SessionService
from differ_api.services.validators import validate_relative_path


class CommentService:
    def __init__(
        self,
        *,
        repo_repository: RepoRepository,
        session_repository: SessionRepository,
        comment_repository: CommentRepository,
        git_client,
    ) -> None:
        self.repo_repository = repo_repository
        self.session_repository = session_repository
        self.comment_repository = comment_repository
        self.git_client = git_client

    def create_comment(
        self,
        *,
        session_id: str,
        head_commit_sha: str,
        base_commit_sha: str | None,
        file_path: str,
        line_side: str,
        line_number: int,
        body: str,
    ):
        session, repo = self._load_session_and_repo(session_id)
        SessionService.ensure_writable(session)
        self._validate_comment_payload(
            repo.path,
            head_commit_sha=head_commit_sha,
            base_commit_sha=base_commit_sha,
            file_path=file_path,
            line_side=line_side,
            line_number=line_number,
            body=body,
        )
        return self.comment_repository.create(
            session_id=session_id,
            head_commit_sha=head_commit_sha,
            base_commit_sha=base_commit_sha,
            file_path=validate_relative_path(file_path),
            line_side=line_side,
            line_number=line_number,
            body=body.strip(),
        )

    def list_comments(
        self,
        *,
        session_id: str,
        head_commit_sha: str | None = None,
        file_path: str | None = None,
        status: str | None = None,
    ):
        session = self.session_repository.get(session_id)
        if session is None:
            raise NotFoundError("Session not found")
        normalized_path = validate_relative_path(file_path) if file_path else None
        if status and status not in {CommentStatus.OPEN.value, CommentStatus.RESOLVED.value}:
            raise ValidationError("Invalid comment status")
        return self.comment_repository.list(
            session_id=session_id,
            head_commit_sha=head_commit_sha,
            file_path=normalized_path,
            status=status,
        )

    def update_comment(
        self,
        *,
        comment_id: str,
        body: str | None,
        file_path: str | None,
        line_side: str | None,
        line_number: int | None,
    ):
        comment = self.comment_repository.get(comment_id)
        if comment is None:
            raise NotFoundError("Comment not found")
        session = self.session_repository.get(comment.session_id)
        if session is None:
            raise NotFoundError("Session not found")
        SessionService.ensure_writable(session)
        if comment.status != CommentStatus.OPEN.value:
            raise ConflictError("Only open comments can be edited")
        if body is not None and not body.strip():
            raise ValidationError("Comment body cannot be empty")
        normalized_path = validate_relative_path(file_path) if file_path else None
        if line_side is not None and line_side not in {"old", "new"}:
            raise ValidationError("Invalid line side")
        if line_number is not None and line_number <= 0:
            raise ValidationError("Line number must be positive")
        updated = self.comment_repository.update(
            comment_id=comment_id,
            body=body.strip() if body is not None else None,
            file_path=normalized_path,
            line_side=line_side,
            line_number=line_number,
        )
        if updated is None:
            raise NotFoundError("Comment not found")
        return updated

    def resolve_comment(self, comment_id: str):
        return self._update_status(comment_id, CommentStatus.RESOLVED.value)

    def reopen_comment(self, comment_id: str):
        return self._update_status(comment_id, CommentStatus.OPEN.value)

    def _update_status(self, comment_id: str, status: str):
        comment = self.comment_repository.get(comment_id)
        if comment is None:
            raise NotFoundError("Comment not found")
        session = self.session_repository.get(comment.session_id)
        if session is None:
            raise NotFoundError("Session not found")
        SessionService.ensure_writable(session)
        updated = self.comment_repository.update(comment_id=comment_id, status=status)
        if updated is None:
            raise NotFoundError("Comment not found")
        return updated

    def _load_session_and_repo(self, session_id: str):
        session = self.session_repository.get(session_id)
        if session is None:
            raise NotFoundError("Session not found")
        repo = self.repo_repository.get(session.repo_id)
        if repo is None:
            raise NotFoundError("Repository not found")
        return session, repo

    def _validate_comment_payload(
        self,
        repo_path: str,
        *,
        head_commit_sha: str,
        base_commit_sha: str | None,
        file_path: str,
        line_side: str,
        line_number: int,
        body: str,
    ) -> None:
        self.git_client.resolve_revision(repo_path, commit=head_commit_sha)
        if base_commit_sha:
            self.git_client.resolve_revision(repo_path, commit=base_commit_sha)
        validate_relative_path(file_path)
        if line_side not in {"old", "new"}:
            raise ValidationError("Invalid line side")
        if line_number <= 0:
            raise ValidationError("Line number must be positive")
        if not body.strip():
            raise ValidationError("Comment body cannot be empty")

