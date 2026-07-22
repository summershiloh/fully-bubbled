import { Mesh, PlaneGeometry, ShaderMaterial, Color } from 'three';
import { audio } from './audio.js';

export class LaserBeam {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.lifetime = 0;
    this.mesh = null;
    this.soundNode = null;
    this.playerX = 0;
    this.playerY = 0;
    this.aimX = 0;
    this.onHit = null;
    this._hitCooldown = 0;

    this._setupMesh();
  }

  _setupMesh() {
    const geo = new PlaneGeometry(2.6, 40);
    const mat = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 1 },
        uColor: { value: new Color(0.9, 0.95, 1.0) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform float uTime;
        uniform float uIntensity;
        uniform vec3 uColor;

        void main() {
          float core = 1.0 - abs(vUv.x - 0.5) * 2.0;
          core = pow(core, 3.0);
          float edgeGlow = exp(-abs(vUv.x - 0.5) * 10.0);
          float flicker = 0.92 + 0.08 * sin(uTime * 60.0 + vUv.y * 20.0);
          float noise2 = 0.85 + 0.15 * sin(uTime * 30.0 + vUv.y * 40.0 + vUv.x * 10.0);
          float alpha = (core * 0.8 + edgeGlow * 0.4) * uIntensity * flicker * noise2;
          float fade = smoothstep(0.0, 0.12, vUv.y) * (1.0 - smoothstep(0.88, 1.0, vUv.y));
          alpha *= fade;
          vec3 col = uColor * (1.0 + 0.3 * core + 0.5 * edgeGlow);
          float haze = exp(-abs(vUv.x - 0.5) * 6.0) * 0.3 * uIntensity;
          col += vec3(0.6, 0.7, 1.0) * haze;
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: 2
    });
    this.mesh = new Mesh(geo, mat);
    this.mesh.visible = false;
    this.mesh.position.z = -0.1;
    this.scene.add(this.mesh);
  }

  activate(playerX, playerY) {
    this.active = true;
    this.lifetime = 0;
    this.playerX = playerX;
    this.playerY = playerY;
    this.aimX = playerX;
    this.mesh.visible = true;
    this.mesh.position.set(playerX, playerY + 6, 0);
    this._hitCooldown = 0;
    this._stopSound();
    this._startSound();
  }

  deactivate() {
    this.active = false;
    this.mesh.visible = false;
    this._stopSound();
  }

  _startSound() {
    if (!audio || !audio.ctx) return;
    audio.ensureResumed();
    const ctx = audio.ctx;
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.15;
    masterGain.connect(audio.masterGain);

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 120;
    const gain1 = ctx.createGain();
    gain1.gain.value = 0.4;
    osc1.connect(gain1);
    gain1.connect(masterGain);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.value = 180;
    const gain2 = ctx.createGain();
    gain2.gain.value = 0.15;
    osc2.connect(gain2);
    gain2.connect(masterGain);

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 4;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 30;
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);

    const lfo2 = ctx.createOscillator();
    lfo2.type = 'sine';
    lfo2.frequency.value = 3.7;
    const lfoGain2 = ctx.createGain();
    lfoGain2.gain.value = 25;
    lfo2.connect(lfoGain2);
    lfoGain2.connect(osc2.frequency);

    osc1.start(now);
    osc2.start(now);
    lfo.start(now);
    lfo2.start(now);

    this.soundNode = { masterGain, osc1, osc2, lfo, lfo2, gain1, gain2, lfoGain, lfoGain2 };
  }

  _stopSound() {
    if (!this.soundNode) return;
    const now = audio.ctx.currentTime;
    this.soundNode.masterGain.gain.linearRampToValueAtTime(0, now + 0.3);
    setTimeout(() => {
      try {
        this.soundNode.osc1.stop();
        this.soundNode.osc2.stop();
        this.soundNode.lfo.stop();
        this.soundNode.lfo2.stop();
      } catch (e) {}
      this.soundNode = null;
    }, 350);
  }

  setAimTarget(targetX) {
    this.aimX = targetX;
  }

  setPlayerPosition(x, y) {
    this.playerX = x;
    this.playerY = y;
  }

  update(delta, bubbles, invaders) {
    if (!this.active) return;
    this.lifetime += delta;
    this._hitCooldown = Math.max(0, this._hitCooldown - delta);
    this.mesh.material.uniforms.uTime.value = this.lifetime;

    const beamX = this.aimX;
    const beamY = this.playerY + 6;
    this.mesh.position.set(beamX, beamY, 0);

    const halfWidth = 1.3;
    const beamTop = beamY + 20;
    const beamBottom = this.playerY - 0.5;

    if (this._hitCooldown <= 0 && bubbles) {
      let hitAny = false;
      for (const [key, bubble] of bubbles) {
        if (bubble.popTime > 0 || bubble.isFalling) continue;
        const bx = bubble.group.position.x;
        const by = bubble.group.position.y;
        if (by > beamBottom && by < beamTop && Math.abs(bx - beamX) < halfWidth) {
          if (this.onHit) this.onHit(bubble, key);
          hitAny = true;
        }
      }
      if (invaders) {
        for (const invader of invaders) {
          if (!invader.alive || invader.popTime > 0) continue;
          const ix = invader.group.position.x;
          const iy = invader.group.position.y;
          if (iy > beamBottom && iy < beamTop && Math.abs(ix - beamX) < halfWidth) {
            if (this.onInvaderHit) this.onInvaderHit(invader);
            hitAny = true;
          }
        }
      }
      if (hitAny) this._hitCooldown = 0.05;
    }
  }

  dispose() {
    this._stopSound();
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.mesh = null;
    }
  }
}
