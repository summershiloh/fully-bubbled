import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const rooms = new Map();
const clients = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  } while (rooms.has(code));
  return code;
}

const server = createServer((req, res) => {
  res.writeHead(426, { 'Content-Type': 'text/plain' });
  res.end('WebSocket upgrade required');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  const clientId = generateRoomCode() + Date.now().toString(36);
  const client = { id: clientId, ws, room: null, name: 'Player', ready: false, gameOver: false, score: 0 };
  clients.set(clientId, client);

  ws.send(JSON.stringify({ type: 'connected', clientId }));

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      handleMessage(client, msg);
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message' }));
    }
  });

  ws.on('close', () => {
    handleDisconnect(client);
  });
});

function handleMessage(client, msg) {
  const { ws } = client;

  switch (msg.type) {
    case 'create_room': {
      if (client.room) {
        ws.send(JSON.stringify({ type: 'error', message: 'Already in a room' }));
        return;
      }
      const code = generateRoomCode();
      const room = {
        code,
        host: client.id,
        players: [client],
        state: 'waiting',
        gameState: null,
        countdownTimer: null,
        countdown: 0
      };
      rooms.set(code, room);
      client.room = code;
      if (msg.name) client.name = msg.name;
      ws.send(JSON.stringify({ type: 'room_created', code }));
      break;
    }

    case 'join_room': {
      const { code } = msg;
      if (!code || !rooms.has(code)) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
        return;
      }
      const room = rooms.get(code);
      if (room.players.length >= 2) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room is full' }));
        return;
      }
      if (client.room) {
        ws.send(JSON.stringify({ type: 'error', message: 'Already in a room' }));
        return;
      }
      client.room = code;
      if (msg.name) client.name = msg.name;
      room.players.push(client);
      ws.send(JSON.stringify({ type: 'room_joined', code }));
      broadcastToRoom(room, { type: 'player_joined', name: client.name, playerId: client.id, playerCount: room.players.length });
      break;
    }

    case 'set_name': {
      client.name = msg.name || 'Player';
      break;
    }

    case 'player_ready': {
      if (!client.room) return;
      const room = rooms.get(client.room);
      if (!room) return;
      client.ready = true;
      broadcastToRoom(room, { type: 'player_ready_update', playerId: client.id, ready: true });
      const allReady = room.players.every(p => p.ready);
      if (allReady && room.players.length === 2) {
        room.state = 'playing';
        resetPlayerStates(room);
        const playerIds = room.players.map(p => ({ id: p.id, name: p.name }));
        broadcastToRoom(room, { type: 'game_start', players: playerIds, timestamp: Date.now() });
      }
      break;
    }

    case 'game_input': {
      if (!client.room) return;
      const room = rooms.get(client.room);
      if (!room) return;
      const opponent = room.players.find(p => p.id !== client.id);
      if (opponent) {
        opponent.ws.send(JSON.stringify({ type: 'opponent_input', data: msg.data }));
      }
      break;
    }

    case 'game_state': {
      if (!client.room) return;
      const room = rooms.get(client.room);
      if (!room) return;
      client.score = msg.data?.score || 0;
      const opponent = room.players.find(p => p.id !== client.id);
      if (opponent) {
        opponent.ws.send(JSON.stringify({ type: 'opponent_state', data: msg.data }));
      }
      break;
    }

    case 'game_over': {
      if (!client.room) return;
      const room = rooms.get(client.room);
      if (!room) return;
      client.gameOver = true;
      client.score = msg.score || client.score;
      const opponent = room.players.find(p => p.id !== client.id);
      if (opponent) {
        opponent.ws.send(JSON.stringify({
          type: 'player_game_over',
          playerId: client.id,
          playerName: client.name,
          score: client.score,
          reason: msg.reason || 'Game over'
        }));
      }
      break;
    }

    case 'player_retry': {
      if (!client.room) return;
      const room = rooms.get(client.room);
      if (!room) return;
      client.gameOver = false;
      client.ready = true;
      client.score = 0;
      broadcastToRoom(room, { type: 'player_retry', playerId: client.id, playerName: client.name });
      const allReady = room.players.every(p => p.ready && !p.gameOver);
      if (allReady && room.players.length === 2) {
        room.state = 'playing';
        cancelCountdown(room);
        resetPlayerStates(room);
        const playerIds = room.players.map(p => ({ id: p.id, name: p.name }));
        broadcastToRoom(room, { type: 'game_start', players: playerIds, timestamp: Date.now() });
      }
      break;
    }

    case 'exit_session': {
      if (!client.room) return;
      const room = rooms.get(client.room);
      if (!room) return;
      startCountdown(room, client);
      break;
    }

    case 'leave_room': {
      leaveRoom(client);
      break;
    }

    default:
      ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
  }
}

function resetPlayerStates(room) {
  for (const p of room.players) {
    p.gameOver = false;
    p.ready = false;
    p.score = 0;
  }
}

function startCountdown(room, exitingPlayer) {
  if (room.countdownTimer) return;
  room.countdown = 60;
  room.state = 'countdown';

  broadcastToRoom(room, {
    type: 'session_countdown',
    seconds: room.countdown,
    exitPlayerId: exitingPlayer.id,
    exitPlayerName: exitingPlayer.name
  });

  room.countdownTimer = setInterval(() => {
    room.countdown--;
    if (room.countdown <= 0) {
      cancelCountdown(room);
      broadcastToRoom(room, { type: 'session_end', reason: 'Countdown reached zero' });
      cleanupRoom(room);
    } else {
      broadcastToRoom(room, {
        type: 'session_countdown',
        seconds: room.countdown,
        exitPlayerId: exitingPlayer.id,
        exitPlayerName: exitingPlayer.name
      });
    }
  }, 1000);
}

function cancelCountdown(room) {
  if (room.countdownTimer) {
    clearInterval(room.countdownTimer);
    room.countdownTimer = null;
    room.countdown = 0;
  }
}

function cleanupRoom(room) {
  cancelCountdown(room);
  for (const p of room.players) {
    p.room = null;
    p.ready = false;
    p.gameOver = false;
    p.score = 0;
  }
  rooms.delete(room.code);
}

function handleDisconnect(client) {
  if (client.room) {
    const room = rooms.get(client.room);
    if (room) {
      broadcastToRoom(room, { type: 'player_disconnected', playerId: client.id });
      leaveRoom(client);
      if (room.players.length === 0) {
        cleanupRoom(room);
      } else if (room.state === 'countdown') {
        cancelCountdown(room);
        broadcastToRoom(room, { type: 'session_end', reason: 'Player disconnected' });
        cleanupRoom(room);
      }
    }
  }
  clients.delete(client.id);
}

function leaveRoom(client) {
  if (!client.room) return;
  const room = rooms.get(client.room);
  if (room) {
    room.players = room.players.filter(p => p.id !== client.id);
    if (room.players.length === 0) {
      cleanupRoom(room);
    } else {
      broadcastToRoom(room, { type: 'player_left', playerId: client.id });
    }
  }
  client.room = null;
  client.ready = false;
  client.gameOver = false;
  client.score = 0;
  client.ws.send(JSON.stringify({ type: 'left_room' }));
}

function broadcastToRoom(room, message) {
  const data = JSON.stringify(message);
  for (const player of room.players) {
    try {
      if (player.ws.readyState === 1) {
        player.ws.send(data);
      }
    } catch (e) {
      console.error(`Failed to send to player ${player.id}:`, e.message);
    }
  }
}

export default server;
