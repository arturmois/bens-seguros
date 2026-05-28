import { env } from '@repo/env'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

const TURNSTILE_VERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify'

const turnstileResponseSchema = z.object({
  success: z.boolean(),
  'error-codes': z.array(z.string()).optional(),
})

const signupBodySchema = z.object({
  turnstileToken: z.string().min(1).optional(),
})

function extractToken(body: unknown): string | null {
  const parsed = signupBodySchema.safeParse(body)
  return parsed.success ? (parsed.data.turnstileToken ?? null) : null
}

function clientIp(request: FastifyRequest): string | undefined {
  const xff = request.headers['x-forwarded-for']
  if (typeof xff === 'string') return xff.split(',')[0]?.trim()
  return request.ip
}

// Fase 7D — Cloudflare Turnstile CAPTCHA validation before Better Auth
// processes `/api/auth/sign-up/email`. When TURNSTILE_SECRET_KEY is not
// configured the middleware acts as a no-op (allows signup) so local dev
// without Turnstile keys keeps working. In production, the secret must be set
// when SIGNUP_MODE=self_serve to prevent bot abuse.
export async function turnstileGateHook(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const secret = env.TURNSTILE_SECRET_KEY
  if (!secret) return
  const pathname = request.url.split('?')[0] ?? request.url
  if (!pathname.endsWith('/sign-up/email')) return

  const token = extractToken(request.body)
  if (!token) {
    await reply.status(403).send({
      success: false,
      error: {
        code: 'CAPTCHA_REQUIRED',
        message: 'Verificação anti-bot necessária para criar conta',
      },
    })
    return
  }

  const form = new URLSearchParams()
  form.set('secret', secret)
  form.set('response', token)
  const ip = clientIp(request)
  if (ip) form.set('remoteip', ip)

  try {
    const apiResponse = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body: form,
    })
    const raw: unknown = await apiResponse.json()
    const parsed = turnstileResponseSchema.safeParse(raw)
    if (!parsed.success || !parsed.data.success) {
      const errorCodes = parsed.success
        ? (parsed.data['error-codes'] ?? [])
        : []
      request.log.warn(
        { errorCodes },
        'Turnstile verification rejected signup attempt'
      )
      await reply.status(403).send({
        success: false,
        error: {
          code: 'CAPTCHA_INVALID',
          message: 'Verificação anti-bot inválida ou expirada',
        },
      })
      return
    }
  } catch (err) {
    request.log.error(
      { err },
      'Turnstile verification network error (allowing request to proceed)'
    )
    // Fail-open: Cloudflare network outage must not block signup. Rate-limit
    // by IP+email (REGISTRATION_EMAIL=3/h, Fase 0 C1) is the second layer.
    return
  }
}
