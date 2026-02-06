import { useEffect, useRef, useState, useCallback } from 'react';
import type { WsMessage } from '@shared/types';

const WS_URL = `ws://${window.location.hostname}:3001/ws`;
const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

interface UseWebSocketReturn {
  isConnected: boolean;
  lastMessage: WsMessage | null;
  subscribe: (event: string, handler: (data: unknown) => void) => () => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<string, Set<(data: unknown) => void>>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const message: WsMessage = JSON.parse(event.data as string);
        setLastMessage(message);

        const handlers = handlersRef.current.get(message.event);
        if (handlers) {
          handlers.forEach((handler) => handler(message.data));
        }
      } catch {
        console.error('[WS] Failed to parse message');
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;

      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts.current += 1;
        reconnectTimeout.current = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  const subscribe = useCallback(
    (event: string, handler: (data: unknown) => void) => {
      if (!handlersRef.current.has(event)) {
        handlersRef.current.set(event, new Set());
      }
      handlersRef.current.get(event)!.add(handler);

      /* Return unsubscribe function */
      return () => {
        handlersRef.current.get(event)?.delete(handler);
      };
    },
    [],
  );

  return { isConnected, lastMessage, subscribe };
}
