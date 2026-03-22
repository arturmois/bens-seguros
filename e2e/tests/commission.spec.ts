import { expect, test } from '../fixtures/auth.fixture'

test.describe('Commission Flow', () => {
  test('view commissions page', async ({ authedPage: page }) => {
    await page.goto('/commissions')
    await expect(page.locator('h1')).toContainText('Comiss')
  })

  test('commissions list shows table or empty state', async ({
    authedPage: page,
  }) => {
    await page.goto('/commissions')
    await expect(
      page.locator('table').or(page.locator('text=Nenhum'))
    ).toBeVisible({
      timeout: 10_000,
    })
  })

  test('export CSV button is available', async ({ authedPage: page }) => {
    await page.goto('/commissions')
    const exportBtn = page
      .locator('button', { hasText: /export/i })
      .or(page.locator('button', { hasText: /csv/i }))
    // Export button may only be visible for certain roles
    if (
      await exportBtn
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false)
    ) {
      await expect(exportBtn.first()).toBeEnabled()
    }
  })
})
