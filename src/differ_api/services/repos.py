from __future__ import annotations

from pathlib import Path

from differ_api.repositories.repos import RepoRepository
from differ_api.services.errors import ConflictError, NotFoundError


class RepoService:
    def __init__(self, *, repo_repository: RepoRepository, git_client) -> None:
        self.repo_repository = repo_repository
        self.git_client = git_client

    def register_repo(self, *, path: str):
        normalized_path = self.git_client.validate_repo(path)
        existing = self.repo_repository.get_by_path(normalized_path)
        if existing is not None:
            raise ConflictError("Repository is already registered")
        return self.repo_repository.create(
            name=Path(normalized_path).name,
            path=normalized_path,
        )

    def get_repo(self, repo_id: str):
        repo = self.repo_repository.get(repo_id)
        if repo is None:
            raise NotFoundError("Repository not found")
        return repo

    def list_repos(self):
        return self.repo_repository.list()

