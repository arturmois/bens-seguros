export const RATE_LIMITS = {
  AUTH: {
    LOGIN: { max: 10, windowSeconds: 900 },
    FORGOT_PASSWORD: { max: 3, windowSeconds: 3600 },
    REGISTRATION: { max: 5, windowSeconds: 3600 },
    VERIFY_EMAIL: { max: 3, windowSeconds: 3600 },
  },
  INVITATION: { max: 20, windowSeconds: 3600 },
  INVITATION_PUBLIC: { max: 30, windowSeconds: 900 },
  INVITATION_ACCEPT: { max: 10, windowSeconds: 900 },
  INTERNAL: { max: 20, windowSeconds: 60 },
  MESSAGE: { max: 10, windowMs: 1_000 },
  GLOBAL: { max: 100, windowSeconds: 60 },
} as const
