import { AggilizadorApiError } from './errors.js'

interface RequestOptions {
  readonly method: 'GET' | 'POST'
  readonly url: string
  readonly body?: unknown
}

export async function request<TResult>(
  options: RequestOptions
): Promise<TResult> {
  const { method, url, body } = options

  const headers: Record<string, string> = {}

  if (method === 'POST' && body !== undefined) {
    headers['Content-Type'] = 'application/json;charset=UTF-8'
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (response.status === 204) {
    return undefined as TResult
  }

  if (!response.ok) {
    const responseBody: unknown = await response.json().catch(() => null)
    throw new AggilizadorApiError(
      `Aggilizador API error: ${response.status} ${response.statusText}`,
      response.status,
      responseBody
    )
  }

  return response.json() as Promise<TResult>
}
