import {
  InvalidLogoFileTypeError,
  LogoFileTooLargeError,
} from './organization-errors.js'

export const ALLOWED_LOGO_MIME_TYPES: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

export const MIME_TO_EXT: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024

export function assertValidLogoUpload(
  mimeType: string,
  sizeBytes: number
): void {
  if (!ALLOWED_LOGO_MIME_TYPES.has(mimeType)) {
    throw new InvalidLogoFileTypeError(mimeType)
  }
  if (sizeBytes > MAX_LOGO_SIZE_BYTES) {
    throw new LogoFileTooLargeError(sizeBytes, MAX_LOGO_SIZE_BYTES)
  }
}

export function logoExtensionFor(mimeType: string): string {
  return MIME_TO_EXT[mimeType] ?? 'png'
}

export function logoStorageKey(
  organizationId: string,
  mimeType: string
): string {
  return `organizations/${organizationId}/logo.${logoExtensionFor(mimeType)}`
}
