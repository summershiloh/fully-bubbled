import { audio } from './audio.js';

let gameScene = null;
let multiplayer = null;
let gameLoopRunning = false;

const $ = (id) => document.getElementById(id);

const screens = {
  title: $('titleScreen'),
  lobby: $('lobbyScreen'),
  controls: $('controlsScreen'),
  game: $('gameHUD')
};

const ui = {
  btnSingle: $('btnSinglePlayer'),
  btnMulti: $('btnMultiplayer'),
  btnControls: $('btnControls'),
  btnControlsBack: $('btnControlsBack'),
  btnCreate: $('btnCreateRoom'),
  btnJoin: $('btnJoinRoom'),
  btnSubmit: $('btnSubmitCode'),
  btnCancel: $('btnCancelCode'),
  btnReady: $('btnReady'),
  btnLeave: $('btnLeaveRoom'),
  btnLobbyBack: $('btnLobbyBack'),
  btnBack: $('btnBackToMenu'),
  btnRetry: $('btnRetry'),
  codeInput: $('codeInput'),
  lobbyMain: $('lobbyMain'),
  lobbyJoinInput: $('lobbyJoinInput'),
  lobbyStatus: $('lobbyStatus'),
  roomInfo: $('roomInfo'),
  roomCodeDisplay: $('roomCodeDisplay'),
  playersInRoom: $('playersInRoom'),
  hudScore: $('hudScore'),
  hudLevel: $('hudLevel'),
  hudTimer: $('hudTimer'),
  hudOpponent: $('hudOpponent'),
  opponentName: $('opponentName'),
  opponentScore: $('opponentScore'),
  gameOverlay: $('gameOverlay'),
  overlayTitle: $('overlayTitle'),
  overlayMessage: $('overlayMessage'),
  overlayScore: $('overlayScore'),
  connectionStatus: $('connectionStatus')
};

export function getUI() { return ui; }
export function getScreens() { return screens; }
export function getGameScene() { return gameScene; }
export function setGameScene(s) { gameScene = s; }
export function getMultiplayer() { return multiplayer; }
export function setMultiplayer(m) { multiplayer = m; }
export function setGameLoopRunning(r) { gameLoopRunning = r; }
export function getGameLoopRunning() { return gameLoopRunning; }

export function showScreen(name) {
  Object.values(screens).forEach(s => { if (s) s.classList.remove('active'); });
  if (name === 'game' && screens.game) {
    screens.game.style.display = 'flex';
    screens.game.classList.add('active');
  } else {
    if (screens.game) screens.game.style.display = 'none';
    if (name === 'title' && screens.title) screens.title.classList.add('active');
    if (name === 'lobby' && screens.lobby) screens.lobby.classList.add('active');
    if (name === 'controls' && screens.controls) screens.controls.classList.add('active');
  }
}

export function hideGameOverlay() { if (ui.gameOverlay) ui.gameOverlay.style.display = 'none'; }

