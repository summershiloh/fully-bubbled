let gameScene = null;
let fireInterval = null;
let touchX = 0, touchY = 0;

function fireOnce(gs) {
  if (!gs || !gs.isRunning || gs.gameOver || gs.firingPaused) return;
  if (gs.powerupMgr?.isFull) {
    gs.tryActivatePowerup();
  } else if (gs.giantBallActive) {
    gs._fireGiantBall();
  } else if (!gs.powerupMgr?.laserActive) {
    gs.fireBullet();
  }
}

function startFire(gs) {
  fireOnce(gs);
  if (fireInterval) clearInterval(fireInterval);
  if (!gs || gs.powerupMgr?.laserActive || gs.giantBallActive || gs.powerupMgr?.isFull) return;
  fireInterval = setInterval(() => {
    if (!gs || !gs.isRunning || gs.gameOver || gs.firingPaused) {
      clearInterval(fireInterval); fireInterval = null; return;
    }
    if (gs.powerupMgr?.isFull) {
      gs.tryActivatePowerup();
      clearInterval(fireInterval); fireInterval = null; return;
    }
    if (gs.powerupMgr?.laserActive || gs.giantBallActive) {
      clearInterval(fireInterval); fireInterval = null; return;
    }
    gs.fireBullet();
  }, 100);
}

function stopFire() {
  if (fireInterval) { clearInterval(fireInterval); fireInterval = null; }
}

export function initInput(sceneRef) {
  gameScene = sceneRef;

  document.addEventListener('keydown', (e) => {
    const key = e.key;
    if (key === 'ArrowLeft' || key === 'a' || key === 'A') gameScene?.handleInput('left', true);
    else if (key === 'ArrowRight' || key === 'd' || key === 'D') gameScene?.handleInput('right', true);
    else if (key === 'ArrowUp' || key === 'w' || key === 'W') gameScene?.handleInput('up', true);
    else if (key === 'ArrowDown' || key === 's' || key === 'S') gameScene?.handleInput('down', true);
    else if (key === ' ') { e.preventDefault(); gameScene?.handleInput('shoot', true); }
    else if (key === 'e' || key === 'E') { e.preventDefault(); gameScene?.handleInput('powerup', true); }
  });

  document.addEventListener('keyup', (e) => {
    const key = e.key;
    if (key === 'ArrowLeft' || key === 'a' || key === 'A') gameScene?.handleInput('left', false);
    else if (key === 'ArrowRight' || key === 'd' || key === 'D') gameScene?.handleInput('right', false);
    else if (key === 'ArrowUp' || key === 'w' || key === 'W') gameScene?.handleInput('up', false);
    else if (key === 'ArrowDown' || key === 's' || key === 'S') gameScene?.handleInput('down', false);
    else if (key === ' ') gameScene?.handleInput('shoot', false);
    else if (key === 'e' || key === 'E') gameScene?.handleInput('powerup', false);
  });

  document.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    touchX = touch.clientX; touchY = touch.clientY;
    startFire(gameScene);
  });

  document.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const dx = touch.clientX - touchX, dy = touch.clientY - touchY;
    if (dx > 10) { gameScene?.handleInput('right', true); gameScene?.handleInput('left', false); }
    else if (dx < -10) { gameScene?.handleInput('left', true); gameScene?.handleInput('right', false); }
    else { gameScene?.handleInput('left', false); gameScene?.handleInput('right', false); }
    gameScene?.handleInput('up', dy < -10);
    gameScene?.handleInput('down', dy > 10);
    touchX = touch.clientX; touchY = touch.clientY;
  }, { passive: false });

  document.addEventListener('touchend', () => {
    ['left','right','up','down'].forEach(d => gameScene?.handleInput(d, false));
    stopFire();
  });
}

export function initReticleAndFire(sceneRef) {
  gameScene = sceneRef;
  const reticle = document.querySelector('#targetReticle');

  document.addEventListener('mousemove', (e) => {
    if (reticle && isGameActive()) {
      reticle.style.left = e.clientX + 'px'; reticle.style.top = e.clientY + 'px';
    }
  });

  document.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    startFire(gameScene);
  });

  document.addEventListener('mouseup', (e) => {
    if (e.button !== 0) return;
    stopFire();
  });

  const reticleObserver = new MutationObserver(() => {
    if (reticle) reticle.style.display = isGameActive() ? 'flex' : 'none';
  });
  if (screens?.game) reticleObserver.observe(screens.game, { attributes: true, attributeFilter: ['class'] });
  if (screens?.mp) reticleObserver.observe(screens.mp, { attributes: true, attributeFilter: ['class'] });
}

function isGameActive() {
  return screens?.game?.classList.contains('active') || screens?.mp?.classList.contains('active');
}

export function updateSceneRef(sceneRef) {
  gameScene = sceneRef;
}

let screens = {};
export function setScreensRef(s) { screens = s; }
