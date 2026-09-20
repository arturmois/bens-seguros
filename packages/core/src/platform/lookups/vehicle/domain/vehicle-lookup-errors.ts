export class InvalidPlateFormatError extends Error {
  readonly code = 'INVALID_PLATE' as const
  constructor(message = 'Invalid plate or chassi format') {
    super(message)
    this.name = 'InvalidPlateFormatError'
  }
}

export class PlateNotFoundError extends Error {
  readonly code = 'PLATE_NOT_FOUND' as const
  constructor(message = 'Plate not found') {
    super(message)
    this.name = 'PlateNotFoundError'
  }
}

export class LookupProviderUnavailableError extends Error {
  readonly code = 'PROVIDER_UNAVAILABLE' as const
  constructor(message = 'Vehicle lookup service unavailable') {
    super(message)
    this.name = 'LookupProviderUnavailableError'
  }
}
