export class PowerupManager {
  constructor(onLaserActivate, onLaserDeactivate) {
    this.MAX_POWER = 500;
    this.FILL_RATE = 0.5;
    this.DEPLETE_RATE = 64;
    this.power = 0;
    this.isFull = false;
    this.laserActive = false;
    this.giantBallAvailable = false;
    this.onLaserActivate = onLaserActivate || (() => {});
    this.onLaserDeactivate = onLaserDeactivate || (() => {});
    this._blinkTimer = 0;
    this._textVisible = true;
    this._depleteAccum = 0;
  }

  addScore(points) {
    if (this.laserActive) return;
    this.power = Math.min(this.MAX_POWER, this.power + points * this.FILL_RATE);
    if (this.power >= this.MAX_POWER && !this.isFull) {
      this.isFull = true;
    }
  }

  activateLaser() {
    if (!this.isFull) return false;
    this.laserActive = true;
    this.isFull = false;
    this._depleteAccum = 0;
    this.onLaserActivate();
    return true;
  }

  update(delta) {
    if (this.laserActive) {
      this._depleteAccum += delta * this.DEPLETE_RATE;
      this.power = Math.max(0, this.power - delta * this.DEPLETE_RATE);
      if (this.power <= 0) {
        this.power = 0;
        this.laserActive = false;
        this.onLaserDeactivate();
      }
    } else {
      this._blinkTimer += delta;
      if (this._blinkTimer > 0.5) {
        this._blinkTimer = 0;
        this._textVisible = !this._textVisible;
      }
    }
    this.updateUI();
  }

  updateUI() {
    const fillEl = document.getElementById('powerupFill');
    const textEl = document.getElementById('powerupText');
    if (!fillEl || !textEl) return;
    const pct = (this.power / this.MAX_POWER) * 100;
    fillEl.style.width = Math.max(0, Math.min(100, pct)) + '%';
    if (this.laserActive) {
      textEl.textContent = 'LASER';
      textEl.className = 'powerup-text active';
      fillEl.classList.add('active');
      fillEl.classList.remove('full');
    } else if (this.isFull) {
      textEl.textContent = 'SPACE';
      textEl.className = 'powerup-text full';
      textEl.style.opacity = this._textVisible ? '1' : '0.2';
      fillEl.classList.add('full');
      fillEl.classList.remove('active');
    } else {
      textEl.textContent = '';
      textEl.className = 'powerup-text';
      fillEl.classList.remove('full', 'active');
    }
  }

  dispose() {
    this.onLaserActivate = null;
    this.onLaserDeactivate = null;
  }
}
