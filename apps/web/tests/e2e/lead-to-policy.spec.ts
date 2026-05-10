import { test, expect } from '@playwright/test'

test('lead frio -> criar proposta -> promover -> emitir apolice', async ({
  page,
}) => {
  await page.goto('/login')
  await page.fill('input[name="email"]', 'vendedor@user.com')
  await page.fill('input[name="password"]', 'Senha@123')
  await page.click('button[type="submit"]')
  await page.waitForURL(/select-org|dashboard/, { timeout: 10_000 })
  if (page.url().includes('select-org')) {
    await page.click('button:has-text("Corretora Exemplo")')
    await page.waitForURL(/dashboard/, { timeout: 10_000 })
  }
  await page.goto('/contacts/new')
  await page.fill('input[name="name"]', 'Maria Teste E2E')
  await page.fill('input[name="phone"]', '+5511988887777')
  await page.click('button:has-text("Criar contato")')
  await expect(page).toHaveURL(/contacts\/[a-f0-9-]+$/)
  await page.click('a:has-text("Nova proposta")')
  await page.selectOption('select[name="branch"]', 'AUTO')
  await page.selectOption('select[name="boardType"]', 'NEW_INSURANCE')
  await page.click('button:has-text("Criar")')
  await expect(page).toHaveURL(/proposals\//)
  for (const stage of ['QUOTE', 'PROTOCOL', 'INSPECTION', 'PAYMENT']) {
    await page.click('button:has-text("Avançar estágio")')
    await expect(page.locator('[data-stage]')).toContainText(stage)
  }
  await page.click('button:has-text("Avançar estágio")')
  await expect(page.locator('text=Promover a cliente')).toBeVisible()
  await page.fill('input[name="document"]', '52998224725')
  await page.click('button:has-text("Promover")')
  await expect(page.locator('[data-stage]')).toContainText('POLICY_ISSUED', {
    timeout: 10_000,
  })
  await page.click('a:has-text("Maria Teste E2E")')
  await expect(page.locator('[data-stage-badge]')).toContainText('Cliente')
})
