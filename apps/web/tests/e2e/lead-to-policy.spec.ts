import { test, expect } from '@playwright/test'

/**
 * E2E flow validating the contact-client separation:
 * cold lead (Contact only) -> proposal -> promotion (with CPF) -> POLICY_ISSUED.
 *
 * Pre-conditions:
 *  - apps/server running on :3001
 *  - apps/web running on :3000
 *  - database freshly seeded (`pnpm db:reset`)
 *  - test credentials from CLAUDE.md: vendedor@user.com / Senha@123
 *
 * Selectors are anchored to UI primitives that the implementation should expose
 * (input names, button labels). If selectors drift, this test will fail with a
 * clear locator message and should be updated alongside the UI change.
 */
test('lead frio -> criar proposta -> promover -> emitir apolice', async ({
  page,
}) => {
  // 1. Login
  await page.goto('/login')
  await page.fill('input[name="email"]', 'vendedor@user.com')
  await page.fill('input[name="password"]', 'Senha@123')
  await page.click('button[type="submit"]')
  // After login, user lands on /select-org (no active org cookie) or /dashboard
  await page.waitForURL(/select-org|dashboard/, { timeout: 10_000 })

  // If on select-org, choose Corretora Exemplo
  if (page.url().includes('select-org')) {
    await page.click('button:has-text("Corretora Exemplo")')
    await page.waitForURL(/dashboard/, { timeout: 10_000 })
  }

  // 2. Criar contato rapido (cold lead, sem CPF)
  await page.goto('/contacts/new')
  await page.fill('input[name="name"]', 'Maria Teste E2E')
  await page.fill('input[name="phone"]', '+5511988887777')
  await page.click('button:has-text("Criar contato")')
  await expect(page).toHaveURL(/contacts\/[a-f0-9-]+$/)

  // 3. Criar proposta a partir do contato
  await page.click('a:has-text("Nova proposta")')
  await page.selectOption('select[name="branch"]', 'AUTO')
  await page.selectOption('select[name="boardType"]', 'NEW_INSURANCE')
  await page.click('button:has-text("Criar")')
  await expect(page).toHaveURL(/proposals\//)

  // 4. Avancar ate PAYMENT (loop pelos estagios intermediarios)
  for (const stage of ['QUOTE', 'PROTOCOL', 'INSPECTION', 'PAYMENT']) {
    await page.click('button:has-text("Avançar estágio")')
    await expect(page.locator('[data-stage]')).toContainText(stage)
  }

  // 5. Tentar avancar pra POLICY_ISSUED — modal de promocao deve aparecer
  await page.click('button:has-text("Avançar estágio")')
  await expect(page.locator('text=Promover a cliente')).toBeVisible()

  // 6. Informar CPF valido no modal e confirmar promocao
  await page.fill('input[name="document"]', '52998224725')
  await page.click('button:has-text("Promover")')

  // 7. Verifica que avancou pra POLICY_ISSUED
  await expect(page.locator('[data-stage]')).toContainText('POLICY_ISSUED', {
    timeout: 10_000,
  })

  // 8. Voltar ao contato e verificar que a badge mudou para "Cliente"
  await page.click('a:has-text("Maria Teste E2E")')
  await expect(page.locator('[data-stage-badge]')).toContainText('Cliente')
})
