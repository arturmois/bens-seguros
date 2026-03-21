const COOKIE_NAME = 'bens-active-org';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function setActiveOrgCookie(organizationId: string) {
  document.cookie = `${COOKIE_NAME}=${organizationId};path=/;max-age=${MAX_AGE};samesite=lax`;
}

export function clearActiveOrgCookie() {
  document.cookie = `${COOKIE_NAME}=;path=/;max-age=0`;
}
