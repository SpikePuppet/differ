export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message)
  }
}

export class NotFoundError extends AppError {
  constructor(detail: string) {
    super(detail, 404)
  }
}

export class BadRequestError extends AppError {
  constructor(detail: string) {
    super(detail, 400)
  }
}

export class ConflictError extends AppError {
  constructor(detail: string) {
    super(detail, 409)
  }
}

export class ValidationError extends AppError {
  constructor(detail: string) {
    super(detail, 422)
  }
}
