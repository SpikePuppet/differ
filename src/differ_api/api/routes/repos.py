from __future__ import annotations

from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends, status

from differ_api.api.deps import get_services
from differ_api.api.schemas import RepoCreateRequest, RepoListResponse, RepoResponse

if TYPE_CHECKING:
    from differ_api.app import ServiceContainer

router = APIRouter(prefix="/repos", tags=["repos"])


@router.post("", response_model=RepoResponse, status_code=status.HTTP_201_CREATED)
def create_repo(
    payload: RepoCreateRequest,
    services: "ServiceContainer" = Depends(get_services),
) -> RepoResponse:
    repo = services.repo_service.register_repo(path=payload.path)
    return RepoResponse.model_validate(repo)


@router.get("", response_model=RepoListResponse)
def list_repos(services: "ServiceContainer" = Depends(get_services)) -> RepoListResponse:
    repos = services.repo_service.list_repos()
    return RepoListResponse(items=[RepoResponse.model_validate(repo) for repo in repos])


@router.get("/{repo_id}", response_model=RepoResponse)
def get_repo(repo_id: str, services: "ServiceContainer" = Depends(get_services)) -> RepoResponse:
    repo = services.repo_service.get_repo(repo_id)
    return RepoResponse.model_validate(repo)
