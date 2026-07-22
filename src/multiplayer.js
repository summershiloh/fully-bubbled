export class MultiplayerClient {
  constructor() {
    this.ws = null;
    this.clientId = null;
    this.roomCode = null;
    this.connected = false;
    this.inRoom = false;
    this.isHost = false;
    this.players = [];
    this.name = 'Player_' + Math.random().toString(36).substr(2, 4).toUpperCase();
    this.messageHandlers = {
      room_created: [],
      room_joined: [],
      player_joined: [],
      player_ready_update: [],
      game_start: [],
      opponent_input: [],
      opponent_state: [],
      game_over: [],
      player_game_over: [],
      player_disconnected: [],
      player_left: [],
      player_retry: [],
      player_exited: [],
      session_countdown: [],
      session_end: [],
      disconnected: [],
      error: [],
      connected: []
    };
  }

  setName(name) {
    this.name = name || this.name;
    this.send({ type: 'set_name', name: this.name });
  }

  connect(serverUrl = null) {
    const url = serverUrl || this.getServerUrl();
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);
      } catch (e) {
        reject(new Error(`WebSocket connection failed: ${e.message}`));
        return;
      }

      this.ws.onopen = () => {
        this.connected = true;
        this.ws.send(JSON.stringify({ type: 'set_name', name: this.name }));
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch (e) {
          console.error('Failed to parse message:', e);
        }
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.inRoom = false;
        this.roomCode = null;
        this.dispatchEvent('disconnected', { message: 'Connection lost' });
        this.dispatchEvent('error', { message: 'Disconnected from server' });
      };

      this.ws.onerror = (err) => {
        reject(new Error('WebSocket error'));
      };

      setTimeout(() => {
        if (!this.connected) reject(new Error('Connection timeout'));
      }, 5000);
    });
  }

  getServerUrl() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${location.host}/api/ws`;
  }

  handleMessage(msg) {
    switch (msg.type) {
      case 'connected':
        this.clientId = msg.clientId;
        break;
      case 'room_created':
        this.roomCode = msg.code;
        this.inRoom = true;
        this.isHost = true;
        this.players = [{ id: this.clientId, name: this.name }];
        break;
      case 'room_joined':
        this.roomCode = msg.code;
        this.inRoom = true;
        break;
      case 'player_joined':
        if (!this.players.find(p => p.id === msg.playerId)) {
          this.players.push({ id: msg.playerId, name: msg.name });
        }
        break;
      case 'game_start':
        this.players = msg.players || this.players;
        break;
      case 'game_over':
        break;
      case 'player_left':
      case 'player_disconnected':
        this.players = this.players.filter(p => p.id !== msg.playerId);
        break;
    }
    this.dispatchEvent(msg.type, msg);
  }

  on(event, callback) {
    if (this.messageHandlers[event]) {
      this.messageHandlers[event].push(callback);
    }
    return this;
  }

  off(event, callback) {
    if (this.messageHandlers[event]) {
      this.messageHandlers[event] = this.messageHandlers[event].filter(cb => cb !== callback);
    }
    return this;
  }

  dispatchEvent(event, data) {
    if (this.messageHandlers[event]) {
      for (const cb of this.messageHandlers[event]) {
        try { cb(data); } catch (e) { console.error('Handler error:', e); }
      }
    }
  }

  createRoom() {
    this.send({ type: 'create_room', name: this.name });
  }

  joinRoom(code) {
    this.send({ type: 'join_room', code: code.toUpperCase(), name: this.name });
  }

  setReady() {
    this.send({ type: 'player_ready' });
  }

  sendGameInput(data) {
    this.send({ type: 'game_input', data });
  }

  sendGameState(data) {
    this.send({ type: 'game_state', data });
  }

  sendGameOver(reason) {
    this.send({ type: 'game_over', reason });
  }

  sendRetry() {
    this.send({ type: 'player_retry' });
  }

  sendExitSession() {
    this.send({ type: 'exit_session' });
  }

  leaveRoom() {
    this.send({ type: 'leave_room' });
    this.inRoom = false;
    this.roomCode = null;
    this.players = [];
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.inRoom = false;
    this.roomCode = null;
  }

  send(msg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }
}
