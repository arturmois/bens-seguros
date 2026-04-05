import { baseLayout, button } from './base-layout.js'

interface EmailVerificationParams {
  readonly name: string
  readonly url: string
}

export function emailVerificationEmail(
  params: EmailVerificationParams
): string {
  return baseLayout(`
    <h2 style="font-size:20px;font-weight:600;color:#0d4f4f;margin:0 0 16px;">Verifique seu Email</h2>
    <p style="font-size:14px;color:#3f3f46;line-height:1.6;margin:0 0 8px;">
      Olá, <strong>${params.name}</strong>!
    </p>
    <p style="font-size:14px;color:#3f3f46;line-height:1.6;margin:0 0 24px;">
      Para acessar o Bens Seguros, confirme seu endereço de email clicando no botão abaixo.
    </p>
    ${button('Verificar Email', params.url)}
    <p style="font-size:12px;color:#71717a;margin:24px 0 0;">
      Este link expira em 24 horas. Se você não criou esta conta, ignore este email.
    </p>
  `)
}
