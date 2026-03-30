import { api } from './api-client'

/**
 * Custom fetch adapter for Orval-generated hooks.
 *
 * Orval expects the return to match `{ data: ResponseBody, status: number, headers: Headers }`.
 * Our `api.*` methods return `ApiResponse<T>` = `{ success, data, meta }` which IS the full
 * response body. We map it into the Orval wrapper shape.
 */
export async function customFetch<T>(
  url: string,
  options: RequestInit & { body?: unknown }
): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase()

  switch (method) {
    case 'GET': {
      const response = await api.get(url)
      return { data: response, status: 200, headers: new Headers() } as T
    }
    case 'POST': {
      const response = await api.post(url, options.body)
      return { data: response, status: 201, headers: new Headers() } as T
    }
    case 'PUT': {
      const response = await api.put(url, options.body)
      return { data: response, status: 200, headers: new Headers() } as T
    }
    case 'PATCH': {
      const response = await api.patch(url, options.body)
      return { data: response, status: 200, headers: new Headers() } as T
    }
    case 'DELETE': {
      await api.delete(url)
      return { data: undefined, status: 204, headers: new Headers() } as T
    }
    default:
      throw new Error(`Unsupported HTTP method: ${method}`)
  }
}
