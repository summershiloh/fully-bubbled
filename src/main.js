import { GameScene } from './gameScene.js';
import { MultiplayerClient } from './multiplayer.js';
import { audio } from './audio.js';
import { initThemePicker, onThemeChange, getCurrentTheme, showThemePicker, getUseCustomSfx, setUseCustomSfx } from './themes.js';
import {
  getUI, getScreens, getGameScene, setGameScene, getMultiplayer, setMultiplayer,
  getGameLoopRunning, setGameLoopRunning,
  showScreen, hideGameOverlay, showGameOverlay, updateHUD,
  showMultiplayerOverlay, hideMultiplayerOverlay, hideAllMultiplayerOverlays,
  initLobbyUI, setupMultiplayerHandlers, initTitleUI, formatTime,
  getPlayerName
} from './ui.js';
import { initInput, initReticleAndFire, updateSceneRef, setScreensRef } from './input.js';
import { initButtons } from './buttons.js';

let gameScene = null;
let mpScenes = [null, null];
let activeCanvas = null;
let multiplayer = null;
let animFrameId = null;
let lastTime = 0;
let gameLoopRunning = false;
let mpSyncInterval = null;
let isMultiplayerMode = false;
let localSideIndex = 0;

const ui = getUI();
const screens = getScreens();
setScreensRef(screens);

function createSinglePlayerCanvas() {
  if (activeCanvas) {
    activeCanvas.remove();
    activeCanvas = null;
  }
  const canvas = document.createElement('canvas');
  canvas.id = 'gameCanvas';
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  document.getElementById('app').prepend(canvas);
  activeCanvas = canvas;
  return canvas;
}

function startSinglePlayer() {
  isMultiplayerMode = false;
  showScreen('game');
  hideGameOverlay();
  ui.hudOpponent.style.display = 'none';
  if (gameScene) gameScene.dispose();
  if (mpScenes[0]) { mpScenes[0].dispose(); mpScenes[0] = null; }
  if (mpScenes[1]) { mpScenes[1].dispose(); mpScenes[1] = null; }
  const canvas = createSinglePlayerCanvas();
  gameScene = new GameScene(canvas, handleGameEvent);
  setGameScene(gameScene);
  gameScene.startGame(false);
  updateSceneRef(gameScene);
  startGameLoop();
}

function onSinglePlayerClick() {
  showThemePicker(() => startSinglePlayer());
}

function startMultiplayerGame(msg) {
  isMultiplayerMode = true;
  showScreen('mp');
  hideAllMultiplayerOverlays();

  if (activeCanvas) { activeCanvas.remove(); activeCanvas = null; }

  const opponent = msg.players?.find(p => p.id !== multiplayer?.clientId);
  const localPlayer = msg.players?.find(p => p.id === multiplayer?.clientId);

  ui.playerNameTag1.textContent = localPlayer?.name || 'You';
  ui.playerNameTag2.textContent = opponent?.name || 'Opponent';

  if (mpScenes[0]) { mpScenes[0].dispose(); mpScenes[0] = null; }
  if (mpScenes[1]) { mpScenes[1].dispose(); mpScenes[1] = null; }
  if (gameScene) { gameScene.dispose(); gameScene = null; }

  const canvas1 = document.getElementById('gameCanvas1');
  const canvas2 = document.getElementById('gameCanvas2');

  mpScenes[0] = new GameScene(canvas1, (e) => handleMpGameEvent(e, 1), { sideIndex: 0, splitScreen: true, isLocal: true });
  mpScenes[0].isMultiplayer = true;
  mpScenes[0].startGame(true);

  mpScenes[1] = new GameScene(canvas2, (e) => handleMpGameEvent(e, 2), { sideIndex: 1, splitScreen: true, isLocal: false });
  mpScenes[1].isMultiplayer = true;
  mpScenes[1].startGame(true);

  gameScene = mpScenes[0];
  setGameScene(mpScenes[0]);
  updateSceneRef(mpScenes[0]);

  setTimeout(() => {
    if (mpScenes[0]) mpScenes[0].onResize();
    if (mpScenes[1]) mpScenes[1].onResize();
  }, 50);

  startMpGameLoop();

  if (multiplayer) {
    if (mpSyncInterval) clearInterval(mpSyncInterval);
    mpSyncInterval = setInterval(() => {
      if (!mpScenes[0]?.isRunning) { clearInterval(mpSyncInterval); return; }
      multiplayer.sendGameState({ score: mpScenes[0].score });
    }, 500);

    multiplayer.on('opponent_state', (msg) => {
      if (mpScenes[1] && msg.data) {
        mpScenes[1].setOpponentInput(msg.data);
        ui.hudScore2.textContent = `SCORE: ${msg.data.score || 0}`;
      }
    });

    multiplayer.on('game_over', () => {
      if (mpSyncInterval) clearInterval(mpSyncInterval);
    });
  }
}

