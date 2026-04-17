from __future__ import annotations

from differ_api.repositories.comments import CommentRepository
from differ_api.repositories.repos import RepoRepository
from differ_api.repositories.sessions import SessionRepository
from differ_api.services.errors import BadRequestError, NotFoundError
from differ_api.services.validators import validate_path_filters


class DiffService:
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

    def compare(
        self,
        *,
        session_id: str,
        base_ref: str | None,
        head_ref: str | None,
        base_commit: str | None,
        head_commit: str | None,
        path_filters: list[str] | None,
    ) -> dict:
        session = self.session_repository.get(session_id)
        if session is None:
            raise NotFoundError("Session not found")
        repo = self.repo_repository.get(session.repo_id)
        if repo is None:
            raise NotFoundError("Repository not found")

        effective_base_ref = base_ref or session.base_ref
        effective_head_ref = head_ref or session.head_ref
        effective_filters = validate_path_filters(path_filters if path_filters is not None else session.path_filters)

        if not effective_base_ref and not base_commit:
            raise BadRequestError("A base ref or base commit is required")
        if not effective_head_ref and not head_commit:
            raise BadRequestError("A head ref or head commit is required")

        if effective_base_ref:
            self.git_client.ensure_ref_exists(repo.path, effective_base_ref)
        if effective_head_ref:
            self.git_client.ensure_ref_exists(repo.path, effective_head_ref)

        resolved_base_commit = self.git_client.resolve_revision(
            repo.path,
            ref=effective_base_ref,
            commit=base_commit,
        )
        resolved_head_commit = self.git_client.resolve_revision(
            repo.path,
            ref=effective_head_ref,
            commit=head_commit,
        )

        diff = self.git_client.diff(
            repo.path,
            base_commit=resolved_base_commit,
            head_commit=resolved_head_commit,
            path_filters=effective_filters,
        )
        comments = self.comment_repository.list(
            session_id=session_id,
            head_commit_sha=resolved_head_commit,
        )
        return {
            "base": self.git_client.get_commit_summary(repo.path, resolved_base_commit, effective_base_ref),
            "head": self.git_client.get_commit_summary(repo.path, resolved_head_commit, effective_head_ref),
            "stats": diff["stats"],
            "files": diff["files"],
            "comments": comments,
        }
