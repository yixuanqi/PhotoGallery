// Procedural Web Audio synthesizer (zero external assets)

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.noiseBuf = null;
    this.ambientStarted = false;
    this.masterGain = null;
    this.sfxGain = null;
    this.ambientGain = null;
    this.musicGain = null;
    this.musicEnabled = true;
    this.masterVol = 0.85;
    this.musicVol = 0.75;
    this.sfxVol = 0.90;
    this.bgDucked = false;
    this.windFilter = null;
    this.distantBellTimer = 11;
    this.heartbeatTimer = 0.6;
    // D-Phrygian Dynamic Interactive Music Sequencer (0KB procedural score)
    this.musicStep = 0;
    this.musicAccum = 0;
    this.musicLayer = 'explore'; // explore | combat | boss1 | boss2
    this.phrygianScale = [146.83, 155.56, 174.61, 196.00, 220.00, 233.08, 261.63, 293.66, 311.13, 349.23, 392.00, 440.00, 466.16, 523.25];
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.startAmbience();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const len = this.ctx.sampleRate * 0.5;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.startAmbience();
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

    // 2-second seamless filtered wind noise loop
    const windLen = this.ctx.sampleRate * 2;
    const windBuf = this.ctx.createBuffer(1, windLen, this.ctx.sampleRate);
    const wd = windBuf.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < windLen; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.03 * white) / 1.03;
      wd[i] = lastOut * 2.8;
    }
    const windSrc = this.ctx.createBufferSource();
    windSrc.buffer = windBuf;
    windSrc.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.setValueAtTime(220, t);
    this.windFilter.Q.value = 1.6;

    // Slow cathedral draft LFO
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.11, t);
    lfoGain.gain.setValueAtTime(75, t);
    lfo.connect(lfoGain);
    lfoGain.connect(this.windFilter.frequency);
    lfo.start(t);

    const windMix = this.ctx.createGain();
    windMix.gain.setValueAtTime(0.22, t);
    windSrc.connect(this.windFilter);
    this.windFilter.connect(windMix);
    windMix.connect(this.ambientGain);
    windSrc.start(t);

    // Subterranean dark cathedral drone (D2 + detuned A2)
    const droneLp = this.ctx.createBiquadFilter();
    droneLp.type = 'lowpass';
    droneLp.frequency.setValueAtTime(165, t);
    const droneMix = this.ctx.createGain();
    droneMix.gain.setValueAtTime(0.08, t);
    droneLp.connect(droneMix);
    droneMix.connect(this.ambientGain);

    [73.42, 110.35].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      osc.connect(droneLp);
      osc.start(t);
    });
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

  setBackgroundDuck(hidden) {
    this.bgDucked = !!hidden;
    this._applyMixGains(0.1);
  }

  get sfxOut() {
    return this.sfxGain || (this.ctx && this.ctx.destination);
  }

  playDistantBell() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    [146.8, 293.6, 440.0].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.992, t + 2.8);
      g.gain.setValueAtTime(0.032 / (i + 1), t);
      g.gain.exponentialRampToValueAtTime(0.0005, t + 2.9);
      osc.connect(g); g.connect(this.sfxOut);
      osc.start(t); osc.stop(t + 3.0);
    });
  }

  playHeartbeat() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    [0, 0.22].forEach((offset, idx) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(idx === 0 ? 58 : 48, t + offset);
      osc.frequency.exponentialRampToValueAtTime(28, t + offset + 0.14);
      g.gain.setValueAtTime(idx === 0 ? 0.18 : 0.12, t + offset);
      g.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.16);
      osc.connect(g); g.connect(this.sfxOut);
      osc.start(t + offset); osc.stop(t + offset + 0.18);
    });
  }

  _playMusicPluck(freq, vol = 0.12, dur = 0.72) {
    if (!this.ctx || !this.musicGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const lp = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.min(2800, freq * 5.2), t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(240, freq * 1.15), t + dur);
    g.gain.setValueAtTime(0.0005, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    osc.connect(lp); lp.connect(g); g.connect(this.musicGain);
    osc.start(t); osc.stop(t + dur + 0.04);
  }

  _playMusicChime(freq, vol = 0.10, dur = 1.65) {
    if (!this.ctx || !this.musicGain) return;
    const t = this.ctx.currentTime;
    [1, 2.003, 2.98].forEach((mult, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * mult, t);
      g.gain.setValueAtTime(0.0004, t);
      g.gain.linearRampToValueAtTime(vol / (i * 1.4 + 1), t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0004, t + dur / (i * 0.45 + 1));
      osc.connect(g); g.connect(this.musicGain);
      osc.start(t); osc.stop(t + dur + 0.05);
    });
  }

  _playMusicDrum(accent = false, highTap = false) {
    if (!this.ctx || !this.musicGain) return;
    const t = this.ctx.currentTime;
    if (highTap) {
      const n = this.ctx.createBufferSource();
      n.buffer = this.noiseBuf;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1650, t);
      bp.Q.value = 3.2;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(accent ? 0.14 : 0.075, t);
      g.gain.exponentialRampToValueAtTime(0.0006, t + 0.065);
      n.connect(bp); bp.connect(g); g.connect(this.musicGain);
      n.start(t); n.stop(t + 0.08);
      return;
    }
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(accent ? 112 : 84, t);
    osc.frequency.exponentialRampToValueAtTime(34, t + (accent ? 0.22 : 0.15));
    g.gain.setValueAtTime(accent ? 0.34 : 0.20, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + (accent ? 0.24 : 0.16));
    osc.connect(g); g.connect(this.musicGain);
    osc.start(t); osc.stop(t + 0.26);
  }

  _playMusicBass(freq, vol = 0.16, dur = 0.45) {
    if (!this.ctx || !this.musicGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const lp = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq * 0.5, t);
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(280, t);
    g.gain.setValueAtTime(0.0006, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
    osc.connect(lp); lp.connect(g); g.connect(this.musicGain);
    osc.start(t); osc.stop(t + dur + 0.05);
  }

  updateAmbience(dt, bossAwake, bossPhase = 0, inCombat = false, parryStreak = 0) {
    if (!this.ctx || this.muted || !this.ambientStarted) return;
    const pNum = typeof bossPhase === 'number' ? bossPhase : (bossPhase ? 2 : (bossAwake ? 1 : 0));
    const bossPhase2 = pNum >= 2;
    const bossPhase3 = pNum >= 3;
    if (this.windFilter) {
      const targetFreq = bossPhase3 ? 135 : bossPhase2 ? 150 : bossAwake ? 185 : 225;
      this.windFilter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.4);
    }
    if (bossPhase2) {
      this.heartbeatTimer -= dt;
      if (this.heartbeatTimer <= 0) {
        this.heartbeatTimer = bossPhase3 ? 0.72 : 0.88;
        this.playHeartbeat();
      }
    } else {
      this.distantBellTimer -= dt;
      if (this.distantBellTimer <= 0) {
        this.distantBellTimer = 15 + Math.random() * 10;
        this.playDistantBell();
      }
    }

    // Layered D-Phrygian Procedural Score (with Phase 3 Climax Tempo & Counter-Chime)
    if (!this.musicEnabled || !this.musicGain) return;
    const layer = bossPhase3 ? 'boss3' : bossPhase2 ? 'boss2' : bossAwake ? 'boss1' : inCombat ? 'combat' : 'explore';
    this.musicLayer = layer;
    const bpm = layer === 'boss3' ? 142 : layer === 'boss2' ? 132 : layer === 'boss1' ? 114 : layer === 'combat' ? 98 : 72;
    const stepDur = 60 / bpm / 4; // 16th-note pulse
    this.musicAccum += dt;
    if (this.musicAccum < stepDur) return;
    this.musicAccum -= stepDur;
    const s = this.musicStep % 32;
    const bar = Math.floor(s / 16);
    const pos = s % 16;
    const sc = this.phrygianScale;

    if (layer === 'explore') {
      // Sparse ancient bronze chimes & wistful plucked D-Phrygian motif
      const exploreChime = { 0: 7, 6: 11, 10: 8, 16: 7, 22: 12, 26: 10 };
      const explorePluck = { 4: 4, 12: 5, 14: 4, 20: 1, 28: 4, 30: 0 };
      if (exploreChime[s] !== undefined) this._playMusicChime(sc[exploreChime[s]], 0.11, 2.2);
      if (explorePluck[s] !== undefined) this._playMusicPluck(sc[explorePluck[s]], 0.11, 0.9);
    } else if (layer === 'combat') {
      // Tense low frame-drum & rhythmic ostinato
      if (pos === 0 || pos === 6 || pos === 10) this._playMusicDrum(pos === 0, false);
      if (pos === 4 || pos === 12 || pos === 14) this._playMusicDrum(false, true);
      const bassSeq = [0, -1, 0, -1, 1, -1, 0, -1, 4, -1, 1, -1, 0, -1, 5, -1];
      if (bassSeq[pos] >= 0) this._playMusicBass(sc[bassSeq[pos]], 0.15, 0.34);
      const pluckSeq = [7, -1, 8, -1, 7, 11, -1, 8, 10, -1, 8, -1, 7, -1, 5, -1];
      if (pluckSeq[pos] >= 0) this._playMusicPluck(sc[pluckSeq[pos]], 0.12, 0.45);
      if (pos === 0) this._playMusicChime(sc[bar === 0 ? 7 : 8], 0.10, 1.5);
    } else {
      // Boss 1 & Boss 2 driving Phrygian duel
      const isP2 = layer === 'boss2' || layer === 'boss3';
      const isP3 = layer === 'boss3';
      if (pos === 0 || pos === 3 || pos === 6 || pos === 10 || (isP2 && pos === 14)) {
        this._playMusicDrum(pos === 0 || pos === 10, false);
      }
      if (pos % 2 === 1 && (isP2 || pos === 5 || pos === 13)) {
        this._playMusicDrum(pos === 13, true);
      }
      const bossBass = bar === 0
        ? [0, 0, -1, 0, 1, -1, 0, -1, 4, -1, 5, -1, 4, -1, 1, -1]
        : [0, 0, -1, 1, 5, -1, 4, -1, 1, -1, 0, -1, 6, -1, 5, 1];
      if (bossBass[pos] >= 0) this._playMusicBass(sc[bossBass[pos]], isP2 ? 0.21 : 0.17, 0.28);
      const leadSeq = bar === 0
        ? [7, -1, 8, 7, 11, -1, 10, 8, 7, -1, 12, 11, 8, -1, 7, -1]
        : [7, 8, 11, -1, 12, 11, 10, 8, 13, -1, 12, 11, 8, 7, 5, -1];
      if (leadSeq[pos] >= 0) this._playMusicPluck(sc[leadSeq[pos]], isP2 ? 0.16 : 0.13, 0.36);
      if (pos === 0 || (isP2 && pos === 8)) {
        const chimeIdx = (bar === 0 ? 7 : 8) + (isP2 && pos === 8 ? 4 : 0);
        this._playMusicChime(sc[Math.min(sc.length - 1, chimeIdx)], isP2 ? 0.14 : 0.11, 1.35);
      }
      if (isP3 && (pos === 4 || pos === 12)) {
        this._playMusicChime(sc[bar === 0 ? 11 : 13], 0.11, 0.85);
      }
      // Parry streak high harmonic shimmer
      if (parryStreak >= 3 && pos % 4 === 2) {
        this._playMusicChime(sc[11 + (pos % 3)], 0.08, 0.55);
      }
    }
    this.musicStep = (this.musicStep + 1) % 32;
  }

  playSlash(pitch = 1.0, heavy = false) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    // Filtered air-cut swoosh
    const n = this.ctx.createBufferSource();
    n.buffer = this.noiseBuf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime((heavy ? 1050 : 1380) * pitch, t);
    bp.frequency.exponentialRampToValueAtTime((heavy ? 240 : 380) * pitch, t + (heavy ? 0.18 : 0.13));
    bp.Q.value = heavy ? 1.15 : 1.5;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(heavy ? 0.24 : 0.17, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + (heavy ? 0.19 : 0.14));
    n.connect(bp); bp.connect(g); g.connect(this.sfxOut);
    n.start(t); n.stop(t + 0.2);

    // Subtle steel blade-edge whistle overtone
    const osc = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime((heavy ? 760 : 1120) * pitch, t);
    osc.frequency.exponentialRampToValueAtTime((heavy ? 290 : 520) * pitch, t + 0.11);
    og.gain.setValueAtTime(heavy ? 0.055 : 0.032, t);
    og.gain.exponentialRampToValueAtTime(0.0008, t + 0.12);
    osc.connect(og); og.connect(this.sfxOut);
    osc.start(t); osc.stop(t + 0.13);
  }

  playHit(heavy = false, comboStep = 1) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const stepPitch = 1 + Math.max(0, comboStep - 1) * 0.08;

    // 1. Meaty low body thump
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime((heavy ? 195 : 235) * stepPitch, t);
    osc.frequency.exponentialRampToValueAtTime(heavy ? 38 : 52, t + (heavy ? 0.18 : 0.11));
    g.gain.setValueAtTime(heavy ? 0.36 : 0.24, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + (heavy ? 0.19 : 0.12));
    osc.connect(g); g.connect(this.sfxOut);
    osc.start(t); osc.stop(t + 0.21);

    // 2. Crisp steel-bite transient burst
    const n = this.ctx.createBufferSource();
    n.buffer = this.noiseBuf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.setValueAtTime(heavy ? 2600 : 3200, t);
    hp.Q.value = 1.2;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(heavy ? 0.24 : 0.15, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + (heavy ? 0.095 : 0.06));
    n.connect(hp); hp.connect(ng); ng.connect(this.sfxOut);
    n.start(t); n.stop(t + 0.11);

    // 3. Subtle armor-iron overtone ring on heavy / finisher hits
    if (heavy) {
      const ring = this.ctx.createOscillator();
      const rg = this.ctx.createGain();
      ring.type = 'sine';
      ring.frequency.setValueAtTime(1180 * stepPitch, t);
      ring.frequency.exponentialRampToValueAtTime(920 * stepPitch, t + 0.22);
      rg.gain.setValueAtTime(0.075, t);
      rg.gain.exponentialRampToValueAtTime(0.0008, t + 0.24);
      ring.connect(rg); rg.connect(this.sfxOut);
      ring.start(t); ring.stop(t + 0.25);
    }
  }

  playParry(perfect = true, streak = 1) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    if (perfect) {
      const rise = 1 + Math.min(4, Math.max(0, streak - 1)) * 0.068;

      // 1. Razor-crisp steel transient click
      const n = this.ctx.createBufferSource();
      n.buffer = this.noiseBuf;
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(3400, t);
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.28, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
      n.connect(hp); hp.connect(ng); ng.connect(this.sfxOut);
      n.start(t); n.stop(t + 0.065);

      // 2. Metallic Sekiro-style CLANG harmonic stack with streak pitch escalation
      [1046, 1568, 2489, 3620, 4698].forEach((f, i) => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = i % 2 === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(f * rise, t);
        osc.frequency.exponentialRampToValueAtTime(f * rise * 0.965, t + 0.42);
        g.gain.setValueAtTime(0.24 / (i * 0.68 + 1), t);
        g.gain.exponentialRampToValueAtTime(0.0007, t + 0.44);
        osc.connect(g); g.connect(this.sfxOut);
        osc.start(t); osc.stop(t + 0.46);
      });

      // 3. Low bronze bell anvil resonance
      const sub = this.ctx.createOscillator();
      const sg = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(293.6 * rise, t);
      sub.frequency.exponentialRampToValueAtTime(260 * rise, t + 0.36);
      sg.gain.setValueAtTime(0.14, t);
      sg.gain.exponentialRampToValueAtTime(0.0008, t + 0.38);
      sub.connect(sg); sg.connect(this.sfxOut);
      sub.start(t); sub.stop(t + 0.4);
    } else {
      // Dull damped steel block thud + short scrape
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(95, t + 0.14);
      g.gain.setValueAtTime(0.19, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(g); g.connect(this.sfxOut);
      osc.start(t); osc.stop(t + 0.17);

      const n = this.ctx.createBufferSource();
      n.buffer = this.noiseBuf;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1400, t);
      bp.Q.value = 1.6;
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.14, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      n.connect(bp); bp.connect(ng); ng.connect(this.sfxOut);
      n.start(t); n.stop(t + 0.09);
    }
  }

  playGlintCue(delayed = false) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const freqs = delayed ? [1174.66, 1760.0, 2637.0] : [1567.98, 2349.32];
    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f, t + i * 0.015);
      osc.frequency.exponentialRampToValueAtTime(f * (delayed ? 1.06 : 0.94), t + (delayed ? 0.16 : 0.10));
      g.gain.setValueAtTime((delayed ? 0.095 : 0.075) / (i + 1), t + i * 0.015);
      g.gain.exponentialRampToValueAtTime(0.0006, t + (delayed ? 0.18 : 0.11));
      osc.connect(g); g.connect(this.sfxOut);
      osc.start(t + i * 0.015); osc.stop(t + (delayed ? 0.20 : 0.13));
    });
  }

  playFinisherDeflect() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    [587.33, 880.0, 1318.5, 2093.0, 3135.96].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = i % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.985, t + 0.65);
      g.gain.setValueAtTime(0.18 / (i * 0.55 + 1), t);
      g.gain.exponentialRampToValueAtTime(0.0007, t + 0.68);
      osc.connect(g); g.connect(this.sfxOut);
      osc.start(t); osc.stop(t + 0.7);
    });
  }

  playDangerAlert() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    [740, 1108].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.linearRampToValueAtTime(f * 0.86, t + 0.28);
      g.gain.setValueAtTime(0.11 / (i + 1), t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(g); g.connect(this.sfxOut);
      osc.start(t); osc.stop(t + 0.32);
    });
  }

  playBellToll() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    [146.8, 220, 349.2, 587.3].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.985, t + 1.6);
      g.gain.setValueAtTime(0.2 / (i * 0.8 + 1), t);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 1.7);
      osc.connect(g); g.connect(this.sfxOut);
      osc.start(t); osc.stop(t + 1.75);
    });
  }

  playPogoLantern() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    [880, 1320].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.96, t + 0.32);
      g.gain.setValueAtTime(0.13 / (i + 1), t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(g); g.connect(this.sfxOut);
      osc.start(t); osc.stop(t + 0.36);
    });
  }

  playIaiReady() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1320, t);
    osc.frequency.exponentialRampToValueAtTime(2200, t + 0.12);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.connect(g); g.connect(this.sfxOut);
    osc.start(t); osc.stop(t + 0.18);
  }

  playIaiSlash() {
    if (!this.ctx || this.muted) return;
    this.playSlash(1.45);
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1480, t);
    osc.frequency.exponentialRampToValueAtTime(420, t + 0.22);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(g); g.connect(this.sfxOut);
    osc.start(t); osc.stop(t + 0.27);
  }

  playCounterSlash() {
    if (!this.ctx || this.muted) return;
    this.playIaiSlash();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, t);
    osc.frequency.exponentialRampToValueAtTime(1180, t + 0.26);
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.connect(g); g.connect(this.sfxOut);
    osc.start(t); osc.stop(t + 0.3);
  }

  playDetonate() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(32, t + 0.35);
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    osc.connect(g); g.connect(this.sfxOut);
    osc.start(t); osc.stop(t + 0.4);
    this.playParry(true);
  }

  playExecution() {
    if (!this.ctx || this.muted) return;
    this.playDetonate();
    this.playBellToll();
  }

  playHeal() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    [440, 554, 659].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + i * 0.06);
      g.gain.setValueAtTime(0.1, t + i * 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.35);
      osc.connect(g); g.connect(this.sfxOut);
      osc.start(t + i * 0.06); osc.stop(t + i * 0.06 + 0.36);
    });
  }

  playSoulCast() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    [587, 880, 1318].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.78, t + 0.32);
      g.gain.setValueAtTime(0.12 / (i + 1), t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(g); g.connect(this.sfxOut);
      osc.start(t); osc.stop(t + 0.37);
    });
  }

  playGrappleLaunch() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const n = this.ctx.createBufferSource();
    n.buffer = this.noiseBuf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(1600, t);
    hp.frequency.exponentialRampToValueAtTime(4200, t + 0.14);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    n.connect(hp); hp.connect(g); g.connect(this.sfxOut);
    n.start(t); n.stop(t + 0.17);
  }

  playGrappleLatch() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    [1480, 2320].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.94, t + 0.14);
      g.gain.setValueAtTime(0.14 / (i + 1), t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(g); g.connect(this.sfxOut);
      osc.start(t); osc.stop(t + 0.17);
    });
  }

  playWraithShot() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(240, t + 0.24);
    g.gain.setValueAtTime(0.09, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
    osc.connect(g); g.connect(this.sfxOut);
    osc.start(t); osc.stop(t + 0.28);
  }

  playTideRoar() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const n = this.ctx.createBufferSource();
    n.buffer = this.noiseBuf;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(240, t);
    lp.frequency.linearRampToValueAtTime(620, t + 0.22);
    lp.frequency.exponentialRampToValueAtTime(140, t + 0.5);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.28, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    n.connect(lp); lp.connect(g); g.connect(this.sfxOut);
    n.start(t); n.stop(t + 0.5);

    const osc = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(92, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.45);
    og.gain.setValueAtTime(0.16, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.48);
    osc.connect(og); og.connect(this.sfxOut);
    osc.start(t); osc.stop(t + 0.5);
  }

  playFootstep() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const n = this.ctx.createBufferSource();
    n.buffer = this.noiseBuf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(420 + Math.random() * 140, t);
    bp.Q.value = 1.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.055, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
    n.connect(bp); bp.connect(g); g.connect(this.sfxOut);
    n.start(t); n.stop(t + 0.05);
  }

  playLand() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(135, t);
    osc.frequency.exponentialRampToValueAtTime(44, t + 0.08);
    g.gain.setValueAtTime(0.13, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(g); g.connect(this.sfxOut);
    osc.start(t); osc.stop(t + 0.1);
  }

  playWingJump() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const n = this.ctx.createBufferSource();
    n.buffer = this.noiseBuf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(520, t);
    bp.frequency.exponentialRampToValueAtTime(1450, t + 0.14);
    bp.Q.value = 1.3;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.16, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    n.connect(bp); bp.connect(g); g.connect(this.sfxOut);
    n.start(t); n.stop(t + 0.18);

    [587.3, 880].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const og = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + i * 0.03);
      osc.frequency.exponentialRampToValueAtTime(f * 1.18, t + 0.2);
      og.gain.setValueAtTime(0.075 / (i + 1), t + i * 0.03);
      og.gain.exponentialRampToValueAtTime(0.0008, t + 0.22);
      osc.connect(og); og.connect(this.sfxOut);
      osc.start(t + i * 0.03); osc.stop(t + 0.24);
    });
  }

  playShieldBreak() {
    if (!this.ctx || this.muted) return;
    this.playParry(true, 2);
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.24);
    g.gain.setValueAtTime(0.26, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
    osc.connect(g); g.connect(this.sfxOut);
    osc.start(t); osc.stop(t + 0.28);
  }

  playGrayShatter() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const n = this.ctx.createBufferSource();
    n.buffer = this.noiseBuf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(2400, t);
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.16, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    n.connect(hp); hp.connect(ng); ng.connect(this.sfxOut);
    n.start(t); n.stop(t + 0.2);

    [1980, 1420, 960].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + i * 0.025);
      osc.frequency.exponentialRampToValueAtTime(f * 0.62, t + i * 0.025 + 0.14);
      g.gain.setValueAtTime(0.075, t + i * 0.025);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.025 + 0.16);
      osc.connect(g); g.connect(this.sfxOut);
      osc.start(t + i * 0.025); osc.stop(t + i * 0.025 + 0.17);
    });
  }

  playBellQuake() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    // Deep bronze bell shock boom + ascending soul resonance chord
    [110, 220, 329.6, 523.25, 880].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f * 1.04, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.94, t + 0.62);
      g.gain.setValueAtTime(0.22 / (i * 0.65 + 1), t);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 0.66);
      osc.connect(g); g.connect(this.sfxOut);
      osc.start(t); osc.stop(t + 0.68);
    });
    const n = this.ctx.createBufferSource();
    n.buffer = this.noiseBuf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(920, t);
    bp.frequency.exponentialRampToValueAtTime(180, t + 0.28);
    bp.Q.value = 1.1;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.24, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    n.connect(bp); bp.connect(ng); ng.connect(this.sfxOut);
    n.start(t); n.stop(t + 0.32);
  }

  playResonanceBell(baseFreq = 440, harmony = false) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const freqs = harmony ? [baseFreq, baseFreq * 1.25, baseFreq * 1.5, baseFreq * 2] : [baseFreq, baseFreq * 1.5, baseFreq * 2.4];
    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f, t + (harmony ? i * 0.045 : 0));
      osc.frequency.exponentialRampToValueAtTime(f * 0.992, t + (harmony ? 1.45 : 0.95));
      g.gain.setValueAtTime((harmony ? 0.16 : 0.14) / (i * 0.7 + 1), t + (harmony ? i * 0.045 : 0));
      g.gain.exponentialRampToValueAtTime(0.0006, t + (harmony ? 1.5 : 0.98));
      osc.connect(g); g.connect(this.sfxOut);
      osc.start(t + (harmony ? i * 0.045 : 0));
      osc.stop(t + (harmony ? 1.55 : 1.0));
    });
  }

  playShadeDash() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const n = this.ctx.createBufferSource();
    n.buffer = this.noiseBuf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1900, t);
    bp.frequency.exponentialRampToValueAtTime(340, t + 0.22);
    bp.Q.value = 1.9;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.22, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    n.connect(bp); bp.connect(ng); ng.connect(this.sfxOut);
    n.start(t); n.stop(t + 0.25);
    [311.1, 622.3].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f * 1.25, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.72, t + 0.24);
      g.gain.setValueAtTime(0.11 / (i + 1), t);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 0.25);
      osc.connect(g); g.connect(this.sfxOut);
      osc.start(t); osc.stop(t + 0.26);
    });
  }

  playShadeBurst() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    [185, 370, 740, 1175].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = i === 0 ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.58, t + 0.26);
      g.gain.setValueAtTime(0.15 / (i * 0.65 + 1), t);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 0.28);
      osc.connect(g); g.connect(this.sfxOut);
      osc.start(t); osc.stop(t + 0.3);
    });
  }

  playEchoReclaim() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    [392.0, 493.88, 587.33, 783.99].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + i * 0.055);
      g.gain.setValueAtTime(0.13, t + i * 0.055);
      g.gain.exponentialRampToValueAtTime(0.0008, t + i * 0.055 + 0.55);
      osc.connect(g); g.connect(this.sfxOut);
      osc.start(t + i * 0.055); osc.stop(t + i * 0.055 + 0.58);
    });
  }

  playShadowBlink() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    [987.77, 1479.98, 440].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f, t + i * 0.03);
      osc.frequency.exponentialRampToValueAtTime(f * 0.76, t + i * 0.03 + 0.24);
      g.gain.setValueAtTime(0.11 / (i + 1), t + i * 0.03);
      g.gain.exponentialRampToValueAtTime(0.0008, t + i * 0.03 + 0.26);
      osc.connect(g); g.connect(this.sfxOut);
      osc.start(t + i * 0.03); osc.stop(t + i * 0.03 + 0.28);
    });
  }

  playEndingChord(isTrueEnding = false, step = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const dawnChords = [
      [146.83, 220.00, 293.66, 369.99],
      [196.00, 246.94, 369.99, 440.00],
      [220.00, 277.18, 329.63, 554.37],
      [146.83, 293.66, 369.99, 587.33, 739.99]
    ];
    const vowChords = [
      [146.83, 174.61, 220.00, 293.66],
      [130.81, 155.56, 233.08, 311.13],
      [116.54, 174.61, 220.00, 349.23],
      [146.83, 220.00, 293.66, 440.00]
    ];
    const chord = (isTrueEnding ? dawnChords : vowChords)[step % 4];
    chord.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f, t + i * 0.09);
      g.gain.setValueAtTime(0.0005, t + i * 0.09);
      g.gain.linearRampToValueAtTime((isTrueEnding ? 0.14 : 0.12) / (i * 0.35 + 1), t + i * 0.09 + 0.18);
      g.gain.exponentialRampToValueAtTime(0.0006, t + i * 0.09 + 3.2);
      osc.connect(g); g.connect(this.sfxOut);
      osc.start(t + i * 0.09); osc.stop(t + i * 0.09 + 3.3);
    });
  }

  playCrumble() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const n = this.ctx.createBufferSource();
    n.buffer = this.noiseBuf;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(720, t);
    lp.frequency.exponentialRampToValueAtTime(140, t + 0.24);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
    n.connect(lp); lp.connect(g); g.connect(this.sfxOut);
    n.start(t); n.stop(t + 0.28);
  }
}

export const audio = new SoundEngine();
