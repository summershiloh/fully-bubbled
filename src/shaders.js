import { ShaderMaterial, Vector3, Color, AdditiveBlending, FrontSide } from 'three';

export function createBubbleMaterial(color, intensity = 1.0) {
  const c = new Color(color);
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: c },
      uGlowColor: { value: new Color(color).multiplyScalar(1.5) },
      uTime: { value: 0 },
      uIntensity: { value: intensity },
      uJiggle: { value: 0 },
      uOpacity: { value: 1.0 }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec3 vColor;
      uniform float uTime;
      uniform float uJiggle;
      uniform vec3 uColor;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vec3 viewDir = normalize(cameraPosition - worldPos.xyz);
        vViewDir = viewDir;

        float jiggle = uJiggle;
        vec3 displaced = position + normal * (jiggle * 0.15 * sin(position.x * 3.0 + uTime * 2.0) * sin(position.y * 3.0 + uTime * 2.5) * sin(position.z * 3.0 + uTime * 3.0));

        vColor = uColor;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec3 vColor;
      uniform vec3 uGlowColor;
      uniform float uIntensity;
      uniform float uTime;
      uniform float uOpacity;

      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewDir);

        float fresnel = 1.0 - max(dot(normal, viewDir), 0.0);
        fresnel = pow(fresnel, 2.0);

        float rim = fresnel * 0.8 + 0.2;

        float phase = sin(uTime * 1.5 + fresnel * 6.28) * 0.1 + 0.9;

        vec3 baseColor = vColor * (0.6 + 0.4 * phase);
        vec3 glowColor = uGlowColor * fresnel * 1.5 * uIntensity;

        float pulse = 0.85 + 0.15 * sin(uTime * 2.0);
        vec3 finalColor = baseColor * pulse + glowColor + vec3(0.0, 0.0, 0.0);

        float alpha = uOpacity;
        gl_FragColor = vec4(finalColor * 1.2, alpha);
      }
    `,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    side: FrontSide
  });
}

export function createGlowSpriteMaterial(color, size = 1.0) {
  const c = new Color(color);
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: c },
      uSize: { value: size },
      uTime: { value: 0 }
    },
    vertexShader: `
      attribute float aSize;
      attribute float aAlpha;
      varying float vAlpha;
      uniform float uSize;
      void main() {
        vAlpha = aAlpha;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uSize * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uTime;
      varying float vAlpha;
      void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        if (dist > 0.5) discard;
        float alpha = smoothstep(0.5, 0.0, dist) * vAlpha;
        float glow = exp(-dist * 6.0);
        vec3 color = uColor * (1.0 + glow * 0.5);
        gl_FragColor = vec4(color, alpha * 0.6);
      }
    `,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false
  });
}

export function createExplosiveMaterial(color) {
  const c = new Color(color);
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: c },
      uGlowColor: { value: new Color('#ffffff') },
      uTime: { value: 0 },
      uJiggle: { value: 0 },
      uOpacity: { value: 1.0 },
      uPulse: { value: 0 }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec3 vColor;
      uniform float uTime;
      uniform float uJiggle;
      uniform vec3 uColor;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vec3 viewDir = normalize(cameraPosition - worldPos.xyz);
        vViewDir = viewDir;
        float jiggle = uJiggle;
        vec3 displaced = position + normal * (jiggle * 0.15 * sin(position.x * 3.0 + uTime * 2.0) * sin(position.y * 3.0 + uTime * 2.5) * sin(position.z * 3.0 + uTime * 3.0));
        vColor = uColor;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec3 vColor;
      uniform vec3 uGlowColor;
      uniform float uTime;
      uniform float uOpacity;
      uniform float uPulse;
      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewDir);
        float fresnel = 1.0 - max(dot(normal, viewDir), 0.0);
        fresnel = pow(fresnel, 2.0);
        vec3 baseColor = vColor * (0.7 + 0.3 * uPulse);
        float glow = fresnel * (1.5 + uPulse * 2.0);
        vec3 glowColor = uGlowColor * glow;
        vec3 finalColor = baseColor + glowColor;
        gl_FragColor = vec4(finalColor * 1.3, uOpacity);
      }
    `,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    side: FrontSide
  });
}

