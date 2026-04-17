from __future__ import annotations

from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends, Query, status

from differ_api.api.deps import get_services
from differ_api.api.schemas import (
    CommentCreateRequest,
    CommentListResponse,
    CommentResponse,
    CompareRequest,
    DiffResponse,
    SessionCreateRequest,
    SessionListResponse,
    SessionResponse,
)

if TYPE_CHECKING:
    from differ_api.app import ServiceContainer

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(
    payload: SessionCreateRequest,
    services: "ServiceContainer" = Depends(get_services),
) -> SessionResponse:
    session = services.session_service.create_session(
        repo_id=payload.repo_id,
        base_ref=payload.base_ref,
        head_ref=payload.head_ref,
        path_filters=payload.path_filters,
    )
    return SessionResponse.model_validate(session)


@router.get("", response_model=SessionListResponse)
def list_sessions(services: "ServiceContainer" = Depends(get_services)) -> SessionListResponse:
    sessions = services.session_service.list_sessions()
    return SessionListResponse(items=[SessionResponse.model_validate(session) for session in sessions])


@router.get("/{session_id}", response_model=SessionResponse)
def get_session(
    session_id: str,
    services: "ServiceContainer" = Depends(get_services),
) -> SessionResponse:
    session = services.session_service.get_session(session_id)
    return SessionResponse.model_validate(session)


@router.post("/{session_id}/compare", response_model=DiffResponse)
def compare_session(
    session_id: str,
    payload: CompareRequest,
    services: "ServiceContainer" = Depends(get_services),
) -> DiffResponse:
    diff = services.diff_service.compare(
        session_id=session_id,
        base_ref=payload.base_ref,
        head_ref=payload.head_ref,
        base_commit=payload.base_commit,
        head_commit=payload.head_commit,
        path_filters=payload.path_filters,
    )
    return DiffResponse.model_validate(diff)


@router.post("/{session_id}/archive", response_model=SessionResponse)
def archive_session(
    session_id: str,
    services: "ServiceContainer" = Depends(get_services),
) -> SessionResponse:
    session = services.session_service.archive_session(session_id)
    return SessionResponse.model_validate(session)


@router.post(
    "/{session_id}/comments",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_comment(
    session_id: str,
    payload: CommentCreateRequest,
    services: "ServiceContainer" = Depends(get_services),
) -> CommentResponse:
    comment = services.comment_service.create_comment(
        session_id=session_id,
        head_commit_sha=payload.head_commit_sha,
        base_commit_sha=payload.base_commit_sha,
        file_path=payload.file_path,
        line_side=payload.line_side,
        line_number=payload.line_number,
        body=payload.body,
    )
    return CommentResponse.model_validate(comment)


@router.get("/{session_id}/comments", response_model=CommentListResponse)
def list_comments(
    session_id: str,
    head_commit_sha: str | None = Query(default=None),
    file_path: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    services: "ServiceContainer" = Depends(get_services),
) -> CommentListResponse:
    comments = services.comment_service.list_comments(
        session_id=session_id,
        head_commit_sha=head_commit_sha,
        file_path=file_path,
        status=status_filter,
    )
    return CommentListResponse(items=[CommentResponse.model_validate(comment) for comment in comments])
