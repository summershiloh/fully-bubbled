import { Mesh, IcosahedronGeometry, Group, Vector3 } from 'three';
import { createInvaderMaterial } from '../shaders.js';

const RADIUS = 0.5;
const GEO = new IcosahedronGeometry(RADIUS, 2);

const INVADER_COUNTS = [0, 0, 0, 1, 2, 3, 5, 7, 9, 10, 12, 13, 14, 15, 15, 15];

export function getInvaderCount(level) {
  if (level < 3) return 0;
  return INVADER_COUNTS[Math.min(level, INVADER_COUNTS.length - 1)];
}

export class Invader {
  constructor(x, y) {
    this.position = new Vector3(x, y, 0);
    this.velocity = new Vector3(0, 0, 0);
    this.phase = Math.random() * Math.PI * 2;
    this.popTime = -1;
    this.alive = true;
    this.removed = false;

    this.descendSpeed = 0.12 + Math.random() * 0.08;
    this.wobbleAmp = 0.4 + Math.random() * 0.4;
    this.wobbleFreq = 0.4 + Math.random() * 0.3;
    this.dodgeDir = Math.random() > 0.5 ? 1 : -1;

    const mat = createInvaderMaterial();
    const geo = GEO.clone();
    this.mesh = new Mesh(geo, mat);

    this.group = new Group();
    this.group.add(this.mesh);
    this.group.position.copy(this.position);
    this.group.userData = { invader: true };

    this.id = Math.random().toString(36).substr(2, 6);
  }

  update(time, delta, playerX, leftBound, rightBound, floorY) {
    if (this.popTime > 0) return false;
    if (!this.alive) return false;

    this.mesh.material.uniforms.uTime.value = time;

    const weave = Math.sin(time * this.wobbleFreq + this.phase) * this.wobbleAmp;
    this.position.x += weave * delta * 0.8;

    const dx = playerX - this.position.x;
    if (Math.abs(dx) < 1.5) {
      this.position.x += (dx > 0 ? -this.dodgeDir : this.dodgeDir) * delta * 0.6;
    }

    this.position.y -= this.descendSpeed * delta * 2;

    this.position.x = Math.max(leftBound, Math.min(rightBound, this.position.x));
    this.group.position.copy(this.position);

    this.mesh.rotation.x += delta * 0.3;
    this.mesh.rotation.y += delta * 0.5;

    if (this.position.y < floorY) return true;

    return false;
  }

  startPop() {
    this.popTime = performance.now();
  }

  updatePop() {
    if (this.popTime <= 0) return false;
    const elapsed = (performance.now() - this.popTime) / 1000;
    const scale = 1 + elapsed * 3;
    this.mesh.scale.set(scale, scale, scale);
    this.mesh.material.uniforms.uOpacity.value = Math.max(0, 1 - elapsed * 2);
    if (elapsed > 1.5) {
      this.removed = true;
      return true;
    }
    return false;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
