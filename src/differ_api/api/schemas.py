from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class RepoCreateRequest(BaseModel):
    path: str


class RepoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    path: str
    created_at: datetime
    updated_at: datetime


class RepoListResponse(BaseModel):
    items: list[RepoResponse]


class SessionCreateRequest(BaseModel):
    repo_id: str
    base_ref: str = "main"
    head_ref: str | None = None
    path_filters: list[str] = Field(default_factory=list)


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    repo_id: str
    base_ref: str
    head_ref: str | None
    path_filters: list[str]
    status: str
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime


class SessionListResponse(BaseModel):
    items: list[SessionResponse]


class CompareRequest(BaseModel):
    base_ref: str | None = None
    head_ref: str | None = None
    base_commit: str | None = None
    head_commit: str | None = None
    path_filters: list[str] | None = None


class CommitSummaryResponse(BaseModel):
    ref: str | None
    commit: str
    author_name: str
    author_email: str
    authored_at: datetime
    subject: str


class DiffStatsResponse(BaseModel):
    files_changed: int
    additions: int
    deletions: int


class DiffLineResponse(BaseModel):
    kind: Literal["context", "add", "delete"]
    content: str
    old_line: int | None
    new_line: int | None


class DiffHunkResponse(BaseModel):
    old_start: int
    old_lines: int
    new_start: int
    new_lines: int
    header: str
    lines: list[DiffLineResponse]


class DiffFileResponse(BaseModel):
    old_path: str
    new_path: str
    change_type: str
    additions: int
    deletions: int
    hunks: list[DiffHunkResponse]


class CommentCreateRequest(BaseModel):
    head_commit_sha: str
    base_commit_sha: str | None = None
    file_path: str
    line_side: Literal["old", "new"]
    line_number: int
    body: str


class CommentUpdateRequest(BaseModel):
    body: str | None = None
    file_path: str | None = None
    line_side: Literal["old", "new"] | None = None
    line_number: int | None = None


class CommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    session_id: str
    head_commit_sha: str
    base_commit_sha: str | None
    file_path: str
    line_side: str
    line_number: int
    body: str
    status: str
    created_at: datetime
    updated_at: datetime


class CommentListResponse(BaseModel):
    items: list[CommentResponse]


class DiffResponse(BaseModel):
    base: CommitSummaryResponse
    head: CommitSummaryResponse
    stats: DiffStatsResponse
    files: list[DiffFileResponse]
    comments: list[CommentResponse]