export function showGameOverlay(title, message) {
  if (ui.overlayTitle) ui.overlayTitle.textContent = title;
  if (ui.overlayMessage) ui.overlayMessage.textContent = message;
  if (ui.gameOverlay) ui.gameOverlay.style.display = 'flex';
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function setLobbyStatus(text) { if (ui.lobbyStatus) ui.lobbyStatus.textContent = text; }

function updatePlayersList() {
  if (!ui.playersInRoom || !multiplayer) return;
  ui.playersInRoom.innerHTML = (multiplayer.players || []).map(p => {
    const isMe = p.id === multiplayer.clientId;
    return `<div class="player-entry"><span>${isMe ? '&#9733; ' : ''}${p.name || 'Player'} ${isMe ? '(You)' : ''}</span><span class="player-status">${isMe ? 'READY?' : 'Joined'}</span></div>`;
  }).join('');
}

export function updateHUD(event) {
  switch (event.type) {
    case 'score_update':
      if (ui.hudScore) ui.hudScore.textContent = `SCORE: ${event.score}`;
      if (gameScene?.isMultiplayer && multiplayer) multiplayer.sendGameState({ score: event.score });
      break;
    case 'level_complete':
      if (ui.hudLevel) ui.hudLevel.textContent = `LEVEL ${event.level}`;
      break;
    case 'game_tick':
      if (ui.hudTimer) ui.hudTimer.textContent = formatTime(event.gameTime);
      if (gameScene) {
        const timerEl = document.querySelector('#descendTimerValue');
        if (timerEl) {
          const remaining = Math.max(0, gameScene.descendInterval - gameScene.descendTimer);
          timerEl.textContent = remaining.toFixed(1);
          timerEl.style.color = remaining > 5 ? '#ff8844' : remaining > 2 ? '#ffdd44' : '#ff4444';
        }
      }
      break;
    case 'game_over':
      gameLoopRunning = false;
      showGameOverlay('GAME OVER', event.reason || 'Last row breached!');
      if (ui.overlayScore) ui.overlayScore.textContent = `SCORE: ${event.score || 0}`;
      break;
  }
}

export function initLobbyUI() {
  ui.btnCreate.addEventListener('click', () => {
    if (!multiplayer || !multiplayer.connected) { setLobbyStatus('Connecting... please wait.'); return; }
    setLobbyStatus('Creating room...');
    multiplayer.createRoom();
  });

  ui.btnJoin.addEventListener('click', () => {
    ui.lobbyMain.style.display = 'none';
    ui.lobbyJoinInput.style.display = 'flex';
  });

  ui.btnSubmit.addEventListener('click', () => {
    const code = ui.codeInput.value.trim().toUpperCase();
    if (code.length === 4 && multiplayer) multiplayer.joinRoom(code);
    else setLobbyStatus('Please enter a 4-character code');
  });

  ui.btnCancel.addEventListener('click', () => {
    ui.lobbyJoinInput.style.display = 'none';
    ui.lobbyMain.style.display = 'flex';
    ui.codeInput.value = '';
  });

  ui.btnReady.addEventListener('click', () => {
    if (multiplayer) {
      multiplayer.setReady();
      ui.btnReady.textContent = 'WAITING...';
      ui.btnReady.style.opacity = '0.5';
      ui.btnReady.disabled = true;
    }
  });

  ui.btnLeave.addEventListener('click', () => {
    if (multiplayer) multiplayer.leaveRoom();
    showScreen('title');
    ui.roomInfo.style.display = 'none';
    ui.btnReady.textContent = 'READY';
    ui.btnReady.style.opacity = '1';
    ui.btnReady.disabled = false;
  });

  ui.btnLobbyBack.addEventListener('click', () => {
    if (multiplayer) { multiplayer.disconnect(); multiplayer = null; }
    ui.roomInfo.style.display = 'none';
    ui.lobbyJoinInput.style.display = 'none';
    ui.lobbyMain.style.display = 'flex';
    ui.codeInput.value = '';
    ui.btnReady.textContent = 'READY';
    ui.btnReady.style.opacity = '1';
    ui.btnReady.disabled = false;
    showScreen('title');
  });

  ui.codeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') ui.btnSubmit.click();
    ui.codeInput.value = ui.codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  });

  ui.codeInput.addEventListener('input', () => {
    ui.codeInput.value = ui.codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  });
}

export function setupMultiplayerHandlers(multiplayerClient, onGameStart) {
  multiplayer = multiplayerClient;

  multiplayer.on('room_created', (msg) => {
    ui.roomCodeDisplay.textContent = msg.code;
    ui.lobbyMain.style.display = 'none';
    ui.roomInfo.style.display = 'flex';
    setLobbyStatus('Room created! Share the code with a friend.');
    updatePlayersList();
  });

  multiplayer.on('room_joined', (msg) => {
    ui.roomCodeDisplay.textContent = msg.code;
    ui.lobbyJoinInput.style.display = 'none';
    ui.roomInfo.style.display = 'flex';
    setLobbyStatus('Joined room! Press Ready to start.');
    updatePlayersList();
  });

  multiplayer.on('player_joined', (msg) => {
    updatePlayersList();
    setLobbyStatus(`${msg.name} joined the room!`);
  });

  multiplayer.on('player_ready_update', () => updatePlayersList());
  multiplayer.on('player_left', () => updatePlayersList());

  multiplayer.on('player_disconnected', () => {
    setLobbyStatus('Opponent disconnected!');
    setTimeout(() => { showScreen('title'); multiplayer.disconnect(); }, 2000);
  });

  multiplayer.on('game_start', (msg) => { if (onGameStart) onGameStart(msg); });
  multiplayer.on('error', (msg) => setLobbyStatus(`Error: ${msg.message}`));
  multiplayer.on('game_over', (msg) => {
    gameLoopRunning = false;
    const isWin = msg.winner === multiplayer?.clientId;
    showGameOverlay(isWin ? 'YOU WIN!' : 'GAME OVER', isWin ? 'You defeated your opponent!' : 'You lost this round!');
  });
}

export function initTitleUI(onSingle, onMulti) {
  ui.btnSingle.addEventListener('click', onSingle);
  ui.btnMulti.addEventListener('click', onMulti);
  ui.btnControls.addEventListener('click', () => showScreen('controls'));
  ui.btnControlsBack.addEventListener('click', () => showScreen('title'));
  ui.btnBack.addEventListener('click', () => {
    gameLoopRunning = false;
    showScreen('title');
    ui.gameOverlay.style.display = 'none';
  });
  ui.btnRetry.addEventListener('click', () => {
    ui.gameOverlay.style.display = 'none';
    if (gameScene) { gameScene.dispose(); gameScene = null; multiplayer?.disconnect(); multiplayer = null; }
    if (onSingle) onSingle();
  });
}


