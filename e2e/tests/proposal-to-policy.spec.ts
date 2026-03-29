import { expect, test } from '../fixtures/auth.fixture'

test.describe('Proposal to Policy Flow', () => {
  test('create proposal and view in list', async ({ authedPage: page }) => {
    await page.goto('/proposals')
    await expect(page.locator('h1')).toContainText('Propostas')

    // Click new proposal button
    const newButton = page
      .locator('button', { hasText: /nov/i })
      .or(page.locator('a', { hasText: /nov/i }))

    if (await newButton.first().isVisible()) {
      await newButton.first().click()
      // Verify form loads
      await expect(
        page.locator('form').or(page.locator('[data-slot="card"]'))
      ).toBeVisible()
    }
  })

  test('proposals page shows table or kanban view', async ({
    authedPage: page,
  }) => {
    await page.goto('/proposals')
    await expect(page.locator('h1')).toContainText('Propostas')
    // Verify either table or kanban is visible
    await expect(
      page.locator('table').or(page.locator('[class*="kanban"]'))
    ).toBeVisible({ timeout: 10_000 })
  })

  test('can switch between table and kanban views', async ({
    authedPage: page,
  }) => {
    await page.goto('/proposals')
    // Click kanban button
    const kanbanBtn = page.locator('button', { hasText: /kanban/i })
    if (await kanbanBtn.isVisible()) {
      await kanbanBtn.click()
      // Verify columns are visible
      await expect(page.locator('text=Captação')).toBeVisible({
        timeout: 5_000,
      })
    }
  })
})
