from __future__ import annotations

from typing import TYPE_CHECKING

from fastapi import Request

if TYPE_CHECKING:
    from differ_api.app import ServiceContainer


def get_services(request: Request) -> "ServiceContainer":
    return request.app.state.services
