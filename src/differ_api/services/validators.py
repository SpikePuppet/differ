from __future__ import annotations

from pathlib import PurePosixPath

from differ_api.services.errors import ValidationError


def validate_relative_path(path: str) -> str:
    candidate = PurePosixPath(path)
    if not path or candidate.is_absolute() or ".." in candidate.parts:
        raise ValidationError("Invalid path filter")
    return path.rstrip("/")


def validate_path_filters(path_filters: list[str] | None) -> list[str]:
    if not path_filters:
        return []
    normalized: list[str] = []
    for value in path_filters:
        normalized.append(validate_relative_path(value))
    return normalized

