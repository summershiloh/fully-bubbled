import {
  Scene, PerspectiveCamera, WebGLRenderer, Vector2, Vector3, Raycaster,
  Color, DirectionalLight, AmbientLight, PointLight, Group, FogExp2,
  SphereGeometry, Mesh, MeshBasicMaterial, AdditiveBlending, PointsMaterial, Points,
  BufferGeometry, Float32BufferAttribute, Plane
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Bubble, getRandomColor, getBubbleColors, getRandomType } from './bubble.js';
import { createRoomBackground } from './roomShader.js';
import { audio } from './audio.js';
import { getCurrentTheme } from './themes.js';
import { PowerupManager } from './powerup-manager.js';
import { LaserBeam } from './laser-beam.js';
import { GiantBallProjectile } from './giant-ball-projectile.js';
import {
  BOARD_WIDTH, BOARD_HEIGHT, BUBBLE_RADIUS, GRID_SPACING, ROW_OFFSET, EXPLOSION_RADIUS,
  gridToX, gridToY, getNeighborPositions, getBoardBounds
} from './game/grid.js';
import { createBoardWalls, getBounds } from './game/board.js';
import { Invader, getInvaderCount } from './invaders/Invader.js';

export class GameScene {
  constructor(canvas, onGameEvent) {
    this.canvas = canvas;
    this.onGameEvent = onGameEvent || (() => {});
    this.bubbles = new Map();
    this.bullets = [];
    this.particles = [];
    this.invaders = [];
    this.score = 0;
    this.level = 1;
    this.time = 0;
    this.gameTime = 0;
    this.isRunning = false;
    this.isMultiplayer = false;
    this.opponentScore = 0;
    this.opponentName = '';

    this.nextColor = getRandomColor();
    this.queuedColor = getRandomColor();
    this.playerX = 0;
    this.playerY = -4.2;
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseInView = false;
    this._tmpVec = new Vector3();
    this._mouseWorld = new Vector3();
    this._mousePlane = new Plane(new Vector3(0, 0, 1), 0);
    this.fireTimer = 0;
    this.fireRate = 0.12;

    this.levelComplete = false;

    this.descendTimer = 0;
    this.descendInterval = 10;
    this.descendActive = true;
    this.firingPaused = false;
    this.gameOver = false;
    this.giantBallActive = false;

    this.keys = { left: false, right: false, up: false, down: false, shoot: false, powerup: false };

    this.setupRenderer();
    this.setupScene();
    this.setupLights();
    this.setupPostProcessing();
    this.setupBoard();
    this.setupPlayer();

    this.powerupMgr = new PowerupManager(
      () => this.activateLaser(),
      () => this.deactivateLaser()
    );
    this.laserBeam = new LaserBeam(this.scene);
    this.laserBeam.onHit = (bubble, key) => this.processBubbleHit(bubble, key, false);
    this.giantBall = new GiantBallProjectile(this.scene);
    this.giantBall.onHit = (bubble, key) => this.processBubbleHit(bubble, key, false, true);

    this.raycaster = new Raycaster();

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
      this.mouseInView = true;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.mouseInView = false;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.handleInput('shoot', true);
        setTimeout(() => this.handleInput('shoot', false), 50);
      }
    });

    window.addEventListener('resize', () => this.onResize());
  }

  setupRenderer() {
    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = 3;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = 'srgb';
  }

  setupScene() {
    this.scene = new Scene();
    this.scene.background = new Color(0x000000);
    this.scene.fog = new FogExp2(0x000000, 0.008);

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new PerspectiveCamera(50, aspect, 0.1, 55);
    this.camera.position.set(0, 3.5, 20);
    this.camera.lookAt(0, 3.5, 0);
  }

  setupLights() {
    const ambient = new AmbientLight(0x444466, 0.8);
    this.scene.add(ambient);

    const dirLight = new DirectionalLight(0xffffff, 2.5);
    dirLight.position.set(5, 12, 8);
    this.scene.add(dirLight);

    const fillLight = new DirectionalLight(0x8888ff, 0.8);
    fillLight.position.set(-5, 5, -5);
    this.scene.add(fillLight);

    const rimLight = new DirectionalLight(0x4466ff, 0.6);
    rimLight.position.set(0, -3, -8);
    this.scene.add(rimLight);

    const warmLight = new PointLight(0xff8844, 1.5, 25);
    warmLight.position.set(0, 8, 5);
    this.scene.add(warmLight);

    const coolLight = new PointLight(0x4488ff, 1.5, 25);
    coolLight.position.set(0, -3, 8);
    this.scene.add(coolLight);
  }

  setupPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    this.bloomPass = new UnrealBloomPass(
      new Vector2(window.innerWidth, window.innerHeight),
      0.365, 0.2, 0.1
    );
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());
  }

  setupBoard() {
    const bgMat = createRoomBackground();
    bgMat.uniforms.uRes.value.set(window.innerWidth, window.innerHeight);
    this.backgroundMat = bgMat;

    this.floor = createBoardWalls(this.scene);

    this.ceilY = BOARD_HEIGHT * 0.5 * GRID_SPACING - BUBBLE_RADIUS;
    this.leftBound = -BOARD_WIDTH * 0.5 * GRID_SPACING + BUBBLE_RADIUS;
    this.rightBound = BOARD_WIDTH * 0.5 * GRID_SPACING - BUBBLE_RADIUS;
    this.floorY = -3.5 + BUBBLE_RADIUS;

    this.initLevel();
  }

  initLevel() {
    for (const [, bubble] of this.bubbles) {
      this.scene.remove(bubble.group);
      bubble.dispose();
    }
    this.bubbles.clear();
    for (const b of this.bullets) {
      if (b.mesh) { this.scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose(); }
    }
    this.bullets = [];
    for (const p of this.particles) {
      if (p.mesh) { this.scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); }
    }
    this.particles = [];
    for (const inv of this.invaders) {
      this.scene.remove(inv.group);
      inv.dispose();
    }
    this.invaders = [];
    this.levelComplete = false;
    this.score = 0;
    this.gameTime = 0;
    this.gameOver = false;
    this.descendTimer = 0;
    this.descendInterval = Math.max(2, 11 - this.level);
    this.firingPaused = false;
    this.giantBallActive = false;
    if (this.powerupMgr && this.powerupMgr.laserActive) {
      this.powerupMgr.laserActive = false;
      this.laserBeam.deactivate();
    }

    const colors = getBubbleColors();
    const rows = 5 + Math.min(this.level, 5);

    for (let row = 0; row < rows; row++) {
      const numInRow = BOARD_WIDTH - Math.abs(row % 2 === 0 ? 0 : 1);
      const rowStartX = -(numInRow - 1) * GRID_SPACING * 0.5;
      for (let col = 0; col < numInRow; col++) {
        const targetX = rowStartX + col * GRID_SPACING + (row % 2 === 0 ? 0 : ROW_OFFSET);
        const targetY = this.ceilY - row * GRID_SPACING * 0.866;
        if (targetY < -1) continue;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const type = getRandomType(this.level);
        this.placeBubble(color, targetX, targetY, 0, row, col, type);
      }
    }

    this.nextColor = getRandomColor();
    this.queuedColor = getRandomColor();

    const invaderCount = getInvaderCount(this.level);
    for (let i = 0; i < invaderCount; i++) {
      const x = this.leftBound + Math.random() * (this.rightBound - this.leftBound);
      const y = this.ceilY + 0.5 - Math.random() * 2;
      const invader = new Invader(x, y);
      this.scene.add(invader.group);
      this.invaders.push(invader);
    }
  }

  setupPlayer() {
    this.playerGroup = new Group();
    this.playerGroup.position.set(0, this.playerY, 0);
    this.scene.add(this.playerGroup);

    const bodyMat = new MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8
    });
    const bodyGeo = new SphereGeometry(0.4, 16, 16);
    this.playerBody = new Mesh(bodyGeo, bodyMat);
    this.playerBody.position.y = 0.3;
    this.playerGroup.add(this.playerBody);

    const glowMat = new MeshBasicMaterial({
      color: 0x4444ff,
      transparent: true,
      opacity: 0.15
    });
    const glowGeo = new SphereGeometry(0.6, 16, 16);
    this.playerGlow = new Mesh(glowGeo, glowMat);
    this.playerGlow.position.y = 0.3;
    this.playerGroup.add(this.playerGlow);
  }

  placeBubble(color, x, y, z, gridRow, gridCol, type = null) {
    const key = `${gridRow}_${gridCol}`;
    if (this.bubbles.has(key)) return false;

    const bubble = new Bubble(color, null, type || getRandomType(this.level));
    bubble.setPosition(x, y, z);
    bubble.gridPos = { row: gridRow, col: gridCol };
    bubble.triggerJiggle(0.5);
    this.scene.add(bubble.group);
    this.bubbles.set(key, bubble);
    this.triggerRipple(gridRow, gridCol, 0.8);
    return true;
  }

  triggerRipple(row, col, force) {
    const bx = this.gridToX(row, col);
    const by = this.gridToY(row, col);
    const neighbors = [];
    for (const [, bubble] of this.bubbles) {
      if (!bubble.gridPos) continue;
      if (bubble.gridPos.row === row && bubble.gridPos.col === col) continue;
      const dx = this.gridToX(bubble.gridPos.row, bubble.gridPos.col) - bx;
      const dy = this.gridToY(bubble.gridPos.row, bubble.gridPos.col) - by;
      const dist = Math.sqrt(dx * dx + dy * dy);
      neighbors.push({ bubble, dist });
    }
    neighbors.sort((a, b) => a.dist - b.dist);
    const count = Math.min(4, neighbors.length);
    for (let i = 0; i < count; i++) {
      const n = neighbors[i];
      const falloff = Math.max(0, 1 - (n.dist / (BUBBLE_RADIUS * 4)));
      n.bubble.triggerJiggle(force * falloff);
    }
  }

  startGame(multiplayer = false) {
    this.isMultiplayer = multiplayer;
    this.isRunning = true;
    this.time = 0;
    this.gameTime = 0;
    this.score = 0;
    this.opponentScore = 0;
    this.gameOver = false;
    this.descendTimer = 0;
    this.initLevel();
    this.applyTheme();
  }

  applyTheme() {
    const theme = getCurrentTheme();
    this.scene.background.set(theme.bg1);
    this.scene.fog.color.set(theme.bg1);
    if (this.playerGlow) {
      this.playerGlow.material.color.set(theme.playerGlow);
    }
  }

  handleInput(action, active) {
    switch (action) {
      case 'left': this.keys.left = active; break;
      case 'right': this.keys.right = active; break;
      case 'up': this.keys.up = active; break;
      case 'down': this.keys.down = active; break;
      case 'shoot':
        if (active && !this.keys.shoot && this.isRunning && !this.firingPaused) {
          if (this.powerupMgr.isFull) {
            this.tryActivatePowerup();
          } else if (this.giantBallActive) {
            this._fireGiantBall();
          } else {
            this.fireBullet();
          }
        }
        this.keys.shoot = active;
        break;
      case 'powerup':
        if (active && !this.keys.powerup) {
          this.tryActivatePowerup();
        }
        this.keys.powerup = active;
        break;
    }
  }

  tryActivatePowerup() {
    if (!this.isRunning || this.firingPaused) return;
    if (this.powerupMgr.activateLaser()) {
      this.laserBeam.activate(this.playerX, this.playerY);
      audio.laserStart();
    }
  }

  activateLaser() {
    this.laserBeam.activate(this.playerX, this.playerY);
    this.descendInterval = 1;
    audio.setPopVolume(0.1);
  }

  deactivateLaser() {
    this.laserBeam.deactivate();
    this.descendInterval = Math.max(2, 11 - this.level);
    audio.setPopVolume(1.0);
  }

  _fireGiantBall() {
    if (!this.mouseInView || this.firingPaused) return;
    this._tmpVec.set(
      (this.mouseX / this.canvas.clientWidth) * 2 - 1,
      -(this.mouseY / this.canvas.clientHeight) * 2 + 1,
      0.5
    );
    this._tmpVec.unproject(this.camera);
    const dir = this._tmpVec.sub(this.camera.position).normalize();
    const t = -this.camera.position.z / dir.z;
    const targetX = this.camera.position.x + dir.x * t;
    const targetY = this.camera.position.y + dir.y * t;
    if (this.giantBall.fire(this.playerX, this.playerY, targetX, targetY)) {
      this.giantBallActive = false;
      audio.giantBallFire();
    }
  }

  setOpponentInput(data) {
    if (data && data.score !== undefined) {
      this.opponentScore = data.score;
    }
  }

  fireBullet() {
    if (!this.mouseInView || this.firingPaused) return;
    if (this.powerupMgr.laserActive || this.giantBallActive) return;

    this._tmpVec.set(
      (this.mouseX / this.canvas.clientWidth) * 2 - 1,
      -(this.mouseY / this.canvas.clientHeight) * 2 + 1,
      0.5
    );
    this._tmpVec.unproject(this.camera);
    const dir = this._tmpVec.sub(this.camera.position).normalize();
    const t = -this.camera.position.z / dir.z;
    const targetX = this.camera.position.x + dir.x * t;
    const targetY = this.camera.position.y + dir.y * t;

    const dx = targetX - this.playerX;
    const dy = targetY - (this.playerY + 0.5);
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.5) return;

    const speed = 18;
    const vx = (dx / dist) * speed;
    const vy = (dy / dist) * speed;

    const bullet = {
      x: this.playerX,
      y: this.playerY + 0.5,
      z: 0,
      vx, vy,
      mesh: null,
      live: true,
      phase: Math.random() * Math.PI * 2,
      lifetime: 0
    };

    const sphere = new Mesh(
      new SphereGeometry(0.12, 8, 8),
      new MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95
      })
    );
    sphere.position.set(bullet.x, bullet.y, 0);
    this.scene.add(sphere);
    bullet.mesh = sphere;
    this.bullets.push(bullet);
    audio.shoot();
  }

  updateBullets(delta) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (!b.live) continue;

      b.x += b.vx * delta;
      b.y += b.vy * delta;
      b.lifetime += delta;

      if (b.lifetime > 4 || b.x < this.leftBound || b.x > this.rightBound || b.y > this.ceilY + 2 || b.y < this.floorY - 2) {
        this.removeBullet(i);
        continue;
      }

      if (b.mesh) {
        b.mesh.position.set(b.x, b.y, 0);
        const trail = 0.85 + 0.15 * Math.sin(this.time * 30 + b.phase);
        b.mesh.scale.set(trail, trail, trail);
      }

      let hitKey = null;
      let hitBubble = null;
      for (const [key, bubble] of this.bubbles) {
        if (bubble.popTime > 0 || bubble.isFalling) continue;
        const dx = b.x - bubble.group.position.x;
        const dy = b.y - bubble.group.position.y;
        if (dx * dx + dy * dy < BUBBLE_RADIUS * BUBBLE_RADIUS * 2.2) {
          hitKey = key;
          hitBubble = bubble;
          break;
        }
      }

      if (hitBubble) {
        this.removeBullet(i);
        this.processBubbleHit(hitBubble, hitKey);
        this.checkFloating();
        continue;
      }

      let hitInvader = null;
      let hitInvIdx = -1;
      for (let j = 0; j < this.invaders.length; j++) {
        const inv = this.invaders[j];
        if (!inv.alive || inv.popTime > 0) continue;
        const dx = b.x - inv.group.position.x;
        const dy = b.y - inv.group.position.y;
        if (dx * dx + dy * dy < 0.5 * 0.5 * 2.2) {
          hitInvader = inv;
          hitInvIdx = j;
          break;
        }
      }

      if (hitInvader) {
        this.removeBullet(i);
        hitInvader.startPop();
        this.spawnParticles(hitInvader.group.position.x, hitInvader.group.position.y, 18);
        this.addScore(25);
        audio.pop();
      }
    }
  }

  processBubbleHit(bubble, key, silent = false, explosive = false) {
    if (bubble.popTime > 0 || bubble.isFalling) return;

    if (bubble.type === 'chrome') {
      bubble.startPop();
      this.spawnParticles(bubble.group.position.x, bubble.group.position.y, 30);
      this.giantBallActive = true;
      audio.chromePop();
      const center = bubble.group.position;
      for (const [k, b] of this.bubbles) {
        if (b.popTime > 0 || b.isFalling || b === bubble) continue;
        const dx = b.group.position.x - center.x;
        const dy = b.group.position.y - center.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < EXPLOSION_RADIUS * 1.5) {
          this.processBubbleHit(b, k, silent, false);
        }
      }
    } else {
      bubble.startPop();

      if (explosive) {
        this.spawnParticles(bubble.group.position.x, bubble.group.position.y, 20);
        const center = bubble.group.position;
        for (const [k, b] of this.bubbles) {
          if (b.popTime > 0 || b.isFalling || b === bubble) continue;
          const dx = b.group.position.x - center.x;
          const dy = b.group.position.y - center.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < EXPLOSION_RADIUS) {
            b.triggerJiggle(1.5 * (1 - dist / EXPLOSION_RADIUS));
          }
        }
      } else if (bubble.type === 'explosive') {
        this.spawnParticles(bubble.group.position.x, bubble.group.position.y, 20);
        const center = bubble.group.position;
        for (const [k, b] of this.bubbles) {
          if (b.popTime > 0 || b.isFalling || b === bubble) continue;
          const dx = b.group.position.x - center.x;
          const dy = b.group.position.y - center.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < EXPLOSION_RADIUS) {
            b.triggerJiggle(1.5 * (1 - dist / EXPLOSION_RADIUS));
          }
        }
      } else if (bubble.type === 'fragile') {
        this.spawnParticles(bubble.group.position.x, bubble.group.position.y, 8);
      } else {
        this.spawnParticles(bubble.group.position.x, bubble.group.position.y, 10);
      }

      if (!silent) audio.pop();
    }
    this.addScore(10);
  }

  removeBullet(index) {
    const b = this.bullets[index];
    if (b && b.mesh) {
      this.scene.remove(b.mesh);
      b.mesh.geometry.dispose();
      b.mesh.material.dispose();
    }
    this.bullets.splice(index, 1);
  }

  gridToX(row, col) { return gridToX(row, col); }
  gridToY(row, col) { return gridToY(row, col, this.ceilY); }
  getNeighborPositions(row, col) { return getNeighborPositions(row, col); }

  checkFloating() {
    const connected = new Set();
    const toVisit = [];

    for (const [key, bubble] of this.bubbles) {
      if (bubble.popTime > 0) continue;
      if (bubble.gridPos && bubble.gridPos.row === 0) {
        toVisit.push(key);
      }
    }

    while (toVisit.length > 0) {
      const key = toVisit.pop();
      if (connected.has(key)) continue;
      connected.add(key);
      const bubble = this.bubbles.get(key);
      if (!bubble || bubble.popTime > 0 || !bubble.gridPos) continue;
      const row = bubble.gridPos.row;
      const col = bubble.gridPos.col;
      for (const n of this.getNeighborPositions(row, col)) {
        const nKey = `${n.row}_${n.col}`;
        if (!connected.has(nKey) && this.bubbles.has(nKey)) {
          toVisit.push(nKey);
        }
      }
    }

    for (const [key, bubble] of this.bubbles) {
      if (bubble.popTime > 0 || bubble.isFalling) continue;
      if (!connected.has(key)) {
        bubble.startFall();
        this.addScore(15);
        audio.falling();
      }
    }
  }

  descendStack(rows = 1) {
    if (!this.descendActive) return;
    this.descendTimer = 0;

    const toMove = [];
    for (const [key, bubble] of this.bubbles) {
      if (!bubble.gridPos || bubble.popTime > 0 || bubble.isFalling) continue;
      toMove.push({ bubble, oldRow: bubble.gridPos.row, oldCol: bubble.gridPos.col, key });
    }
    toMove.sort((a, b) => b.oldRow - a.oldRow);

    for (const entry of toMove) {
      this.bubbles.delete(entry.key);
      const newRow = entry.oldRow + rows;
      const newCol = entry.oldCol;
      const numInRow = BOARD_WIDTH - (newRow % 2 === 0 ? 0 : 1);
      if (newCol >= numInRow) {
        this.scene.remove(entry.bubble.group);
        entry.bubble.dispose();
        continue;
      }
      const newKey = `${newRow}_${newCol}`;
      const occupant = this.bubbles.get(newKey);
      if (occupant && occupant !== entry.bubble) {
        this.scene.remove(occupant.group);
        occupant.dispose();
      }
      entry.bubble.gridPos = { row: newRow, col: newCol };
      const newY = this.gridToY(newRow, newCol);
      entry.bubble.group.position.y = newY;
      entry.bubble.triggerJiggle(0.6);
      this.bubbles.set(newKey, entry.bubble);
    }

    const colors = getBubbleColors();
    for (let r = 0; r < rows; r++) {
      const numInRow = BOARD_WIDTH - (r % 2 === 0 ? 0 : 1);
      const startX = -(numInRow - 1) * GRID_SPACING * 0.5;
      for (let col = 0; col < numInRow; col++) {
        const x = startX + col * GRID_SPACING + (r % 2 === 0 ? 0 : ROW_OFFSET);
        const y = this.gridToY(r, col);
        if (y > this.ceilY) continue;
        const color = colors[Math.floor(Math.random() * colors.length)];
        let type = getRandomType(this.level, !this.chromeSpawnedThisLevel);
        if (type === 'chrome') this.chromeSpawnedThisLevel = true;
        this.placeBubble(color, x, y, 0, r, col, type);
      }
    }

    for (const [, bubble] of this.bubbles) {
      if (!bubble.gridPos) continue;
      if (bubble.group.position.y < -3.0) {
        this.gameOver = true;
        audio.gameOver();
        if (this.onGameEvent) {
          this.onGameEvent({ type: 'game_over', reason: 'Bubbles crossed the line!', score: this.score });
        }
        return;
      }
    }
  }

  spawnParticles(x, y, count = 12) {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 1 + Math.random() * 3;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = 0;
      const c = new Color(getRandomColor());
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      sizes[i] = 0.1 + Math.random() * 0.2;
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new Float32BufferAttribute(colors, 3));
    geo.setAttribute('size', new Float32BufferAttribute(sizes, 1));

    const mat = new PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: AdditiveBlending,
      depthWrite: false
    });

    const points = new Points(geo, mat);
    this.scene.add(points);
    this.particles.push({
      mesh: points,
      velocities: Array.from({ length: count }, () => {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
      }),
      life: 0.6 + Math.random() * 0.3
    });
  }

  updateParticles(delta) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
        continue;
      }
      const pos = p.mesh.geometry.attributes.position.array;
      for (let j = 0; j < p.velocities.length; j++) {
        pos[j * 3] += p.velocities[j].vx * delta;
        pos[j * 3 + 1] += p.velocities[j].vy * delta;
        p.velocities[j].vy -= 5 * delta;
      }
      p.mesh.geometry.attributes.position.needsUpdate = true;
      p.mesh.material.opacity = p.life / 0.9;
    }
  }

  addScore(points) {
    this.score += points;
    this.powerupMgr.addScore(points);
    if (this.onGameEvent) {
      this.onGameEvent({ type: 'score_update', score: this.score });
    }
  }

  updatePlayer(delta) {
    let dx = 0;
    if (this.keys.left) dx = -1;
    if (this.keys.right) dx = 1;

    this.playerX += dx * 5 * delta;
    this.playerX = Math.max(this.leftBound, Math.min(this.rightBound, this.playerX));
    this.playerGroup.position.x = this.playerX;

    this.playerBody.rotation.z = dx * -0.2;
    this.playerGlow.material.opacity = 0.12 + 0.08 * Math.sin(this.time * 2);
    this.playerGlow.material.color.setHex(0x6688ff);
  }

  checkWinCondition() {
    if (this.bubbles.size === 0 && !this.levelComplete) {
      this.levelComplete = true;
      this.level++;
      audio.levelUp();
      if (this.onGameEvent) {
        this.onGameEvent({ type: 'level_complete', level: this.level });
      }
      setTimeout(() => {
        this.levelComplete = false;
        this.initLevel();
      }, 1000);
      return;
    }
  }

  update(delta) {
    if (!this.isRunning) return;
    this.time += delta;

    if (this.backgroundMat) {
      this.backgroundMat.uniforms.uTime.value = this.time;
    }

    this.gameTime += delta;

    this.powerupMgr.update(delta);
    this.updatePlayer(delta);
    this.updateBullets(delta);
    this.updateParticles(delta);

    let laserTargetX = this.playerX;
    if (this.mouseInView) {
      this._tmpVec.set(
        (this.mouseX / this.canvas.clientWidth) * 2 - 1,
        -(this.mouseY / this.canvas.clientHeight) * 2 + 1,
        0.5
      );
      this._tmpVec.unproject(this.camera);
      const dir = this._tmpVec.sub(this.camera.position).normalize();
      const t = -this.camera.position.z / dir.z;
      laserTargetX = this.camera.position.x + dir.x * t;
    }
    this.laserBeam.setAimTarget(laserTargetX);
    this.laserBeam.setPlayerPosition(this.playerX, this.playerY);
    this.laserBeam.update(delta, this.bubbles);
    this.giantBall.update(delta, this.bubbles, this.leftBound, this.rightBound, this.ceilY, this.floorY);

    let removeKeys = [];
    for (const [key, bubble] of this.bubbles) {
      if (bubble.popTime > 0) {
        const done = bubble.update(this.time, delta);
        if (done) {
          this.scene.remove(bubble.group);
          bubble.dispose();
          removeKeys.push(key);
        }
      } else if (bubble.isFalling) {
        bubble.vy += -12 * delta;
        bubble.vx *= 0.998;
        bubble.group.position.x += bubble.vx * delta;
        bubble.group.position.y += bubble.vy * delta;
        bubble.mesh.rotation.x += bubble.vy * delta * 0.5;
        bubble.mesh.rotation.z += bubble.vx * delta * 0.3;

        if (bubble.group.position.y < this.floorY) {
          bubble.group.position.y = this.floorY;
          bubble.vy = Math.abs(bubble.vy) * 0.55;
          bubble.vx *= 0.92;
          if (Math.abs(bubble.vy) < 0.3) {
            bubble.vy = 0;
            bubble.settleTimer += delta;
            if (bubble.settleTimer > 0.6) {
              bubble.flickerTimer += delta;
              const flick = Math.floor(bubble.flickerTimer / 0.12) % 2 === 0;
              bubble.mesh.material.uniforms.uOpacity.value = flick ? 1 : 0.15;
              if (bubble.flickerTimer > 0.8) {
                this.scene.remove(bubble.group);
                bubble.dispose();
                removeKeys.push(key);
                continue;
              }
            }
          }
        }

        for (const [k2, b2] of this.bubbles) {
          if (k2 === key || !b2.isFalling || b2.removed) continue;
          const dx = b2.group.position.x - bubble.group.position.x;
          const dy = b2.group.position.y - bubble.group.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = BUBBLE_RADIUS * 1.9;
          if (dist < minDist && dist > 0.001) {
            const overlap = (minDist - dist) * 0.5;
            const nx = dx / dist;
            const ny = dy / dist;
            bubble.group.position.x -= nx * overlap;
            bubble.group.position.y -= ny * overlap;
            b2.group.position.x += nx * overlap;
            b2.group.position.y += ny * overlap;
            const relVx = bubble.vx - b2.vx;
            const relVy = bubble.vy - b2.vy;
            const relDot = relVx * nx + relVy * ny;
            if (relDot < 0) {
              bubble.vx -= relDot * nx * 0.5;
              bubble.vy -= relDot * ny * 0.5;
              b2.vx += relDot * nx * 0.5;
              b2.vy += relDot * ny * 0.5;
            }
          }
        }

        if (bubble.group.position.y < -20) {
          this.scene.remove(bubble.group);
          bubble.dispose();
          removeKeys.push(key);
          continue;
        }
      } else {
        const done = bubble.update(this.time, delta);
        if (done) {
          this.scene.remove(bubble.group);
          bubble.dispose();
          removeKeys.push(key);
        }
      }
    }
    for (const key of removeKeys) {
      this.bubbles.delete(key);
    }

    if (this.time % 1 < delta) {
      const deepKeys = [];
      for (const [key, bubble] of this.bubbles) {
        if (bubble.isFalling && bubble.group.position.y < -15) deepKeys.push(key);
      }
      for (const key of deepKeys) {
        const bubble = this.bubbles.get(key);
        if (bubble) { this.scene.remove(bubble.group); bubble.dispose(); this.bubbles.delete(key); }
      }
    }

    let invaderGameOver = false;
    for (let i = this.invaders.length - 1; i >= 0; i--) {
      const inv = this.invaders[i];
      if (!inv.alive) {
        if (inv.removed) {
          this.scene.remove(inv.group);
          inv.dispose();
          this.invaders.splice(i, 1);
        }
        continue;
      }
      if (inv.popTime > 0) {
        inv.updatePop();
        if (inv.removed) {
          this.scene.remove(inv.group);
          inv.dispose();
          this.invaders.splice(i, 1);
        }
        continue;
      }
      if (inv.update(this.time, delta, this.playerX, this.leftBound, this.rightBound, this.floorY)) {
        invaderGameOver = true;
      }
    }

    if (invaderGameOver && !this.gameOver) {
      this.gameOver = true;
      audio.gameOver();
      if (this.onGameEvent) {
        this.onGameEvent({ type: 'game_over', reason: 'Invader breached the line!', score: this.score });
      }
    }

    if (!this.gameOver) {
      this.checkWinCondition();
      this.descendTimer += delta;
      if (this.descendTimer >= this.descendInterval) {
        const rows = this.powerupMgr.laserActive ? 2 + Math.floor(Math.random() * 2) : 1;
        this.descendStack(rows);
      }
    }

    const pLights = this.scene.children.filter(c => c.isPointLight);
    if (pLights.length >= 2) {
      pLights[0].position.x = Math.sin(this.time * 0.3) * 5;
      pLights[0].position.z = 5 + Math.cos(this.time * 0.3) * 3;
      pLights[1].position.x = Math.cos(this.time * 0.2) * 5;
      pLights[1].position.z = 8 + Math.sin(this.time * 0.2) * 2;
    }

    if (this.onGameEvent) {
      this.onGameEvent({ type: 'game_tick', gameTime: this.gameTime, score: this.score });
    }
  }

  render() {
    this.composer.render();
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    if (this.backgroundMat) {
      this.backgroundMat.uniforms.uRes.value.set(w, h);
    }
  }

  dispose() {
    for (const [, bubble] of this.bubbles) {
      this.scene.remove(bubble.group);
      bubble.dispose();
    }
    this.bubbles.clear();
    for (const inv of this.invaders) {
      this.scene.remove(inv.group);
      inv.dispose();
    }
    this.invaders = [];
    if (this.laserBeam) this.laserBeam.dispose();
    if (this.giantBall) this.giantBall.dispose();
    if (this.powerupMgr) this.powerupMgr.dispose();
    this.renderer.dispose();
  }
}
