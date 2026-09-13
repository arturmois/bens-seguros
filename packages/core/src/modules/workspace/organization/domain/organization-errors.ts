export class OrganizationNotFoundError extends Error {
  readonly code = 'ORGANIZATION_NOT_FOUND' as const
  constructor(organizationId: string) {
    super(`Organização ${organizationId} não encontrada`)
    this.name = 'OrganizationNotFoundError'
  }
}

export class SlugConflictError extends Error {
  readonly code = 'SLUG_CONFLICT' as const
  constructor(slug: string) {
    super(`Slug "${slug}" já está em uso por outra organização`)
    this.name = 'SlugConflictError'
  }
}

export class LogoFileRequiredError extends Error {
  readonly code = 'LOGO_FILE_REQUIRED' as const
  constructor() {
    super('Um arquivo de imagem é obrigatório')
    this.name = 'LogoFileRequiredError'
  }
}

export class InvalidLogoFileTypeError extends Error {
  readonly code = 'INVALID_LOGO_FILE_TYPE' as const
  constructor(mimeType: string) {
    super(
      `Tipo de arquivo "${mimeType}" inválido. Permitidos: JPEG, PNG, WebP, GIF`
    )
    this.name = 'InvalidLogoFileTypeError'
  }
}

export class LogoFileTooLargeError extends Error {
  readonly code = 'LOGO_FILE_TOO_LARGE' as const
  readonly sizeBytes: number
  readonly maxBytes: number
  constructor(sizeBytes: number, maxBytes: number) {
    const maxMb = Math.round(maxBytes / (1024 * 1024))
    super(`Arquivo excede o tamanho máximo de ${String(maxMb)}MB`)
    this.name = 'LogoFileTooLargeError'
    this.sizeBytes = sizeBytes
    this.maxBytes = maxBytes
  }
}
