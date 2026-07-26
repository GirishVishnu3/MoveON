/**
 * MoveON WebSocket client.
 * Connects to the FastAPI WebSocket endpoint at /ws/{clientId}
 * and fires event-based callbacks with auto-reconnect.
 */

type MessageHandler = (data: Record<string, unknown>) => void;

const BACKEND_WS_URL =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_WS_URL) ||
  'ws://localhost:8000/ws';

const MAX_RETRIES = 5;
const RETRY_BASE_MS = 1000;

class MoveONWebSocket {
  private ws: WebSocket | null = null;
  private clientId: string | null = null;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private retryCount = 0;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private manualClose = false;

  connect(clientId: string) {
    this.clientId = clientId;
    this.manualClose = false;
    this._createConnection();
  }

  private _createConnection() {
    if (!this.clientId) return;
    const url = `${BACKEND_WS_URL}/${this.clientId}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log(`[WS] Connected as ${this.clientId}`);
      this.retryCount = 0;
      this._emit('__connected', {});
      // Keepalive ping every 20s
      this.pingInterval = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'PING' }));
        }
      }, 20_000);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const type: string = data.type || '__unknown';
        this._emit(type, data);
      } catch {
        console.warn('[WS] Non-JSON message received:', event.data);
      }
    };

    this.ws.onerror = (err) => {
      // Log as warning only — WS errors are non-fatal; the app falls back to HTTP polling
      console.warn('[WS] Connection error (non-fatal, falling back to polling):', err);
      // Do NOT emit '__error' here — it causes React error boundary activation
    };

    this.ws.onclose = () => {
      if (this.pingInterval) clearInterval(this.pingInterval);
      if (!this.manualClose && this.retryCount < MAX_RETRIES) {
        const delay = RETRY_BASE_MS * Math.pow(2, this.retryCount);
        this.retryCount++;
        console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.retryCount})…`);
        setTimeout(() => this._createConnection(), delay);
      } else {
        this._emit('__disconnected', {});
      }
    };
  }

  disconnect() {
    this.manualClose = true;
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.ws?.close();
    this.ws = null;
  }

  send(message: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('[WS] Cannot send — socket not open');
    }
  }

  on(type: string, handler: MessageHandler) {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type)!.push(handler);
  }

  off(type: string, handler: MessageHandler) {
    const list = this.handlers.get(type) ?? [];
    this.handlers.set(type, list.filter((h) => h !== handler));
  }

  private _emit(type: string, data: Record<string, unknown>) {
    const handlers = this.handlers.get(type) ?? [];
    handlers.forEach((h) => h(data));
  }
}

// Singleton instance for the app
export const socket = new MoveONWebSocket();
