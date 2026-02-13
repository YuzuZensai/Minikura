export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
    };
  }
}

export class NotFoundError extends DomainError {
  readonly code = "NOT_FOUND";
  readonly statusCode = 404;

  constructor(resource: string, identifier?: string) {
    super(identifier ? `${resource} not found: ${identifier}` : `${resource} not found`);
  }
}

export class ConflictError extends DomainError {
  readonly code = "CONFLICT";
  readonly statusCode = 409;

  constructor(resource: string, identifier?: string) {
    super(
      identifier ? `${resource} already exists: ${identifier}` : `${resource} already exists`
    );
  }
}

export class UnauthorizedError extends DomainError {
  readonly code = "UNAUTHORIZED";
  readonly statusCode = 401;

  constructor(message = "Unauthorized access") {
    super(message);
  }
}

export class ForbiddenError extends DomainError {
  readonly code = "FORBIDDEN";
  readonly statusCode = 403;

  constructor(message = "Forbidden access") {
    super(message);
  }
}

export class ValidationError extends DomainError {
  readonly code = "VALIDATION_ERROR";
  readonly statusCode = 400;

  constructor(message: string) {
    super(message);
  }
}

export class BusinessRuleError extends DomainError {
  readonly code = "BUSINESS_RULE_VIOLATION";
  readonly statusCode = 422;

  constructor(message: string) {
    super(message);
  }
}