function handleMpGameEvent(event, side) {
  updateHUD(event, side);
}

async function initLobby() {
  setMultiplayer(new MultiplayerClient());
  multiplayer = getMultiplayer();
  const name = getPlayerName();
  if (name) multiplayer.setName(name);
  ui.lobbyStatus.textContent = 'Connecting...';
  try {
    await multiplayer.connect();
    ui.lobbyStatus.textContent = 'Connected! Create or join a room.';
    setupMultiplayerHandlers(
      multiplayer,
      startMultiplayerGame,
      handlePlayerGameOver,
      handlePlayerRetry,
      handleSessionCountdown,
      handleSessionEnd
    );
  } catch (err) {
    ui.lobbyStatus.textContent = `Connection failed: ${err.message}`;
    setTimeout(() => showScreen('title'), 2000);
  }
}

function handlePlayerGameOver(msg) {
  const isLocal = msg.playerId === multiplayer?.clientId;
  const side = isLocal ? 1 : 2;
  const opponentSide = isLocal ? 2 : 1;

  showMultiplayerOverlay(side, 'GAME OVER', msg.score, true, false);

  showMultiplayerOverlay(opponentSide, `${msg.playerName || 'Opponent'} Game Over`, msg.score, false, true);
}

function handlePlayerRetry(msg) {
  hideAllMultiplayerOverlays();
}

function handleSessionCountdown(msg) {
  const isLocalExit = msg.exitPlayerId === multiplayer?.clientId;
  const absentSide = isLocalExit ? 1 : 2;
  const overlay = document.getElementById('mpOverlay' + absentSide);
  if (overlay) {
    overlay.style.display = 'flex';
    const titleEl = document.getElementById('mpOverlayTitle' + absentSide);
    const scoreEl = document.getElementById('mpOverlayScore' + absentSide);
    const waitingEl = document.getElementById('mpOverlayWaiting' + absentSide);
    const buttonsEl = document.getElementById('mpOverlayButtons' + absentSide);
    if (titleEl) titleEl.textContent = 'Player Exited';
    if (scoreEl) scoreEl.innerHTML = `Session will end in <span class="countdown-num">${msg.seconds}</span>s`;
    if (waitingEl) waitingEl.style.display = 'none';
    if (buttonsEl) buttonsEl.style.display = 'none';
  }
}

function handleSessionEnd(msg) {
  hideAllMultiplayerOverlays();
  cleanupMultiplayer();
  showScreen('title');
}

function cleanupMultiplayer() {
  if (mpSyncInterval) { clearInterval(mpSyncInterval); mpSyncInterval = null; }
  if (mpScenes[0]) { mpScenes[0].dispose(); mpScenes[0] = null; }
  if (mpScenes[1]) { mpScenes[1].dispose(); mpScenes[1] = null; }
  gameScene = null;
  setGameScene(null);
  if (activeCanvas) { activeCanvas.remove(); activeCanvas = null; }
  isMultiplayerMode = false;
}

function handleGameEvent(event) {
  updateHUD(event);
  if (event.type === 'game_over') {
    gameLoopRunning = false;
  }
}

function startGameLoop() {
  gameLoopRunning = true;
  lastTime = performance.now();
  function loop(time) {
    if (!gameLoopRunning) return;
    const delta = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;
    if (gameScene) { gameScene.update(delta); gameScene.render(); }
    animFrameId = requestAnimationFrame(loop);
  }
  if (animFrameId) cancelAnimationFrame(animFrameId);
  animFrameId = requestAnimationFrame(loop);
}

function startMpGameLoop() {
  gameLoopRunning = true;
  lastTime = performance.now();
  function loop(time) {
    if (!gameLoopRunning) return;
    const delta = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;
    if (mpScenes[0]) { mpScenes[0].update(delta); mpScenes[0].render(); }
    if (mpScenes[1]) { mpScenes[1].update(delta); mpScenes[1].render(); }
    animFrameId = requestAnimationFrame(loop);
  }
  if (animFrameId) cancelAnimationFrame(animFrameId);
  animFrameId = requestAnimationFrame(loop);
}

function stopGameLoop() {
  gameLoopRunning = false;
  if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
}

