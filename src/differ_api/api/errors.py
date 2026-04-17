from __future__ import annotations

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from differ_api.services.errors import AppError


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(_, exc: AppError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

