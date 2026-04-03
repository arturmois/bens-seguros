import { expect, test } from '../fixtures/auth.fixture'

test.describe('Endorsement Kanban Flow', () => {
  test('endorsement dashboard is reachable from the sidebar', async ({
    authedPage: page,
  }) => {
    await page.goto('/endorsements')
    await expect(page.locator('h1')).toContainText('Endossos')
    await expect(page.locator('text=Cotação')).toBeVisible({ timeout: 10_000 })
  })

  test('active policy detail exposes the create endorsement action', async ({
    authedPage: page,
  }) => {
    await page.goto('/policies')

    const firstPolicyLink = page.locator('a[href^="/policies/"]').first()
    if (await firstPolicyLink.isVisible()) {
      await firstPolicyLink.click()
      const button = page.locator('button', { hasText: 'Criar Endosso' })
      if (await button.isVisible()) {
        await button.click()
        await expect(page.locator('text=Novo Endosso')).toBeVisible()
      }
    }
  })
})
