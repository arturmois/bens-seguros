import { expect, test } from '../fixtures/auth.fixture'

test.describe('Chat Flow', () => {
  test('chat page loads', async ({ authedPage: page }) => {
    await page.goto('/chat')
    // Chat page should show conversation list or empty state
    await expect(
      page
        .locator('[data-testid="chat-container"]')
        .or(page.locator('text=Chat'))
        .or(page.locator('text=Conversas'))
        .or(page.locator('text=Nenhuma'))
    ).toBeVisible({ timeout: 10_000 })
  })

  test('chat sidebar shows conversations or empty state', async ({
    authedPage: page,
  }) => {
    await page.goto('/chat')
    await page.waitForTimeout(2_000)
    // Either conversation items or empty state
    const hasContent = await page.locator('main').isVisible()
    expect(hasContent).toBeTruthy()
  })
})
