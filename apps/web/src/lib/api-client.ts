export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export interface ApiResponse<TData> {
  success: true
  data: TData
  meta?: { total: number; nextCursor: string | null }
}

interface ApiErrorResponse {
  success: false
  error: { code: string; message: string }
}

function isErrorResponse(body: unknown): body is ApiErrorResponse {
  return (
    typeof body === 'object' &&
    body !== null &&
    'success' in body &&
    body.success === false &&
    'error' in body
  )
}

async function request<TData>(
  path: string,
  options: Omit<RequestInit, 'body'> & { body?: unknown } = {}
): Promise<ApiResponse<TData>> {
  const headers: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(options.headers ?? {}).filter(([, v]) => v !== '')
    ),
  }
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const fetchBody =
    options.body instanceof FormData
      ? options.body
      : options.body != null
        ? JSON.stringify(options.body)
        : undefined

  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers,
    body: fetchBody,
  })

  if (res.status === 204) {
    return { success: true, data: null as TData }
  }

  const body: unknown = await res.json()

  if (!res.ok) {
    if (isErrorResponse(body)) {
      throw new ApiError(res.status, body.error.code, body.error.message)
    }
    throw new ApiError(res.status, 'UNKNOWN_ERROR', 'Erro inesperado')
  }

  return body as ApiResponse<TData>
}

export const api = {
  get: <TData>(path: string) => request<TData>(path),

  post: <TData>(path: string, data: unknown) =>
    request<TData>(path, { method: 'POST', body: data }),

  put: <TData>(path: string, data: unknown) =>
    request<TData>(path, { method: 'PUT', body: data }),

  patch: <TData>(path: string, data: unknown) =>
    request<TData>(path, { method: 'PATCH', body: data }),

  delete: (path: string) => request(path, { method: 'DELETE' }),

  upload: <TData>(path: string, formData: FormData) =>
    request<TData>(path, {
      method: 'PUT',
      body: formData,
    }),
}
