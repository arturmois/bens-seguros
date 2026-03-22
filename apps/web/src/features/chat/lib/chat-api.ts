import { api } from '@/lib/api-client';

const CHAT_SERVER_URL = process.env.NEXT_PUBLIC_CHAT_SERVER_URL ?? 'http://localhost:3002';

interface ChatApiResponse<TData> {
  success: true;
  data: TData;
  meta?: { total: number; nextCursor: string | null };
}

interface ChatApiErrorBody {
  success: false;
  error: { code: string; message: string };
}

export class ChatApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ChatApiError';
  }
}

function isChatErrorResponse(body: unknown): body is ChatApiErrorBody {
  return (
    typeof body === 'object' &&
    body !== null &&
    'success' in body &&
    body.success === false &&
    'error' in body
  );
}

let cachedToken: string | null = null;

export async function getChatToken(): Promise<string> {
  if (cachedToken) return cachedToken;

  const response = await api.post<{ token: string }>('/api/v1/chat/token', {});
  cachedToken = response.data.token;
  return cachedToken;
}

export function clearChatToken(): void {
  cachedToken = null;
}

export async function chatFetch<TData>(
  path: string,
  options?: RequestInit,
): Promise<ChatApiResponse<TData>> {
  const token = await getChatToken();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
  };

  const res = await fetch(`${CHAT_SERVER_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearChatToken();
    throw new ChatApiError(401, 'UNAUTHORIZED', 'Token expirado');
  }

  if (res.status === 204) {
    return { success: true, data: null as TData };
  }

  const body: unknown = await res.json();

  if (!res.ok) {
    if (isChatErrorResponse(body)) {
      throw new ChatApiError(res.status, body.error.code, body.error.message);
    }
    throw new ChatApiError(res.status, 'UNKNOWN_ERROR', 'Erro inesperado');
  }

  return body as ChatApiResponse<TData>;
}

export const chatApi = {
  get: <TData>(path: string) => chatFetch<TData>(path),

  post: <TData>(path: string, data: unknown) =>
    chatFetch<TData>(path, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  put: <TData>(path: string, data: unknown) =>
    chatFetch<TData>(path, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: <TData>(path: string) =>
    chatFetch<TData>(path, {
      method: 'DELETE',
    }),
};
