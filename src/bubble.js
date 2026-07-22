import { Mesh, IcosahedronGeometry, Group, Vector3, Color } from 'three';
import { createBubbleMaterial, createExplosiveMaterial, createFragileMaterial, createChromeMaterial } from './shaders.js';
import { getBubbleColors as getThemeBubbleColors, getRandomColor as getThemeColor } from './themes.js';

const RADIUS = 0.45;
const GEO = new IcosahedronGeometry(RADIUS, 2);
const GEO_BIG = new IcosahedronGeometry(RADIUS * 1.15, 2);
const GEO_SMALL = new IcosahedronGeometry(RADIUS * 0.8, 2);

export function getRandomColor() {
  return getThemeColor();
}

export function getBubbleColors() {
  return getThemeBubbleColors();
}

export function getRandomType(level = 1) {
  const r = Math.random();
  if (r < 0.2) return 'explosive';
  if (r < 0.35) return 'fragile';
  if (r < 0.40 && level > 2) return 'chrome';
  return 'normal';
}

export class Bubble {
  constructor(color, gridPos = null, type = 'normal') {
    this.color = color;
    this.type = type;
    this.gridPos = gridPos;
    this.jiggleAmplitude = 0;
    this.jiggleVelocity = 0;
    this.phase = Math.random() * Math.PI * 2;
    this.targetPosition = new Vector3();
    this.popTime = -1;
    this.isFalling = false;
    this.fallVelocity = 0;
    this.vx = 0;
    this.vy = 0;
    this.exploded = false;
    this.flickerTimer = 0;
    this.settleTimer = 0;
    this.removed = false;

    let mat;
    if (type === 'explosive') {
      mat = createExplosiveMaterial(color);
    } else if (type === 'fragile') {
      mat = createFragileMaterial(color);
    } else if (type === 'chrome') {
      mat = createChromeMaterial(color);
    } else {
      mat = createBubbleMaterial(color);
    }

    const geo = type === 'explosive' ? GEO_BIG.clone() : type === 'fragile' ? GEO_SMALL.clone() : type === 'chrome' ? GEO_BIG.clone() : GEO.clone();
    this.mesh = new Mesh(geo, mat);
    this.mesh.scale.set(1, 1, 1);

    this.group = new Group();
    this.group.add(this.mesh);
    this.group.userData = { bubbleType: type };

    this.id = Math.random().toString(36).substr(2, 6);
  }

  setPosition(x, y, z) {
    this.group.position.set(x, y, z);
    this.targetPosition.set(x, y, z);
  }

  triggerJiggle(force = 1.0) {
    this.jiggleAmplitude = Math.min(this.jiggleAmplitude + force, 2.0);
    this.jiggleVelocity = force * 3.0;
  }

  startPop() {
    this.popTime = performance.now();
    this.isFalling = false;
  }

  startFall(vx = 0) {
    this.isFalling = true;
    this.gridPos = null;
    this.vy = 1.0;
    this.vx = vx || (Math.random() - 0.5) * 2;
    this.flickerTimer = 0;
    this.settleTimer = 0;
  }

  update(time, delta) {
    const mat = this.mesh.material;
    if (mat.uniforms) {
      mat.uniforms.uTime.value = time;
      if (this.type === 'explosive') {
        mat.uniforms.uPulse.value = 0.5 + 0.5 * Math.sin(time * 3 + this.phase);
      }
    }

    if (this.popTime > 0) {
      const elapsed = (performance.now() - this.popTime) / 1000;
      const scale = 1 + elapsed * 3;
      this.mesh.scale.set(scale, scale, scale);
      mat.uniforms.uOpacity.value = Math.max(0, 1 - elapsed * 2);
      if (elapsed > 1.5) return true;
      return false;
    }

    this.jiggleVelocity += (0 - this.jiggleAmplitude) * 12 * delta;
    this.jiggleVelocity *= (1 - 4 * delta);
    this.jiggleAmplitude += this.jiggleVelocity * delta;

    const jiggle = this.jiggleAmplitude;
    mat.uniforms.uJiggle.value = jiggle;

    const wobble = 1 + jiggle * 0.08 * Math.sin(time * 4 + this.phase);
    this.mesh.scale.set(wobble, wobble, wobble);

    mat.uniforms.uOpacity.value = 1;
    return false;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
