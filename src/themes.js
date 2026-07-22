export const THEMES = {
  random: {
    id: 'random', name: 'Random', icon: '&#9856;',
    desc: 'Surprise me!',
    bubbleColors: [], fontColor: '#ffffff',
    bulletColor: '#ffffff', playerGlow: '#ffffff', accent: '#ffffff',
    bg1: '#000000', bg2: '#111111', sfxId: null
  },
  cappucino: {
    id: 'cappucino', name: 'Cappucino', icon: '&#9749;',
    desc: 'Warm caf\u00e9 vibes',
    bubbleColors: ['#D4A574', '#8B5E3C', '#C4956A', '#6F4E37', '#F5E6D3', '#A0522D', '#3E2723'],
    fontColor: '#D4A574',
    bulletColor: '#F5E6D3', playerGlow: '#D4A574', accent: '#C4956A',
    bg1: '#1a0f0a', bg2: '#2a1a10', sfxId: 'cappucino'
  },
  chilly: {
    id: 'chilly', name: 'Chilly', icon: '&#10052;',
    desc: 'Cool icy calm',
    bubbleColors: ['#A8D8EA', '#7EC8E3', '#B8E6F0', '#E0F0FF', '#5BA3C9', '#D4EEF7', '#3D8EB9'],
    fontColor: '#A8D8EA',
    bulletColor: '#E0F0FF', playerGlow: '#A8D8EA', accent: '#7EC8E3',
    bg1: '#040a14', bg2: '#0a1628', sfxId: 'chilly'
  },
  matrix: {
    id: 'matrix', name: 'Matrix', icon: '&#9889;',
    desc: 'Digital rain',
    bubbleColors: ['#00FF41', '#00CC33', '#009900', '#33FF66', '#006600', '#00BB33', '#66FF99'],
    fontColor: '#00FF41',
    bulletColor: '#00FF41', playerGlow: '#00FF41', accent: '#00CC33',
    bg1: '#000a00', bg2: '#001a00', sfxId: 'matrix'
  },
  'chill-dojo': {
    id: 'chill-dojo', name: 'Chill Dojo', icon: '&#127807;',
    desc: 'Zen garden calm',
    bubbleColors: ['#F5E6CC', '#D4C5A9', '#5B8C5A', '#E8A0B4', '#8B7355', '#C4A882', '#7BA07B'],
    fontColor: '#E8A0B4',
    bulletColor: '#F5E6CC', playerGlow: '#E8A0B4', accent: '#5B8C5A',
    bg1: '#1a1410', bg2: '#2a2218', sfxId: 'chill-dojo'
  },
  chess: {
    id: 'chess', name: 'Chess', icon: '&#9812;',
    desc: 'Black & white',
    bubbleColors: ['#FFFFFF', '#E0E0E0', '#B0B0B0', '#808080', '#505050', '#303030', '#000000'],
    fontColor: '#E0E0E0',
    bulletColor: '#FFFFFF', playerGlow: '#FFFFFF', accent: '#AAAAAA',
    bg1: '#000000', bg2: '#111111', sfxId: 'chess'
  }
};

const THEME_KEYS = Object.keys(THEMES).filter(k => k !== 'random');

let currentThemeId = 'cappucino';
let themeChangeListeners = [];
let pickerInitialized = false;
let useCustomSfx = true;

export function getUseCustomSfx() { return useCustomSfx; }
export function setUseCustomSfx(v) { useCustomSfx = v; }

export function getSfxId() {
  const t = THEMES[currentThemeId];
  return t.sfxId && useCustomSfx ? t.sfxId : null;
}

export function getBubbleColors() {
  return THEMES[currentThemeId].bubbleColors;
}

export function getRandomColor() {
  const colors = getBubbleColors();
  return colors[Math.floor(Math.random() * colors.length)];
}

export function getCurrentTheme() {
  return THEMES[currentThemeId];
}

export function getCurrentThemeId() {
  return currentThemeId;
}

export function applyTheme(id) {
  if (id === 'random') {
    id = THEME_KEYS[Math.floor(Math.random() * THEME_KEYS.length)];
  }
  if (!THEMES[id]) return;
  currentThemeId = id;
  const theme = THEMES[id];
  document.documentElement.style.setProperty('--hud-fg', theme.fontColor || '#ffffff');
  document.documentElement.style.setProperty('--hud-accent', theme.accent || '#ffffff');
  themeChangeListeners.forEach(fn => fn(theme, id));
}

export function onThemeChange(fn) {
  themeChangeListeners.push(fn);
  return () => {
    themeChangeListeners = themeChangeListeners.filter(f => f !== fn);
  };
}

function buildPickerHTML() {
  return `
    <div id="themeOverlay" class="theme-overlay" style="display:none;">
      <div class="theme-panel">
        <h2 class="theme-panel-title">CHOOSE THEME</h2>
        <div class="theme-grid">
          ${Object.values(THEMES).map(t => {
            const isRandom = t.id === 'random';
            const colors = isRandom ? [] : t.bubbleColors;
            return `
              <div class="theme-card btn-bubble" data-theme="${t.id}">
                <div class="theme-card-preview">
                  ${isRandom
                    ? '<div class="theme-random-icon">?</div>'
                    : `<div class="theme-color-strip">${colors.map(c => `<span class="theme-swatch" style="background:${c}"></span>`).join('')}</div>`
                  }
                </div>
                <div class="theme-card-name">${t.name}</div>
              </div>
            `;
          }).join('')}
        </div>
        <button id="btnThemeClose" class="btn-bubble">CLOSE</button>
      </div>
    </div>
  `;
}

let onPickCallback = null;

export function initThemePicker(btnSelector) {
  if (pickerInitialized) return;
  pickerInitialized = true;

  const div = document.createElement('div');
  div.innerHTML = buildPickerHTML();
  document.body.appendChild(div.firstElementChild);

  const overlay = document.getElementById('themeOverlay');
  const closeBtn = document.getElementById('btnThemeClose');

  document.querySelectorAll('.theme-card').forEach(card => {
    card.addEventListener('click', () => {
      applyTheme(card.dataset.theme);
      overlay.style.display = 'none';
      if (onPickCallback) {
        const cb = onPickCallback;
        onPickCallback = null;
        cb();
      }
    });
  });

  closeBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
    onPickCallback = null;
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.style.display = 'none';
      onPickCallback = null;
    }
  });
}

export function showThemePicker(onPick) {
  const overlay = document.getElementById('themeOverlay');
  if (overlay) {
    onPickCallback = onPick || null;
    overlay.style.display = 'flex';
  }
}
