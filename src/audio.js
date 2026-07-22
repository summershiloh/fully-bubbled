import { getSfxConfig } from './sfx-manager.js';

export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.enabled = true;
    this.sfxVolume = 0.1;
    this.musicVolume = 0;
    this.popVolume = 1.0;
    this.streaming = false;
    this._sfxThemeId = null;
  }

  setPopVolume(v) {
    this.popVolume = v;
  }

  setSfxTheme(id) {
    this._sfxThemeId = id;
  }

  setStreaming(v) {
    this.streaming = v;
    const el = document.getElementById('streamingSpinner');
    if (el) el.style.display = v ? 'inline-block' : 'none';
  }

  _playCustomSfx(name, extra) {
    if (!this._sfxThemeId) return false;
    const cfg = getSfxConfig(this._sfxThemeId, name);
    if (!cfg) return false;
    this._playCustom(name, cfg, extra);
    return true;
  }

  _playCustom(name, cfg, extra) {
    if (!this.enabled || !this.ctx) return;
    this.ensureResumed();
    const now = this.ctx.currentTime;
    if (name === 'pop') {
      const g = this._createGain(cfg.gain * this.popVolume);
      const o = this._createOsc(cfg.type, cfg.freq);
      const o2 = this._createOsc(cfg.type, cfg.freq2);
      const o3 = cfg.freq3 ? this._createOsc(cfg.type, cfg.freq3) : null;
      const [att, sus, rel, peak] = cfg.envelope;
      this._scheduleEnvelope(g, now, att, sus, rel, peak, peak * 0.2);
      o.connect(g); o2.connect(g); if (o3) o3.connect(g);
      o.start(now); o2.start(now); if (o3) o3.start(now);
      const dur = att + sus + rel;
      o.stop(now + dur); o2.stop(now + dur); if (o3) o3.stop(now + dur);
    } else if (name === 'shoot') {
      const g = this._createGain(cfg.gain * this.popVolume);
      const o = this._createOsc(cfg.type, cfg.freq);
      const o2 = this._createOsc(cfg.type, cfg.freq2);
      const [att, sus, rel, peak] = cfg.envelope;
      this._scheduleEnvelope(g, now, att, sus, rel, peak, peak * 0.3);
      o.connect(g); o2.connect(g);
      o.frequency.linearRampToValueAtTime(cfg.freq + 60, now + 0.08);
      o2.frequency.linearRampToValueAtTime(cfg.freq2 + 120, now + 0.06);
      o.start(now); o2.start(now);
      o.stop(now + 0.2); o2.stop(now + 0.18);
    } else if (name === 'chromePop') {
      const g = this._createGain(cfg.gain);
      cfg.notes.forEach((freq, i) => {
        const delay = cfg.timings[i];
        const o = this._createOsc(cfg.type, freq);
        const o2 = this._createOsc(cfg.type, freq * 2);
        const gn = this.ctx.createGain();
        gn.gain.value = 0.04;
        gn.gain.setValueAtTime(0, now + delay);
        gn.gain.linearRampToValueAtTime(0.06, now + delay + 0.01);
        gn.gain.linearRampToValueAtTime(0.01, now + delay + 0.1);
        gn.gain.linearRampToValueAtTime(0, now + delay + 0.25);
        gn.connect(g); o.connect(gn); o2.connect(gn);
        o.start(now + delay); o2.start(now + delay);
        o.stop(now + delay + 0.3); o2.stop(now + delay + 0.25);
      });
    } else if (name === 'laserStart') {
      const g = this._createGain(cfg.gain);
      const o = this._createOsc(cfg.type, cfg.freq);
      const o2 = this._createOsc(cfg.type, cfg.freq2);
      const [att, sus, rel, peak] = cfg.envelope;
      this._scheduleEnvelope(g, now, att, sus, rel, peak, peak * 0.4);
      o.connect(g); o2.connect(g);
      o.frequency.linearRampToValueAtTime(cfg.freq - 15, now + 0.2);
      o2.frequency.linearRampToValueAtTime(cfg.freq2 - 20, now + 0.15);
      o.start(now); o2.start(now);
      o.stop(now + 0.3); o2.stop(now + 0.3);
    } else if (name === 'giantBallFire') {
      const g = this._createGain(cfg.gain);
      const o = this._createOsc(cfg.type, cfg.freq);
      const o2 = this._createOsc(cfg.type, cfg.freq2);
      const [att, sus, rel, peak] = cfg.envelope;
      this._scheduleEnvelope(g, now, att, sus, rel, peak, peak * 0.4);
      o.connect(g); o2.connect(g);
      o.frequency.linearRampToValueAtTime(cfg.freq - 100, now + 0.3);
      o2.frequency.linearRampToValueAtTime(cfg.freq2 - 150, now + 0.3);
      o.start(now); o2.start(now);
      o.stop(now + 0.8); o2.stop(now + 0.7);
    } else if (name === 'levelUp') {
      const g = this._createGain(cfg.gain);
      cfg.notes.forEach((freq, i) => {
        const delay = i * 0.1;
        const gn = this.ctx.createGain();
        gn.gain.value = 0.05;
        gn.gain.setValueAtTime(0, now + delay);
        gn.gain.linearRampToValueAtTime(0.15, now + delay + 0.02);
        gn.gain.linearRampToValueAtTime(0.05, now + delay + 0.1);
        gn.gain.linearRampToValueAtTime(0, now + delay + 0.3);
        gn.connect(g);
        const o = this._createOsc(cfg.type, freq);
        const o2 = this._createOsc(cfg.type, freq * 1.5);
        o.connect(gn); o2.connect(gn);
        o.start(now + delay); o2.start(now + delay);
        o.stop(now + delay + 0.5); o2.stop(now + delay + 0.4);
      });
    } else if (name === 'gameOver') {
      const g = this._createGain(cfg.gain);
      cfg.notes.forEach((freq, i) => {
        const delay = i * 0.18;
        const gn = this.ctx.createGain();
        gn.gain.value = 0.04;
        gn.gain.setValueAtTime(0, now + delay);
        gn.gain.linearRampToValueAtTime(0.12, now + delay + 0.03);
        gn.gain.linearRampToValueAtTime(0.03, now + delay + 0.12);
        gn.gain.linearRampToValueAtTime(0, now + delay + 0.3);
        gn.connect(g);
        const o = this._createOsc(cfg.type, freq);
        const o2 = this._createOsc(cfg.type, freq * 0.5);
        o.connect(gn); o2.connect(gn);
        o.start(now + delay); o2.start(now + delay);
        o.stop(now + delay + 0.5); o2.stop(now + delay + 0.45);
      });
    } else if (name === 'falling') {
      const g = this._createGain(cfg.gain);
      const o = this._createOsc(cfg.type, cfg.freq);
      const o2 = this._createOsc(cfg.type, cfg.freq2);
      const [att, sus, rel, peak] = cfg.envelope;
      this._scheduleEnvelope(g, now, att, sus, rel, peak, peak * 0.2);
      o.connect(g); o2.connect(g);
      o.frequency.linearRampToValueAtTime(cfg.freq + 100, now + 0.2);
      o2.frequency.linearRampToValueAtTime(cfg.freq2 + 40, now + 0.15);
      o.start(now); o2.start(now);
      o.stop(now + 0.7); o2.stop(now + 0.6);
    }
  }

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1;
      this.masterGain.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.masterGain);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(this.masterGain);
    } catch (e) {
      console.warn('Audio not available:', e.message);
      this.enabled = false;
    }
  }

  ensureResumed() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setSfxVolume(v) {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxVolume;
  }

  setMusicVolume(v) {
    this.musicVolume = Math.max(0, Math.min(1, v));
    if (this.musicGain) this.musicGain.gain.value = this.musicVolume;
    if (v <= 0) {
      this.stopMusic();
    } else if (!this._currentSource && !this._loadingTrack && this.ctx) {
      this.ambientPad();
    }
  }

  _createGain(vol = 1) {
    const g = this.ctx.createGain();
    g.gain.value = vol;
    g.connect(this.sfxGain);
    return g;
  }

  _createOsc(type, freq) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    return o;
  }

  _scheduleEnvelope(gain, start, attack, sustain, release, peakVol = 1, sustainVol = 0.7) {
    const now = start;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peakVol, now + attack);
    gain.gain.linearRampToValueAtTime(sustainVol, now + attack + sustain);
    gain.gain.linearRampToValueAtTime(0, now + attack + sustain + release);
  }

  shoot() {
    if (!this.enabled || !this.ctx) return;
    if (this._playCustomSfx('shoot')) return;
    this.ensureResumed();
    const now = this.ctx.currentTime;
    const g = this._createGain(0.04);
    const o = this._createOsc('triangle', 260);
    const o2 = this._createOsc('triangle', 390);
    this._scheduleEnvelope(g, now, 0.03, 0.04, 0.12, 0.15, 0.05);
    o.connect(g);
    o2.connect(g);
    o.frequency.linearRampToValueAtTime(320, now + 0.08);
    o2.frequency.linearRampToValueAtTime(440, now + 0.06);
    o.start(now);
    o2.start(now);
    o.stop(now + 0.2);
    o2.stop(now + 0.18);
  }

  pop() {
    if (!this.enabled || !this.ctx) return;
    if (this._playCustomSfx('pop')) return;
    this.ensureResumed();
    const now = this.ctx.currentTime;
    const g = this._createGain(0.12 * this.popVolume);
    const o = this._createOsc('sine', 550);
    const o2 = this._createOsc('sine', 770);
    const o3 = this._createOsc('sine', 1100);
    this._scheduleEnvelope(g, now, 0.005, 0.04, 0.2, 0.35 * this.popVolume, 0.05);
    o.connect(g);
    o2.connect(g);
    o3.connect(g);
    o.frequency.linearRampToValueAtTime(1320, now + 0.05);
    o2.frequency.linearRampToValueAtTime(1760, now + 0.04);
    o3.frequency.linearRampToValueAtTime(660, now + 0.08);
    o.start(now);
    o2.start(now);
    o3.start(now);
    o.stop(now + 0.25);
    o2.stop(now + 0.2);
    o3.stop(now + 0.3);
  }

  popChain(chainLength = 3) {
    if (!this.enabled || !this.ctx) return;
    this.ensureResumed();
    const baseFreq = 440 + chainLength * 60;
    for (let i = 0; i < Math.min(chainLength, 6); i++) {
      const delay = i * 0.04;
      const now = this.ctx.currentTime + delay;
      const g = this._createGain(0.08 * this.popVolume);
      const peak = (0.3 - i * 0.04) * this.popVolume;
      const o = this._createOsc('sine', baseFreq + i * 160);
      const o2 = this._createOsc('triangle', baseFreq + i * 220);
      this._scheduleEnvelope(g, now, 0.01, 0.03, 0.18, peak, 0.05);
      o.connect(g);
      o2.connect(g);
      o.frequency.linearRampToValueAtTime(baseFreq + i * 160 + 400, now + 0.06);
      o.start(now);
      o2.start(now);
      o.stop(now + 0.3);
      o2.stop(now + 0.25);
    }
  }

  place() {
    if (!this.enabled || !this.ctx) return;
    this.ensureResumed();
    const now = this.ctx.currentTime;
    const g = this._createGain(0.1);
    const o = this._createOsc('sine', 360);
    const o2 = this._createOsc('sine', 540);
    this._scheduleEnvelope(g, now, 0.02, 0.06, 0.25, 0.3, 0.08);
    o.connect(g);
    o2.connect(g);
    o.frequency.linearRampToValueAtTime(480, now + 0.06);
    o2.frequency.linearRampToValueAtTime(600, now + 0.05);
    o.start(now);
    o2.start(now);
    o.stop(now + 0.35);
    o2.stop(now + 0.3);
  }

  levelUp() {
    if (!this.enabled || !this.ctx) return;
    if (this._playCustomSfx('levelUp')) return;
    this.ensureResumed();
    const now = this.ctx.currentTime;
    const notes = [262, 330, 392, 523, 659, 784];
    notes.forEach((freq, i) => {
      const delay = i * 0.1;
      const g = this._createGain(0.12);
      const o = this._createOsc('sine', freq);
      const o2 = this._createOsc('triangle', freq * 1.5);
      this._scheduleEnvelope(g, now + delay, 0.02, 0.08 + i * 0.02, 0.3, 0.35 - i * 0.03, 0.15);
      o.connect(g);
      o2.connect(g);
      o.start(now + delay);
      o2.start(now + delay);
      o.stop(now + delay + 0.5);
      o2.stop(now + delay + 0.4);
    });
  }

  gameOver() {
    if (!this.enabled || !this.ctx) return;
    if (this._playCustomSfx('gameOver')) return;
    this.ensureResumed();
    const now = this.ctx.currentTime;
    const melody = [392, 349, 330, 262, 294, 330, 349];
    melody.forEach((freq, i) => {
      const delay = i * 0.18;
      const g = this._createGain(0.1);
      const o = this._createOsc('sine', freq);
      const o2 = this._createOsc('triangle', freq * 0.5);
      this._scheduleEnvelope(g, now + delay, 0.03, 0.12, 0.3, 0.3, 0.12);
      o.connect(g);
      o2.connect(g);
      o.start(now + delay);
      o2.start(now + delay);
      o.stop(now + delay + 0.5);
      o2.stop(now + delay + 0.45);
    });
  }

  win() {
    if (!this.enabled || !this.ctx) return;
    this.ensureResumed();
    const now = this.ctx.currentTime;
    const arpegg = [523, 659, 784, 1047, 784, 1047, 1319];
    arpegg.forEach((freq, i) => {
      const delay = i * 0.12;
      const g = this._createGain(0.15);
      const o = this._createOsc('sine', freq);
      const o2 = this._createOsc('sine', freq * 2);
      this._scheduleEnvelope(g, now + delay, 0.02, 0.1 + i * 0.04, 0.3, 0.4 - i * 0.03, 0.1);
      o.connect(g);
      o2.connect(g);
      o.frequency.linearRampToValueAtTime(freq * 1.05, now + delay + 0.08);
      o.start(now + delay);
      o2.start(now + delay);
      o.stop(now + delay + 0.6);
      o2.stop(now + delay + 0.4);
    });
  }

  hover() {
    if (!this.enabled || !this.ctx) return;
    this.ensureResumed();
    const now = this.ctx.currentTime;
    const g = this._createGain(0.03);
    const o = this._createOsc('sine', 880);
    this._scheduleEnvelope(g, now, 0.01, 0.02, 0.1, 0.15, 0.02);
    o.connect(g);
    o.start(now);
    o.stop(now + 0.15);
  }

  click() {
    if (!this.enabled || !this.ctx) return;
    this.ensureResumed();
    const now = this.ctx.currentTime;
    const g = this._createGain(0.06);
    const o = this._createOsc('sine', 660);
    const o2 = this._createOsc('sine', 990);
    this._scheduleEnvelope(g, now, 0.002, 0.02, 0.08, 0.25, 0.05);
    o.connect(g);
    o2.connect(g);
    o.start(now);
    o2.start(now);
    o.stop(now + 0.12);
    o2.stop(now + 0.1);
  }

  falling() {
    if (!this.enabled || !this.ctx) return;
    if (this._playCustomSfx('falling')) return;
    this.ensureResumed();
    const now = this.ctx.currentTime;
    const g = this._createGain(0.04);
    const o = this._createOsc('sine', 200);
    const o2 = this._createOsc('triangle', 180);
    this._scheduleEnvelope(g, now, 0.1, 0.15, 0.4, 0.15, 0.03);
    o.frequency.linearRampToValueAtTime(300, now + 0.2);
    o2.frequency.linearRampToValueAtTime(220, now + 0.15);
    o.connect(g);
    o2.connect(g);
    o.start(now);
    o2.start(now);
    o.stop(now + 0.7);
    o2.stop(now + 0.6);
  }

  _musicTracks = ['Aya.mp3', 'Enjines.mp3', 'Eurospeed.mp3'];
  _currentSource = null;
  _bufferCache = {};

  async _loadTrack(url) {
    if (this._bufferCache[url]) return this._bufferCache[url];
    this.setStreaming(true);
    try {
      const res = await fetch(url);
      const data = await res.arrayBuffer();
      const buf = await this.ctx.decodeAudioData(data);
      this._bufferCache[url] = buf;
      this.setStreaming(false);
      return buf;
    } catch (e) {
      this.setStreaming(false);
      return null;
    }
  }

  async _playMusicTrack() {
    if (!this.enabled || !this.ctx || !this.musicGain || this.musicVolume <= 0) return;
    if (this._loadingTrack) return;
    this._loadingTrack = true;
    this.stopMusic();
    this.ensureResumed();
    const track = this._musicTracks[Math.floor(Math.random() * this._musicTracks.length)];
    this._showTrackName(track);
    const url = '/audio/' + track;
    const buf = await this._loadTrack(url);
    this._loadingTrack = false;
    if (!buf || this.musicVolume <= 0) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.musicGain);
    src.loop = false;
    src.onended = () => {
      if (this._currentSource === src) this._currentSource = null;
      if (this.musicVolume > 0) this._playMusicTrack();
    };
    src.start();
    this._currentSource = src;
  }

  stopMusic() {
    if (this._currentSource) {
      try { this._currentSource.stop(); } catch (e) {}
      this._currentSource = null;
    }
  }

  ambientPad() {
    this._playMusicTrack();
  }

  _showTrackName(name) {
    const el = document.getElementById('trackName');
    if (!el) return;
    el.textContent = 'Now Playing: ' + name.replace('.mp3', '');
    el.classList.remove('track-name-exit');
    el.classList.add('track-name-enter');
    el.style.display = 'block';
    clearTimeout(this._trackFadeTimer);
    this._trackFadeTimer = setTimeout(() => {
      el.classList.remove('track-name-enter');
      el.classList.add('track-name-exit');
      setTimeout(() => { el.style.display = 'none'; el.classList.remove('track-name-exit'); }, 600);
    }, 2000);
  }

  laserStart() {
    if (!this.enabled || !this.ctx) return;
    if (this._playCustomSfx('laserStart')) return;
    this.ensureResumed();
    const now = this.ctx.currentTime;
    const g = this._createGain(0.08);
    const o = this._createOsc('sawtooth', 55);
    const o2 = this._createOsc('sine', 110);
    this._scheduleEnvelope(g, now, 0.01, 0.1, 0.15, 0.2, 0.08);
    o.connect(g);
    o2.connect(g);
    o.frequency.linearRampToValueAtTime(40, now + 0.2);
    o2.frequency.linearRampToValueAtTime(90, now + 0.15);
    o.start(now);
    o2.start(now);
    o.stop(now + 0.3);
    o2.stop(now + 0.3);
  }

  chromePop() {
    if (!this.enabled || !this.ctx) return;
    if (this._playCustomSfx('chromePop')) return;
    this.ensureResumed();
    const now = this.ctx.currentTime;
    const g = this._createGain(0.015);
    const o = this._createOsc('sine', 80);
    const o2 = this._createOsc('sine', 55);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.3, now + 0.1);
    g.gain.linearRampToValueAtTime(0.15, now + 0.25);
    g.gain.linearRampToValueAtTime(0, now + 0.6);
    o.connect(g);
    o2.connect(g);
    o.frequency.linearRampToValueAtTime(35, now + 0.5);
    o2.frequency.linearRampToValueAtTime(25, now + 0.5);
    o.start(now);
    o2.start(now);
    o.stop(now + 0.7);
    o2.stop(now + 0.7);
  }

  giantBallFire() {
    if (!this.enabled || !this.ctx) return;
    if (this._playCustomSfx('giantBallFire')) return;
    this.ensureResumed();
    const now = this.ctx.currentTime;
    const g = this._createGain(0.1);
    const o = this._createOsc('sine', 180);
    const o2 = this._createOsc('sine', 270);
    this._scheduleEnvelope(g, now, 0.02, 0.3, 0.4, 0.3, 0.12);
    o.connect(g);
    o2.connect(g);
    o.frequency.linearRampToValueAtTime(80, now + 0.3);
    o2.frequency.linearRampToValueAtTime(120, now + 0.3);
    o.start(now);
    o2.start(now);
    o.stop(now + 0.8);
    o2.stop(now + 0.7);
  }

  dispose() {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

export const audio = new AudioSystem();
