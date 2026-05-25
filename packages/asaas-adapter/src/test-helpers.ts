type FetchMockLike = {
  mock: { calls: unknown[][] }
}

export function firstFetchCall(mock: FetchMockLike): {
  url: string
  init: RequestInit
} {
  const call = mock.mock.calls[0]
  if (!call) {
    throw new Error('fetch mock was not called')
  }
  const [url, init] = call
  if (typeof url !== 'string') {
    throw new Error('fetch mock first arg is not a string')
  }
  if (init === undefined || typeof init !== 'object') {
    throw new Error('fetch mock called without init options')
  }
  return { url, init: init as RequestInit }
}

export function firstFetchBody(mock: FetchMockLike): Record<string, unknown> {
  const { init } = firstFetchCall(mock)
  if (typeof init.body !== 'string') {
    throw new Error('fetch mock call has no string body')
  }
  const parsed = JSON.parse(init.body)
  if (parsed === null || typeof parsed !== 'object') {
    throw new Error('fetch mock body is not a JSON object')
  }
  return parsed as Record<string, unknown>
}
