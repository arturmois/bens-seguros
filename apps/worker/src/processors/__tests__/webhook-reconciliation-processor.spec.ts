import { describe, expect, it, vi } from 'vitest'
import { runReconciliationBatch } from '../webhook-reconciliation-processor.js'

const validPayload = {
  type: 'PAYMENT_SUCCEEDED',
  provider: 'asaas',
  externalId: 'evt_001',
  occurredAt: '2026-05-25T10:00:00.000Z',
  providerCustomerId: 'cus_001',
  providerSubscriptionId: 'sub_001',
  providerPaymentId: 'pay_001',
  amountCents: 29900,
  currency: 'BRL',
}

function silentLogger() {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}

describe('runReconciliationBatch', () => {
  it('busca rows + retorna zeros quando vazio', async () => {
    const findMany = vi.fn().mockResolvedValue([])
    const update = vi.fn()
    const processEvent = vi.fn()

    const result = await runReconciliationBatch({
      findFailedWebhookEvents: findMany,
      updateWebhookEvent: update,
      processEvent,
      logger: silentLogger(),
    })

    expect(findMany).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
    })
    expect(processEvent).not.toHaveBeenCalled()
  })

  it('processa e marca processedAt + clear processingError em sucesso', async () => {
    const row = {
      id: 'wh_001',
      source: 'asaas',
      externalId: 'evt_001',
      eventType: 'PAYMENT_SUCCEEDED',
      payload: validPayload,
      processingError: 'previous failure',
      processedAt: null,
      receivedAt: new Date(),
    }
    const findMany = vi.fn().mockResolvedValue([row])
    const update = vi.fn().mockResolvedValue(undefined)
    const processEvent = vi.fn().mockResolvedValue({ processed: true })

    const result = await runReconciliationBatch({
      findFailedWebhookEvents: findMany,
      updateWebhookEvent: update,
      processEvent,
      logger: silentLogger(),
    })

    expect(result.successCount).toBe(1)
    expect(result.failureCount).toBe(0)
    expect(processEvent).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledWith('wh_001', {
      processedAt: expect.any(Date),
      processingError: null,
    })
  })

  it('overwrite processingError em nova falha', async () => {
    const row = {
      id: 'wh_002',
      source: 'asaas',
      externalId: 'evt_002',
      eventType: 'PAYMENT_SUCCEEDED',
      payload: validPayload,
      processingError: 'previous failure',
      processedAt: null,
      receivedAt: new Date(),
    }
    const findMany = vi.fn().mockResolvedValue([row])
    const update = vi.fn().mockResolvedValue(undefined)
    const processEvent = vi.fn().mockRejectedValue(new Error('still broken'))

    const result = await runReconciliationBatch({
      findFailedWebhookEvents: findMany,
      updateWebhookEvent: update,
      processEvent,
      logger: silentLogger(),
    })

    expect(result.successCount).toBe(0)
    expect(result.failureCount).toBe(1)
    expect(update).toHaveBeenCalledWith('wh_002', {
      processingError: 'still broken',
    })
  })

  it('skipa rows com payload inválido (Zod fail) + atualiza processingError', async () => {
    const row = {
      id: 'wh_bad',
      source: 'asaas',
      externalId: 'evt_bad',
      eventType: 'PAYMENT_SUCCEEDED',
      payload: { type: 'INVALID' },
      processingError: 'bad',
      processedAt: null,
      receivedAt: new Date(),
    }
    const findMany = vi.fn().mockResolvedValue([row])
    const update = vi.fn().mockResolvedValue(undefined)
    const processEvent = vi.fn()
    const logger = silentLogger()

    const result = await runReconciliationBatch({
      findFailedWebhookEvents: findMany,
      updateWebhookEvent: update,
      processEvent,
      logger,
    })

    expect(processEvent).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalled()
    expect(result.skippedCount).toBe(1)
    expect(update).toHaveBeenCalledWith('wh_bad', {
      processingError: expect.stringContaining('payload'),
    })
  })

  it('processa múltiplas rows em sequência', async () => {
    const rows = [
      {
        id: 'wh_a',
        source: 'asaas',
        externalId: 'evt_a',
        eventType: 'PAYMENT_SUCCEEDED',
        payload: validPayload,
        processingError: 'fail',
        processedAt: null,
        receivedAt: new Date(),
      },
      {
        id: 'wh_b',
        source: 'asaas',
        externalId: 'evt_b',
        eventType: 'PAYMENT_SUCCEEDED',
        payload: { ...validPayload, externalId: 'evt_b' },
        processingError: 'fail',
        processedAt: null,
        receivedAt: new Date(),
      },
    ]
    const findMany = vi.fn().mockResolvedValue(rows)
    const update = vi.fn().mockResolvedValue(undefined)
    const processEvent = vi.fn().mockResolvedValue({ processed: true })

    const result = await runReconciliationBatch({
      findFailedWebhookEvents: findMany,
      updateWebhookEvent: update,
      processEvent,
      logger: silentLogger(),
    })

    expect(result.successCount).toBe(2)
    expect(processEvent).toHaveBeenCalledTimes(2)
  })
})
