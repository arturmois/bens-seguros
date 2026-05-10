import { fileTypeFromBuffer } from 'file-type'
import { InvalidFileTypeError } from '../domain/document-errors.js'

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'video/mp4',
  'audio/mpeg',
  'audio/ogg',
])

const BLOCKED_EXTENSIONS = new Set([
  'exe',
  'bat',
  'cmd',
  'sh',
  'ps1',
  'msi',
  'dll',
  'com',
  'scr',
  'vbs',
  'wsf',
  'jar',
])

export async function validateFileContent(
  buffer: Buffer,
  fileName: string
): Promise<void> {
  const parts = fileName.toLowerCase().split('.')
  const blockedPart = parts.find((part) => BLOCKED_EXTENSIONS.has(part))
  if (blockedPart) {
    throw new InvalidFileTypeError(blockedPart)
  }
  const detected = await fileTypeFromBuffer(buffer)
  if (!detected) {
    return
  }
  if (!ALLOWED_MIME_TYPES.has(detected.mime)) {
    throw new InvalidFileTypeError(detected.mime)
  }
}