initThemePicker();
onThemeChange((theme, id) => {
  if (gameScene && gameScene.applyTheme) gameScene.applyTheme();
  if (mpScenes[0] && mpScenes[0].applyTheme) mpScenes[0].applyTheme();
  if (mpScenes[1] && mpScenes[1].applyTheme) mpScenes[1].applyTheme();
  audio.setSfxTheme(theme.sfxId && getUseCustomSfx() ? id : null);
});

initTitleUI(onSinglePlayerClick, () => { showScreen('lobby'); initLobby(); });
initLobbyUI();
initInput(null);
initReticleAndFire(null);

const menuOverlay = document.getElementById('gameMenuOverlay');
document.getElementById('btnMenu')?.addEventListener('click', () => {
  if (menuOverlay) menuOverlay.style.display = 'flex';
});
document.getElementById('btnMenuClose')?.addEventListener('click', () => {
  if (menuOverlay) menuOverlay.style.display = 'none';
});
if (menuOverlay) {
  menuOverlay.addEventListener('click', (e) => {
    if (e.target === menuOverlay) menuOverlay.style.display = 'none';
  });
}
document.getElementById('btnMenuRetry')?.addEventListener('click', () => {
  if (menuOverlay) menuOverlay.style.display = 'none';
  if (isMultiplayerMode) {
    if (multiplayer) multiplayer.sendRetry();
    hideAllMultiplayerOverlays();
    return;
  }
  if (gameScene) { gameScene.dispose(); gameScene = null; }
  if (multiplayer) { multiplayer.disconnect(); multiplayer = null; }
  startSinglePlayer();
});
document.getElementById('btnMenuExit')?.addEventListener('click', () => {
  if (menuOverlay) menuOverlay.style.display = 'none';
  if (isMultiplayerMode) {
    if (mpScenes[0]) {
      showMultiplayerOverlay(1, 'GAME OVER', mpScenes[0].score, true, false);
    }
    if (multiplayer) multiplayer.sendExitSession();
    return;
  }
  stopGameLoop();
  if (gameScene) { gameScene.dispose(); gameScene = null; }
  if (multiplayer) { multiplayer.disconnect(); multiplayer = null; }
  showScreen('title');
});
document.getElementById('sfxSlider')?.addEventListener('input', (e) => {
  audio.setSfxVolume(e.target.value / 100);
});
document.getElementById('musicSlider')?.addEventListener('input', (e) => {
  audio.setMusicVolume(e.target.value / 100);
});
document.getElementById('customSfxToggle')?.addEventListener('change', (e) => {
  setUseCustomSfx(e.target.checked);
  const theme = getCurrentTheme();
  audio.setSfxTheme(theme.sfxId && e.target.checked ? theme.id : null);
});

document.getElementById('btnFullscreen')?.addEventListener('click', () => {
  audio.ensureResumed();
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.() || document.documentElement.webkitRequestFullscreen?.();
  } else {
    document.exitFullscreen?.() || document.webkitExitFullscreen?.();
  }
});

ui.mpRetry1?.addEventListener('click', () => {
  if (multiplayer) multiplayer.sendRetry();
  hideAllMultiplayerOverlays();
});

ui.mpExit1?.addEventListener('click', () => {
  showMultiplayerOverlay(1, 'GAME OVER', mpScenes[0]?.score || 0, false, true);
  if (multiplayer) multiplayer.sendExitSession();
});

ui.mpRetry2?.addEventListener('click', () => {
  if (multiplayer) multiplayer.sendRetry();
  hideAllMultiplayerOverlays();
});

ui.mpExit2?.addEventListener('click', () => {
  showMultiplayerOverlay(2, 'GAME OVER', mpScenes[1]?.score || 0, false, true);
  if (multiplayer) multiplayer.sendExitSession();
});

document.addEventListener('click', () => { audio.init(); if (audio.musicVolume > 0) audio.ambientPad(); }, { once: true });

initButtons();
showScreen('title');

const tempCanvas = document.createElement('canvas');
tempCanvas.style.display = 'block';
tempCanvas.style.width = '100%';
tempCanvas.style.height = '100%';
document.getElementById('app').prepend(tempCanvas);
activeCanvas = tempCanvas;

const tempScene = new GameScene(tempCanvas);
tempScene.isRunning = false;
gameScene = tempScene;
setGameScene(gameScene);
gameLoopRunning = false;
const animBg = (time) => {
  if (gameLoopRunning) return;
  if (tempScene?.backgroundMat) tempScene.backgroundMat.uniforms.uTime.value = time / 1000;
  tempScene?.renderer.render(tempScene.scene, tempScene.camera);
  requestAnimationFrame(animBg);
};
requestAnimationFrame(animBg);

console.log('Fully Bubbled v1.0 loaded!');
