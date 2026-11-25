(() => {
  const CB = window.CB;
  const game = CB.game;

  let ctx = null;
  let noiseBuf = null;
  let softNoiseBuf = null;
  let masterGain = null;

  // ==================== 四关程序化环境音景（零外部音频资产） ====================
  let ambientStageId = 1;
  let ambientGain = null;
  let ambientNoiseSrc = null;
  let ambientFilter = null;
  let ambientLfo = null;
  let ambientLfoGain = null;
  let ambientDroneOsc = null;
  let ambientDroneGain = null;
  let ambientTimer = null;

  const AMBIENT_PROFILES = {
    1: {
      // 第 1 关 晨露荷塘：温润微风 + 稀疏荷叶露珠五声短鸣
      filterType: 'bandpass',
      freq: 620,
      q: 0.85,
      lfoRate: 0.16,
      lfoDepth: 160,
      noiseVol: 0.075,
      droneFreq: 0,
      droneVol: 0,
      accentType: 'dew',
      notes: [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5],
      intervalMin: 2600,
      intervalMax: 4800,
    },
    2: {
      // 第 2 关 星象天文台：深空丝绒星鸣低频 + 稀疏晶亮星铃泛音
      filterType: 'lowpass',
      freq: 360,
      q: 0.9,
      lfoRate: 0.09,
      lfoDepth: 95,
      noiseVol: 0.055,
      droneFreq: 110.0,
      droneVol: 0.028,
      accentType: 'star',
      notes: [659.25, 783.99, 987.77, 1174.66, 1318.51, 1567.98],
      intervalMin: 2400,
      intervalMax: 4400,
    },
    3: {
      // 第 3 关 暮光古藤廊：翡翠雾林轻风 + 暖木萤火轻敲
      filterType: 'bandpass',
      freq: 460,
      q: 1.05,
      lfoRate: 0.13,
      lfoDepth: 120,
      noiseVol: 0.07,
      droneFreq: 146.83,
      droneVol: 0.016,
      accentType: 'forest',
      notes: [392.0, 440.0, 523.25, 587.33, 659.25, 783.99],
      intervalMin: 2500,
      intervalMax: 4600,
    },
    4: {
      // 第 4 关 落日鎏金穹：高空云海晚风 + 暖金竖琴五度泛音
      filterType: 'bandpass',
      freq: 760,
      q: 0.75,
      lfoRate: 0.18,
      lfoDepth: 220,
      noiseVol: 0.082,
      droneFreq: 130.81,
      droneVol: 0.02,
      accentType: 'sunset',
      notes: [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.51],
      intervalMin: 2300,
      intervalMax: 4200,
    },
  };

  function buildSoftNoiseBuffer(audioCtx) {
    // 3 秒平滑粉红风噪缓冲，无缝循环无接缝咔哒声
    const len = Math.floor(audioCtx.sampleRate * 3.0);
    const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.950 * b2 + white * 0.048;
      data[i] = (b0 + b1 + b2 + white * 0.02) * 0.45;
    }
    // 首尾 0.08s 交叉淡化，彻底消除循环接缝
    const fade = Math.min(4000, Math.floor(len * 0.04));
    for (let i = 0; i < fade; i++) {
      const k = i / fade;
      data[i] = data[i] * k + data[len - fade + i] * (1 - k);
    }
    return buf;
  }

  function initAudioCore() {
    if (ctx) return ctx;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    ctx = new AudioCtx();
    masterGain = ctx.createGain();
    masterGain.gain.value = game.audioMuted ? 0 : 0.72;
    masterGain.connect(ctx.destination);
    noiseBuf = buildNoiseBuffer(ctx);
    softNoiseBuf = buildSoftNoiseBuffer(ctx);
    startAmbienceNodes();
    return ctx;
  }

  function startAmbienceNodes() {
    if (!ctx || !softNoiseBuf || ambientNoiseSrc) return;
    const prof = AMBIENT_PROFILES[ambientStageId] || AMBIENT_PROFILES[1];

    ambientGain = ctx.createGain();
    ambientGain.gain.value = game.audioMuted ? 0 : prof.noiseVol;
    ambientGain.connect(masterGain);

    ambientFilter = ctx.createBiquadFilter();
    ambientFilter.type = prof.filterType;
    ambientFilter.frequency.value = prof.freq;
    ambientFilter.Q.value = prof.q;
    ambientFilter.connect(ambientGain);

    ambientNoiseSrc = ctx.createBufferSource();
    ambientNoiseSrc.buffer = softNoiseBuf;
    ambientNoiseSrc.loop = true;
    ambientNoiseSrc.connect(ambientFilter);
    ambientNoiseSrc.start();

    ambientLfo = ctx.createOscillator();
    ambientLfo.type = 'sine';
    ambientLfo.frequency.value = prof.lfoRate;
    ambientLfoGain = ctx.createGain();
    ambientLfoGain.gain.value = prof.lfoDepth;
    ambientLfo.connect(ambientLfoGain).connect(ambientFilter.frequency);
    ambientLfo.start();

    ambientDroneOsc = ctx.createOscillator();
    ambientDroneOsc.type = 'sine';
    ambientDroneOsc.frequency.value = prof.droneFreq || 110;
    ambientDroneGain = ctx.createGain();
    ambientDroneGain.gain.value = game.audioMuted ? 0 : (prof.droneVol || 0);
    ambientDroneOsc.connect(ambientDroneGain).connect(masterGain);
    ambientDroneOsc.start();

    scheduleAmbientAccent();
  }

  function scheduleAmbientAccent() {
    if (ambientTimer) clearTimeout(ambientTimer);
    const prof = AMBIENT_PROFILES[ambientStageId] || AMBIENT_PROFILES[1];
    const wait = prof.intervalMin + Math.random() * (prof.intervalMax - prof.intervalMin);
    ambientTimer = setTimeout(() => {
      if (ctx && ctx.state === 'running' && !game.audioMuted && !document.hidden) {
        playAmbientAccent(AMBIENT_PROFILES[ambientStageId] || AMBIENT_PROFILES[1]);
      }
      scheduleAmbientAccent();
    }, wait);
  }

  function playAmbientAccent(prof) {
    if (!ctx || game.audioMuted) return;
    const f = prof.notes[Math.floor(Math.random() * prof.notes.length)];
    if (prof.accentType === 'dew') {
      // 轻盈荷塘露珠滑音
      playTone('sine', f * 0.92, f * 1.12, 0.24, 0.036, 0);
      if (Math.random() < 0.45) playTone('sine', f * 1.5, f * 1.52, 0.28, 0.022, 0.14);
    } else if (prof.accentType === 'star') {
      // 深空星铃双泛音
      playTone('sine', f, f * 1.004, 0.65, 0.032, 0);
      playTone('triangle', f * 2, f * 2.005, 0.42, 0.014, 0.04);
    } else if (prof.accentType === 'forest') {
      // 暮光雾林温润木琴点音 + 微萤颤鸣
      playTone('triangle', f, f * 0.985, 0.26, 0.034, 0);
      if (Math.random() < 0.5) playTone('sine', f * 1.25, f * 1.28, 0.22, 0.022, 0.16);
    } else {
      // 落日鎏金穹暖五度竖琴轻拨
      playTone('triangle', f, f, 0.52, 0.034, 0);
      playTone('sine', f * 1.5, f * 1.5, 0.56, 0.022, 0.09);
    }
  }

  function setAmbienceStage(stageId) {
    ambientStageId = stageId || 1;
    if (!ctx || !ambientFilter || !ambientGain) return;
    const prof = AMBIENT_PROFILES[ambientStageId] || AMBIENT_PROFILES[1];
    const t = ctx.currentTime;
    ambientFilter.type = prof.filterType;
    ambientFilter.frequency.setTargetAtTime(prof.freq, t, 0.35);
    ambientFilter.Q.setTargetAtTime(prof.q, t, 0.35);
    if (ambientLfo) ambientLfo.frequency.setTargetAtTime(prof.lfoRate, t, 0.35);
    if (ambientLfoGain) ambientLfoGain.gain.setTargetAtTime(prof.lfoDepth, t, 0.35);
    ambientGain.gain.setTargetAtTime(game.audioMuted ? 0 : prof.noiseVol, t, 0.35);
    if (ambientDroneOsc && ambientDroneGain) {
      if (prof.droneFreq > 0) ambientDroneOsc.frequency.setTargetAtTime(prof.droneFreq, t, 0.35);
      ambientDroneGain.gain.setTargetAtTime(game.audioMuted ? 0 : (prof.droneVol || 0), t, 0.4);
    }
  }

  function setAmbienceGust(active) {
    if (!ctx || !ambientFilter || !ambientGain) return;
    const prof = AMBIENT_PROFILES[ambientStageId] || AMBIENT_PROFILES[1];
    const t = ctx.currentTime;
    if (active) {
      ambientFilter.frequency.setTargetAtTime(Math.max(prof.freq, 1080), t, 0.25);
      ambientGain.gain.setTargetAtTime(game.audioMuted ? 0 : prof.noiseVol * 1.95, t, 0.25);
    } else {
      ambientFilter.frequency.setTargetAtTime(prof.freq, t, 0.35);
      ambientGain.gain.setTargetAtTime(game.audioMuted ? 0 : prof.noiseVol, t, 0.35);
    }
  }

  let iosBufferUnlocked = false;
  let suspendedByBg = false;

  function primeSilentFrame(audioCtx) {
    if (!audioCtx || iosBufferUnlocked) return;
    try {
      const buf = audioCtx.createBuffer(1, 1, 22050);
      const src = audioCtx.createBufferSource();
      src.buffer = buf;
      src.connect(audioCtx.destination);
      src.start(0);
      iosBufferUnlocked = true;
    } catch (_) {}
  }

  function ensureAudio() {
    if (game.audioMuted || suspendedByBg) return null;
    if (!ctx) initAudioCore();
    if (!ctx) return null;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function unlock() {
    if (!ctx) initAudioCore();
    if (ctx) {
      primeSilentFrame(ctx);
      if (ctx.state === 'suspended' && !suspendedByBg) {
        ctx.resume().catch(() => {});
      }
    }
  }

  function suspendAudio() {
    suspendedByBg = true;
    if (ctx && ctx.state === 'running') {
      ctx.suspend().catch(() => {});
    }
  }

  function resumeAudio() {
    suspendedByBg = false;
    if (ctx && !game.audioMuted && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  // iOS WKWebView / 微信 / TapTap 容器首触可靠解锁音频
  const onFirstGesture = () => {
    unlock();
    if (ctx && ctx.state === 'running') {
      window.removeEventListener('touchend', onFirstGesture, true);
      window.removeEventListener('pointerdown', onFirstGesture, true);
      window.removeEventListener('click', onFirstGesture, true);
    }
  };
  window.addEventListener('touchend', onFirstGesture, true);
  window.addEventListener('pointerdown', onFirstGesture, true);
  window.addEventListener('click', onFirstGesture, true);

  function setMuted(muted) {
    game.audioMuted = muted;
    if (masterGain && ctx) {
      masterGain.gain.setTargetAtTime(muted ? 0 : 0.72, ctx.currentTime, 0.02);
    }
    if (ambientGain && ctx) {
      const prof = AMBIENT_PROFILES[ambientStageId] || AMBIENT_PROFILES[1];
      ambientGain.gain.setTargetAtTime(muted ? 0 : prof.noiseVol, ctx.currentTime, 0.05);
    }
    if (ambientDroneGain && ctx) {
      const prof = AMBIENT_PROFILES[ambientStageId] || AMBIENT_PROFILES[1];
      ambientDroneGain.gain.setTargetAtTime(muted ? 0 : (prof.droneVol || 0), ctx.currentTime, 0.05);
    }
  }

  function buildNoiseBuffer(audioCtx) {
    const len = Math.floor(audioCtx.sampleRate * 1.2);
    const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  function jitter(base, spread = 0.06) {
    return base * (1 + (Math.random() * 2 - 1) * spread);
  }

  function playNoise(duration, freq, type, vol, delay = 0, q = 1.2) {
    const c = ensureAudio();
    if (!c || !noiseBuf) return;
    const t = c.currentTime + delay;
    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    const filter = c.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    filter.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + duration);
    src.connect(filter).connect(g).connect(masterGain);
    src.start(t);
    src.stop(t + duration + 0.01);
  }

  function playTone(type, fStart, fEnd, dur, vol, delay = 0) {
    const c = ensureAudio();
    if (!c) return;
    const t = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, fStart), t);
    if (fEnd !== fStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, fEnd), t + dur);
    }
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    osc.connect(g).connect(masterGain);
    osc.start(t);
    osc.stop(t + dur + 0.01);
  }

  function playShoot(mode, chargeRatio = 0) {
    if (mode === 'light') {
      // 轻弹静音点射：极清脆轻气音 + 细微风铃晶音
      playNoise(0.05, 3600, 'bandpass', 0.11, 0, 2.2);
      playTone('sine', jitter(1860), 1180, 0.05, 0.085);
    } else {
      // 蓄力物理重弹：随蓄力比例增强的弹簧弹射 + 厚实击球脉冲 + 晶辉泛音
      const boost = 1 + chargeRatio * 0.28;
      playTone('triangle', jitter(480 * boost), 125, 0.14, 0.26 + chargeRatio * 0.06);
      playTone('sine', jitter(1120 * boost), 620, 0.08, 0.14 + chargeRatio * 0.05);
      playNoise(0.08 + chargeRatio * 0.04, 1550, 'bandpass', 0.16 + chargeRatio * 0.08, 0, 1.1);
      if (chargeRatio >= 0.85) {
        playTone('sine', 1567.98, 2093.0, 0.11, 0.11, 0.015);
      }
    }
  }

  function playChargeCue(isFull = false) {
    if (isFull) {
      playTone('sine', 1318.5, 1760.0, 0.11, 0.11, 0);
      playTone('triangle', 1760.0, 2093.0, 0.13, 0.08, 0.03);
    } else {
      playTone('sine', 740, 987.77, 0.075, 0.085, 0);
    }
  }

  function playRicochet(bounceNum = 1, isSuper = false) {
    const pitchBoost = 1 + Math.min(3, bounceNum - 1) * 0.18;
    if (isSuper) {
      playTone('sine', 240 * pitchBoost, 680 * pitchBoost, 0.16, 0.24);
      playTone('triangle', 520 * pitchBoost, 960 * pitchBoost, 0.11, 0.14, 0.02);
    } else {
      const base = jitter(1120 * pitchBoost, 0.08);
      playTone('sine', base, base * 1.48, 0.035, 0.16);
      playTone('triangle', base * 1.45, base * 0.65, 0.11, 0.13, 0.03);
    }
  }

  function playHit(isCrit = false) {
    if (isCrit) {
      playTone('square', jitter(260), 54, 0.11, 0.26);
      playTone('sine', jitter(1480), 2120, 0.09, 0.16);
      playTone('triangle', jitter(2200), 1760, 0.12, 0.11, 0.025);
      playNoise(0.065, 2200, 'bandpass', 0.19);
    } else {
      playTone('triangle', jitter(195), 58, 0.085, 0.22);
      playNoise(0.048, 1500, 'bandpass', 0.14);
    }
  }

  function playGuardDefeat() {
    playTone('triangle', 320, 88, 0.18, 0.24);
    playTone('sine', 660, 990, 0.12, 0.14, 0.04);
    playTone('sine', 880, 1320, 0.16, 0.13, 0.09);
    playNoise(0.12, 1100, 'bandpass', 0.16);
  }

  function playBreak(type) {
    if (type === 'crate') {
      playNoise(0.17, 780, 'bandpass', 0.28, 0, 1.0);
      playTone('triangle', jitter(220), 68, 0.07, 0.24, 0);
      playTone('triangle', jitter(165), 52, 0.08, 0.21, 0.045);
      playNoise(0.09, 1750, 'highpass', 0.12, 0.03);
    } else if (type === 'inkwell') {
      [1820, 2580, 3360].forEach((f, idx) => {
        playTone('sine', jitter(f, 0.09), f * 0.62, 0.13, 0.11, idx * 0.016);
      });
      playNoise(0.14, 2900, 'highpass', 0.15, 0);
      playNoise(0.16, 980, 'bandpass', 0.18, 0.035, 1.8);
    }
  }

  function playGuardState(kind) {
    if (kind === 'suspicious') {
      playTone('sine', 370, 410, 0.075, 0.13, 0);
      playTone('sine', 470, 520, 0.09, 0.12, 0.075);
    } else if (kind === 'alert') {
      playTone('sawtooth', 510, 760, 0.13, 0.14, 0);
      playTone('triangle', 760, 920, 0.09, 0.11, 0.08);
    } else if (kind === 'windup') {
      playTone('sawtooth', 140, 390, 0.38, 0.14);
      playNoise(0.28, 900, 'bandpass', 0.09);
    } else if (kind === 'stun') {
      playTone('triangle', 135, 34, 0.26, 0.34);
      playNoise(0.18, 520, 'lowpass', 0.28);
      playTone('sine', 680, 460, 0.14, 0.1, 0.08);
      playTone('sine', 520, 740, 0.14, 0.09, 0.18);
    } else if (kind === 'magnet') {
      playTone('sine', 290, 460, 0.12, 0.11);
      playTone('triangle', 580, 320, 0.1, 0.08, 0.04);
    } else if (kind === 'enemyShoot') {
      playTone('square', jitter(340), 140, 0.09, 0.13);
    }
  }

  function playCoin(combo = 0) {
    const scale = Math.min(8, combo);
    const mult = Math.pow(1.06, scale);
    playTone('sine', 960 * mult, 1020 * mult, 0.055, 0.12, 0);
    playTone('sine', 1360 * mult, 1460 * mult, 0.095, 0.11, 0.045);
  }

  function playWeaponSwitch() {
    playTone('triangle', 460, 720, 0.05, 0.12);
    playNoise(0.03, 2400, 'bandpass', 0.08);
  }

  function playDash() {
    playNoise(0.11, 1400, 'bandpass', 0.15, 0, 1.1);
    playTone('sine', 280, 140, 0.1, 0.11);
  }

  function playPlayerHurt() {
    playTone('sawtooth', 180, 62, 0.18, 0.24);
    playNoise(0.12, 650, 'lowpass', 0.2);
  }

  // ==================== Step 4 宝箱 / 警报 / 怀表撤离音效 ====================
  function playLockTick(progress = 0) {
    const base = 620 + progress * 540;
    playTone('triangle', jitter(base, 0.04), base * 1.18, 0.04, 0.11);
    playNoise(0.025, 2600, 'bandpass', 0.06);
  }

  function playChestOpen(isGiant = false) {
    playNoise(0.14, 1100, 'bandpass', 0.16, 0);
    if (isGiant) {
      // 大金宝箱璀璨竖琴琶音
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
      notes.forEach((f, idx) => {
        playTone('triangle', f, f * 1.01, 0.38, 0.17, idx * 0.055);
        playTone('sine', f * 2, f * 2, 0.28, 0.08, idx * 0.055);
      });
    } else {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((f, idx) => {
        playTone('triangle', f, f, 0.22, 0.15, idx * 0.05);
      });
    }
  }

  function playCurioPickup(isGrand = false) {
    if (isGrand) {
      [587.33, 880, 1174.66, 1760].forEach((f, i) => {
        playTone('sine', f, f * 1.02, 0.34, 0.16, i * 0.06);
      });
    } else {
      playTone('sine', 784, 1174, 0.14, 0.14, 0);
      playTone('triangle', 1174, 1568, 0.18, 0.12, 0.07);
    }
  }

  function playVaultAlarm() {
    // 复古黄铜警铃双脉冲
    [0, 0.26].forEach((d) => {
      playTone('sawtooth', 420, 640, 0.18, 0.13, d);
      playTone('triangle', 840, 620, 0.16, 0.1, d + 0.06);
    });
  }

  function playWatchStart() {
    // 怀表发条上弦 + 清脆鸣钟
    playTone('triangle', 380, 920, 0.18, 0.16, 0);
    playTone('sine', 1046.5, 1046.5, 0.42, 0.16, 0.1);
    playTone('sine', 1567.98, 1567.98, 0.38, 0.11, 0.14);
  }

  function playWatchTick(urgent = false, high = true) {
    const f = urgent ? (high ? 1480 : 1120) : (high ? 1020 : 820);
    playTone('triangle', f, f * 0.72, 0.055, urgent ? 0.18 : 0.12);
    playNoise(0.02, 3200, 'highpass', urgent ? 0.09 : 0.05);
  }

  function playExtractSuccess() {
    const fanfare = [
      { f: 523.25, t: 0, d: 0.22 },
      { f: 659.25, t: 0.11, d: 0.22 },
      { f: 783.99, t: 0.22, d: 0.25 },
      { f: 1046.5, t: 0.34, d: 0.55 },
      { f: 1318.5, t: 0.44, d: 0.52 },
    ];
    fanfare.forEach((n) => {
      playTone('triangle', n.f, n.f, n.d, 0.19, n.t);
      playTone('sine', n.f * 0.5, n.f * 0.5, n.d, 0.11, n.t);
    });
  }

  function playRunFail() {
    const notes = [392, 349.23, 311.13, 246.94];
    notes.forEach((f, i) => {
      playTone('sawtooth', f, f * 0.94, 0.24, 0.13, i * 0.14);
      playTone('triangle', f * 0.5, f * 0.48, 0.26, 0.12, i * 0.14);
    });
  }

  // ==================== 空中花房机关合成音效 ====================
  function playPrismSplit() {
    // 水晶棱镜折射分光：清亮大九和弦泛音
    const notes = [1174.66, 1479.98, 1760, 2349.32];
    notes.forEach((f, i) => {
      playTone('sine', jitter(f, 0.03), f * 1.03, 0.24, 0.11, i * 0.022);
    });
    playTone('triangle', 1760, 2637, 0.12, 0.08, 0);
  }

  function playPrismRotate() {
    // 旋转黄铜棱镜座：清脆齿轮咔哒 + 水晶短鸣
    playNoise(0.035, 2200, 'bandpass', 0.09);
    playTone('sine', 987.77, 1318.51, 0.09, 0.11);
  }

  function playPollenBurst() {
    // 花粉隐身花苞绽放：柔绵气雾蓬松声 + 柔和金粉微鸣
    playNoise(0.24, 1350, 'lowpass', 0.2, 0, 0.9);
    playTone('sine', 523.25, 783.99, 0.16, 0.1, 0.02);
    playTone('sine', 659.25, 987.77, 0.18, 0.08, 0.06);
  }

  function playSneeze() {
    // 守卫吸入花粉打喷嚏
    playTone('triangle', 320, 560, 0.07, 0.11, 0);
    playNoise(0.16, 2100, 'bandpass', 0.22, 0.065, 1.4);
    playTone('sawtooth', 420, 150, 0.12, 0.1, 0.07);
  }

  function playChimeChord() {
    // 共鸣风铃串五声音阶清脆摇响
    const pentatonic = [1046.5, 1174.66, 1318.51, 1567.98, 1760.0, 2093.0];
    for (let i = 0; i < 4; i++) {
      const f = pentatonic[Math.floor(Math.random() * pentatonic.length)];
      playTone('sine', f, f * 1.005, 0.42, 0.12, i * 0.055);
      playTone('triangle', f * 2, f * 2, 0.22, 0.05, i * 0.055);
    }
  }

  function playGateOpen() {
    // 向日葵绽放 + 藤蔓花闸滑开
    playNoise(0.28, 920, 'bandpass', 0.16, 0, 1.2);
    const notes = [440, 554.37, 659.25, 880, 1108.73];
    notes.forEach((f, i) => {
      playTone('triangle', f, f * 1.01, 0.3, 0.14, i * 0.055);
    });
  }

  // ==================== 引力星轨 & 引力漩涡合成音效 ====================
  function playVortexSpawn() {
    // 微型引力漩涡展开：深沉星渊低频吸入 + 水晶泛音旋流
    playTone('sine', 210, 72, 0.32, 0.22, 0);
    playTone('triangle', 580, 920, 0.24, 0.11, 0.03);
    playTone('sine', 880, 1320, 0.26, 0.09, 0.06);
    playNoise(0.22, 1150, 'bandpass', 0.12, 0.02, 2.0);
  }

  function playSlingshotCharge() {
    // 子弹经过星轨仪充能弯道加速的星芒滑音
    playTone('sine', 740, 1480, 0.14, 0.11, 0);
    playTone('triangle', 1108, 1760, 0.12, 0.08, 0.03);
  }

  function playSlingshotCrit() {
    // 星轨引力弹弓暴击：重打击 + 明亮竖琴星辉和弦
    playTone('square', jitter(280), 58, 0.12, 0.26, 0);
    [1046.5, 1318.5, 1567.98, 2093.0].forEach((f, i) => {
      playTone('sine', f, f * 1.02, 0.22, 0.11, i * 0.02);
    });
    playNoise(0.06, 2400, 'bandpass', 0.16);
  }

  function playPolarityFlip(isAttract = true) {
    if (isAttract) {
      playTone('sine', 620, 320, 0.12, 0.14, 0);
      playTone('triangle', 420, 840, 0.14, 0.11, 0.06);
    } else {
      playTone('sine', 320, 720, 0.12, 0.14, 0);
      playTone('triangle', 840, 480, 0.14, 0.11, 0.06);
    }
  }

  function playSplitBounce() {
    playTone('sine', 1318.5, 1975.5, 0.11, 0.12, 0);
    playTone('triangle', 1567.98, 2349.3, 0.12, 0.1, 0.03);
  }

  function playRepelWave() {
    playNoise(0.16, 1800, 'bandpass', 0.16, 0, 1.4);
    playTone('sine', 240, 620, 0.16, 0.15, 0);
  }

  // ==================== 低摩擦露水滑道 & 可滑动台球木箱音效 ====================
  function playDewSlide() {
    // 晨露玻璃滑道水膜滑行音：清亮高通水汽滑音 + 微泛音
    playNoise(0.14, 2400, 'bandpass', 0.09, 0, 2.2);
    playTone('sine', jitter(880, 0.05), 1180, 0.12, 0.06, 0);
  }

  function playCratePush(onSlide = false) {
    // 木箱受击开始滑行：低频木箱摩擦启动声
    playTone('triangle', jitter(165), 95, 0.09, 0.18, 0);
    playNoise(0.11, onSlide ? 1950 : 720, 'bandpass', onSlide ? 0.12 : 0.16, 0, 1.4);
  }

  function playCrateClack(heavy = false) {
    // 台球木箱碰撞（木箱撞木箱 / 撞晕守卫）：清脆实心台球撞击声
    const f1 = jitter(heavy ? 310 : 420, 0.06);
    playTone('triangle', f1, f1 * 0.48, 0.085, heavy ? 0.28 : 0.22, 0);
    playTone('sine', f1 * 2.1, f1 * 1.3, 0.06, 0.14, 0);
    playNoise(0.06, 1450, 'bandpass', heavy ? 0.2 : 0.14, 0, 1.6);
  }

  // ==================== 主题怪护盾格挡 / 物理破防 / 专属技能音效 ====================
  function playShieldClang() {
    // 直线子弹打在青铜盾/星光膜/荆棘硬壳上的清脆弹开音
    playTone('triangle', jitter(920), 540, 0.09, 0.18, 0);
    playTone('sine', jitter(1640), 1220, 0.11, 0.12, 0.01);
    playNoise(0.05, 2600, 'bandpass', 0.1, 0, 2.0);
  }

  function playShieldBreak() {
    // 物理机制成功破盾 / 破膜 / 绝杀伏击的震撼碎裂和弦
    playTone('square', 220, 48, 0.16, 0.28, 0);
    playNoise(0.16, 1650, 'bandpass', 0.24, 0, 1.0);
    [784, 1046.5, 1567.98].forEach((f, i) => {
      playTone('sine', f, f * 1.06, 0.24, 0.13, i * 0.028);
    });
  }

  function playRoughScrape() {
    // 普通粗糙石砖上木箱刹停时的粗重摩擦声
    playNoise(0.11, 460, 'bandpass', 0.2, 0, 0.9);
    playTone('triangle', 120, 62, 0.09, 0.16, 0);
  }

  function playFrogHop() {
    playTone('sine', 240, 560, 0.11, 0.12, 0);
  }

  function playStarVolley() {
    playTone('sine', 1046, 620, 0.12, 0.11, 0);
    playTone('triangle', 1480, 920, 0.09, 0.08, 0.03);
  }


  // ==================== 云海崖边击落 & 易碎木花栏 & 怪物台球连撞音效 ====================
  function playRailingBreak() {
    // 脆裂木条折断声 + 细碎花叶沙沙声
    playNoise(0.14, 1150, 'bandpass', 0.25, 0, 1.1);
    playTone('triangle', jitter(290), 82, 0.065, 0.22, 0);
    playTone('triangle', jitter(210), 64, 0.075, 0.2, 0.032);
    playNoise(0.11, 2600, 'highpass', 0.14, 0.02);
  }

  function playCliffDrop() {
    // 呼啸下坠风声 + 旋转滑落哨音 + 爽快击落云海欢呼和弦！
    playNoise(0.42, 1650, 'bandpass', 0.19, 0, 1.8);
    playTone('sine', 960, 195, 0.44, 0.17, 0);
    playTone('triangle', 640, 140, 0.36, 0.11, 0.03);
    // 延迟明亮三和弦欢呼反馈
    [587.33, 880.0, 1174.66, 1567.98].forEach((f, idx) => {
      playTone('sine', f, f * 1.015, 0.22, 0.12, 0.12 + idx * 0.042);
    });
  }

  function playMonsterClack(chainNum = 2) {
    // 清脆怪物台球连撞音：随连撞次数攀升音高，爽感拉满！
    const step = Math.min(7, Math.max(0, chainNum - 2));
    const pitch = Math.pow(1.11, step);
    const base = jitter(380 * pitch, 0.04);
    playTone('triangle', base, base * 0.45, 0.09, 0.28, 0);
    playTone('sine', base * 2.2, base * 2.8, 0.085, 0.16, 0.008);
    playNoise(0.055, 1900 * pitch, 'bandpass', 0.18, 0, 1.8);
    if (chainNum >= 3) {
      playTone('sine', 1046.5 * pitch, 1318.5 * pitch, 0.14, 0.11, 0.03);
    }
  }


  function playWindGust() {
    // 狂风蒲公英扇：破栏瞬间向外喷涌的清冽强风冲击波
    playNoise(0.24, 1450, 'bandpass', 0.22, 0, 1.3);
    playNoise(0.18, 2600, 'highpass', 0.12, 0.03);
    playTone('sine', 340, 760, 0.18, 0.12, 0);
  }

  let lastBountySfxTime = 0;
  function playBountyChime() {
    const now = performance.now();
    if (now - lastBountySfxTime < 140) return;
    lastBountySfxTime = now;
    playTone('sine', 1318.5, 1760.0, 0.09, 0.08, 0);
    playTone('triangle', 1760.0, 2093.0, 0.11, 0.065, 0.035);
  }


  // ==================== 飞艇母港工坊与图鉴交互音效 ====================
  function playUiClick() {
    playTone('triangle', 680, 920, 0.045, 0.085, 0);
    playNoise(0.02, 2400, 'bandpass', 0.045);
  }

  function playUiLocked() {
    playTone('triangle', 220, 150, 0.06, 0.11, 0);
    playTone('triangle', 175, 125, 0.07, 0.09, 0.065);
  }

  function playUpgradeBuy() {
    playNoise(0.06, 1800, 'bandpass', 0.11, 0, 1.4);
    [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      playTone('triangle', f, f * 1.01, 0.22, 0.14, idx * 0.045);
      playTone('sine', f * 2, f * 2, 0.16, 0.06, idx * 0.045);
    });
  }


  function playGustStart() {
    // 撤离最后 5 秒高空阵风起风呼啸 + 清亮顺风风铃提示
    playNoise(0.65, 1180, 'bandpass', 0.24, 0, 1.35);
    playNoise(0.55, 2200, 'highpass', 0.11, 0.06);
    playTone('sine', 340, 880, 0.32, 0.13, 0);
    [783.99, 1046.5, 1318.51].forEach((f, idx) => {
      playTone('sine', f, f * 1.01, 0.26, 0.09, 0.1 + idx * 0.05);
    });
  }


  // ==================== 开场 10 秒水彩过场动画程序化配乐提示音 ====================
  function playIntroCue(sceneIndex = 0) {
    if (game.audioMuted || suspendedByBg) return;
    if (!ctx || ctx.state !== 'running') return;
    if (sceneIndex === 0) {
      // Scene 1：云海破晓 · 柔风与竖琴长音琶音
      playNoise(0.95, 720, 'bandpass', 0.08, 0, 1.1);
      [261.63, 329.63, 392.0, 523.25, 659.25].forEach((f, idx) => {
        playTone('sine', f, f * 1.003, 0.72, 0.075, idx * 0.14);
      });
    } else if (sceneIndex === 1) {
      // Scene 2：飞艇启航巡览四岛 · 温暖铜管与木琴轻和弦
      playNoise(0.45, 980, 'bandpass', 0.09, 0, 1.4);
      [392.0, 440.0, 523.25, 659.25, 783.99].forEach((f, idx) => {
        playTone('triangle', f, f * 1.004, 0.48, 0.075, idx * 0.11);
      });
    } else if (sceneIndex === 2) {
      // Scene 3：热气球降临 + 星露弹弯道弹射 · 蓄力叮声与星辉回响
      playTone('sine', 523.25, 783.99, 0.22, 0.09, 0.05);
      playTone('triangle', 659.25, 1318.51, 0.28, 0.095, 0.72);
      [1046.5, 1318.51, 1567.98].forEach((f, idx) => {
        playTone('sine', f, f * 1.01, 0.42, 0.08, 0.92 + idx * 0.07);
      });
    } else if (sceneIndex === 3) {
      // Scene 4：拨云见日 · 标题绽放璀璨大九和弦
      playNoise(0.65, 1280, 'bandpass', 0.1, 0, 1.2);
      [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.51].forEach((f, idx) => {
        playTone('triangle', f, f, 0.68, 0.09, idx * 0.065);
        playTone('sine', f * 2, f * 2, 0.46, 0.04, idx * 0.065);
      });
    }
  }

  CB.audio = {
    unlock,
    suspendAudio,
    resumeAudio,
    setMuted,
    playShoot,
    playChargeCue,
    playRicochet,
    playHit,
    playGuardDefeat,
    playBreak,
    playGuardState,
    playCoin,
    playWeaponSwitch,
    playDash,
    playPlayerHurt,
    playLockTick,
    playChestOpen,
    playCurioPickup,
    playVaultAlarm,
    playWatchStart,
    playWatchTick,
    playExtractSuccess,
    playRunFail,
    playPrismSplit,
    playPrismRotate,
    playPollenBurst,
    playSneeze,
    playChimeChord,
    playGateOpen,
    playVortexSpawn,
    playSlingshotCharge,
    playSlingshotCrit,
    playPolarityFlip,
    playSplitBounce,
    playRepelWave,
    playDewSlide,
    playCratePush,
    playCrateClack,
    playShieldClang,
    playShieldBreak,
    playRoughScrape,
    playFrogHop,
    playStarVolley,
    playRailingBreak,
    playCliffDrop,
    playMonsterClack,
    playWindGust,
    playBountyChime,
    playUiClick,
    playUiLocked,
    playUpgradeBuy,
    setAmbienceStage,
    setAmbienceGust,
    playGustStart,
    playIntroCue,
  };
})();
