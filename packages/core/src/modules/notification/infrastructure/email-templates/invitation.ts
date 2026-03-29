import { baseLayout, button } from './base-layout.js'

interface InvitationParams {
  readonly inviterName: string
  readonly organizationName: string
  readonly role: string
  readonly frontendUrl: string
  readonly invitationId: string
}

export function invitationEmail(params: InvitationParams): string {
  return baseLayout(`
    <h2 style="font-size:20px;font-weight:600;color:#0d4f4f;margin:0 0 16px;">Convite para Organização</h2>
    <p style="font-size:14px;color:#3f3f46;line-height:1.6;margin:0 0 16px;">
      <strong>${params.inviterName}</strong> convidou você para participar da organização
      <strong>${params.organizationName}</strong> como <strong>${params.role}</strong>.
    </p>
    ${button('Aceitar Convite', `${params.frontendUrl}/accept-invitation?id=${params.invitationId}`)}
    <p style="font-size:12px;color:#71717a;margin:16px 0 0;">Se você não reconhece este convite, pode ignorar este e-mail.</p>
  `)
}
