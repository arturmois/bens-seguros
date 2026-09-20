import { baseLayout, button } from '../../../../notification/index.js'

interface ClaimOpenedParams {
  readonly userName: string
  readonly claimNumber: string
  readonly clientName: string
  readonly priority: string
  readonly frontendUrl: string
}

export function claimOpenedEmail(params: ClaimOpenedParams): string {
  return baseLayout(`
    <h2 style="font-size:20px;font-weight:600;color:#0d4f4f;margin:0 0 16px;">Novo Sinistro Aberto</h2>
    <p style="font-size:14px;color:#3f3f46;line-height:1.6;margin:0 0 8px;">Ola ${params.userName},</p>
    <p style="font-size:14px;color:#3f3f46;line-height:1.6;margin:0 0 16px;">
      Um novo sinistro foi aberto pelo cliente <strong>${params.clientName}</strong>.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
      <tr>
        <td style="font-size:13px;color:#71717a;padding:4px 12px 4px 0;">Numero:</td>
        <td style="font-size:13px;color:#3f3f46;font-weight:600;">${params.claimNumber}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#71717a;padding:4px 12px 4px 0;">Prioridade:</td>
        <td style="font-size:13px;color:#3f3f46;font-weight:600;">${params.priority}</td>
      </tr>
    </table>
    ${button('Ver Sinistro', `${params.frontendUrl}/claims`)}
  `)
}
