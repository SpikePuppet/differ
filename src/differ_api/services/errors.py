from __future__ import annotations


class AppError(Exception):
    status_code = 500

    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail


class NotFoundError(AppError):
    status_code = 404


class BadRequestError(AppError):
    status_code = 400


class ConflictError(AppError):
    status_code = 409


class ValidationError(AppError):
    status_code = 422

