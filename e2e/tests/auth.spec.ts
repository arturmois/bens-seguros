import { expect, test } from '../fixtures/auth.fixture'

test.describe('Auth Flow', () => {
  test('login and see dashboard', async ({ authedPage: page }) => {
    await expect(page.locator('h1')).toContainText('Dashboard')
  })

  test('redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/clients')
    await page.waitForURL(/login/)
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })

  test('shows sidebar navigation after login', async ({ authedPage: page }) => {
    await expect(page.locator('nav[aria-label="Menu principal"]')).toBeVisible()
  })

  test('dashboard shows metrics after login', async ({ authedPage: page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('h1')).toContainText('Dashboard')
    // Verify at least one metric card is visible
    await expect(
      page
        .locator('text=Propostas ativas')
        .or(page.locator('text=Apólices ativas'))
    ).toBeVisible({ timeout: 10_000 })
  })
})
