import type { InvitationData, InvitationErrorVariant } from './invitation-types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export class InvitationFetchError extends Error {
  constructor(
    readonly code: string,
    readonly status: number
  ) {
    super(`Invitation error: ${code} (${status})`)
  }
}

export async function fetchInvitation(id: string): Promise<InvitationData> {
  const res = await fetch(`${API_BASE}/api/v1/invitations/${id}/public`)
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: { code?: string }
    }
    const code = body.error?.code ?? ''
    throw new InvitationFetchError(code, res.status)
  }
  const body = (await res.json()) as { data: InvitationData }
  return body.data
}

export type AcceptInvitationPayload =
  | { mode: 'register'; name: string; password: string }
  | { mode: 'login'; password: string }
  | { mode: 'current-session' }

export async function acceptInvitation(
  id: string,
  payload: AcceptInvitationPayload
): Promise<{ organizationId: string }> {
  const res = await fetch(`${API_BASE}/api/v1/invitations/${id}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: { code?: string }
    }
    const code = body.error?.code ?? ''
    throw new InvitationFetchError(code, res.status)
  }
  const body = (await res.json()) as { data: { organizationId: string } }
  return body.data
}

export async function signOutAndReload(): Promise<void> {
  await fetch(`${API_BASE}/api/auth/sign-out`, {
    method: 'POST',
    credentials: 'include',
  }).catch(() => null)
  window.location.reload()
}

export function resolveErrorVariant(err: unknown): InvitationErrorVariant {
  if (!(err instanceof InvitationFetchError)) return 'not_found'
  if (err.code === 'INVITATION_ALREADY_ACCEPTED') return 'already_accepted'
  if (err.code === 'INVITATION_EXPIRED') return 'expired'
  return 'not_found'
}

export interface AcceptErrorInfo {
  readonly title: string
  readonly description: string
}

export function resolveAcceptError(err: unknown): AcceptErrorInfo {
  if (!(err instanceof InvitationFetchError)) {
    return {
      title: 'Erro inesperado',
      description: 'Tente novamente em alguns instantes.',
    }
  }
  switch (err.code) {
    case 'EMAIL_ALREADY_EXISTS':
      return {
        title: 'Email já cadastrado',
        description:
          'Este email já tem conta. Recarregue a página pra entrar com sua senha.',
      }
    case 'WEAK_PASSWORD':
      return {
        title: 'Senha não atende aos requisitos',
        description: 'Use no mínimo 8 caracteres.',
      }
    case 'INVALID_CREDENTIALS':
      return {
        title: 'Senha incorreta',
        description: 'Verifique a senha e tente novamente.',
      }
    case 'INVITATION_ALREADY_ACCEPTED':
      return {
        title: 'Convite já aceito',
        description: 'Você já faz parte desta organização.',
      }
    case 'SESSION_EMAIL_MISMATCH':
      return {
        title: 'Conta não corresponde',
        description: 'Saia da sessão atual e abra o convite novamente.',
      }
    case 'NO_SESSION':
      return {
        title: 'Sessão expirada',
        description: 'Faça login pra continuar.',
      }
    default:
      return {
        title: 'Erro ao processar convite',
        description: 'Tente novamente ou contate o suporte.',
      }
  }
}
