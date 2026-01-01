import { IntersectionState } from '../types';

type MessageHandler = (data: { [key: string]: IntersectionState }) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private messageHandlers: MessageHandler[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 3000;
  private url = 'ws://localhost:3000';

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('⚠️ WebSocket already connected');
      return;
    }

    console.log('🔌 Connecting to WebSocket server...');
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('✅ WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'INITIAL_STATE' || message.type === 'STATE_UPDATE') {
          console.log('📡 State update received:', message.type);
          this.messageHandlers.forEach(handler => handler(message.data));
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      this.attemptReconnect();
    };
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay);
    } else {
      console.error('❌ Max reconnection attempts reached');
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  onMessage(handler: MessageHandler) {
    this.messageHandlers.push(handler);
  }

  removeMessageHandler(handler: MessageHandler) {
    this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
  }

  sendDensityUpdate(intersectionId: string, direction: 'NS' | 'EW', density: number) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log(`📤 Sending density update: ${intersectionId} ${direction} = ${density}`);
      this.ws.send(JSON.stringify({
        type: 'UPDATE_DENSITY',
        data: { intersectionId, direction, density }
      }));
    } else {
      console.error('❌ WebSocket not connected, cannot send density update');
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const wsService = new WebSocketService();
export default wsService;
