// Procedural Web Audio synthesizer with OfflineAudioContext static pre-baking
// Zero external assets · Zero per-sound onended listeners · Zero per-beat Oscillator/Filter/Gain churn
import { prof } from './profiler.js';
import { locBiomeAmbience } from './i18n.js';
import { buildSfxBakeTasks } from './audioSfxBank.js';

const PHRYGIAN_SCALE = [
  146.83, 155.56, 174.61, 196.00, 220.00, 233.08, 261.63,
  293.66, 311.13, 349.23, 392.00, 440.00, 466.16, 523.25
];
const EXPLORE_CHIME = { 0: 7, 6: 11, 10: 8, 16: 7, 22: 12, 26: 10 };
const EXPLORE_PLUCK = { 4: 4, 12: 5, 14: 4, 20: 1, 28: 4, 30: 0 };
const COMBAT_BASS   = [0, -1, 0, -1, 1, -1, 0, -1, 4, -1, 1, -1, 0, -1, 5, -1];
const COMBAT_PLUCK  = [7, -1, 8, -1, 7, 11, -1, 8, 10, -1, 8, -1, 7, -1, 5, -1];
const BOSS_BASS_0   = [0, 0, -1, 0, 1, -1, 0, -1, 4, -1, 5, -1, 4, -1, 1, -1];
const BOSS_BASS_1   = [0, 0, -1, 1, 5, -1, 4, -1, 1, -1, 0, -1, 6, -1, 5, 1];
const BOSS_LEAD_0   = [7, -1, 8, 7, 11, -1, 10, 8, 7, -1, 12, 11, 8, -1, 7, -1];
const BOSS_LEAD_1   = [7, 8, 11, -1, 12, 11, 10, 8, 13, -1, 12, 11, 8, 7, 5, -1];

const DAWN_CHORDS = [
  [146.83, 220.00, 293.66, 369.99],
  [196.00, 246.94, 369.99, 440.00],
  [220.00, 277.18, 329.63, 554.37],
  [146.83, 293.66, 369.99, 587.33, 739.99]
];
const VOW_CHORDS = [
  [146.83, 174.61, 220.00, 293.66],
  [130.81, 155.56, 233.08, 311.13],
  [116.54, 174.61, 220.00, 349.23],
  [146.83, 220.00, 293.66, 440.00]
];

