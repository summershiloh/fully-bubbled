const SFX_PRESETS = {
  chilly: {
    pop: { type: 'sine', freq: 440, freq2: 660, freq3: 880, gain: 0.08, envelope: [0.005, 0.04, 0.2, 0.25] },
    shoot: { type: 'sine', freq: 520, freq2: 780, gain: 0.03, envelope: [0.03, 0.04, 0.12, 0.1] },
    chromePop: { notes: [1047, 1319, 1568, 2093], timings: [0, 0.05, 0.12, 0.2], type: 'sine', gain: 0.02 },
    laserStart: { type: 'sine', freq: 110, freq2: 220, gain: 0.05, envelope: [0.01, 0.1, 0.15, 0.15] },
    giantBallFire: { type: 'sine', freq: 360, freq2: 540, gain: 0.05, envelope: [0.02, 0.3, 0.4, 0.2] },
    levelUp: { notes: [349, 440, 523, 698, 880, 1047], type: 'sine', gain: 0.06 },
    gameOver: { notes: [349, 311, 294, 233, 262, 294, 311], type: 'sine', gain: 0.05 },
    falling: { type: 'sine', freq: 160, freq2: 140, gain: 0.02, envelope: [0.1, 0.15, 0.4, 0.1] }
  },
  cappucino: {
    pop: { type: 'triangle', freq: 330, freq2: 495, freq3: 660, gain: 0.1, envelope: [0.005, 0.04, 0.2, 0.28] },
    shoot: { type: 'triangle', freq: 220, freq2: 330, gain: 0.03, envelope: [0.03, 0.04, 0.12, 0.12] },
    chromePop: { notes: [660, 880, 1100, 1320], timings: [0, 0.05, 0.12, 0.2], type: 'triangle', gain: 0.03 },
    laserStart: { type: 'triangle', freq: 90, freq2: 180, gain: 0.06, envelope: [0.01, 0.1, 0.15, 0.18] },
    giantBallFire: { type: 'triangle', freq: 150, freq2: 225, gain: 0.06, envelope: [0.02, 0.3, 0.4, 0.25] },
    levelUp: { notes: [262, 330, 392, 523, 659, 784], type: 'triangle', gain: 0.08 },
    gameOver: { notes: [294, 262, 247, 220, 196, 220, 247], type: 'triangle', gain: 0.06 },
    falling: { type: 'triangle', freq: 180, freq2: 160, gain: 0.03, envelope: [0.1, 0.15, 0.4, 0.12] }
  },
  matrix: {
    pop: { type: 'sawtooth', freq: 880, freq2: 1320, freq3: 1760, gain: 0.06, envelope: [0.002, 0.02, 0.15, 0.2] },
    shoot: { type: 'sawtooth', freq: 440, freq2: 660, gain: 0.02, envelope: [0.02, 0.03, 0.1, 0.08] },
    chromePop: { notes: [1760, 2200, 2640, 3520], timings: [0, 0.04, 0.1, 0.18], type: 'sawtooth', gain: 0.015 },
    laserStart: { type: 'sawtooth', freq: 55, freq2: 110, gain: 0.05, envelope: [0.01, 0.1, 0.15, 0.12] },
    giantBallFire: { type: 'sawtooth', freq: 200, freq2: 300, gain: 0.04, envelope: [0.02, 0.3, 0.4, 0.18] },
    levelUp: { notes: [440, 554, 659, 880, 1108, 1320], type: 'sawtooth', gain: 0.05 },
    gameOver: { notes: [440, 392, 370, 330, 294, 330, 370], type: 'sawtooth', gain: 0.04 },
    falling: { type: 'sawtooth', freq: 100, freq2: 90, gain: 0.015, envelope: [0.1, 0.15, 0.4, 0.06] }
  },
  'chill-dojo': {
    pop: { type: 'sine', freq: 520, freq2: 690, freq3: 920, gain: 0.07, envelope: [0.008, 0.05, 0.25, 0.22] },
    shoot: { type: 'sine', freq: 480, freq2: 720, gain: 0.025, envelope: [0.03, 0.04, 0.12, 0.09] },
    chromePop: { notes: [784, 1047, 1175, 1568], timings: [0, 0.06, 0.14, 0.22], type: 'sine', gain: 0.025 },
    laserStart: { type: 'sine', freq: 100, freq2: 200, gain: 0.05, envelope: [0.01, 0.1, 0.15, 0.14] },
    giantBallFire: { type: 'sine', freq: 270, freq2: 405, gain: 0.05, envelope: [0.02, 0.3, 0.4, 0.22] },
    levelUp: { notes: [330, 392, 523, 659, 784, 1047], type: 'sine', gain: 0.07 },
    gameOver: { notes: [330, 294, 262, 220, 247, 262, 294], type: 'sine', gain: 0.05 },
    falling: { type: 'sine', freq: 140, freq2: 120, gain: 0.02, envelope: [0.1, 0.15, 0.4, 0.08] }
  },
  chess: {
    pop: { type: 'square', freq: 220, freq2: 330, freq3: 440, gain: 0.04, envelope: [0.003, 0.03, 0.15, 0.15] },
    shoot: { type: 'square', freq: 180, freq2: 270, gain: 0.02, envelope: [0.02, 0.03, 0.1, 0.06] },
    chromePop: { notes: [660, 880, 1100, 1320], timings: [0, 0.05, 0.12, 0.2], type: 'square', gain: 0.015 },
    laserStart: { type: 'square', freq: 65, freq2: 130, gain: 0.04, envelope: [0.01, 0.1, 0.15, 0.1] },
    giantBallFire: { type: 'square', freq: 120, freq2: 180, gain: 0.03, envelope: [0.02, 0.3, 0.4, 0.14] },
    levelUp: { notes: [220, 277, 330, 440, 554, 660], type: 'square', gain: 0.04 },
    gameOver: { notes: [220, 196, 185, 165, 147, 165, 185], type: 'square', gain: 0.03 },
    falling: { type: 'square', freq: 80, freq2: 70, gain: 0.01, envelope: [0.1, 0.15, 0.4, 0.04] }
  }
};

export function getSfxConfig(themeId, sfxName) {
  const preset = SFX_PRESETS[themeId];
  if (!preset) return null;
  return preset[sfxName] || null;
}

export function hasCustomSfx(themeId) {
  return !!SFX_PRESETS[themeId];
}
