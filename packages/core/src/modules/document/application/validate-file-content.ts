import { fileTypeFromBuffer } from 'file-type'
import { InvalidFileTypeError } from '../domain/document-errors.js'

const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  // Documents
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Media
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
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''

  if (BLOCKED_EXTENSIONS.has(ext)) {
    throw new InvalidFileTypeError(ext)
  }

  const detected = await fileTypeFromBuffer(buffer)

  // No magic bytes detected (e.g. plain text, CSV) — allow through
  if (!detected) {
    return
  }

  if (!ALLOWED_MIME_TYPES.has(detected.mime)) {
    throw new InvalidFileTypeError(detected.mime)
  }
}
