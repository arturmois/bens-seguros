# Email Verification & Password Reset

## Overview

Implement two critical auth flows for Bens Seguros: **blocking email verification** on signup and **password reset via email link**. Both leverage Better Auth's native capabilities and the existing Resend email infrastructure.

## Decisions

| Decision                  | Choice                   | Rationale                                              |
| ------------------------- | ------------------------ | ------------------------------------------------------ |
| Verification behavior     | Bloqueante (blocking)    | ERP financeiro - usuário não acessa nada sem verificar |
| Reset mechanism           | Link por email           | Abordagem clássica, Better Auth suporte nativo         |
| Verification token expiry | 24h                      | Suficiente sem ser excessivo                           |
| Reset token expiry        | 1h (Better Auth default) | Padrão da indústria para apps financeiros              |
| Resend cooldown           | 60s                      | Previne spam sem frustrar                              |
| Implementation approach   | Better Auth nativo       | Menor código, tabela Verification já existe            |

## Current State

- Better Auth configured with email+password, organization plugin, RBAC
- Resend fully functional with HTML templates (invitations, quotes, commissions, etc.)
- `emailVerified` field exists in User schema (default: false, never updated)
- `Verification` table exists in DB (created by Better Auth, unused)
- Login page has disabled "Esqueceu?" link ("Em breve")
- Forgot/reset password pages do not exist
- Middleware exposes `emailVerified` but does not enforce it

## Design

### 1. Better Auth Configuration

**File:** `packages/auth/src/index.ts`

Add to existing `betterAuth()` config:

```typescript
emailAndPassword: {
  enabled: true,
  minPasswordLength: 8,
  // NEW: Password reset
  sendResetPassword: async ({ user, url }) => {
    void sendPasswordResetEmail(user.email, user.name, url)
  },
},

// NEW: Email verification
emailVerification: {
  sendOnSignUp: true,
  autoSignInAfterVerification: true,
  expiresIn: 86400, // 24h
  sendVerificationEmail: async ({ user, url }) => {
    void sendVerificationEmail(user.email, user.name, url)
  },
},
```

- `sendOnSignUp: true` — sends verification email automatically on registration
- `autoSignInAfterVerification: true` — clicking the link logs the user in and redirects
- Both callbacks use `void` (fire-and-forget) to prevent timing attacks
- The `sendResetPassword` and `sendVerificationEmail` functions instantiate `ResendEmailProvider` and use new email templates

### 2. Email Templates

**Location:** `packages/core/src/modules/notification/infrastructure/email-templates/`

Two new templates reusing existing `baseLayout()` and `button()` helpers:

**`email-verification.ts`** — "Verifique seu email"

- Greeting with user name
- Explanation that they need to verify to access the platform
- CTA button "Verificar Email"
- Expiry notice (24h)
- Footer: "Se você não criou esta conta, ignore este email"

**`password-reset.ts`** — "Redefinir sua senha"

- Greeting with user name
- Explanation that a password reset was requested
- CTA button "Redefinir Senha"
- Expiry notice (1h)
- Security note: "Se você não solicitou, ignore este email"

### 3. New Frontend Pages

All under `apps/web/src/app/(auth)/`:

**`/verify-email`** — Verification pending screen

- Displayed after registration (automatic redirect)
- Shows: email icon, message "Enviamos um link de verificação para {email}"
- "Reenviar email" button with 60s countdown cooldown
- Uses `authClient.sendVerificationEmail({ email, callbackURL: '/onboarding' })`
- After clicking email link: Better Auth validates token, auto-login, redirects to `/onboarding`

**`/forgot-password`** — Request password reset

- Accessed from "Esqueceu?" link on login page
- Email input + "Enviar link de redefinição" button
- After submission: success message "Se o email existir, enviaremos um link" (does not reveal if email exists)
- Uses `authClient.requestPasswordReset({ email, redirectTo: '/reset-password' })`

**`/reset-password`** — Set new password

- Accessed via email link (receives `?token=...` in URL)
- If invalid/expired token: error message + link to `/forgot-password`
- If valid token: new password + confirmation fields + "Redefinir senha" button
- Uses `authClient.resetPassword({ newPassword, token })`
- After success: redirects to `/login` with confirmation toast

### 4. Changes to Existing Pages

**`/register` (register-form.tsx + use-auth.ts)**

- After registration, redirect to `/verify-email` instead of `/onboarding`
- The user is logged in after registration (session exists, `emailVerified = false`), so `/verify-email` reads the email from the session via `authClient.useSession()` — no query param needed

**`/login` (login-form.tsx)**

- Activate the "Esqueceu?" link (remove "Em breve" / disabled state)
- Point to `/forgot-password`

### 5. Middleware & Blocking

**File:** `apps/web/src/proxy.ts`

Add `/verify-email` to the group of pages requiring session but not organization (same as `/onboarding`, `/select-org`).

Add `/forgot-password` and `/reset-password` to public pages (same as `/login`, `/register`).

New blocking logic for unverified users:

```
1. User has session but emailVerified = false?
   → Redirect to /verify-email
   → Except if already on /verify-email (avoid loop)

2. User has session and emailVerified = true?
   → Normal flow (onboarding → select-org → dashboard)
```

The middleware currently only checks for session cookie existence. To read `emailVerified`:

- Better Auth with `cookieCache` is already configured (5 min TTL), so session data is available in the cookie
- Decode the session cookie to extract `emailVerified` status, or call `auth.api.getSession()` (cached)

### 6. Complete Post-Registration Flow

```
Register → /verify-email (blocked here)
    → Click email link
    → Better Auth validates + auto-login
    → Redirect to /onboarding
    → Create organization
    → /dashboard
```

## Security & Edge Cases

### Rate Limiting

- `auth-rate-limit.ts` already protects all `/api/auth/*` routes via Redis — covers verification and reset endpoints automatically
- 60s cooldown on resend button is client-side (UX); server rate limit is the real protection

### Edge Cases

| Scenario                                                  | Behavior                                                        |
| --------------------------------------------------------- | --------------------------------------------------------------- |
| User tries to access `/dashboard` without verifying email | Middleware redirects to `/verify-email`                         |
| Verification token expired (>24h)                         | Page shows error + resend button                                |
| Reset token expired (>1h)                                 | `/reset-password` shows error + link to `/forgot-password`      |
| Email does not exist (reset)                              | Returns generic success — does not reveal if email exists       |
| Already verified user accesses `/verify-email`            | Redirects to `/onboarding` or `/dashboard`                      |
| Multiple resend clicks                                    | 60s client-side cooldown + server rate limit                    |
| User registered via org invitation                        | Same flow — register → verify email → accept invite → dashboard |
| User opens reset link in different browser                | Works — token is session-independent                            |

## Out of Scope

- Email verification for existing users (not retroactive — new registrations only)
- Email change re-verification
- 2FA / MFA
