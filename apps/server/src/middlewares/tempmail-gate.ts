import disposableDomains from 'disposable-email-domains'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

const disposableSet = new Set<string>(disposableDomains)

const signupBodySchema = z.object({
  email: z.string().email().optional(),
})

function extractDomain(email: string | undefined): string | null {
  if (!email) return null
  const at = email.lastIndexOf('@')
  if (at === -1 || at === email.length - 1) return null
  return email.slice(at + 1).toLowerCase()
}

export async function tempmailGateHook(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const pathname = request.url.split('?')[0] ?? ''
  if (!pathname.endsWith('/sign-up/email')) return

  const parsed = signupBodySchema.safeParse(request.body)
  if (!parsed.success) return

  const domain = extractDomain(parsed.data.email)
  if (!domain) return

  if (disposableSet.has(domain)) {
    request.log.warn({ domain }, 'Signup blocked by tempmail blocklist')
    await reply.status(403).send({
      success: false,
      error: {
        code: 'EMAIL_DOMAIN_NOT_ALLOWED',
        message:
          'Endereços de email descartáveis não são permitidos. Use um email pessoal ou corporativo.',
      },
    })
  }
}
