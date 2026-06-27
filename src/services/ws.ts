import type { SSEEvent, StreamEvent, WSReceived } from '@/types/api';

/* ============== WebSocket chat client ============== */

export interface WSChatHandlers {
  onMessage?: (data: WSReceived) => void;
  onOpen?: () => void;
  onClose?: (ev: CloseEvent) => void;
  onError?: (ev: Event) => void;
}

export class WSChatClient {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: WSChatHandlers;

  constructor(url: string, handlers: WSChatHandlers) {
    this.url = url;
    this.handlers = handlers;
  }

  connect() {
    this.close();
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => this.handlers.onOpen?.();
    this.ws.onclose = (ev) => this.handlers.onClose?.(ev);
    this.ws.onerror = (ev) => this.handlers.onError?.(ev);
    this.ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as WSReceived;
        this.handlers.onMessage?.(data);
      } catch {
        /* ignore non-json */
      }
    };
  }

  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  get isOpen(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  send(text: string) {
    if (this.isOpen) {
      this.ws!.send(JSON.stringify({ message: text }));
      return true;
    }
    return false;
  }

  close() {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      try {
        this.ws.close();
      } catch {
        /* noop */
      }
      this.ws = null;
    }
  }
}

export function buildChatWSUrl(agentId: string, stream = false): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const path = stream ? `/ws/chat/stream/${encodeURIComponent(agentId)}` : `/ws/chat/${encodeURIComponent(agentId)}`;
  return `${proto}//${window.location.host}${path}`;
}

/* ============== SSE chat client ============== */

export interface SSEChatHandlers {
  onEvent?: (ev: SSEEvent) => void;
  onError?: (err: Error) => void;
  onDone?: () => void;
}

/** Streams an SSE chat response via fetch + ReadableStream. Returns a cancel function. */
export function streamSSEChat(
  agentId: string,
  message: string,
  handlers: SSEChatHandlers,
): () => void {
  const controller = new AbortController();
  const url = `/api/chat/sse/${encodeURIComponent(agentId)}?message=${encodeURIComponent(message)}`;

  (async () => {
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok || !res.body) {
        throw new Error(`SSE request failed: ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // SSE events separated by \n\n
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';
        for (const block of parts) {
          const line = block.trim();
          if (!line.startsWith('data:')) continue;
          const payload = line.replace(/^data:\s*/, '');
          try {
            const evt = JSON.parse(payload) as SSEEvent;
            handlers.onEvent?.(evt);
          } catch {
            /* ignore malformed */
          }
        }
      }
      handlers.onDone?.();
    } catch (err) {
      if (!controller.signal.aborted) {
        handlers.onError?.(err as Error);
      }
    }
  })();

  return () => controller.abort();
}

/* ============== Connection Manager ============== */

export type ConnectionState =
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'degraded';

export interface ConnectionManagerOptions {
  onStateChange?: (state: ConnectionState) => void;
  maxRetriesBeforeDegrade?: number;
}

/**
 * Manages WS lifecycle with exponential backoff reconnection and HTTP fallback.
 * States: connected -> disconnected -> reconnecting -> connected
 *                                  -> degraded (HTTP fallback)
 */
export class ConnectionManager {
  state: ConnectionState = 'disconnected';
  private retries = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private opts: Required<ConnectionManagerOptions>;

  constructor(opts: ConnectionManagerOptions = {}) {
    this.opts = {
      onStateChange: opts.onStateChange ?? (() => {}),
      maxRetriesBeforeDegrade: opts.maxRetriesBeforeDegrade ?? 5,
    };
  }

  private setState(s: ConnectionState) {
    if (this.state === s) return;
    this.state = s;
    this.opts.onStateChange(s);
  }

  markConnected() {
    this.retries = 0;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.setState('connected');
  }

  markDisconnected(reattempt: () => void) {
    this.retries += 1;
    const delay = Math.min(1000 * 2 ** (this.retries - 1), 16000);

    if (this.retries > this.opts.maxRetriesBeforeDegrade) {
      this.setState('degraded');
      return;
    }

    if (this.retries >= 3) {
      this.setState('reconnecting');
    }

    this.timer = setTimeout(() => reattempt(), delay);
  }

  reset() {
    this.retries = 0;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.setState('disconnected');
  }

  destroy() {
    this.reset();
  }
}

/** Parse a Prometheus text exposition into key-value metric samples. */
export function parsePrometheus(text: string): Array<{ name: string; value: number; labels: Record<string, string> }> {
  const samples: Array<{ name: string; value: number; labels: Record<string, string> }> = [];
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)(?:\{([^}]*)\})?\s+([+-]?[\d.eE+-]+)$/);
    if (!m) continue;
    const name = m[1];
    const labels: Record<string, string> = {};
    if (m[2]) {
      const labelStr = m[2];
      const re = /([a-zA-Z_][a-zA-Z0-9_]*)="([^"]*)"/g;
      let lm: RegExpExecArray | null;
      while ((lm = re.exec(labelStr)) !== null) {
        labels[lm[1]] = lm[2];
      }
    }
    const value = Number.parseFloat(m[3]);
    samples.push({ name, value, labels });
  }
  return samples;
}

export type { StreamEvent };
