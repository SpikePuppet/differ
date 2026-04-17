from __future__ import annotations

import os
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel

router = APIRouter(prefix="/fs", tags=["filesystem"])


class FsEntry(BaseModel):
    name: str
    path: str
    is_git: bool


class FsBrowseResponse(BaseModel):
    path: str
    parent: str | None
    is_git: bool
    entries: list[FsEntry]


def _looks_like_git_repo(p: Path) -> bool:
    git = p / ".git"
    return git.is_dir() or git.is_file()


def _resolve_start(raw: str | None) -> Path:
    if not raw:
        return Path.home()
    expanded = os.path.expanduser(raw)
    return Path(expanded)


@router.get("/browse", response_model=FsBrowseResponse)
def browse(
    path: str | None = Query(default=None),
    show_hidden: bool = Query(default=False),
) -> FsBrowseResponse:
    target = _resolve_start(path).resolve()
    if not target.exists():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Path does not exist: {target}",
        )
    if not target.is_dir():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Path is not a directory: {target}",
        )

    entries: list[FsEntry] = []
    try:
        children = sorted(target.iterdir(), key=lambda p: p.name.lower())
    except PermissionError as err:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied reading: {target}",
        ) from err

    for child in children:
        if not child.is_dir():
            continue
        if not show_hidden and child.name.startswith("."):
            continue
        entries.append(
            FsEntry(
                name=child.name,
                path=str(child),
                is_git=_looks_like_git_repo(child),
            )
        )

    parent = str(target.parent) if target.parent != target else None
    return FsBrowseResponse(
        path=str(target),
        parent=parent,
        is_git=_looks_like_git_repo(target),
        entries=entries,
    )
