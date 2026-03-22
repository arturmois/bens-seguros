import { baseLayout, button } from './base-layout.js'

interface CommissionApprovedParams {
  readonly userName: string
  readonly policyNumber: string
  readonly value: string
  readonly approvedBy: string
  readonly frontendUrl: string
}

export function commissionApprovedEmail(
  params: CommissionApprovedParams
): string {
  return baseLayout(`
    <h2 style="font-size:20px;font-weight:600;color:#0d4f4f;margin:0 0 16px;">Comissao Aprovada</h2>
    <p style="font-size:14px;color:#3f3f46;line-height:1.6;margin:0 0 8px;">Ola ${params.userName},</p>
    <p style="font-size:14px;color:#3f3f46;line-height:1.6;margin:0 0 16px;">
      Sua comissao referente a apolice <strong>${params.policyNumber}</strong> no valor de
      <strong>${params.value}</strong> foi aprovada por ${params.approvedBy}.
    </p>
    ${button('Ver Comissao', `${params.frontendUrl}/commissions`)}
  `)
}
