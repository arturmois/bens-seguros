import { baseLayout } from './base-layout.js'

interface QuoteSentEmailParams {
  readonly clientName: string
  readonly salespersonName: string
  readonly organizationName: string
  readonly branch: string
  readonly premiumFormatted: string
}

export function quoteSentEmailHtml(params: QuoteSentEmailParams): string {
  return baseLayout(`
    <h2 style="font-size:20px;font-weight:600;color:#0d4f4f;margin:0 0 16px;">Cotação de Seguro</h2>
    <p style="font-size:14px;color:#3f3f46;line-height:1.6;margin:0 0 16px;">
      Prezado(a) <strong>${params.clientName}</strong>,
    </p>
    <p style="font-size:14px;color:#3f3f46;line-height:1.6;margin:0 0 16px;">
      Segue em anexo a cotação de seguro <strong>${params.branch}</strong> conforme solicitado.
    </p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e4e4e7;color:#666;">Ramo</td>
        <td style="padding:8px;border-bottom:1px solid #e4e4e7;font-weight:600;">${params.branch}</td>
      </tr>
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e4e4e7;color:#666;">Prêmio Total</td>
        <td style="padding:8px;border-bottom:1px solid #e4e4e7;font-weight:600;">${params.premiumFormatted}</td>
      </tr>
    </table>
    <p style="font-size:14px;color:#3f3f46;line-height:1.6;margin:16px 0;">
      Para dúvidas ou aceite, responda este e-mail diretamente.
    </p>
    <p style="font-size:14px;color:#3f3f46;margin:16px 0 0;">
      Atenciosamente,<br><strong>${params.salespersonName}</strong><br><span style="color:#666;">${params.organizationName}</span>
    </p>
  `)
}
