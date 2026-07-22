import { Mesh, SphereGeometry, ShaderMaterial, Color, AdditiveBlending } from 'three';

const BALL_RADIUS = 5.5;

export class GiantBallProjectile {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.mesh = null;
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.vx = 0;
    this.vy = 0;
    this.lifetime = 0;
    this.onHit = null;
    this._hitBubbles = new Set();
    this._hitInvaders = new Set();
    this.leftBound = 0;
    this.rightBound = 0;
    this.ceilY = 0;
    this.floorY = 0;
  }

  fire(playerX, playerY, targetX, targetY) {
    const dx = targetX - playerX;
    const dy = targetY - playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.5) return false;

    const speed = 16;
    this.vx = (dx / dist) * speed;
    this.vy = (dy / dist) * speed;
    this.x = playerX;
    this.y = playerY + 0.5;
    this.z = 0;
    this.lifetime = 0;
    this.active = true;
    this._hitBubbles.clear();
    this._hitInvaders.clear();

    if (!this.mesh) {
      const geo = new SphereGeometry(BALL_RADIUS, 32, 24);
      const mat = new ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new Color('#ffffff') },
          uGlow: { value: new Color('#88ddff') },
          uRadius: { value: BALL_RADIUS }
        },
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vViewDir;
          uniform float uTime;
          uniform float uRadius;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vec3 viewDir = normalize(cameraPosition - worldPos.xyz);
            vViewDir = viewDir;
            float pulse = 1.0 + 0.04 * sin(uTime * 6.0);
            vec3 displaced = position * pulse;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          varying vec3 vViewDir;
          uniform vec3 uColor;
          uniform vec3 uGlow;
          uniform float uTime;
          uniform float uRadius;
          void main() {
            vec3 normal = normalize(vNormal);
            vec3 viewDir = normalize(vViewDir);
            float fresnel = 1.0 - max(dot(normal, viewDir), 0.0);
            fresnel = pow(fresnel, 3.0);
            float phase = 0.5 + 0.5 * sin(uTime * 5.0);
            vec3 col = uColor * (0.7 + 0.3 * phase);
            col += uGlow * fresnel * 2.0;
            col += vec3(0.3, 0.5, 0.8) * fresnel * fresnel * 3.0;
            float alpha = 0.85 + 0.15 * fresnel;
            float edgeFade = smoothstep(uRadius * 0.92, uRadius, length(position));
            alpha *= 1.0 - edgeFade * 0.3;
            gl_FragColor = vec4(col, alpha);
          }
        `,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false
      });
      this.mesh = new Mesh(geo, mat);
      this.mesh.position.z = 0;
      this.scene.add(this.mesh);
    }

    this.mesh.visible = true;
    this.mesh.position.set(this.x, this.y, this.z);
    return true;
  }

  update(delta, bubbles, leftBound, rightBound, ceilY, floorY, invaders) {
    if (!this.active) return;

    this.leftBound = leftBound;
    this.rightBound = rightBound;
    this.ceilY = ceilY;
    this.floorY = floorY;

    this.x += this.vx * delta;
    this.y += this.vy * delta;
    this.lifetime += delta;

    if (this.x - BALL_RADIUS < leftBound) {
      this.x = leftBound + BALL_RADIUS;
      this.vx = Math.abs(this.vx) * 0.9;
    }
    if (this.x + BALL_RADIUS > rightBound) {
      this.x = rightBound - BALL_RADIUS;
      this.vx = -Math.abs(this.vx) * 0.9;
    }
    if (this.y + BALL_RADIUS > ceilY + 2) {
      this.vy = -Math.abs(this.vy) * 0.9;
    }
    if (this.y - BALL_RADIUS < floorY - 2) {
      this.vy = Math.abs(this.vy) * 0.9;
    }

    this.vy -= 2.5 * delta;

    this.mesh.position.set(this.x, this.y, this.z);

    if (this.lifetime > 8 || Math.abs(this.vx) < 0.3 && Math.abs(this.vy) < 0.3 && this.lifetime > 1) {
      this.deactivate();
      return;
    }

    const hitRadiusSq = (BALL_RADIUS + 0.45) * (BALL_RADIUS + 0.45);
    let hitAny = false;
    for (const [key, bubble] of bubbles) {
      if (bubble.popTime > 0 || bubble.isFalling || this._hitBubbles.has(key)) continue;
      const dx = this.x - bubble.group.position.x;
      const dy = this.y - bubble.group.position.y;
      if (dx * dx + dy * dy < hitRadiusSq) {
        this._hitBubbles.add(key);
        if (this.onHit) this.onHit(bubble, key);
        hitAny = true;
      }
    }

    if (invaders) {
      for (const invader of invaders) {
        if (!invader.alive || invader.popTime > 0 || this._hitInvaders.has(invader.id)) continue;
        const dx = this.x - invader.group.position.x;
        const dy = this.y - invader.group.position.y;
        if (dx * dx + dy * dy < hitRadiusSq) {
          this._hitInvaders.add(invader.id);
          if (this.onInvaderHit) this.onInvaderHit(invader);
          hitAny = true;
        }
      }
    }

    if (this._hitBubbles.size > 0 || this._hitInvaders.size > 0) {
      this.vx *= 0.98;
      this.vy *= 0.98;
    }
  }

  deactivate() {
    this.active = false;
    if (this.mesh) this.mesh.visible = false;
    this._hitBubbles.clear();
    this._hitInvaders.clear();
  }

  dispose() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.mesh = null;
    }
  }
}
