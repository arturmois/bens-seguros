import { describe, it, expect, vi } from 'vitest'
import 'reflect-metadata'
import { SoftDeleteContact } from './soft-delete-contact.js'
import type { ContactRepository } from '../domain/contact-repository.js'

describe('SoftDeleteContact', () => {
  it('chama softDelete no repo', async () => {
    const repo = { softDelete: vi.fn() } as unknown as ContactRepository
    await new SoftDeleteContact(repo).execute({
      id: 'c-1',
      organizationId: 'org-1',
    })
    expect(repo.softDelete).toHaveBeenCalledWith('c-1', 'org-1')
  })
})
