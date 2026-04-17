from __future__ import annotations

from dataclasses import dataclass

from fastapi import FastAPI

from differ_api.api.errors import register_error_handlers
from differ_api.api.routes.comments import router as comments_router
from differ_api.api.routes.fs import router as fs_router
from differ_api.api.routes.repos import router as repos_router
from differ_api.api.routes.sessions import router as sessions_router
from differ_api.db.session import Database
from differ_api.git.client import GitClient
from differ_api.repositories.comments import CommentRepository
from differ_api.repositories.repos import RepoRepository
from differ_api.repositories.sessions import SessionRepository
from differ_api.services.comments import CommentService
from differ_api.services.diff import DiffService
from differ_api.services.repos import RepoService
from differ_api.services.sessions import SessionService


@dataclass
class ServiceContainer:
    repo_service: RepoService
    session_service: SessionService
    diff_service: DiffService
    comment_service: CommentService


def create_app(database_url: str = "sqlite:///./differ.db") -> FastAPI:
    database = Database(database_url)
    database.create_all()

    repo_repository = RepoRepository(database.session_factory)
    session_repository = SessionRepository(database.session_factory)
    comment_repository = CommentRepository(database.session_factory)
    git_client = GitClient()

    repo_service = RepoService(repo_repository=repo_repository, git_client=git_client)
    session_service = SessionService(
        repo_repository=repo_repository,
        session_repository=session_repository,
        git_client=git_client,
    )
    comment_service = CommentService(
        repo_repository=repo_repository,
        session_repository=session_repository,
        comment_repository=comment_repository,
        git_client=git_client,
    )
    diff_service = DiffService(
        repo_repository=repo_repository,
        session_repository=session_repository,
        comment_repository=comment_repository,
        git_client=git_client,
    )

    app = FastAPI(title="Differ API", version="0.1.0")
    app.state.services = ServiceContainer(
        repo_service=repo_service,
        session_service=session_service,
        diff_service=diff_service,
        comment_service=comment_service,
    )

    register_error_handlers(app)
    app.include_router(repos_router)
    app.include_router(sessions_router)
    app.include_router(comments_router)
    app.include_router(fs_router)
    return app


app = create_app()

