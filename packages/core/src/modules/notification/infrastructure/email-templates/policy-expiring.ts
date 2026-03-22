import { baseLayout, button } from './base-layout.js'

interface PolicyExpiringParams {
  readonly userName: string
  readonly policyNumber: string
  readonly clientName: string
  readonly expirationDate: string
  readonly daysUntilExpiry: number
  readonly frontendUrl: string
}

export function policyExpiringEmail(params: PolicyExpiringParams): string {
  return baseLayout(`
    <h2 style="font-size:20px;font-weight:600;color:#d97706;margin:0 0 16px;">Apolice Expirando</h2>
    <p style="font-size:14px;color:#3f3f46;line-height:1.6;margin:0 0 8px;">Ola ${params.userName},</p>
    <p style="font-size:14px;color:#3f3f46;line-height:1.6;margin:0 0 16px;">
      A apolice <strong>${params.policyNumber}</strong> do cliente <strong>${params.clientName}</strong>
      vence em <strong>${params.daysUntilExpiry} dias</strong> (${params.expirationDate}).
    </p>
    ${button('Ver Apolice', `${params.frontendUrl}/policies`)}
  `)
}
