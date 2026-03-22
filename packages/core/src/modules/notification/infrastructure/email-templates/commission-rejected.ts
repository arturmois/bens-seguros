import { baseLayout, button } from './base-layout.js'

interface CommissionRejectedParams {
  readonly userName: string
  readonly policyNumber: string
  readonly reason: string
  readonly rejectedBy: string
  readonly frontendUrl: string
}

export function commissionRejectedEmail(
  params: CommissionRejectedParams
): string {
  return baseLayout(`
    <h2 style="font-size:20px;font-weight:600;color:#dc2626;margin:0 0 16px;">Comissao Rejeitada</h2>
    <p style="font-size:14px;color:#3f3f46;line-height:1.6;margin:0 0 8px;">Ola ${params.userName},</p>
    <p style="font-size:14px;color:#3f3f46;line-height:1.6;margin:0 0 8px;">
      Sua comissao referente a apolice <strong>${params.policyNumber}</strong> foi rejeitada por ${params.rejectedBy}.
    </p>
    <p style="font-size:14px;color:#3f3f46;line-height:1.6;margin:0 0 16px;">
      <strong>Motivo:</strong> ${params.reason}
    </p>
    ${button('Ver Detalhes', `${params.frontendUrl}/commissions`)}
  `)
}
