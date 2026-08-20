export class AppError extends Error {
  code?: string
  status?: number
  constructor(message: string, code?: string, status?: number) {
    super(message)
    this.name = "AppError"
    this.code = code
    this.status = status
  }
}

export class AuthError extends AppError {
  constructor(message: string, code?: string) {
    super(message, code)
    this.name = "AuthError"
  }
}

export class ValidationError extends AppError {
  fields?: Record<string, string>
  constructor(message: string, fields?: Record<string, string>) {
    super(message)
    this.name = "ValidationError"
    this.fields = fields
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) return error.message
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  return "Une erreur inattendue s'est produite. Veuillez réessayer."
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes("network") || error.message.includes("fetch")
  }
  return false
}
