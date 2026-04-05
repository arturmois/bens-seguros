import { baseLayout, button } from './base-layout.js'

interface PasswordResetParams {
  readonly name: string
  readonly url: string
}

export function passwordResetEmail(params: PasswordResetParams): string {
  return baseLayout(`
    <h2 style="font-size:20px;font-weight:600;color:#0d4f4f;margin:0 0 16px;">Redefinir Senha</h2>
    <p style="font-size:14px;color:#3f3f46;line-height:1.6;margin:0 0 8px;">
      Olá, <strong>${params.name}</strong>!
    </p>
    <p style="font-size:14px;color:#3f3f46;line-height:1.6;margin:0 0 24px;">
      Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha.
    </p>
    ${button('Redefinir Senha', params.url)}
    <p style="font-size:12px;color:#71717a;margin:24px 0 0;">
      Este link expira em 1 hora. Se você não solicitou a redefinição, ignore este email — sua senha permanecerá inalterada.
    </p>
  `)
}
