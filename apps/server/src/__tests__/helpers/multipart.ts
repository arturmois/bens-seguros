export function buildMultipartBody(
  fieldName: string,
  filename: string,
  mimeType: string,
  content: Buffer,
  boundary: string
): Buffer {
  const header =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n`
  const footer = `\r\n--${boundary}--\r\n`
  return Buffer.concat([Buffer.from(header), content, Buffer.from(footer)])
}

export function buildCsvMultipart(
  filename: string,
  content: string,
  boundary: string
): Buffer {
  return buildMultipartBody(
    'file',
    filename,
    'text/csv',
    Buffer.from(content),
    boundary
  )
}
