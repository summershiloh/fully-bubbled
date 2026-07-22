let gameScene = null;
let fireInterval = null;
let touchX = 0, touchY = 0;
let isTouching = false;
let lastTouchFireTime = 0;

function updateTouchAim(clientX, clientY) {
  const gs = gameScene;
  if (!gs || !gs.canvas) return;
  const rect = gs.canvas.getBoundingClientRect();
  gs.mouseX = clientX - rect.left;
  gs.mouseY = clientY - rect.top;
  gs.mouseInView = true;

  const reticle = document.querySelector('#targetReticle');
  if (reticle && isGameActive()) {
    reticle.style.left = clientX + 'px';
    reticle.style.top = clientY + 'px';
  }
}

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
    isTouching = true;
    lastTouchFireTime = performance.now();
    updateTouchAim(touch.clientX, touch.clientY);
    startFire(gameScene);
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    updateTouchAim(touch.clientX, touch.clientY);
    const now = performance.now();
    if (now - lastTouchFireTime > 80) {
      fireOnce(gameScene);
      lastTouchFireTime = now;
    }
  }, { passive: false });

  document.addEventListener('touchend', () => {
    isTouching = false;
    if (gameScene) gameScene.mouseInView = false;
    stopFire();
  });

  document.addEventListener('touchcancel', () => {
    isTouching = false;
    if (gameScene) gameScene.mouseInView = false;
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
