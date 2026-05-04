import { ApiError } from './api-client'

function isErrorResponse(
  data: unknown
): data is { error: { message: string } } {
  if (typeof data !== 'object' || data === null) return false
  if (!('error' in data)) return false
  const err = (data as Record<string, unknown>).error
  if (typeof err !== 'object' || err === null) return false
  if (!('message' in err)) return false
  return typeof (err as Record<string, unknown>).message === 'string'
}

export function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.message.trim() || fallback
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as Record<string, unknown>).response === 'object'
  ) {
    const response = (error as Record<string, unknown>).response as Record<
      string,
      unknown
    >
    if ('data' in response && isErrorResponse(response.data)) {
      return response.data.error.message
    }
  }
  return fallback
}
