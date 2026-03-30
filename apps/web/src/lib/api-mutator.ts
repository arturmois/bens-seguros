import { api } from './api-client'

export async function customFetch<T>(
  url: string,
  options: RequestInit & { body?: unknown }
): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase()

  switch (method) {
    case 'GET':
      return (await api.get<T>(url)).data
    case 'POST':
      return (await api.post<T>(url, options.body)).data
    case 'PUT':
      return (await api.put<T>(url, options.body)).data
    case 'PATCH':
      return (await api.patch<T>(url, options.body)).data
    case 'DELETE': {
      await api.delete(url)
      return undefined as T
    }
    default:
      throw new Error(`Unsupported HTTP method: ${method}`)
  }
}
