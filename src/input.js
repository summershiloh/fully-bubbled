let gameScene = null;

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
    updateTouchAim(touch.clientX, touch.clientY);
    if (gameScene) gameScene.pointerActive = true;
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    updateTouchAim(touch.clientX, touch.clientY);
  }, { passive: false });

  document.addEventListener('touchend', () => {
    if (gameScene) {
      gameScene.pointerActive = false;
      gameScene.mouseInView = false;
    }
  });

  document.addEventListener('touchcancel', () => {
    if (gameScene) {
      gameScene.pointerActive = false;
      gameScene.mouseInView = false;
    }
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
    if (gameScene) gameScene.pointerActive = true;
  });

  document.addEventListener('mouseup', (e) => {
    if (e.button !== 0) return;
    if (gameScene) gameScene.pointerActive = false;
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
