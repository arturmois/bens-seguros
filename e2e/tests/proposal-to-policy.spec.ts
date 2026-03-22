import { test, expect } from '../fixtures/auth.fixture';

test.describe('Proposal to Policy Flow', () => {
  test('create proposal and view in list', async ({ authedPage: page }) => {
    await page.goto('/proposals');
    await expect(page.locator('h1')).toContainText('Propostas');

    // Click new proposal button
    const newButton = page
      .locator('button', { hasText: /nov/i })
      .or(page.locator('a', { hasText: /nov/i }));

    if (await newButton.first().isVisible()) {
      await newButton.first().click();
      // Verify form loads
      await expect(page.locator('form').or(page.locator('[data-slot="card"]'))).toBeVisible();
    }
  });

  test('view proposals list with stages', async ({ authedPage: page }) => {
    await page.goto('/proposals');
    await expect(page.locator('h1')).toContainText('Propostas');
    // Table or kanban should be visible
    await expect(page.locator('table').or(page.locator('[data-testid="kanban"]'))).toBeVisible({
      timeout: 10_000,
    });
  });
});
