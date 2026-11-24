export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Invalid request', fields?: Record<string, string>) {
    super(400, 'VALIDATION_ERROR', message, fields);
  }
}
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, 'UNAUTHORIZED', message);
  }
}
export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(404, 'NOT_FOUND', message);
  }
}
export class ConflictError extends AppError {
  constructor(message: string, code = 'CONFLICT') {
    super(409, code, message);
  }
}
/** Raised by the Mongo adapter when the unique email index rejects an insert (E11000). */
export class DuplicateEmailError extends ConflictError {
  constructor() {
    super('An account with this email already exists', 'EMAIL_TAKEN');
  }
}
export class DuplicateKeyError extends Error {}

/** LLM transport failure, carrying the upstream HTTP status when there is one. */
export class LlmError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = 'LlmError';
  }
}
