import { io } from 'socket.io-client';

class SocketClient {
  constructor() {
    this.socket = null;
    this.connected = false;
  }

  connect() {
    if (this.socket) return this.socket;

    const isVercel = typeof window !== 'undefined' && (window.location.hostname.includes('vercel.app') || window.location.hostname.includes('netlify.app'));
    const socketUrl = import.meta.env.VITE_API_URL || (isVercel ? 'https://scratchportal.onrender.com' : '/');

    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      this.connected = true;
      console.log('⚡ Socket connected:', this.socket.id);
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      console.log('❌ Socket disconnected');
    });

    return this.socket;
  }

  joinRoom(roomName) {
    if (this.socket) {
      this.socket.emit('join:room', roomName);
    }
  }

  leaveRoom(roomName) {
    if (this.socket) {
      this.socket.emit('leave:room', roomName);
    }
  }

  joinTeam(teamId) {
    if (this.socket && teamId) {
      this.socket.emit('join:team', teamId);
    }
  }

  on(event, callback) {
    if (!this.socket) this.connect();
    this.socket.on(event, callback);
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }
}

export const socketClient = new SocketClient();
export default socketClient;