export function createFragileMaterial(color) {
  const c = new Color(color);
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: c },
      uTime: { value: 0 },
      uJiggle: { value: 0 },
      uOpacity: { value: 1.0 }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec3 vColor;
      uniform float uTime;
      uniform float uJiggle;
      uniform vec3 uColor;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vec3 viewDir = normalize(cameraPosition - worldPos.xyz);
        vViewDir = viewDir;
        float jiggle = uJiggle * 1.5;
        vec3 displaced = position + normal * (jiggle * 0.15 * sin(position.x * 3.0 + uTime * 2.0) * sin(position.y * 3.0 + uTime * 2.5) * sin(position.z * 3.0 + uTime * 3.0));
        vColor = uColor;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec3 vColor;
      uniform float uTime;
      uniform float uOpacity;
      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewDir);
        float fresnel = 1.0 - max(dot(normal, viewDir), 0.0);
        fresnel = pow(fresnel, 3.0);
        vec3 baseColor = vColor * (0.5 + 0.5 * (0.6 + 0.4 * sin(uTime * 2.0)));
        vec3 finalColor = baseColor + baseColor * fresnel * 0.5;
        float alpha = uOpacity * (0.85 + 0.15 * fresnel);
        gl_FragColor = vec4(finalColor * 1.1, alpha);
      }
    `,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    side: FrontSide
  });
}

export function createBackgroundMaterial() {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor1: { value: new Color('#0a0015') },
      uColor2: { value: new Color('#001520') }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      varying vec2 vUv;

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
        vec2 uv = vUv * 4.0 + uTime * 0.02;
        float n = noise(uv + uTime * 0.01);
        float n2 = noise(uv * 2.0 - uTime * 0.015);
        vec3 col = mix(uColor1, uColor2, n * 0.5 + 0.3 + n2 * 0.2);
        float stars = pow(max(noise(uv * 10.0 + uTime * 0.005) - 0.7, 0.0) * 3.0, 4.0);
        col += stars * vec3(0.6, 0.4, 1.0);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    side: FrontSide
  });
}

export function createChromeMaterial(color) {
  const c = new Color(color);
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: c },
      uOpacity: { value: 1.0 },
      uJiggle: { value: 0 }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec3 vPosition;
      uniform float uTime;
      uniform float uJiggle;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vec3 viewDir = normalize(cameraPosition - worldPos.xyz);
        vViewDir = viewDir;
        vPosition = worldPos.xyz;
        float jiggle = uJiggle;
        vec3 displaced = position + normal * (jiggle * 0.15 * sin(position.x * 3.0 + uTime * 2.0) * sin(position.y * 3.0 + uTime * 2.5) * sin(position.z * 3.0 + uTime * 3.0));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec3 vPosition;
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uOpacity;

      float hash(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }

      float noise3D(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec3(1.0,0.0,0.0));
        float c = hash(i + vec3(0.0,1.0,0.0));
        float d = hash(i + vec3(1.0,1.0,0.0));
        float e = hash(i + vec3(0.0,0.0,1.0));
        float f_ = hash(i + vec3(1.0,0.0,1.0));
        float g = hash(i + vec3(0.0,1.0,1.0));
        float h = hash(i + vec3(1.0,1.0,1.0));
        float mix1 = mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
        float mix2 = mix(mix(e,f_,f.x), mix(g,h,f.x), f.y);
        return mix(mix1, mix2, f.z);
      }

      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewDir);
        vec3 reflDir = reflect(-viewDir, normal);
        float fresnel = 1.0 - max(dot(normal, viewDir), 0.0);
        fresnel = pow(fresnel, 4.0);

        vec3 envSampler = reflDir * 2.0 + uTime * 0.05;
        float envR = noise3D(envSampler + vec3(1.0));
        float envG = noise3D(envSampler + vec3(2.0));
        float envB = noise3D(envSampler + vec3(3.0));
        vec3 envColor = vec3(envR, envG, envB);

        vec3 envSampler2 = reflDir * 1.5 - uTime * 0.03;
        float envR2 = noise3D(envSampler2 + vec3(4.0));
        float envG2 = noise3D(envSampler2 + vec3(5.0));
        float envB2 = noise3D(envSampler2 + vec3(6.0));
        vec3 envColor2 = vec3(envR2, envG2, envB2);

        vec3 reflected = envColor * 0.6 + envColor2 * 0.4;
        vec3 chromeCol = mix(vec3(0.02, 0.02, 0.04), reflected, 0.9 + 0.1 * fresnel);
        chromeCol += vec3(0.15, 0.15, 0.18) * pow(fresnel, 2.0) * 2.0;
        chromeCol = mix(chromeCol, chromeCol * uColor, 0.05);
        chromeCol = chromeCol * 1.2;

        float rimGlow = pow(fresnel, 3.0) * 0.4;
        chromeCol += vec3(0.5, 0.5, 0.55) * rimGlow;

        float sparkle = pow(max(noise3D(reflDir * 20.0 + uTime * 0.5) - 0.85, 0.0) * 6.0, 8.0);
        chromeCol += vec3(1.0, 0.95, 0.9) * sparkle;

        gl_FragColor = vec4(chromeCol, 1.0);
      }
    `,
    transparent: false,
    depthWrite: true,
    side: 0
  });
}

export function createInvaderMaterial() {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 1.0 },
      uJiggle: { value: 0 }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      uniform float uTime;
      uniform float uJiggle;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vec3 viewDir = normalize(cameraPosition - worldPos.xyz);
        vViewDir = viewDir;
        float jiggle = uJiggle;
        vec3 displaced = position + normal * (jiggle * 0.15 * sin(position.x * 3.0 + uTime * 2.0) * sin(position.y * 3.0 + uTime * 2.5) * sin(position.z * 3.0 + uTime * 3.0));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      uniform float uTime;
      uniform float uOpacity;
      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewDir);
        float fresnel = 1.0 - max(dot(normal, viewDir), 0.0);
        fresnel = pow(fresnel, 2.0);
        float blink = 0.5 + 0.5 * sin(uTime * 3.0);
        vec3 redColor = vec3(1.0, 0.08, 0.03);
        vec3 whiteColor = vec3(1.0, 0.95, 0.9);
        vec3 baseColor = mix(redColor, whiteColor, blink);
        float glow = fresnel * (1.2 + 0.8 * blink);
        vec3 glowColor = vec3(1.0, 0.3, 0.1) * glow;
        float pulse = 0.85 + 0.15 * sin(uTime * 5.0);
        vec3 finalColor = (baseColor + glowColor) * pulse * 1.4;
        gl_FragColor = vec4(finalColor, uOpacity);
      }
    `,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    side: FrontSide
  });
}
