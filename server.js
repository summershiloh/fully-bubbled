import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

let WebSocketServer;
try {
  WebSocketServer = (await import('ws')).WebSocketServer;
} catch {
  console.log('ws package not found, using built-in fallback');
}

const PORT = process.env.PORT || 7777;
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

function createServerWithWebSocket() {
  if (!WebSocketServer) {
    console.log('Starting HTTP-only server (no WebSocket support)');
    const server = createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Fully Bubbled game server running');
    });
    server.listen(PORT, () => {
      console.log(`[WARN] Server running on port ${PORT} (HTTP only)`);
      console.log('Install ws: npm install ws');
    });
    return;
  }

  const distDir = join(__dirname, 'dist');

  const MIME = {
    '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon', '.json': 'application/json', '.map': 'application/json'
  };

  const server = createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', rooms: rooms.size, players: clients.size }));
      return;
    }
    let path = req.url === '/' ? '/index.html' : req.url;
    const filePath = join(distDir, path);
    if (existsSync(filePath)) {
      const ext = filePath.substring(filePath.lastIndexOf('.'));
      const type = MIME[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type });
      res.end(readFileSync(filePath));
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(readFileSync(join(distDir, 'index.html')));
    }
  });

  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    const clientId = generateRoomCode() + Date.now().toString(36);
    const client = { id: clientId, ws, room: null, name: 'Player', ready: false, gameOver: false, score: 0 };
    clients.set(clientId, client);

    console.log(`Client ${clientId} connected (${clients.size} total)`);

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

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Fully Bubbled Server] Running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
    console.log(`Other players connect via http://YOUR_SERVER_IP:${PORT}`);
  });
}

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
      console.log(`Room ${code} created by ${client.name}`);
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
      console.log(`${client.name} joined room ${code}`);
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
        console.log(`Game started in room ${room.code}`);
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
      console.log(`${client.name} game over in room ${room.code} (score: ${client.score})`);
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
        console.log(`Game restarted in room ${room.code}`);
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

  console.log(`Countdown started in room ${room.code} (60s)`);
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
  console.log(`Room ${room.code} cleaned up`);
}

function handleDisconnect(client) {
  console.log(`Client ${client.id} (${client.name}) disconnected`);
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

createServerWithWebSocket();
