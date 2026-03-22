'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { SOCKET_EVENTS, CHAT_LIMITS } from '@repo/shared';

import { getChatToken } from '../lib/chat-api';
import { disconnectSocket, getSocket } from '../lib/socket-client';
import { isRecord } from '../lib/type-guards';
import type { AgentPresence } from '../types';

interface UseSocketReturn {
  readonly socket: Socket | null;
  readonly isConnected: boolean;
  readonly onlineAgents: AgentPresence[];
}

export function useSocket(): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastEventTimestampRef = useRef<number>(Date.now());
  const [isConnected, setIsConnected] = useState(false);
  const [onlineAgents, setOnlineAgents] = useState<AgentPresence[]>([]);

  const handleAgentStatusUpdate = useCallback((data: unknown) => {
    if (!isAgentStatusPayload(data)) return;
    const agents: AgentPresence[] = data.agents.map((agent) => ({
      userId: agent.userId,
      name: agent.name,
      status: 'online',
    }));
    setOnlineAgents(agents);
  }, []);

  const handleConnect = useCallback(() => {
    setIsConnected(true);
  }, []);

  const handleDisconnect = useCallback(() => {
    setIsConnected(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function connect(): Promise<void> {
      try {
        const token = await getChatToken();
        if (!mounted) return;

        const sock = getSocket(token);
        socketRef.current = sock;

        sock.on('connect', handleConnect);
        sock.on('disconnect', handleDisconnect);
        sock.on(SOCKET_EVENTS.AGENT_STATUS_UPDATE, handleAgentStatusUpdate);

        sock.on(SOCKET_EVENTS.INCOMING_MESSAGE, () => {
          lastEventTimestampRef.current = Date.now();
        });

        sock.on(SOCKET_EVENTS.CONVERSATION_UPDATED, () => {
          lastEventTimestampRef.current = Date.now();
        });

        heartbeatRef.current = setInterval(() => {
          if (sock.connected) {
            sock.emit(SOCKET_EVENTS.AGENT_HEARTBEAT);
          }
        }, CHAT_LIMITS.HEARTBEAT_INTERVAL_MS);
      } catch {
        // Token fetch failed; connection will not be established
      }
    }

    void connect();

    return () => {
      mounted = false;

      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }

      const sock = socketRef.current;
      if (sock) {
        sock.off('connect', handleConnect);
        sock.off('disconnect', handleDisconnect);
        sock.off(SOCKET_EVENTS.AGENT_STATUS_UPDATE, handleAgentStatusUpdate);
        sock.off(SOCKET_EVENTS.INCOMING_MESSAGE);
        sock.off(SOCKET_EVENTS.CONVERSATION_UPDATED);
      }

      disconnectSocket();
      socketRef.current = null;
    };
  }, [handleConnect, handleDisconnect, handleAgentStatusUpdate]);

  return { socket: socketRef.current, isConnected, onlineAgents };
}

// --- type guards ---

interface AgentStatusPayload {
  agents: ReadonlyArray<{ userId: string; name: string }>;
}

function isAgentStatusPayload(data: unknown): data is AgentStatusPayload {
  if (!isRecord(data)) return false;
  if (!Array.isArray(data['agents'])) return false;
  return (data['agents'] as unknown[]).every(
    (a) => isRecord(a) && typeof a['userId'] === 'string' && typeof a['name'] === 'string',
  );
}
