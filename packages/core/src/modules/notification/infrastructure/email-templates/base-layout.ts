export function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Inter,system-ui,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
          <tr>
            <td style="background-color:#0d4f4f;padding:24px 32px;">
              <span style="font-size:20px;font-weight:700;color:#ffffff;">Bens Seguros</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #e4e4e7;">
              <p style="font-size:12px;color:#71717a;margin:0;">Este email foi enviado automaticamente pelo sistema Bens Seguros.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function button(text: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background-color:#0d4f4f;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">${text}</a>`
}