// Per-Biome Crossfading Ambient Mix Profiles (zero per-frame node creation, smooth setTargetAtTime crossfade)
const BIOME_AMBIENCE_PROFILES = {
  sanctuary: { label: '熄灯冷风 · 远钟余响', wind: 0.24, rain: 0.0001, well: 0.0001, foundry: 0.0001, drone: 0.08, windHz: 235, droneHz: 155, accent: 'bell' },
  corridor:  { label: '墨雨长廊 · 檐滴轻叩', wind: 0.16, rain: 0.28,   well: 0.0001, foundry: 0.0001, drone: 0.06, windHz: 260, droneHz: 145, accent: 'bell' },
  chapel:    { label: '断钟圣殿 · 幽穹低吟', wind: 0.12, rain: 0.04,   well: 0.0001, foundry: 0.0001, drone: 0.15, windHz: 185, droneHz: 210, accent: 'choir' },
  bell_well: { label: '沉渊钟井 · 暗河潮雾', wind: 0.07, rain: 0.0001, well: 0.30,   foundry: 0.0001, drone: 0.10, windHz: 155, droneHz: 140, accent: 'drip' },
  cistern:   { label: '沉钟水牢 · 溺钟回澜', wind: 0.05, rain: 0.0001, well: 0.36,   foundry: 0.0001, drone: 0.15, windHz: 130, droneHz: 122, accent: 'drip' },
  foundry:   { label: '沉渊古炉 · 熔金炽鸣', wind: 0.11, rain: 0.0001, well: 0.04,   foundry: 0.31,   drone: 0.12, windHz: 175, droneHz: 190, accent: 'ember' },
  crypt:     { label: '残钟地窖 · 阴窖滴墨', wind: 0.05, rain: 0.0001, well: 0.12,   foundry: 0.0001, drone: 0.17, windHz: 135, droneHz: 180, accent: 'drip' },
  ascent:    { label: '初钟圣阶 · 罡风余烬', wind: 0.26, rain: 0.0001, well: 0.0001, foundry: 0.15,   drone: 0.11, windHz: 310, droneHz: 175, accent: 'ember' },
  heart:     { label: '初钟圣心 · 圣钟共鸣', wind: 0.18, rain: 0.0001, well: 0.0001, foundry: 0.06,   drone: 0.21, windHz: 205, droneHz: 245, accent: 'choir' },
  wind:      { label: '绝风断塔 · 罡风呼啸', wind: 0.36, rain: 0.0001, well: 0.0001, foundry: 0.0001, drone: 0.07, windHz: 370, droneHz: 185, accent: 'bell' },
  forest:    { label: '枯墨古林 · 幽林孢鸣', wind: 0.14, rain: 0.08,   well: 0.16,   foundry: 0.0001, drone: 0.12, windHz: 195, droneHz: 165, accent: 'drip' },
  mountain:  { label: '霜骸圣脊 · 凛雪寒吟', wind: 0.32, rain: 0.0001, well: 0.0001, foundry: 0.0001, drone: 0.16, windHz: 420, droneHz: 225, accent: 'choir' }
};

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.noiseBuf = null;
    this._noiseSamples = null;
    this.ambientStarted = false;
    this.masterGain = null;
    this.sfxGain = null;
    this.ambientGain = null;
    this.musicGain = null;
    this.musicGainSoft = null;
    this.musicGainLoud = null;
    this.musicEnabled = true;
    this.masterVol = 0.85;
    this.musicVol = 0.75;
    this.sfxVol = 0.90;
    this.bgDucked = false;
    this._needsGestureResume = false;
    this.windFilter = null;
    this.droneFilter = null;
    this._windFreqTarget = 220;
    this._droneFreqTarget = 165;
    this.biomeGains = null;
    this.activeBiome = 'sanctuary';
    this._appliedBiomeKey = '';
    this.distantBellTimer = 9;
    this.heartbeatTimer = 0.6;
    this._lastSfxTime = {};

    // Static OfflineAudioContext pre-baked AudioBuffers (1 node per playback, 0 listeners)
    this._baked = Object.create(null);
    this._bakeStarted = false;
    this._bakeReady = false;

    // D-Phrygian Dynamic Interactive Music Sequencer
    this.musicStep = 0;
    this.musicAccum = 0;
    this.musicLayer = 'explore';
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted') {
        this.keepAliveResume(true);
      }
      this.startAmbience();
      if (!this._bakeStarted) this._bakeAllBuffers();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this._bindStateRecovery();
    const len = Math.floor(this.ctx.sampleRate * 0.55);
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    // Deterministic seeded white noise for crisp reproducible offline baking
    let seed = 0x1a2b3c4d;
    for (let i = 0; i < len; i++) {
      seed = (seed * 1664525 + 1013904223) | 0;
      data[i] = ((seed >>> 8) / 8388608) - 1;
    }
    this._noiseSamples = data;
    this.startAmbience();
    this._bakeAllBuffers();
  }

  startAmbience() {
    if (!this.ctx || this.ambientStarted) return;
    this.ambientStarted = true;
    const t = this.ctx.currentTime;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime((this.muted || this.bgDucked) ? 0.0001 : Math.max(0.0001, this.masterVol), t);
    this.masterGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(Math.max(0.0001, this.sfxVol), t);
    this.sfxGain.connect(this.masterGain);

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(Math.max(0.0001, 0.24 * this.musicVol), t);
    this.ambientGain.connect(this.masterGain);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(!this.musicEnabled ? 0.0001 : Math.max(0.0001, 0.28 * this.musicVol), t);
    this.musicGain.connect(this.masterGain);

    // Pre-allocated static sub-buses for BGM velocity tiers (zero per-note GainNode allocations!)
    this.musicGainSoft = this.ctx.createGain();
    this.musicGainSoft.gain.setValueAtTime(0.72, t);
    this.musicGainSoft.connect(this.musicGain);

    this.musicGainLoud = this.ctx.createGain();
    this.musicGainLoud.gain.setValueAtTime(1.26, t);
    this.musicGainLoud.connect(this.musicGain);

    // Helper: make a seamless loopable procedural noise buffer (circular crossfade at seam, 0 clicks)
    const makeSeamlessLoop = (sec, genFn) => {
      const n = Math.floor(this.ctx.sampleRate * sec);
      const fade = Math.min(2048, n >> 4);
      const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const ch = buf.getChannelData(0);
      genFn(ch, n, this.ctx.sampleRate);
      for (let i = 0; i < fade; i++) {
        const a = i / fade;
        ch[i] = ch[i] * a + ch[n - fade + i] * (1 - a);
      }
      return buf;
    };

    // Stem 1: Cold Cathedral Wind (persistent loop + LFO)
    const windBuf = makeSeamlessLoop(2.2, (wd, n) => {
      let lastOut = 0;
      for (let i = 0; i < n; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.03 * white) / 1.03;
        wd[i] = lastOut * 2.8;
      }
    });
    const windSrc = this.ctx.createBufferSource();
    windSrc.buffer = windBuf;
    windSrc.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.setValueAtTime(235, t);
    this.windFilter.Q.value = 1.6;

    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.11, t);
    lfoGain.gain.setValueAtTime(68, t);
    lfo.connect(lfoGain);
    lfoGain.connect(this.windFilter.frequency);
    lfo.start(t);

    const windMix = this.ctx.createGain();
    windMix.gain.setValueAtTime(0.24, t);
    windSrc.connect(this.windFilter);
    this.windFilter.connect(windMix);
    windMix.connect(this.ambientGain);
    windSrc.start(t);

    // Stem 2: Ink Rain Patter (Corridor biome)
    const rainBuf = makeSeamlessLoop(2.6, (rd, n) => {
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const w = Math.random() * 2 - 1;
        lp = lp * 0.72 + w * 0.28;
        const drop = (Math.random() < 0.0018) ? (Math.random() * 1.4 - 0.7) : 0;
        rd[i] = (w - lp) * 0.55 + drop * 0.7;
      }
    });
    const rainSrc = this.ctx.createBufferSource();
    rainSrc.buffer = rainBuf;
    rainSrc.loop = true;
    const rainBp = this.ctx.createBiquadFilter();
    rainBp.type = 'bandpass';
    rainBp.frequency.setValueAtTime(1450, t);
    rainBp.Q.value = 0.75;
    const rainMix = this.ctx.createGain();
    rainMix.gain.setValueAtTime(0.0001, t);
    rainSrc.connect(rainBp);
    rainBp.connect(rainMix);
    rainMix.connect(this.ambientGain);
    rainSrc.start(t);

    // Stem 3: Subterranean Abyssal River & Cavern Rush (Bell Well & Crypt biomes)
    const wellBuf = makeSeamlessLoop(2.8, (wd, n, sr) => {
      let b0 = 0, b1 = 0;
      for (let i = 0; i < n; i++) {
        const w = Math.random() * 2 - 1;
        b0 = b0 * 0.94 + w * 0.06;
        b1 = b1 * 0.82 + w * 0.18;
        const swell = 0.72 + 0.28 * Math.sin((i / n) * Math.PI * 4);
        wd[i] = (b0 * 2.4 + b1 * 0.65) * swell;
      }
    });
    const wellSrc = this.ctx.createBufferSource();
    wellSrc.buffer = wellBuf;
    wellSrc.loop = true;
    const wellBp = this.ctx.createBiquadFilter();
    wellBp.type = 'bandpass';
    wellBp.frequency.setValueAtTime(340, t);
    wellBp.Q.value = 1.1;
    const wellMix = this.ctx.createGain();
    wellMix.gain.setValueAtTime(0.0001, t);
    wellSrc.connect(wellBp);
    wellBp.connect(wellMix);
    wellMix.connect(this.ambientGain);
    wellSrc.start(t);

    // Stem 4: Molten Furnace Roar & Ember Crackle (Foundry & Ascent biomes)
    const foundryBuf = makeSeamlessLoop(2.6, (fd, n) => {
      let rumble = 0;
      let crack = 0;
      for (let i = 0; i < n; i++) {
        const w = Math.random() * 2 - 1;
        rumble = rumble * 0.965 + w * 0.035;
        if (Math.random() < 0.0012) crack = (Math.random() * 2 - 1) * 0.95;
        else crack *= 0.86;
        const throb = 0.8 + 0.2 * Math.sin((i / n) * Math.PI * 2);
        fd[i] = rumble * 3.4 * throb + crack * 0.45;
      }
    });
    const foundrySrc = this.ctx.createBufferSource();
    foundrySrc.buffer = foundryBuf;
    foundrySrc.loop = true;
    const foundryLp = this.ctx.createBiquadFilter();
    foundryLp.type = 'lowpass';
    foundryLp.frequency.setValueAtTime(420, t);
    const foundryMix = this.ctx.createGain();
    foundryMix.gain.setValueAtTime(0.0001, t);
    foundrySrc.connect(foundryLp);
    foundryLp.connect(foundryMix);
    foundryMix.connect(this.ambientGain);
    foundrySrc.start(t);

    // Stem 5: Subterranean Dark Cathedral / Crypt Resonant Drone (D2 + A2 + soft F3)
    this.droneFilter = this.ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.setValueAtTime(155, t);
    const droneMix = this.ctx.createGain();
    droneMix.gain.setValueAtTime(0.08, t);
    this.droneFilter.connect(droneMix);
    droneMix.connect(this.ambientGain);

    const droneFreqs = [73.42, 110.35, 174.61];
    for (let i = 0; i < droneFreqs.length; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = i === 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(droneFreqs[i], t);
      if (i === 2) {
        const subG = this.ctx.createGain();
        subG.gain.setValueAtTime(0.35, t);
        osc.connect(subG);
        subG.connect(this.droneFilter);
      } else {
        osc.connect(this.droneFilter);
      }
      osc.start(t);
    }

    this.biomeGains = { wind: windMix, rain: rainMix, well: wellMix, foundry: foundryMix, drone: droneMix };
    this._appliedBiomeKey = '';
  }

  _applyMixGains(tc = 0.06) {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const mVal = (this.muted || this.bgDucked) ? 0.0001 : Math.max(0.0001, this.masterVol);
    this.masterGain.gain.cancelScheduledValues(t);
    this.masterGain.gain.setTargetAtTime(mVal, t, tc);
    if (this.sfxGain) {
      this.sfxGain.gain.cancelScheduledValues(t);
      this.sfxGain.gain.setTargetAtTime(Math.max(0.0001, this.sfxVol), t, tc);
    }
    if (this.ambientGain) {
      this.ambientGain.gain.cancelScheduledValues(t);
      this.ambientGain.gain.setTargetAtTime(Math.max(0.0001, 0.24 * this.musicVol), t, tc);
    }
    if (this.musicGain) {
      this.musicGain.gain.cancelScheduledValues(t);
      this.musicGain.gain.setTargetAtTime(!this.musicEnabled ? 0.0001 : Math.max(0.0001, 0.28 * this.musicVol), t, tc);
    }
  }

  setVolumes(masterVol, musicVol, sfxVol) {
    if (typeof masterVol === 'number') this.masterVol = Math.max(0, Math.min(1, masterVol));
    if (typeof musicVol === 'number') this.musicVol = Math.max(0, Math.min(1, musicVol));
    if (typeof sfxVol === 'number') this.sfxVol = Math.max(0, Math.min(1, sfxVol));
    this._applyMixGains(0.04);
  }

  setMuted(flag) {
    this.muted = flag;
    this._applyMixGains(0.06);
    if (!flag) this.init();
  }

  setMusicEnabled(flag) {
    this.musicEnabled = !!flag;
    this._applyMixGains(0.1);
  }

  _bindStateRecovery() {
    if (!this.ctx) return;
    try {
      this.ctx.onstatechange = () => {
        if (!this.ctx) return;
        if (this.ctx.state === 'running') {
          this._needsGestureResume = false;
          if (!this.bgDucked && !this.muted) this._applyMixGains(0.08);
        } else if (!this.bgDucked && !this.muted && (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted')) {
          this._needsGestureResume = true;
        }
      };
    } catch {}
  }

  _unlockSilentPulse() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    try {
      const b = this.ctx.createBuffer(1, 1, this.ctx.sampleRate || 22050);
      const s = this.ctx.createBufferSource();
      s.buffer = b;
      s.connect(this.ctx.destination);
      s.start(0);
    } catch {}
  }

  needsRecovery() {
    if (!this.ctx || this.muted || this.bgDucked) return false;
    return !!(this._needsGestureResume || this.ctx.state === 'suspended' || this.ctx.state === 'interrupted');
  }

  keepAliveResume(fromUserGesture = false) {
    if (!this.ctx || this.muted) return;
    this.bgDucked = false;
    this.musicAccum = 0;
    const st = this.ctx.state;
    if (st === 'suspended' || st === 'interrupted') {
      try {
        const p = this.ctx.resume();
        if (p && typeof p.then === 'function') {
          p.then(() => {
            this._needsGestureResume = false;
            if (fromUserGesture) this._unlockSilentPulse();
            this._applyMixGains(0.08);
          }).catch(() => {
            this._needsGestureResume = true;
          });
        }
      } catch {
        this._needsGestureResume = true;
      }
    } else if (st === 'running') {
      this._needsGestureResume = false;
      if (fromUserGesture) this._unlockSilentPulse();
      this._applyMixGains(0.08);
    }
  }

  setBackgroundDuck(hidden) {
    this.bgDucked = !!hidden;
    this._applyMixGains(0.08);
    if (this.ctx) {
      if (this.bgDucked) {
        this.musicAccum = 0;
        try { if (this.ctx.state === 'running') this.ctx.suspend().catch(() => {}); } catch {}
      } else if (!this.muted) {
        this._needsGestureResume = true;
        this.keepAliveResume(false);
      }
    }
  }

  emergencySuspend() {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      if (this.masterGain) {
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setTargetAtTime(0.0001, now, 0.03);
      }
      if (this.ctx.state === 'running') this.ctx.suspend().catch(() => {});
    } catch {}
  }

  resetToExplore(themeKey = 'sanctuary') {
    const key = BIOME_AMBIENCE_PROFILES[themeKey] ? themeKey : 'sanctuary';
    this.activeBiome = key;
    this._appliedBiomeKey = '';
    this.musicLayer = 'explore';
    this.musicStep = 0;
    this.musicAccum = 0;
    this.heartbeatTimer = 0.6;
    if (!this.ctx || !this.biomeGains) return;
    const p = BIOME_AMBIENCE_PROFILES[key];
    const now = this.ctx.currentTime;
    const fastRamp = (node, target) => {
      if (!node) return;
      node.gain.cancelScheduledValues(now);
      node.gain.setTargetAtTime(Math.max(0.0001, target), now, 0.14);
    };
    fastRamp(this.biomeGains.wind, p.wind);
    fastRamp(this.biomeGains.rain, p.rain);
    fastRamp(this.biomeGains.well, p.well);
    fastRamp(this.biomeGains.foundry, p.foundry);
    fastRamp(this.biomeGains.drone, p.drone);
    if (this.windFilter) {
      this._windFreqTarget = p.windHz;
      this.windFilter.frequency.cancelScheduledValues(now);
      this.windFilter.frequency.setTargetAtTime(p.windHz, now, 0.16);
    }
    if (this.droneFilter) {
      this._droneFreqTarget = p.droneHz;
      this.droneFilter.frequency.cancelScheduledValues(now);
      this.droneFilter.frequency.setTargetAtTime(p.droneHz, now, 0.16);
    }
    this._appliedBiomeKey = `${key}|0`;
  }

  get sfxOut() {
    return this.sfxGain || (this.ctx && this.ctx.destination);
  }

  // ==================== OFFLINE PRE-BAKING PIPELINE ====================
  _makeOfflineNoise(octx) {
    const srcLen = this._noiseSamples ? this._noiseSamples.length : Math.floor(octx.sampleRate * 0.55);
    const nb = octx.createBuffer(1, srcLen, octx.sampleRate);
    const ch = nb.getChannelData(0);
    if (this._noiseSamples && this._noiseSamples.length === srcLen) {
      ch.set(this._noiseSamples);
    } else {
      for (let i = 0; i < srcLen; i++) ch[i] = Math.random() * 2 - 1;
    }
    return nb;
  }

  async _bakeOne(key, durSec, buildFn) {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC || !this.ctx) return;
    try {
      const sr = this.ctx.sampleRate || 44100;
      const frames = Math.max(256, Math.ceil(durSec * sr));
      const octx = new OAC(1, frames, sr);
      buildFn(octx, octx.destination);
      const rendered = await octx.startRendering();
      this._baked[key] = rendered;
    } catch {
      // Silently ignore if offline context unavailable
    }
  }

  async _bakeAllBuffers() {
    if (this._bakeStarted || !this.ctx) return;
    this._bakeStarted = true;
    const tasks = buildSfxBakeTasks(c => this._makeOfflineNoise(c));

    // Bake in small async batches so main thread stays silky during startup
    const BATCH = 6;
    for (let i = 0; i < tasks.length; i += BATCH) {
      const slice = tasks.slice(i, i + BATCH);
      await Promise.all(slice.map(t => this._bakeOne(t[0], t[1], t[2])));
    }
    this._bakeReady = true;
  }

  // Single-node fire-and-forget playback: 1 AudioBufferSourceNode, 0 onended listeners, 0 extra C++ nodes!
  _playBaked(key, rate = 1.0, dest = null) {
    if (!this.ctx || this.muted) return false;
    const buf = this._baked[key];
    if (!buf) return false;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    if (rate !== 1.0) src.playbackRate.value = rate;
    src.connect(dest || this.sfxOut);
    src.start();
    return true;
  }

  playDistantBell() {
    this._playBaked('distant_bell', 1.0, this.sfxOut);
  }

  playHeartbeat() {
    this._playBaked('heartbeat', 1.0, this.sfxOut);
  }

  _playMusicPluck(freq, loud = false) {
    if (!this.ctx || !this.musicGain) return;
    this._playBaked('bgm_pluck', freq / 293.66, loud ? this.musicGainLoud : this.musicGain);
  }

  _playMusicChime(freq, soft = false, loud = false) {
    if (!this.ctx || !this.musicGain) return;
    const bus = soft ? this.musicGainSoft : (loud ? this.musicGainLoud : this.musicGain);
    this._playBaked('bgm_chime', freq / 293.66, bus);
  }

  _playMusicDrum(accent = false, highTap = false) {
    if (!this.ctx || !this.musicGain) return;
    const key = highTap ? (accent ? 'bgm_tap_acc' : 'bgm_tap_soft') : (accent ? 'bgm_drum_acc' : 'bgm_drum_soft');
    this._playBaked(key, 1.0, this.musicGain);
  }

  _playMusicBass(freq, loud = false) {
    if (!this.ctx || !this.musicGain) return;
    this._playBaked('bgm_bass', freq / 146.83, loud ? this.musicGainLoud : this.musicGain);
  }

  getActiveBiomeAmbienceLabel() {
    const key = BIOME_AMBIENCE_PROFILES[this.activeBiome] ? this.activeBiome : 'sanctuary';
    const profObj = BIOME_AMBIENCE_PROFILES[key];
    return locBiomeAmbience(key, profObj.label);
  }

  _crossfadeBiomeStems(themeKey, bossAwake, bossPhase2, bossPhase3) {
    if (!this.ctx || !this.biomeGains) return;
    const key = BIOME_AMBIENCE_PROFILES[themeKey] ? themeKey : 'sanctuary';
    this.activeBiome = key;
    const appliedKey = `${key}|${bossPhase3 ? 3 : bossPhase2 ? 2 : bossAwake ? 1 : 0}`;
    if (appliedKey === this._appliedBiomeKey) return;
    this._appliedBiomeKey = appliedKey;

    const p = BIOME_AMBIENCE_PROFILES[key];
    const now = this.ctx.currentTime;
    const duck = bossPhase2 ? 0.62 : bossAwake ? 0.78 : 1.0;
    const tc = 0.72;
    const rampGain = (node, target) => {
      if (!node) return;
      node.gain.cancelScheduledValues(now);
      node.gain.setTargetAtTime(Math.max(0.0001, target), now, tc);
    };
    rampGain(this.biomeGains.wind, p.wind * duck);
    rampGain(this.biomeGains.rain, p.rain * duck);
    rampGain(this.biomeGains.well, p.well * duck);
    rampGain(this.biomeGains.foundry, p.foundry * (bossAwake && key === 'foundry' ? 1.05 : duck));
    rampGain(this.biomeGains.drone, p.drone * (bossPhase2 ? 1.25 : 1.0));

    const targetWindHz = bossPhase3 ? 135 : bossPhase2 ? 150 : bossAwake ? 185 : p.windHz;
    if (this.windFilter && targetWindHz !== this._windFreqTarget) {
      this._windFreqTarget = targetWindHz;
      this.windFilter.frequency.cancelScheduledValues(now);
      this.windFilter.frequency.setTargetAtTime(targetWindHz, now, 0.55);
    }
    const targetDroneHz = bossPhase3 ? 260 : bossPhase2 ? 220 : p.droneHz;
    if (this.droneFilter && targetDroneHz !== this._droneFreqTarget) {
      this._droneFreqTarget = targetDroneHz;
      this.droneFilter.frequency.cancelScheduledValues(now);
      this.droneFilter.frequency.setTargetAtTime(targetDroneHz, now, 0.65);
    }
  }

  playBiomeAccent(themeKey) {
    const p = BIOME_AMBIENCE_PROFILES[themeKey] || BIOME_AMBIENCE_PROFILES.sanctuary;
    if (p.accent === 'drip') {
      this._playBaked('amb_drip', 0.84 + Math.random() * 0.36, this.ambientGain || this.sfxOut);
    } else if (p.accent === 'ember') {
      this._playBaked('amb_ember_crack', 0.85 + Math.random() * 0.35, this.ambientGain || this.sfxOut);
    } else if (p.accent === 'choir') {
      this._playBaked('amb_chapel_choir', 0.96 + Math.random() * 0.08, this.ambientGain || this.sfxOut);
    } else {
      this.playDistantBell();
    }
  }

  updateAmbience(dt, bossAwake, bossPhase = 0, inCombat = false, parryStreak = 0, biomeTheme = 'sanctuary') {
    if (!this.ctx || this.muted || !this.ambientStarted) return;
    const pNum = typeof bossPhase === 'number' ? bossPhase : (bossPhase ? 2 : (bossAwake ? 1 : 0));
    const bossPhase2 = pNum >= 2;
    const bossPhase3 = pNum >= 3;
    this._crossfadeBiomeStems(biomeTheme, bossAwake, bossPhase2, bossPhase3);

    if (bossPhase2) {
      this.heartbeatTimer -= dt;
      if (this.heartbeatTimer <= 0) {
        this.heartbeatTimer = bossPhase3 ? 0.72 : 0.88;
        this.playHeartbeat();
      }
    } else {
      this.distantBellTimer -= dt;
      if (this.distantBellTimer <= 0) {
        const p = BIOME_AMBIENCE_PROFILES[this.activeBiome] || BIOME_AMBIENCE_PROFILES.sanctuary;
        this.distantBellTimer = (p.accent === 'drip' || p.accent === 'ember')
          ? (4.8 + Math.random() * 5.2)
          : (12 + Math.random() * 9);
        this.playBiomeAccent(this.activeBiome);
      }
    }

    if (!this.musicEnabled || !this.musicGain) return;
    const layer = bossPhase3 ? 'boss3' : bossPhase2 ? 'boss2' : bossAwake ? 'boss1' : inCombat ? 'combat' : 'explore';
    this.musicLayer = layer;
    const isBoss4Climax = pNum >= 4;
    const bpm = isBoss4Climax ? 148 : layer === 'boss3' ? 142 : layer === 'boss2' ? 132 : layer === 'boss1' ? 114 : layer === 'combat' ? 98 : 72;
    const stepDur = 60 / bpm / 4;
    this.musicAccum += dt;
    if (this.musicAccum < stepDur) return;
    this.musicAccum -= stepDur;
    const s = this.musicStep % 32;
    const bar = (s >= 16) ? 1 : 0;
    const pos = s & 15;
    const sc = PHRYGIAN_SCALE;

    if (layer === 'explore') {
      const ec = EXPLORE_CHIME[s];
      const ep = EXPLORE_PLUCK[s];
      const bio = this.activeBiome;
      if (bio === 'foundry' || bio === 'ascent') {
        if (pos === 0 || pos === 8) this._playMusicBass(sc[bar === 0 ? 0 : 1], false);
        if (ec !== undefined) this._playMusicChime(sc[ec], true, false);
        if (ep !== undefined && (s % 4 === 0)) this._playMusicPluck(sc[ep], false);
      } else if (bio === 'cistern') {
        if (pos === 0) this._playMusicBass(sc[bar === 0 ? 0 : 3] * 0.5, false);
        if (ec !== undefined) this._playMusicChime(sc[Math.max(0, ec - 1)] * 0.5, true, false);
        if (s === 12 || s === 28) this._playMusicPluck(sc[bar === 0 ? 1 : 4], false);
      } else if (bio === 'bell_well' || bio === 'crypt') {
        if (ec !== undefined) this._playMusicChime(sc[Math.min(sc.length - 1, ec + 1)], true, false);
        if (s === 8 || s === 24) this._playMusicPluck(sc[bar === 0 ? 4 : 1], false);
      } else if (bio === 'heart') {
        if (ec !== undefined) {
          this._playMusicChime(sc[ec], true, false);
          if (pos === 0 || pos === 12) this._playMusicChime(sc[Math.min(sc.length - 1, ec + 4)], true, false);
        }
        if (ep !== undefined) this._playMusicPluck(sc[ep], false);
      } else {
        if (ec !== undefined) this._playMusicChime(sc[ec], false, false);
        if (ep !== undefined) this._playMusicPluck(sc[ep], false);
      }
    } else if (layer === 'combat') {
      if (pos === 0 || pos === 6 || pos === 10) this._playMusicDrum(pos === 0, false);
      if (pos === 4 || pos === 12 || pos === 14) this._playMusicDrum(false, true);
      if (COMBAT_BASS[pos] >= 0) this._playMusicBass(sc[COMBAT_BASS[pos]], false);
      if (COMBAT_PLUCK[pos] >= 0) this._playMusicPluck(sc[COMBAT_PLUCK[pos]], false);
      if (pos === 0) this._playMusicChime(sc[bar === 0 ? 7 : 8], false, false);
    } else {
      const isP2 = layer === 'boss2' || layer === 'boss3';
      const isP3 = layer === 'boss3';
      if (pos === 0 || pos === 3 || pos === 6 || pos === 10 || (isP2 && pos === 14)) {
        this._playMusicDrum(pos === 0 || pos === 10, false);
      }
      if ((pos & 1) === 1 && (isP2 || pos === 5 || pos === 13)) {
        this._playMusicDrum(pos === 13, true);
      }
      const bossBass = bar === 0 ? BOSS_BASS_0 : BOSS_BASS_1;
      if (bossBass[pos] >= 0) this._playMusicBass(sc[bossBass[pos]], isP2);
      const leadSeq = bar === 0 ? BOSS_LEAD_0 : BOSS_LEAD_1;
      if (leadSeq[pos] >= 0) this._playMusicPluck(sc[leadSeq[pos]], isP2);
      if (pos === 0 || (isP2 && pos === 8)) {
        const chimeIdx = (bar === 0 ? 7 : 8) + (isP2 && pos === 8 ? 4 : 0);
        this._playMusicChime(sc[chimeIdx < sc.length ? chimeIdx : sc.length - 1], false, isP2);
      }
      if (isP3 && (pos === 4 || pos === 12)) {
        this._playMusicChime(sc[bar === 0 ? 11 : 13], false, false);
      }
      if (parryStreak >= 3 && (pos & 3) === 2) {
        this._playMusicChime(sc[11 + (pos % 3)], true, false);
      }
    }
    this.musicStep = (this.musicStep + 1) & 31;
  }

  _canPlaySfx(key, minGap = 0.028) {
    if (!this.ctx || this.muted) return false;
    const t = this.ctx.currentTime;
    const prev = this._lastSfxTime[key] || -1;
    if (t - prev < minGap) return false;
    this._lastSfxTime[key] = t;
    return true;
  }

  playSlash(pitch = 1.0, heavy = false) {
    if (!this._canPlaySfx('slash', 0.03)) return;
    this._playBaked(heavy ? 'slash_heavy' : 'slash_light', pitch);
  }

  playHit(heavy = false, comboStep = 1) {
    if (!this._canPlaySfx('hit', 0.024)) return;
    const stepPitch = 1 + Math.max(0, comboStep - 1) * 0.08;
    this._playBaked(heavy ? 'hit_heavy' : 'hit_light', stepPitch);
  }

  playParry(perfect = true, streak = 1) {
    if (!this.ctx || this.muted) return;
    if (perfect) {
      const rise = 1 + Math.min(4, Math.max(0, streak - 1)) * 0.068;
      this._playBaked('parry_perfect', rise);
    } else {
      this._playBaked('parry_block', 1.0);
    }
  }

  playSpikeClang(isPogo = false) {
    if (!this.ctx || this.muted || !this._canPlaySfx('spike_clang', 0.045)) return;
    const rate = isPogo ? (1.30 + Math.random() * 0.10) : (1.12 + Math.random() * 0.10);
    this._playBaked('parry_block', rate);
  }

  playGlintCue(delayed = false) {
    this._playBaked(delayed ? 'glint_delayed' : 'glint_fast', 1.0);
  }

  playFinisherDeflect() {
    this._playBaked('finisher_deflect', 1.0);
  }

  playDangerAlert() {
    this._playBaked('danger_alert', 1.0);
  }

  playBellToll() {
    this._playBaked('bell_toll', 1.0);
  }

  playPogoLantern() {
    this._playBaked('pogo_lantern', 1.0);
  }

  playIaiReady() {
    this._playBaked('iai_ready', 1.0);
  }

  playIaiSlash() {
    this._playBaked('iai_slash', 1.0);
  }

  playCounterSlash() {
    this._playBaked('counter_slash', 1.0);
  }

  playDetonate() {
    this._playBaked('detonate', 1.0);
  }

  playExecution() {
    if (!this.ctx || this.muted) return;
    this._playBaked('detonate', 1.0);
    this._playBaked('bell_toll', 1.0);
  }

  playHeal() {
    this._playBaked('heal', 1.0);
  }

  playSoulCast() {
    this._playBaked('soul_cast', 1.0);
  }

  playGrappleLaunch() {
    if (!this._canPlaySfx('grapple', 0.04)) return;
    this._playBaked('grapple_launch', 1.0);
  }

  playGrappleLatch() {
    this._playBaked('grapple_latch', 1.0);
  }

  playWraithShot() {
    this._playBaked('wraith_shot', 1.0);
  }

  playTideRoar() {
    this._playBaked('tide_roar', 1.0);
  }

  playFootstep() {
    this._playBaked('footstep', 0.88 + Math.random() * 0.24);
  }

  playLand() {
    this._playBaked('land', 1.0);
  }

  playWingJump() {
    this._playBaked('wing_jump', 1.0);
  }

  playShieldBreak() {
    if (!this.ctx || this.muted) return;
    this._playBaked('parry_perfect', 1.068);
    this._playBaked('shield_break', 1.0);
  }

  playGrayShatter() {
    this._playBaked('gray_shatter', 1.0);
  }

  playBellQuake() {
    this._playBaked('bell_quake', 1.0);
  }

  playResonanceBell(baseFreq = 440, harmony = false) {
    this._playBaked(harmony ? 'res_bell_harmony' : 'res_bell_single', baseFreq / 440);
  }

  playShadeDash() {
    this._playBaked('shade_dash', 1.0);
  }

  playShadeBurst() {
    this._playBaked('shade_burst', 1.0);
  }

  playEchoReclaim() {
    this._playBaked('echo_reclaim', 1.0);
  }

  playShadowBlink() {
    this._playBaked('shadow_blink', 1.0);
  }

  playEndingChord(isTrueEnding = false, step = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const chord = (isTrueEnding ? DAWN_CHORDS : VOW_CHORDS)[step % 4];
    for (let i = 0; i < chord.length; i++) {
      const f = chord[i];
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f, t + i * 0.09);
      g.gain.setValueAtTime(0.0005, t + i * 0.09);
      g.gain.linearRampToValueAtTime((isTrueEnding ? 0.14 : 0.12) / (i * 0.35 + 1), t + i * 0.09 + 0.18);
      g.gain.exponentialRampToValueAtTime(0.0006, t + i * 0.09 + 3.2);
      osc.connect(g); g.connect(this.sfxOut);
      osc.start(t + i * 0.09); osc.stop(t + i * 0.09 + 3.3);
    }
  }

  playShieldBash(heavy = false) {
    if (!this._canPlaySfx('shield_bash', 0.04)) return;
    this._playBaked('shield_bash', heavy ? 0.88 : 1.05);
  }

  playBellChimeCast(step = 1) {
    if (!this._canPlaySfx('bell_chime', 0.03)) return;
    const rate = step === 3 ? 1.18 : step === 2 ? 1.06 : 0.95;
    this._playBaked('bell_chime_cast', rate);
  }

  playWeaponSwap(weaponId = 'blade') {
    if (weaponId === 'bell') {
      this._playBaked('bell_chime_cast', 1.12);
    } else if (weaponId === 'hammer' || weaponId === 'shield') {
      this._playBaked('shield_bash', 0.84);
    } else {
      this._playBaked('weapon_swap', 1.0);
    }
  }

  playCrumble() {
    this._playBaked('crumble', 1.0);
  }

  playWallSlam() { if (this._canPlaySfx('wall_slam', 0.04)) this._playBaked('wall_slam', 0.94 + Math.random() * 0.12); }
  playAirSlam() { this._playBaked('air_slam', 1.0); }

  playFalconCry() {
    if (!this._canPlaySfx('falcon_cry', 0.08)) return;
    this._playBaked('falcon_cry', 0.94 + Math.random() * 0.12);
  }

  playWindBlade() {
    if (!this._canPlaySfx('wind_blade', 0.05)) return;
    this._playBaked('wind_blade', 0.95 + Math.random() * 0.12);
  }

  playSporeBounce() {
    if (!this._canPlaySfx('spore_bounce', 0.06)) return;
    this._playBaked('spore_bounce', 0.96 + Math.random() * 0.08);
  }

  playSporeBurst() {
    if (!this._canPlaySfx('spore_burst', 0.08)) return;
    this._playBaked('spore_burst', 0.92 + Math.random() * 0.16);
  }

  playSporePurify() {
    if (!this._canPlaySfx('spore_purify', 0.08)) return;
    this._playBaked('spore_purify', 1.0);
  }

  playBarkCrack() {
    if (!this._canPlaySfx('bark_crack', 0.06)) return;
    this._playBaked('bark_crack', 1.0);
  }

  playFrostBuild() {
    if (!this._canPlaySfx('frost_build', 0.08)) return;
    this._playBaked('frost_build', 0.95 + Math.random() * 0.12);
  }

  playFrostShatter() {
    if (!this._canPlaySfx('frost_shatter', 0.06)) return;
    this._playBaked('frost_shatter', 1.0);
  }

  playUltimateBlade() {
    this._playBaked('ult_blade', 1.0);
  }

  playUltimateHammer() {
    this._playBaked('ult_hammer', 1.0);
  }

  playUltimateBell() {
    this._playBaked('ult_bell', 1.0);
  }

  playForgeTrait() {
    this._playBaked('forge_trait', 1.0);
  }

  playRelicRefine() {
    this._playBaked('relic_refine', 1.0);
  }

  playBoss4Swap() {
    this._playBaked('boss4_swap', 1.0);
  }

  playBoss4Iai() {
    this._playBaked('boss4_iai', 1.0);
  }

  playBoss4Counter() {
    this._playBaked('boss4_counter', 1.0);
  }
}

export const audio = new SoundEngine();

// Instrument all SoundEngine playback & ambience methods with re-entrancy-safe CPU timing
let _audioProfDepth = 0;
for (const key of Object.getOwnPropertyNames(SoundEngine.prototype)) {
  if (key === 'updateAmbience' || key.startsWith('play')) {
    const orig = SoundEngine.prototype[key];
    if (typeof orig !== 'function') continue;
    const isSfx = key.startsWith('play');
    audio[key] = function (...args) {
      if (_audioProfDepth > 0) return orig.apply(this, args);
      const t0 = performance.now();
      _audioProfDepth++;
      try {
        return orig.apply(this, args);
      } finally {
        _audioProfDepth--;
        prof.addAudioTime(performance.now() - t0, isSfx && !this.muted);
      }
    };
  }
}
