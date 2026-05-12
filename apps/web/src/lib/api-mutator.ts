import { ApiError, API_URL } from './api-client'

export async function customFetch<T>(
  url: string,
  options: RequestInit
): Promise<T> {
  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...Object.fromEntries(
        Object.entries(options.headers ?? {}).filter(
          ([, v]) => v !== undefined && v !== ''
        )
      ),
    },
  })
  if (response.status === 204) {
    return {
      data: { success: true, data: null },
      status: 204,
      headers: response.headers,
    } as T
  }
  const body: unknown = await response.json()
  if (!response.ok) {
    const err =
      typeof body === 'object' &&
      body !== null &&
      'error' in body &&
      typeof (body as Record<string, unknown>).error === 'object'
        ? (
            body as {
              error: {
                code: string
                message: string
                details?: Record<string, unknown>
              }
            }
          ).error
        : null
    throw new ApiError(
      response.status,
      err?.code ?? 'UNKNOWN_ERROR',
      err?.message ?? 'Erro inesperado',
      err?.details
    )
  }
  return { data: body, status: response.status, headers: response.headers } as T
}
