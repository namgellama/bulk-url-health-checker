export class AppError extends Error {
    constructor(
        public readonly statusCode: number,
        message: string,
    ) {
        super(message);
        this.name = "App Error";
    }
}

export class NotFoundError extends AppError {
    constructor(message = "Resource not found") {
        super(404, message);
        this.name = "Not Found Error";
    }
}

export class BadRequestError extends AppError {
    constructor(message = "Bad Request") {
        super(400, message);
        this.name = "Bad Request Error";
    }
}

export class ConflictError extends AppError {
    constructor(message = "Conflict") {
        super(409, message);
        this.name = "Conflict Error";
    }
}

export class HttpStatusError extends Error {
    constructor(
        public httpStatus: number,
        public responseTimeMs: number,
        public pageTitle: string | null,
        public statusText: string,
    ) {
        super(`HTTP ${httpStatus} - ${statusText}`);
    }
}
