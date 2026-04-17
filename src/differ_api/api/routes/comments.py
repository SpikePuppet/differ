from __future__ import annotations

from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends

from differ_api.api.deps import get_services
from differ_api.api.schemas import CommentResponse, CommentUpdateRequest

if TYPE_CHECKING:
    from differ_api.app import ServiceContainer

router = APIRouter(prefix="/comments", tags=["comments"])


@router.patch("/{comment_id}", response_model=CommentResponse)
def update_comment(
    comment_id: str,
    payload: CommentUpdateRequest,
    services: "ServiceContainer" = Depends(get_services),
) -> CommentResponse:
    comment = services.comment_service.update_comment(
        comment_id=comment_id,
        body=payload.body,
        file_path=payload.file_path,
        line_side=payload.line_side,
        line_number=payload.line_number,
    )
    return CommentResponse.model_validate(comment)


@router.post("/{comment_id}/resolve", response_model=CommentResponse)
def resolve_comment(
    comment_id: str,
    services: "ServiceContainer" = Depends(get_services),
) -> CommentResponse:
    comment = services.comment_service.resolve_comment(comment_id)
    return CommentResponse.model_validate(comment)


@router.post("/{comment_id}/reopen", response_model=CommentResponse)
def reopen_comment(
    comment_id: str,
    services: "ServiceContainer" = Depends(get_services),
) -> CommentResponse:
    comment = services.comment_service.reopen_comment(comment_id)
    return CommentResponse.model_validate(comment)
