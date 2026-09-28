export class AppError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Invalid email or password") {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to do this") {
    super(403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(409, message);
  }
}
