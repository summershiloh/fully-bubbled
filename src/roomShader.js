import { ShaderMaterial, Vector2, Color } from 'three';

export function createRoomBackground() {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uRes: { value: new Vector2(1, 1) },
      uColor1: { value: new Color('#0a0a14') },
      uColor2: { value: new Color('#04060e') }
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
      uniform vec2 uRes;
      uniform vec3 uColor1;
      uniform vec3 uColor2;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
                   mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
      }

      void main() {
        vec2 uv = vUv;
        vec2 p = uv * 3.0;
        float t = uTime * 0.04;

        float n1 = noise(p + t);
        float n2 = noise(p * 2.0 - t * 0.3);

        vec3 col = mix(uColor1, uColor2, n1 * 0.4 + 0.3);

        float stars = pow(max(noise(p * 12.0 + t * 0.2) - 0.7, 0.0) * 3.3, 5.0);
        col += vec3(0.3, 0.4, 0.6) * stars * 0.5;

        float vignette = 1.0 - length(uv - 0.5) * 0.5;
        col *= vignette;

        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
}
