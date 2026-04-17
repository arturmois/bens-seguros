// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/lib/api-client'

import { useCepLookup } from './use-cep-lookup'

const getCepMock = vi.fn()

vi.mock('@/api/endpoints/cep/cep', () => ({
  getCep: (...args: unknown[]) => getCepMock(...args),
}))

const payload = {
  zipCode: '01311000',
  street: 'Avenida Paulista',
  neighborhood: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
  complement: null,
}

describe('useCepLookup', () => {
  beforeEach(() => {
    getCepMock.mockReset()
  })

  it('returns null without calling API when CEP has fewer than 8 digits', async () => {
    const { result } = renderHook(() => useCepLookup())
    const data = await act(() => result.current.lookup('1234'))
    expect(data).toBeNull()
    expect(getCepMock).not.toHaveBeenCalled()
    expect(result.current.error).toBeNull()
  })

  it('normalizes CEP and returns AddressData on success', async () => {
    getCepMock.mockResolvedValue({
      data: { success: true, data: payload },
      status: 200,
      headers: new Headers(),
    })
    const { result } = renderHook(() => useCepLookup())
    const data = await act(() => result.current.lookup('01311-000'))
    expect(getCepMock).toHaveBeenCalledWith('01311000')
    expect(data).toEqual(payload)
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error).toBeNull()
  })

  it('sets error { type: "not-found" } on ApiError with status 404', async () => {
    getCepMock.mockRejectedValue(
      new ApiError(404, 'CEP_NOT_FOUND', 'CEP não encontrado.')
    )
    const { result } = renderHook(() => useCepLookup())
    const data = await act(() => result.current.lookup('00000000'))
    expect(data).toBeNull()
    await waitFor(() =>
      expect(result.current.error).toEqual({ type: 'not-found' })
    )
  })

  it('sets error { type: "provider-unavailable" } on ApiError with status 502', async () => {
    getCepMock.mockRejectedValue(
      new ApiError(502, 'CEP_PROVIDER_UNAVAILABLE', 'Serviço indisponível.')
    )
    const { result } = renderHook(() => useCepLookup())
    const data = await act(() => result.current.lookup('01311000'))
    expect(data).toBeNull()
    await waitFor(() =>
      expect(result.current.error).toEqual({ type: 'provider-unavailable' })
    )
  })

  it('sets error { type: "network" } on unknown errors', async () => {
    getCepMock.mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useCepLookup())
    const data = await act(() => result.current.lookup('01311000'))
    expect(data).toBeNull()
    await waitFor(() =>
      expect(result.current.error).toEqual({ type: 'network' })
    )
  })

  it('clears error on a subsequent successful lookup', async () => {
    getCepMock.mockRejectedValueOnce(
      new ApiError(404, 'CEP_NOT_FOUND', 'CEP não encontrado.')
    )
    getCepMock.mockResolvedValueOnce({
      data: { success: true, data: payload },
      status: 200,
      headers: new Headers(),
    })
    const { result } = renderHook(() => useCepLookup())

    await act(() => result.current.lookup('00000000'))
    await waitFor(() =>
      expect(result.current.error).toEqual({ type: 'not-found' })
    )

    await act(() => result.current.lookup('01311000'))
    await waitFor(() => expect(result.current.error).toBeNull())
  })
})
