import { expect, test } from '../fixtures/auth.fixture'

test.describe('Claim Flow', () => {
  test('view claims page', async ({ authedPage: page }) => {
    await page.goto('/claims')
    await expect(page.locator('h1')).toContainText('Sinistros')
  })

  test('claims list shows table or empty state', async ({
    authedPage: page,
  }) => {
    await page.goto('/claims')
    // Either table data or empty state
    await expect(
      page.locator('table').or(page.locator('text=Nenhum'))
    ).toBeVisible({
      timeout: 10_000,
    })
  })

  test('new claim button navigates to form', async ({ authedPage: page }) => {
    await page.goto('/claims')
    const newButton = page
      .locator('button', { hasText: /nov/i })
      .or(page.locator('a', { hasText: /nov/i }))

    if (await newButton.first().isVisible()) {
      await newButton.first().click()
      await expect(
        page.locator('form').or(page.locator('[data-slot="card"]'))
      ).toBeVisible()
    }
  })
})
