import { Scene, OrthographicCamera, Mesh, PlaneGeometry, ShaderMaterial, Color, AdditiveBlending } from 'three';

export class TitleFX {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new Scene();
    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.mesh = null;
    this.time = 0;
    this.running = false;
    this._setup();
  }

  _setup() {
    const mat = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uRes: { value: [window.innerWidth, window.innerHeight] },
        uColor1: { value: new Color('#0a0015') },
        uColor2: { value: new Color('#001520') },
        uAccent: { value: new Color('#4488ff') }
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
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uAccent;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        void main() {
          vec2 uv = vUv;
          vec2 p = uv * 3.0;
          float t = uTime * 0.08;

          float n1 = noise(p + t);
          float n2 = noise(p * 2.0 - t * 0.6);
          float n3 = noise(p * 4.0 + t * 0.4);

          vec3 col = mix(uColor1, uColor2, n1 * 0.5 + 0.3 + n2 * 0.2);

          float bubbles = smoothstep(0.55, 0.8, n3);
          vec3 bubbleCol = uAccent * 0.15;
          col += bubbleCol * bubbles;

          float stars = pow(max(noise(p * 8.0 + t * 0.3) - 0.65, 0.0) * 2.8, 6.0);
          col += vec3(0.4, 0.6, 1.0) * stars * 0.6;

          float vignette = 1.0 - length(uv - 0.5) * 0.6;
          col *= vignette;

          gl_FragColor = vec4(col, 1.0);
        }
      `
    });

    const geo = new PlaneGeometry(2, 2);
    this.mesh = new Mesh(geo, mat);
    this.scene.add(this.mesh);
  }

  start(renderer) {
    this.renderer = renderer;
    this.running = true;
    this.time = 0;
  }

  stop() {
    this.running = false;
  }

  update(delta) {
    if (!this.running || !this.mesh) return;
    this.time += delta;
    this.mesh.material.uniforms.uTime.value = this.time;
  }

  render() {
    if (!this.running || !this.renderer) return;
    this.renderer.render(this.scene, this.camera);
  }

  resize(w, h) {
    if (this.mesh) {
      this.mesh.material.uniforms.uRes.value = [w, h];
    }
  }

  dispose() {
    this.running = false;
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
  }
}
