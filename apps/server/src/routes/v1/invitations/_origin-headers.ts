import type { FastifyRequest } from 'fastify'

export function buildOriginHeaders(request: FastifyRequest): Headers {
  const headers = new Headers()
  headers.set(
    'origin',
    request.headers.origin ?? request.headers.referer ?? 'http://localhost:3000'
  )
  const cookieHeader = request.headers.cookie
  if (cookieHeader) headers.set('cookie', cookieHeader)
  return headers
}
