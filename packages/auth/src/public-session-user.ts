interface UserWithPublicFields {
  readonly id: string
  readonly email: string
  readonly name: string
  readonly emailVerified: boolean
  readonly image?: string | null
  readonly acceptedTermsAt?: Date | null
  readonly termsVersion?: string | null
  readonly privacyVersion?: string | null
}

export interface PublicSessionUser {
  readonly id: string
  readonly email: string
  readonly name: string
  readonly emailVerified: boolean
  readonly image: string | null
  readonly acceptedTermsAt: Date | null
  readonly termsVersion: string | null
  readonly privacyVersion: string | null
}

export function pickPublicSessionUser(
  user: UserWithPublicFields
): PublicSessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    emailVerified: user.emailVerified,
    image: user.image ?? null,
    acceptedTermsAt: user.acceptedTermsAt ?? null,
    termsVersion: user.termsVersion ?? null,
    privacyVersion: user.privacyVersion ?? null,
  }
}
