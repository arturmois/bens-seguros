import { ApiError, API_URL } from './api-client'

/**
 * Custom fetch mutator for Orval-generated hooks.
 *
 * Orval generates code that calls `JSON.stringify(body)` before passing to this
 * function, so the body in `options` is already a serialized JSON string.
 * We call `fetch()` directly — never re-serialize.
 *
 * Return shape: `{ data: ResponseBody, status: number, headers: Headers }`
 * where ResponseBody is the raw API JSON (`{ success, data, meta }`).
 */
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
        ? (body as { error: { code: string; message: string } }).error
        : null

    throw new ApiError(
      response.status,
      err?.code ?? 'UNKNOWN_ERROR',
      err?.message ?? 'Erro inesperado'
    )
  }

  // Orval's mutator contract requires generic return; shape guaranteed by generated callers
  return { data: body, status: response.status, headers: response.headers } as T
}
