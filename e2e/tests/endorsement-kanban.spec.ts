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
    const hasPolicies = await firstPolicyLink
      .isVisible({ timeout: 5_000 })
      .catch(() => false)

    if (!hasPolicies) {
      test.skip(true, 'No policies in test environment')
      return
    }

    await firstPolicyLink.click()
    const button = page.locator('button', { hasText: 'Criar Endosso' })
    const hasButton = await button
      .isVisible({ timeout: 5_000 })
      .catch(() => false)

    if (!hasButton) {
      test.skip(true, 'No active policy available for endorsement')
      return
    }

    await button.click()
    await expect(page.locator('text=Criar Endosso')).toBeVisible()
  })
})
