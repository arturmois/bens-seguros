import { test as base, type Page } from '@playwright/test'

const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? 'test@bens.com.br'
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'password123'

export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL('/', { timeout: 10_000 })
    await use(page)
  },
})

export { expect } from '@playwright/test'
