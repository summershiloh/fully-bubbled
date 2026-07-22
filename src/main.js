import { GameScene } from './gameScene.js';
import { MultiplayerClient } from './multiplayer.js';
import { audio } from './audio.js';
import { initThemePicker, onThemeChange, getCurrentTheme, showThemePicker, getUseCustomSfx, setUseCustomSfx } from './themes.js';
import {
  getUI, getScreens, getGameScene, setGameScene, getMultiplayer, setMultiplayer,
  getGameLoopRunning, setGameLoopRunning,
  showScreen, hideGameOverlay, showGameOverlay, updateHUD,
  initLobbyUI, setupMultiplayerHandlers, initTitleUI, formatTime
} from './ui.js';
import { initInput, initReticleAndFire, updateSceneRef, setScreensRef } from './input.js';
import { initButtons } from './buttons.js';

let gameScene = null;
let multiplayer = null;
let animFrameId = null;
let lastTime = 0;
let gameLoopRunning = false;

const ui = getUI();
const screens = getScreens();
setScreensRef(screens);

function startSinglePlayer() {
  showScreen('game');
  hideGameOverlay();
  ui.hudOpponent.style.display = 'none';
  if (gameScene) gameScene.dispose();
  const canvas = document.getElementById('gameCanvas');
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
  showScreen('game');
  hideGameOverlay();
  ui.hudOpponent.style.display = 'block';
  const opponent = msg.players?.find(p => p.id !== multiplayer?.clientId);
  if (opponent) ui.opponentName.textContent = opponent.name || 'Opponent';
  if (gameScene) gameScene.dispose();
  const canvas = document.getElementById('gameCanvas');
  gameScene = new GameScene(canvas, handleGameEvent);
  gameScene.isMultiplayer = true;
  gameScene.startGame(true);
  setGameScene(gameScene);
  updateSceneRef(gameScene);
  startGameLoop();

  if (multiplayer) {
    const syncInterval = setInterval(() => {
      if (!gameScene?.isRunning) { clearInterval(syncInterval); return; }
      multiplayer.sendGameState({ score: gameScene.score });
    }, 500);
    multiplayer.on('opponent_state', (msg) => {
      if (gameScene && msg.data) {
        gameScene.setOpponentInput(msg.data);
        ui.opponentScore.textContent = msg.data.score || 0;
      }
    });
    multiplayer.on('game_over', () => { clearInterval(syncInterval); });
  }
}

async function initLobby() {
  setMultiplayer(new MultiplayerClient());
  multiplayer = getMultiplayer();
  ui.lobbyStatus.textContent = 'Connecting...';
  try {
    await multiplayer.connect();
    ui.lobbyStatus.textContent = 'Connected! Create or join a room.';
    setupMultiplayerHandlers(multiplayer, startMultiplayerGame);
  } catch (err) {
    ui.lobbyStatus.textContent = `Connection failed: ${err.message}`;
    setTimeout(() => showScreen('title'), 2000);
  }
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

// Theme picker
initThemePicker();
onThemeChange((theme, id) => {
  if (gameScene && gameScene.applyTheme) gameScene.applyTheme();
  audio.setSfxTheme(theme.sfxId && getUseCustomSfx() ? id : null);
});

// Init UI
initTitleUI(onSinglePlayerClick, () => { showScreen('lobby'); initLobby(); });
initLobbyUI();
initInput(null);
initReticleAndFire(null);

// Menu overlay
const menuOverlay = document.getElementById('gameMenuOverlay');
const menuPanel = document.querySelector('.game-menu-panel');
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
  if (gameScene) { gameScene.dispose(); gameScene = null; }
  if (multiplayer) { multiplayer.disconnect(); multiplayer = null; }
  startSinglePlayer();
});
document.getElementById('btnMenuExit')?.addEventListener('click', () => {
  if (menuOverlay) menuOverlay.style.display = 'none';
  gameLoopRunning = false;
  if (animFrameId) cancelAnimationFrame(animFrameId);
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

document.addEventListener('click', () => { audio.init(); if (audio.musicVolume > 0) audio.ambientPad(); }, { once: true });

initButtons();
showScreen('title');

const canvas = document.getElementById('gameCanvas');
if (canvas) {
  const tempScene = new GameScene(canvas);
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
}

console.log('Fully Bubbled v1.0 loaded!');
