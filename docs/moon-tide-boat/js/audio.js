window.MT = window.MT || {};

// 六大纪元动态 Web Audio 合成配乐与音效引擎（零外部音频资产）
window.MT.Audio = (function () {
  var ctx = null;
  var master = null;
  var underwaterFilter = null;
  var comp = null;
  var delayNode = null;
  var delayFeedback = null;
  var ambGain = null;
  var ambFilter = null;
  var boostGain = null;
  var boostFilter = null;
  var iceScrapeGain = null;
  var iceScrapeFilter = null;
  var grindGain = null;
  var grindOsc = null;
  var musicBus = null;
  var sfxBus = null;
  var motorOsc = null;
  var motorSubOsc = null;
  var motorGain = null;
  var motorFilter = null;
  var lapGain = null;
  var lapFilter = null;

  var initialized = false;
  var muted = false;
  var musicVol = 0.85;
  var sfxVol = 0.90;
  var currentEraId = 'moon_sea';
  var musicTimer = 0.6;
  var padTimer = 0.2;
  var drumTimer = 0.8;
  var chordIndex = 0;
  var musicLevel = 1;
  var moonDescent = 0;
  var climaxTension = 0;
  var seaMood = 'surface'; // surface | boil | ash | kelp | ascent | dawn
  var lastPickTime = 0;
  var pickStep = 0;
  var lastSteamTime = 0;
  var lastSpringTime = 0;

  // 六大纪元和声、音色与环境声场配置
  var ERA_SCORES = {
    // 第 2 海域 · 霜穹冰海：清透极光水晶竖琴与冰蓝和声（Dmaj9 / Em9 / Bm9 / Gmaj7）
    frost_sea: {
      ambType: 'bandpass', ambFreq: 680, ambQ: 1.1, ambVol: 0.14,
      delayFb: 0.44, beat: 1.95,
      chords: [
        { bass: 146.83, notes: [293.66, 369.99, 440.00, 554.37, 659.25, 880.00] },
        { bass: 164.81, notes: [329.63, 392.00, 493.88, 587.33, 739.99, 987.77] },
        { bass: 123.47, notes: [246.94, 329.63, 369.99, 440.00, 587.33, 739.99] },
        { bass: 196.00, notes: [293.66, 369.99, 493.88, 587.33, 739.99, 880.00] }
      ]
    },
    // 纪元 I · 月潮之海：温暖毛毡钢琴 Dmaj9 + 温柔海浪底噪
    moon_sea: {
      ambType: 'lowpass', ambFreq: 420, ambQ: 0.7, ambVol: 0.17,
      delayFb: 0.34,
      chords: [
        { bass: 146.83, notes: [293.66, 369.99, 440.00, 554.37, 659.25, 739.99] },
        { bass: 123.47, notes: [246.94, 329.63, 369.99, 440.00, 554.37, 659.25] },
        { bass: 196.00, notes: [293.66, 369.99, 440.00, 493.88, 587.33, 739.99] },
        { bass: 164.81, notes: [293.66, 329.63, 440.00, 554.37, 659.25, 739.99] }
      ]
    },
    // 纪元 II · 陨落火海：D 弗里吉亚小调 + 低沉火山心跳鼓 + 炽热轰鸣
    fire_sea: {
      ambType: 'lowpass', ambFreq: 250, ambQ: 1.1, ambVol: 0.21,
      delayFb: 0.30,
      chords: [
        { bass: 110.00, notes: [220.00, 233.08, 293.66, 329.63, 440.00, 523.25] },
        { bass: 116.54, notes: [233.08, 293.66, 349.23, 440.00, 523.25, 587.33] },
        { bass: 98.00,  notes: [196.00, 233.08, 293.66, 349.23, 440.00, 523.25] },
        { bass: 110.00, notes: [220.00, 261.63, 329.63, 440.00, 493.88, 587.33] }
      ]
    },
    // 纪元 III · 尘冬冰原：F# 小调晶莹冰风铃 + 清冽寒风过滤层
    ice_winter: {
      ambType: 'bandpass', ambFreq: 960, ambQ: 2.2, ambVol: 0.13,
      delayFb: 0.46,
      chords: [
        { bass: 185.00, notes: [369.99, 440.00, 554.37, 659.25, 739.99, 880.00] },
        { bass: 146.83, notes: [293.66, 369.99, 440.00, 554.37, 659.25, 880.00] },
        { bass: 164.81, notes: [329.63, 415.30, 493.88, 659.25, 739.99, 987.77] },
        { bass: 138.59, notes: [277.18, 369.99, 440.00, 554.37, 659.25, 830.61] }
      ]
    },
    // 纪元 IV · 融冰荒土：A 多利亚空灵拨弦 + 苍茫干风
    thawed_wasteland: {
      ambType: 'bandpass', ambFreq: 520, ambQ: 1.5, ambVol: 0.14,
      delayFb: 0.42,
      chords: [
        { bass: 110.00, notes: [220.00, 261.63, 329.63, 369.99, 440.00, 523.25] },
        { bass: 146.83, notes: [220.00, 293.66, 369.99, 440.00, 587.33, 659.25] },
        { bass: 130.81, notes: [261.63, 329.63, 392.00, 493.88, 587.33, 659.25] },
        { bass: 123.47, notes: [246.94, 293.66, 369.99, 440.00, 523.25, 659.25] }
      ]
    },
    // 纪元 V · 萌芽青野：G 利底亚明快暖阳钢琴与悠扬长笛 + 细雨丝
    sprout_meadow: {
      ambType: 'bandpass', ambFreq: 1680, ambQ: 0.9, ambVol: 0.08,
      delayFb: 0.34,
      chords: [
        { bass: 196.00, notes: [293.66, 369.99, 392.00, 493.88, 587.33, 739.99] },
        { bass: 164.81, notes: [329.63, 392.00, 493.88, 587.33, 659.25, 783.99] },
        { bass: 130.81, notes: [261.63, 329.63, 392.00, 493.88, 587.33, 739.99] },
        { bass: 146.83, notes: [293.66, 369.99, 440.00, 587.33, 659.25, 783.99] }
      ]
    },
    // 纪元 VI · 巨木林海：E 大调宫崎骏风温暖弦乐交响 + 钢片琴星辉
    giant_forest: {
      ambType: 'lowpass', ambFreq: 640, ambQ: 0.6, ambVol: 0.11,
      delayFb: 0.44,
      chords: [
        { bass: 164.81, notes: [329.63, 415.30, 493.88, 622.25, 659.25, 830.61] },
        { bass: 138.59, notes: [277.18, 329.63, 415.30, 493.88, 659.25, 830.61] },
        { bass: 220.00, notes: [329.63, 415.30, 440.00, 554.37, 659.25, 880.00] },
        { bass: 123.47, notes: [246.94, 329.63, 415.30, 493.88, 622.25, 739.99] }
      ]
    }
  };

  function getScore() {
    return ERA_SCORES[currentEraId] || ERA_SCORES.moon_sea;
  }

  function getChord() {
    var sc = getScore();
    return sc.chords[chordIndex % sc.chords.length];
  }

  function createNoiseBuffer(audioCtx, seconds, pink) {
    var len = Math.floor(audioCtx.sampleRate * seconds);
    var buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    var data = buf.getChannelData(0);
    var b0 = 0, b1 = 0, b2 = 0;
    for (var i = 0; i < len; i++) {
      var w = Math.random() * 2 - 1;
      if (pink) {
        b0 = 0.997 * b0 + w * 0.029;
        b1 = 0.985 * b1 + w * 0.032;
        b2 = 0.950 * b2 + w * 0.048;
        data[i] = (b0 + b1 + b2 + w * 0.14) * 0.62;
      } else {
        data[i] = w;
      }
    }
    return buf;
  }

  function init() {
    if (initialized) {
      if (ctx && ctx.state === 'suspended') {
        try { ctx.resume(); } catch (e) {}
      }
      return;
    }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();

    // 柔和母带压缩器，杜绝多音轨叠加破音
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 18;
    comp.ratio.value = 4;
    comp.attack.value = 0.01;
    comp.release.value = 0.22;

    underwaterFilter = ctx.createBiquadFilter();
    underwaterFilter.type = 'lowpass';
    underwaterFilter.frequency.value = 18000;
    underwaterFilter.Q.value = 0.7;

    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.84;
    master.connect(underwaterFilter);
    underwaterFilter.connect(comp);
    comp.connect(ctx.destination);

    musicBus = ctx.createGain();
    musicBus.gain.value = musicVol;
    musicBus.connect(master);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = sfxVol;
    sfxBus.connect(master);

    // 柔和星海回声延迟总线
    delayNode = ctx.createDelay(1.2);
    delayNode.delayTime.value = 0.36;
    delayFeedback = ctx.createGain();
    delayFeedback.gain.value = 0.34;
    var delayLP = ctx.createBiquadFilter();
    delayLP.type = 'lowpass';
    delayLP.frequency.value = 1550;
    var delayWet = ctx.createGain();
    delayWet.gain.value = 0.30;

    delayNode.connect(delayLP);
    delayLP.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayLP.connect(delayWet);
    delayWet.connect(musicBus);

    // 1. 六纪元无缝形变环境声场（受音乐音量总线平滑控制）
    var ambSrc = ctx.createBufferSource();
    ambSrc.buffer = createNoiseBuffer(ctx, 4.5, true);
    ambSrc.loop = true;
    ambFilter = ctx.createBiquadFilter();
    ambFilter.type = 'lowpass';
    ambFilter.frequency.value = 420;
    ambFilter.Q.value = 0.7;
    ambGain = ctx.createGain();
    ambGain.gain.value = 0.16;
    ambSrc.connect(ambFilter);
    ambFilter.connect(ambGain);
    ambGain.connect(musicBus);
    ambSrc.start();

    // 1b. Q 版小潜艇水下轻柔螺旋桨马达嘟嘟声（随航速 propSpinRate 柔和脉动，静止自动静默！）
    motorOsc = ctx.createOscillator();
    motorOsc.type = 'triangle';
    motorOsc.frequency.value = 68;
    motorSubOsc = ctx.createOscillator();
    motorSubOsc.type = 'sine';
    motorSubOsc.frequency.value = 136;
    motorFilter = ctx.createBiquadFilter();
    motorFilter.type = 'lowpass';
    motorFilter.frequency.value = 210;
    motorGain = ctx.createGain();
    motorGain.gain.value = 0.0001;
    var motorSubG = ctx.createGain();
    motorSubG.gain.value = 0.25;
    motorOsc.connect(motorFilter);
    motorSubOsc.connect(motorSubG); motorSubG.connect(motorFilter);
    motorFilter.connect(motorGain);
    motorGain.connect(sfxBus);
    motorOsc.start(); motorSubOsc.start();

    // 1c. 海面木舟轻拍水波与深潜水流沙沙声层
    var lapSrc = ctx.createBufferSource();
    lapSrc.buffer = createNoiseBuffer(ctx, 3.2, true);
    lapSrc.loop = true;
    lapFilter = ctx.createBiquadFilter();
    lapFilter.type = 'bandpass';
    lapFilter.frequency.value = 720;
    lapFilter.Q.value = 1.2;
    lapGain = ctx.createGain();
    lapGain.gain.value = 0.0001;
    lapSrc.connect(lapFilter);
    lapFilter.connect(lapGain);
    lapGain.connect(sfxBus);
    lapSrc.start();

    // 2. 推进火箭柔和气流喷射层
    var boostSrc = ctx.createBufferSource();
    boostSrc.buffer = createNoiseBuffer(ctx, 2.5, false);
    boostSrc.loop = true;
    boostFilter = ctx.createBiquadFilter();
    boostFilter.type = 'bandpass';
    boostFilter.frequency.value = 340;
    boostFilter.Q.value = 1.4;
    boostGain = ctx.createGain();
    boostGain.gain.value = 0.0001;
    boostSrc.connect(boostFilter);
    boostFilter.connect(boostGain);
    boostGain.connect(master);
    boostSrc.start();

    // 3. 冰原滑行清脆冰刃刮冰声层（随速度与压坡实时呼吸）
    var iceSrc = ctx.createBufferSource();
    iceSrc.buffer = createNoiseBuffer(ctx, 2.2, false);
    iceSrc.loop = true;
    iceScrapeFilter = ctx.createBiquadFilter();
    iceScrapeFilter.type = 'bandpass';
    iceScrapeFilter.frequency.value = 3400;
    iceScrapeFilter.Q.value = 3.2;
    iceScrapeGain = ctx.createGain();
    iceScrapeGain.gain.value = 0.0001;
    iceSrc.connect(iceScrapeFilter);
    iceScrapeFilter.connect(iceScrapeGain);
    iceScrapeGain.connect(master);
    iceSrc.start();

    // 4. 滑轨高速滑行清亮共鸣声层
    grindOsc = ctx.createOscillator();
    grindOsc.type = 'triangle';
    grindOsc.frequency.value = 390;
    var grindBP = ctx.createBiquadFilter();
    grindBP.type = 'bandpass';
    grindBP.frequency.value = 1280;
    grindBP.Q.value = 1.8;
    grindGain = ctx.createGain();
    grindGain.gain.value = 0.0001;
    grindOsc.connect(grindBP);
    grindBP.connect(grindGain);
    grindGain.connect(master);
    grindOsc.start();

    initialized = true;
  }

  // 毛毡钢琴音色（月潮之海 / 萌芽青野 / 通用点缀）
  function playFeltNote(freq, vol, dur, delayOffset, bright) {
    if (!initialized || muted) return;
    var now = ctx.currentTime + (delayOffset || 0);
    var osc = ctx.createOscillator();
    var sub = ctx.createOscillator();
    var flt = ctx.createBiquadFilter();
    var g = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    sub.type = 'sine';
    sub.frequency.setValueAtTime(freq * 2, now);

    var subG = ctx.createGain();
    subG.gain.value = 0.15;

    flt.type = 'lowpass';
    flt.frequency.setValueAtTime(bright || 1240, now);
    flt.frequency.exponentialRampToValueAtTime(340, now + dur);

    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(flt);
    sub.connect(subG); subG.connect(flt);
    flt.connect(g);
    g.connect(musicBus || master);
    g.connect(delayNode);

    osc.start(now); sub.start(now);
    osc.stop(now + dur + 0.06); sub.stop(now + dur + 0.06);
  }

  // 纪元 II 火山低频太鼓心跳
  function playFireDrum(vol, pitch) {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch || 96, now);
    osc.frequency.exponentialRampToValueAtTime(36, now + 0.38);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(vol || 0.14, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    osc.connect(g); g.connect(sfxBus || master);
    osc.start(now); osc.stop(now + 0.45);
  }

  // 纪元 III 冰原晶莹风铃 / 钟琴泛音
  function playIceChime(freq, vol, dur, delayOffset) {
    if (!initialized || muted) return;
    var now = ctx.currentTime + (delayOffset || 0);
    var o1 = ctx.createOscillator();
    var o2 = ctx.createOscillator();
    var g = ctx.createGain();
    var g2 = ctx.createGain();

    o1.type = 'sine';
    o1.frequency.setValueAtTime(freq, now);
    o2.type = 'sine';
    o2.frequency.setValueAtTime(freq * 2.756, now); // 金属风铃非整数泛音
    g2.gain.value = 0.22;

    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    o1.connect(g);
    o2.connect(g2); g2.connect(g);
    g.connect(sfxBus || master);
    g.connect(delayNode);

    o1.start(now); o2.start(now);
    o1.stop(now + dur + 0.05); o2.stop(now + dur + 0.05);
  }

  // 纪元 IV 荒土空灵拨弦
  function playPluckNote(freq, vol, dur, delayOffset) {
    if (!initialized || muted) return;
    var now = ctx.currentTime + (delayOffset || 0);
    var osc = ctx.createOscillator();
    var flt = ctx.createBiquadFilter();
    var g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);
    flt.type = 'lowpass';
    flt.frequency.setValueAtTime(2100, now);
    flt.frequency.exponentialRampToValueAtTime(280, now + Math.min(0.65, dur));
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(flt); flt.connect(g);
    g.connect(sfxBus || master); g.connect(delayNode);
    osc.start(now); osc.stop(now + dur + 0.05);
  }

  // 纪元 V 暖春悠扬长笛
  function playFluteNote(freq, vol, dur, delayOffset) {
    if (!initialized || muted) return;
    var now = ctx.currentTime + (delayOffset || 0);
    var osc = ctx.createOscillator();
    var vib = ctx.createOscillator();
    var vibG = ctx.createGain();
    var g = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    vib.type = 'sine';
    vib.frequency.value = 5.2;
    vibG.gain.value = freq * 0.009;
    vib.connect(vibG); vibG.connect(osc.frequency);

    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.24);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(g); g.connect(musicBus || master); g.connect(delayNode);
    osc.start(now); vib.start(now);
    osc.stop(now + dur + 0.08); vib.stop(now + dur + 0.08);
  }

  // 纪元 VI 宫崎骏风温暖宽广弦乐铺底
  function playWarmString(freq, vol, dur, delayOffset) {
    if (!initialized || muted) return;
    var now = ctx.currentTime + (delayOffset || 0);
    var o1 = ctx.createOscillator();
    var o2 = ctx.createOscillator();
    var flt = ctx.createBiquadFilter();
    var g = ctx.createGain();

    o1.type = 'sawtooth'; o1.frequency.setValueAtTime(freq * 0.996, now);
    o2.type = 'sawtooth'; o2.frequency.setValueAtTime(freq * 1.004, now);
    flt.type = 'lowpass';
    flt.frequency.setValueAtTime(620, now);
    flt.frequency.linearRampToValueAtTime(1180, now + dur * 0.45);
    flt.frequency.linearRampToValueAtTime(520, now + dur);

    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(vol, now + Math.min(0.9, dur * 0.32));
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    o1.connect(flt); o2.connect(flt);
    flt.connect(g); g.connect(musicBus || master); g.connect(delayNode);
    o1.start(now); o2.start(now);
    o1.stop(now + dur + 0.08); o2.stop(now + dur + 0.08);
  }

  // === 核心动作与纪元专属音效 ===
  function setBoosting(active, fuelRatio) {
    if (!initialized || !boostGain) return;
    var now = ctx.currentTime;
    var target = (!muted && active) ? (0.068 + Math.min(1, fuelRatio || 0) * 0.032) : 0.0001;
    boostGain.gain.setTargetAtTime(target, now, 0.08);
    boostFilter.frequency.setTargetAtTime(280 + (fuelRatio || 0) * 300, now, 0.10);
    if (!active && iceScrapeGain && fuelRatio === 0) {
      iceScrapeGain.gain.setTargetAtTime(0.0001, now, 0.06);
    }
    if (!active && grindGain && fuelRatio === 0) {
      grindGain.gain.setTargetAtTime(0.0001, now, 0.05);
    }
  }

  function setGrinding(active, style, speedRatio) {
    if (!initialized || !grindGain || !grindOsc) return;
    var now = ctx.currentTime;
    var target = (!muted && active) ? (0.026 + Math.min(1, speedRatio || 0.5) * 0.024) : 0.0001;
    grindGain.gain.setTargetAtTime(target, now, 0.04);
    var baseHz = style === 'ice_bridge' ? 540 : (style === 'root_rail' ? 330 : 420);
    grindOsc.frequency.setTargetAtTime(baseHz + (speedRatio || 0) * 190, now, 0.06);
  }

  // 潜海实时水下闷音低通滤波（0=水面清澈 18000Hz，1=深海温润沉浸 620Hz）
  function setUnderwater(ratio) {
    if (!initialized || !underwaterFilter) return;
    var r = Math.max(0, Math.min(1, ratio || 0));
    var targetHz = 18000 * Math.pow(620 / 18000, r);
    underwaterFilter.frequency.setTargetAtTime(targetHz, ctx.currentTime, 0.08);
  }

  function playDiveIn(strength) {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    var s = Math.max(0.4, Math.min(1.2, strength || 0.8));
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(68, now + 0.24);
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.11 * s, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    osc.connect(g); g.connect(sfxBus || master);
    osc.start(now); osc.stop(now + 0.30);
    playSplash(0.65 * s);
  }

  function playBreach(charge) {
    if (!initialized || muted) return;
    var ch = Math.max(0.2, Math.min(1.0, charge || 0.5));
    setUnderwater(0);
    playSplash(0.9 + ch * 0.5);
    var c = getChord();
    playFeltNote(c.notes[2], 0.055 * (0.7 + ch * 0.4), 1.6, 0, 1620);
    playIceChime(c.notes[4], 0.044 * (0.7 + ch * 0.4), 2.0, 0.05);
    if (ch >= 0.70) {
      playIceChime(c.notes[5] * 1.25, 0.042, 2.3, 0.12);
    }
  }

  function playWhaleBounce() {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(165, now);
    osc.frequency.exponentialRampToValueAtTime(295, now + 0.28);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.65);
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.085, now + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.72);
    osc.connect(g); g.connect(sfxBus || master); g.connect(delayNode);
    osc.start(now); osc.stop(now + 0.76);
    playSplash(0.85);
    playIceChime(getChord().notes[4], 0.042, 1.5, 0.05);
  }

  function playFeverIgnite() {
    if (!initialized || muted) return;
    var c = getChord();
    playFeltNote(c.bass * 2, 0.065, 2.0, 0, 1650);
    playIceChime(c.notes[2], 0.048, 2.2, 0.05);
    playIceChime(c.notes[4], 0.050, 2.4, 0.12);
    playIceChime(c.notes[5] * 1.25, 0.046, 2.6, 0.20);
  }

  // 沉海古钟清越共鸣钟声（基频 + 铜钟非整数泛音长尾）
  function playBellChime() {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    var freqs = [293.66, 587.33, 880.0, 1408.0];
    var vols  = [0.085, 0.055, 0.036, 0.022];
    var durs  = [3.4, 2.6, 1.9, 1.3];
    for (var i = 0; i < freqs.length; i++) {
      var osc = ctx.createOscillator();
      var g = ctx.createGain();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freqs[i], now);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(vols[i], now + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, now + durs[i]);
      osc.connect(g); g.connect(sfxBus || master); g.connect(delayNode);
      osc.start(now); osc.stop(now + durs[i] + 0.06);
    }
  }

  // 拾取沉海遗物专属星辉琶音
  function playRelicFound() {
    if (!initialized || muted) return;
    var notes = [369.99, 440.00, 554.37, 659.25, 880.00, 1108.73];
    notes.forEach(function (f, idx) {
      playFeltNote(f, 0.052, 2.2, idx * 0.075, 1750);
      playIceChime(f * 1.5, 0.030, 2.6, idx * 0.075 + 0.03);
    });
  }

  function setClimaxTension(tension) {
    climaxTension = Math.max(0, Math.min(1, tension || 0));
  }

  function setSeaMood(mood) {
    seaMood = mood || 'surface';
  }

  // 乘海底上升大洋流破晓重返海面的史诗弦乐齐鸣！
  function playDawnAscentFanfare() {
    if (!initialized || muted) return;
    setUnderwater(0);
    setClimaxTension(0);
    playWarmString(146.83, 0.068, 5.4, 0.00); // D3
    playWarmString(220.00, 0.052, 5.2, 0.22); // A3
    playWarmString(293.66, 0.046, 5.0, 0.44); // D4
    playWarmString(369.99, 0.042, 4.8, 0.68); // F#4
    var notes = [293.66, 369.99, 440.00, 587.33, 739.99, 880.00];
    notes.forEach(function (f, i) {
      playIceChime(f, 0.036, 2.8, 0.14 + i * 0.12);
    });
  }

  // 震碎深海月核矿柱清脆晶体爆裂和弦
  function playCrystalShatter() {
    if (!initialized || muted) return;
    playWoodSmash();
    var c = getChord();
    playIceChime(c.notes[2] * 1.5, 0.048, 2.0, 0.00);
    playIceChime(c.notes[4] * 1.5, 0.044, 2.2, 0.05);
    playIceChime(c.notes[5] * 2.0, 0.036, 2.4, 0.11);
  }

  function playTidalRoar() {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    var src = ctx.createBufferSource();
    src.buffer = createNoiseBuffer(ctx, 1.4, true);
    var flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.setValueAtTime(180, now);
    flt.frequency.linearRampToValueAtTime(620, now + 0.55);
    flt.frequency.exponentialRampToValueAtTime(160, now + 1.35);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.15, now + 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.38);
    src.connect(flt); flt.connect(g); g.connect(sfxBus || master);
    src.start(now); src.stop(now + 1.4);
    playFireDrum(0.16, 72);
  }

  function playMeteorSplash() {
    if (!initialized || muted) return;
    playFireDrum(0.14, 108);
    playSplash(0.85);
  }

  // 关卡通关清澄胜利和弦（Dmaj9 暖阳绽放）
  function playStageClear() {
    if (!initialized || muted) return;
    setUnderwater(0);
    setClimaxTension(0);
    playWarmString(146.83, 0.064, 5.2, 0.00);
    playWarmString(220.00, 0.048, 5.0, 0.18);
    playWarmString(293.66, 0.044, 4.8, 0.36);
    var arp = [293.66, 369.99, 440.00, 554.37, 659.25, 739.99, 880.00];
    arp.forEach(function (f, idx) {
      playFeltNote(f, 0.052, 2.8, 0.08 + idx * 0.14, 1680);
      if (idx >= 2) playIceChime(f * 1.5, 0.028, 2.6, 0.16 + idx * 0.14);
    });
  }

  // 第 2 关：踩踏玄武岩浮板跳跃音效（低沉火山岩敲击 + 连跳递升清音）
  function playBasaltStep(chain) {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    var ch = Math.max(1, Math.min(5, chain || 1));
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(145 + ch * 16, now);
    osc.frequency.exponentialRampToValueAtTime(58, now + 0.11);
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.11, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    osc.connect(g); g.connect(sfxBus || master);
    osc.start(now); osc.stop(now + 0.14);

    var c = getChord();
    var note = c.notes[(ch - 1) % c.notes.length];
    playFeltNote(note, 0.040, 1.3, 0.02, 1380);
  }

  function playGeyserErupt() {
    if (!initialized || muted) return;
    playSteamRefill(0.95);
    var c = getChord();
    playIceChime(c.notes[3], 0.036, 1.6, 0.04);
  }

  function playBrazierIgnite() {
    if (!initialized || muted) return;
    playFireDrum(0.16, 92);
    playSteamRefill(1.1);
    var c = getChord();
    playFeltNote(c.notes[0], 0.055, 2.2, 0.02, 1520);
    playFeltNote(c.notes[2], 0.052, 2.4, 0.10, 1660);
    playIceChime(c.notes[4] * 1.25, 0.044, 2.6, 0.18);
  }

  // 破水撞碎海面残木/浮障音效（厚实木裂脆响 + 水花四溅）
  function playWoodSmash() {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.14);
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(980, now);
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.12, now + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.connect(lp); lp.connect(g); g.connect(sfxBus || master);
    osc.start(now); osc.stop(now + 0.18);

    var src = ctx.createBufferSource();
    src.buffer = createNoiseBuffer(ctx, 0.24, false);
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1450, now);
    bp.Q.value = 1.4;
    var ng = ctx.createGain();
    ng.gain.setValueAtTime(0.001, now);
    ng.gain.linearRampToValueAtTime(0.09, now + 0.008);
    ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    src.connect(bp); bp.connect(ng); ng.connect(sfxBus || master);
    src.start(now); src.stop(now + 0.24);

    playSplash(0.85);
    var c = getChord();
    playFeltNote(c.notes[2], 0.045, 1.4, 0.02, 1480);
  }

  // 乘入高空月雾云带滑翔风铃清音
  function playCloudGlide() {
    if (!initialized || muted) return;
    var c = getChord();
    playIceChime(c.notes[3], 0.036, 2.2, 0.00);
    playIceChime(c.notes[5], 0.032, 2.4, 0.09);
  }

  // 深海低气息水压心跳脉冲
  function playPressurePulse() {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(76, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.16);
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.095, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    osc.connect(g); g.connect(sfxBus || master);
    osc.start(now); osc.stop(now + 0.20);
  }

  // 潮汐声呐清澈水下回响脉冲
  function playSonarPing() {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.5, now);
    osc.frequency.exponentialRampToValueAtTime(987.77, now + 0.45);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.045, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);
    osc.connect(g); g.connect(sfxBus || master); g.connect(delayNode);
    osc.start(now); osc.stop(now + 1.0);
  }

  // 高空风帆 Lv.3 踏云二段跳清脆风铃托举音
  function playCloudJump() {
    if (!initialized || muted) return;
    var c = getChord();
    playUpdraft();
    playIceChime(c.notes[2], 0.042, 1.8, 0.00);
    playIceChime(c.notes[4], 0.046, 2.0, 0.06);
    playIceChime(c.notes[5] * 1.25, 0.038, 2.2, 0.13);
  }

  // 深潜鱼鳍 Lv.2+ 炸浪冲击波低频爆发
  function playBreachShockwave() {
    if (!initialized || muted) return;
    playFireDrum(0.18, 66);
    playSplash(1.25);
    var c = getChord();
    playFeltNote(c.notes[1], 0.052, 1.8, 0.02, 1520);
    playIceChime(c.notes[4], 0.044, 2.2, 0.08);
  }

  // 落月撞击海面史诗闷雷与深海震波
  function playImpactBoom() {
    if (!initialized || muted) return;
    playFireDrum(0.24, 52);
    playTidalRoar();
    var now = ctx.currentTime;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(118, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.95);
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.18, now + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.05);
    osc.connect(g); g.connect(sfxBus || master);
    osc.start(now); osc.stop(now + 1.1);
  }

  // 深海鱼鳍流体冲刺水切音效
  function playHydroDash() {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    var src = ctx.createBufferSource();
    src.buffer = createNoiseBuffer(ctx, 0.32, false);
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(520, now);
    bp.frequency.exponentialRampToValueAtTime(1280, now + 0.18);
    bp.Q.value = 1.6;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.085, now + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.30);
    src.connect(bp); bp.connect(g); g.connect(sfxBus || master);
    src.start(now); src.stop(now + 0.32);
    playDiveIn(0.65);
  }

  // 钻入倒扣沉船气室：清澈甘甜的回气气泡和弦
  function playAirPocketRefill() {
    if (!initialized || muted) return;
    var c = getChord();
    playFeltNote(c.notes[1], 0.052, 1.8, 0.00, 1560);
    playIceChime(c.notes[3], 0.044, 2.2, 0.06);
    playIceChime(c.notes[5], 0.042, 2.4, 0.14);
  }

  // 深渊远方悠远低沉巨鲸鸣唱
  function playDeepWhaleSong() {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(124, now);
    osc.frequency.exponentialRampToValueAtTime(168, now + 0.85);
    osc.frequency.exponentialRampToValueAtTime(98, now + 2.4);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.055, now + 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 2.55);
    osc.connect(g); g.connect(sfxBus || master); g.connect(delayNode);
    osc.start(now); osc.stop(now + 2.65);
  }

  function playSardineShimmer() {
    if (!initialized || muted) return;
    var c = getChord();
    playIceChime(c.notes[3], 0.028, 1.3, 0.00);
    playIceChime(c.notes[4], 0.026, 1.4, 0.04);
    playIceChime(c.notes[5], 0.024, 1.5, 0.08);
  }

  function playMantaGlide() {
    if (!initialized || muted) return;
    var c = getChord();
    playWarmString(c.notes[1], 0.036, 2.2, 0.00);
    playIceChime(c.notes[4], 0.032, 2.0, 0.06);
  }

  function playAnglerBanish() {
    if (!initialized || muted) return;
    playWoodSmash();
    var c = getChord();
    playFeltNote(c.notes[4], 0.052, 1.6, 0.05, 1620);
  }

  // 归港系缆温馨木铃与暖和弦
  // 水下变形为可爱小潜艇的清脆泡泡机械轻音
  // Q版小潜艇主动声呐共振脉冲（清澈双泛音水下叮咚回响）
  function playActiveSonarPing() {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    var c = getChord();
    var baseF = (c && c.notes && c.notes[3]) ? c.notes[3] * 1.5 : 880;

    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseF, now);
    osc.frequency.exponentialRampToValueAtTime(baseF * 0.96, now + 0.55);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.062, now + 0.014);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);
    osc.connect(g); g.connect(sfxBus || master); g.connect(delayNode);
    osc.start(now); osc.stop(now + 1.2);

    playIceChime(baseF * 1.5, 0.028, 1.5, 0.06);
  }

  // 声呐唤醒生态/洞窟奇观后的音乐回响共鸣和弦（sardine | bell | crystal | whale）
  function playResonanceChord(kind) {
    if (!initialized || muted) return;
    var c = getChord();
    if (kind === 'bell') {
      playBronzeBell(0.75);
      playIceChime(c.notes[4], 0.036, 2.2, 0.16);
    } else if (kind === 'crystal') {
      playIceChime(c.notes[2] * 1.5, 0.042, 2.2, 0.04);
      playIceChime(c.notes[4] * 1.5, 0.040, 2.4, 0.12);
      playIceChime(c.notes[5] * 2.0, 0.034, 2.6, 0.22);
    } else if (kind === 'whale') {
      playDeepWhaleSong();
      playWarmString(c.notes[1], 0.038, 2.8, 0.12);
    } else {
      // sardine star-ring harp arpeggio
      playIceChime(c.notes[2], 0.032, 1.6, 0.02);
      playIceChime(c.notes[3], 0.034, 1.7, 0.08);
      playIceChime(c.notes[4], 0.036, 1.8, 0.14);
      playIceChime(c.notes[5], 0.032, 2.0, 0.21);
    }
  }

  // 实景绘本快照轻柔机械快门清音
  // 唤醒沉海月潮共鸣碑：1/3 -> 2/3 -> 3/3 逐级升华的空灵共鸣圣咏和弦
  // 晶洞深渊碑「声呐回声节拍二重唱」高辨识度三音阶提示音
  function playRhythmCue(stepIdx) {
    if (!initialized || muted) return;
    var freqs = [523.25, 659.25, 783.99]; // C5 -> E5 -> G5
    var f = freqs[Math.max(0, Math.min(2, stepIdx || 0))];
    playIceChime(f, 0.056, 1.8, 0.00);
    playFeltNote(f * 0.5, 0.042, 1.4, 0.02, 1600);
  }

  function playMoteSlot(stepIdx) {
    if (!initialized || muted) return;
    var freqs = [587.33, 739.99, 880.00];
    var f = freqs[Math.max(0, Math.min(2, stepIdx || 0))];
    playIceChime(f, 0.052, 2.0, 0.00);
    playIceChime(f * 1.5, 0.032, 2.2, 0.08);
  }

  function playShrineAwaken(count) {
    if (!initialized || muted) return;
    var c = getChord();
    var lv = Math.max(1, Math.min(3, count || 1));
    playWarmString(c.bass, 0.056, 4.2, 0.00);
    playFeltNote(c.notes[0], 0.050, 2.4, 0.02, 1480);
    playIceChime(c.notes[2], 0.044, 2.6, 0.12);
    if (lv >= 2) playIceChime(c.notes[4], 0.046, 2.8, 0.26);
    if (lv >= 3) {
      playWarmString(c.notes[1], 0.048, 5.2, 0.18);
      playIceChime(c.notes[5], 0.048, 3.2, 0.42);
      playIceChime(c.notes[2] * 2.0, 0.036, 3.4, 0.58);
    }
  }

  // 全唤醒后首次归港「暮光灯塔港 · 永久焕新」无字幕静谧终章弦乐齐鸣！
  function playHarborAwakenFinale() {
    if (!initialized || muted) return;
    setUnderwater(0);
    playWarmString(146.83, 0.072, 6.2, 0.00); // D3
    playWarmString(220.00, 0.056, 6.0, 0.26); // A3
    playWarmString(293.66, 0.050, 5.8, 0.52); // D4
    playWarmString(369.99, 0.044, 5.6, 0.80); // F#4
    var harp = [293.66, 329.63, 369.99, 440.00, 587.33, 659.25, 739.99, 880.00];
    harp.forEach(function (f, i) {
      playIceChime(f, 0.036, 3.2, 0.16 + i * 0.15);
    });
  }

  // 撞碎冰盖清脆水晶裂冰声
  function playIceCrack() {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    var src = ctx.createBufferSource();
    src.buffer = createNoiseBuffer(ctx, 0.24, false);
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1900, now);
    bp.Q.value = 1.6;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.11, now + 0.014);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    src.connect(bp); bp.connect(g); g.connect(sfxBus || master);
    src.start(now); src.stop(now + 0.24);
    playIceChime(1046.5, 0.044, 1.4, 0.01);
    playIceChime(1318.5, 0.036, 1.5, 0.06);
  }

  // 穿越跨海星潮航门的空灵极光过渡和弦
  // 声呐转动冰棱镜：清澈透明的六棱水晶折光音阶
  function playPrismRotate(isAligned) {
    if (!initialized || muted) return;
    if (isAligned) {
      playIceChime(880.0, 0.052, 2.2, 0.00);
      playIceChime(1174.66, 0.044, 2.4, 0.08);
      playIceChime(1318.51, 0.036, 2.6, 0.16);
    } else {
      playIceChime(659.25, 0.042, 1.4, 0.00);
      playIceChime(783.99, 0.032, 1.4, 0.06);
    }
  }

  function playPortalTransit() {
    if (!initialized || muted) return;
    setUnderwater(0);
    playWarmString(196.00, 0.058, 4.4, 0.00);
    playWarmString(293.66, 0.046, 4.2, 0.14);
    playIceChime(587.33, 0.042, 2.8, 0.06);
    playIceChime(783.99, 0.040, 2.8, 0.18);
    playIceChime(987.77, 0.038, 3.0, 0.30);
    playIceChime(1174.66, 0.032, 3.2, 0.44);
  }

  function playShutterSnap() {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    var src = ctx.createBufferSource();
    src.buffer = createNoiseBuffer(ctx, 0.08, false);
    var hp = ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.setValueAtTime(2400, now);
    hp.Q.value = 1.8;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.055, now + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    src.connect(hp); hp.connect(g); g.connect(sfxBus || master);
    src.start(now); src.stop(now + 0.08);
  }

  function playSubMorph(toSub) {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(toSub ? 320 : 210, now);
    osc.frequency.exponentialRampToValueAtTime(toSub ? 520 : 390, now + 0.14);
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.055, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    osc.connect(g); g.connect(sfxBus || master);
    osc.start(now); osc.stop(now + 0.20);
  }

  function playHarborMoor() {
    if (!initialized || muted) return;
    setUnderwater(0);
    var c = getChord();
    playFeltNote(c.notes[0], 0.048, 2.2, 0.00, 1320);
    playFeltNote(c.notes[2], 0.044, 2.4, 0.10, 1480);
    playIceChime(c.notes[4], 0.036, 2.6, 0.20);
  }

  function playBountyComplete() {
    if (!initialized || muted) return;
    var c = getChord();
    playFeltNote(c.notes[1], 0.055, 1.6, 0, 1520);
    playFeltNote(c.notes[3], 0.058, 1.8, 0.09, 1680);
    playIceChime(c.notes[5], 0.052, 2.4, 0.18);
  }

  function setIceScrape(speedRatio, carving) {
    if (!initialized || !iceScrapeGain) return;
    var now = ctx.currentTime;
    var r = Math.max(0, Math.min(1.2, speedRatio || 0));
    var target = (!muted && r > 0.05) ? (0.014 + r * 0.034 + (carving ? 0.026 : 0)) : 0.0001;
    iceScrapeGain.gain.setTargetAtTime(target, now, 0.05);
    iceScrapeFilter.frequency.setTargetAtTime(2700 + r * 1700 + (carving ? 850 : 0), now, 0.06);
  }

  function playIceLand(strength) {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    var s = Math.max(0.3, Math.min(1.3, strength || 0.7));
    // 清脆硬冰落地声（短促冰晶咔哒 + 高频冰屑摩擦）
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(165, now);
    osc.frequency.exponentialRampToValueAtTime(64, now + 0.085);
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.11 * s, now + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.10);
    osc.connect(g); g.connect(sfxBus || master);
    osc.start(now); osc.stop(now + 0.12);

    var src = ctx.createBufferSource();
    src.buffer = createNoiseBuffer(ctx, 0.18, false);
    var hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(2600, now);
    var ng = ctx.createGain();
    ng.gain.setValueAtTime(0.001, now);
    ng.gain.linearRampToValueAtTime(0.065 * s, now + 0.01);
    ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    src.connect(hp); hp.connect(ng); ng.connect(sfxBus || master);
    src.start(now); src.stop(now + 0.18);
  }

  function playSplash(strength) {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    var s = Math.max(0.25, Math.min(1.4, strength || 0.7));
    var src = ctx.createBufferSource();
    src.buffer = createNoiseBuffer(ctx, 0.42, true);
    var flt = ctx.createBiquadFilter();
    flt.type = 'bandpass';
    var baseFreq = currentEraId === 'thawed_wasteland' ? 320 : (currentEraId === 'ice_winter' ? 1150 : 620);
    flt.frequency.setValueAtTime(baseFreq, now);
    flt.frequency.exponentialRampToValueAtTime(baseFreq * 0.35, now + 0.34);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.11 * s, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
    src.connect(flt); flt.connect(g); g.connect(sfxBus || master);
    src.start(now); src.stop(now + 0.4);
  }

  function playSteamRefill(strength) {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    if (now - lastSteamTime < 0.25) return;
    lastSteamTime = now;
    var src = ctx.createBufferSource();
    src.buffer = createNoiseBuffer(ctx, 0.55, false);
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1400, now);
    bp.frequency.exponentialRampToValueAtTime(480, now + 0.48);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.075 * (strength || 0.8), now + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.52);
    src.connect(bp); bp.connect(g); g.connect(sfxBus || master);
    src.start(now); src.stop(now + 0.54);
  }

  function playOarStroke() {
    if (!initialized || muted) return;
    playSplash(0.32);
  }

  // 掠拾星火递增清脆音阶（自动对齐当前纪元调式）
  function playHookCatch() {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    if (now - lastPickTime > 1.35) pickStep = 0;
    else pickStep = (pickStep + 1) % 6;
    lastPickTime = now;

    var notes = getChord().notes;
    var freq = notes[pickStep % notes.length];
    if (currentEraId === 'ice_winter' || currentEraId === 'giant_forest') {
      playIceChime(freq * (pickStep >= 4 ? 1.5 : 1), 0.042, 1.35, 0);
    } else if (currentEraId === 'thawed_wasteland') {
      playPluckNote(freq, 0.048, 0.9, 0);
    } else {
      playFeltNote(freq, 0.052, 1.15, 0, 1520);
    }
  }

  function playSpringBounce() {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    if (now - lastSpringTime < 0.16) return;
    lastSpringTime = now;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.exponentialRampToValueAtTime(360, now + 0.16);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.28);
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.11, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.30);
    osc.connect(g); g.connect(sfxBus || master);
    osc.start(now); osc.stop(now + 0.32);
    playFeltNote(getChord().notes[3], 0.036, 0.9, 0.02, 1480);
  }

  function playVineSlice() {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    var src = ctx.createBufferSource();
    src.buffer = createNoiseBuffer(ctx, 0.24, false);
    var hp = ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.setValueAtTime(2200, now);
    hp.frequency.exponentialRampToValueAtTime(740, now + 0.20);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.12, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    src.connect(hp); hp.connect(g); g.connect(sfxBus || master);
    src.start(now); src.stop(now + 0.24);

    var n = getChord().notes;
    playIceChime(n[2], 0.048, 1.5, 0.02);
    playIceChime(n[5], 0.044, 1.9, 0.09);
  }

  function playUpdraft() {
    if (!initialized || muted) return;
    var n = getChord().notes;
    playFluteNote(n[2], 0.042, 1.4, 0);
    playFluteNote(n[4], 0.038, 1.6, 0.16);
  }

  function playMountChord(kind, celebrate) {
    if (!initialized || muted) return;
    var c = getChord();
    playFeltNote(c.bass, 0.068, 2.4, 0, 880);
    playFeltNote(c.notes[1], 0.052, 2.1, 0.06, 1340);
    playFeltNote(c.notes[3], 0.050, 2.3, 0.13, 1520);
    if (celebrate) {
      playIceChime(c.notes[5], 0.044, 2.8, 0.21);
    }
  }

  function playEraFanfare(eraId) {
    if (!initialized || muted) return;
    if (eraId && ERA_SCORES[eraId]) currentEraId = eraId;
    var c = getChord();
    if (currentEraId === 'fire_sea') {
      playFireDrum(0.20, 88);
      playWarmString(c.bass, 0.065, 3.2, 0.05);
      playFeltNote(c.notes[2], 0.055, 2.4, 0.16, 1100);
    } else if (currentEraId === 'ice_winter') {
      playIceChime(c.notes[1], 0.048, 3.2, 0);
      playIceChime(c.notes[3], 0.046, 3.4, 0.18);
      playIceChime(c.notes[5], 0.044, 3.8, 0.36);
    } else if (currentEraId === 'thawed_wasteland') {
      playPluckNote(c.notes[0], 0.058, 2.2, 0);
      playPluckNote(c.notes[2], 0.052, 2.4, 0.18);
      playPluckNote(c.notes[4], 0.048, 2.8, 0.36);
    } else if (currentEraId === 'sprout_meadow') {
      playFeltNote(c.bass, 0.064, 2.8, 0, 1180);
      playFluteNote(c.notes[2], 0.050, 2.4, 0.14);
      playFluteNote(c.notes[4], 0.048, 2.8, 0.34);
    } else if (currentEraId === 'giant_forest') {
      playWarmString(c.bass, 0.062, 4.4, 0);
      playWarmString(c.notes[1], 0.048, 4.2, 0.18);
      playIceChime(c.notes[4], 0.046, 3.6, 0.32);
      playIceChime(c.notes[5], 0.042, 4.0, 0.52);
    } else {
      playMountChord('lantern', true);
    }
  }

  function playZoneChime() {
    playEraFanfare(currentEraId);
  }

  function playSkyFallSplash() {
    if (!initialized || muted) return;
    playFireDrum(0.22, 82);
    playSplash(1.4);
  }

  // 终章《重逢之海 · 新生世界树》温暖交响和弦与钢片琴星辉琶音
  function playFinaleChord() {
    if (!initialized || muted) return;
    setIceScrape(0, false);
    setBoosting(false, 0);
    // E major 9 宽广暖弦乐铺底
    playWarmString(164.81, 0.068, 7.2, 0.00);
    playWarmString(246.94, 0.052, 7.0, 0.25);
    playWarmString(329.63, 0.048, 6.8, 0.50);
    playWarmString(415.30, 0.040, 6.4, 0.85);
    // 清澈向上的毛毡钢琴与钢片琴星辉琶音
    var arp = [329.63, 415.30, 493.88, 622.25, 659.25, 830.61, 987.77];
    arp.forEach(function (f, idx) {
      playFeltNote(f, 0.046, 3.6, 0.18 + idx * 0.24, 1620);
      if (idx >= 3) playIceChime(f * 1.5, 0.028, 3.4, 0.36 + idx * 0.24);
    });
  }

  // 主循环每帧驱动六纪元动态音乐与环境声场平滑演进
  function update(dt, level, descent, eraId) {
    if (!initialized || muted) return;
    musicLevel = level || 1;
    moonDescent = descent || 0;
    if (eraId && ERA_SCORES[eraId] && eraId !== currentEraId) {
      currentEraId = eraId;
      chordIndex = 0;
    }

    var sc = getScore();
    var now = ctx.currentTime;
    if (ambFilter && ambGain) {
      if (ambFilter.type !== sc.ambType) ambFilter.type = sc.ambType;
      ambFilter.frequency.setTargetAtTime(sc.ambFreq, now, 0.6);
      ambFilter.Q.setTargetAtTime(sc.ambQ, now, 0.6);
      ambGain.gain.setTargetAtTime(sc.ambVol + moonDescent * 0.02, now, 0.6);
    }
    if (delayFeedback) {
      delayFeedback.gain.setTargetAtTime(sc.delayFb, now, 0.6);
    }

    // 1. 纪元专属和声铺底（火海低音弦 / 冰原晶垫 / 巨林交响弦乐）
    padTimer -= dt;
    if (padTimer <= 0) {
      var cPad = getChord();
      if (currentEraId === 'giant_forest') {
        playWarmString(cPad.bass, 0.048, 4.8, 0);
        playWarmString(cPad.notes[1], 0.034, 4.6, 0.25);
        playWarmString(cPad.notes[2], 0.030, 4.4, 0.50);
        padTimer = 4.6;
      } else if (currentEraId === 'fire_sea') {
        playWarmString(cPad.bass, 0.046, 3.8, 0);
        padTimer = 4.0;
      } else if (currentEraId === 'frost_sea') {
        playWarmString(cPad.bass, 0.040, 4.4, 0);
        playIceChime(cPad.notes[2], 0.022, 2.8, 0.18);
        playIceChime(cPad.notes[4], 0.020, 3.0, 0.56);
        padTimer = 4.2;
      } else if (currentEraId === 'sprout_meadow') {
        playFluteNote(cPad.notes[2 + (chordIndex % 2)], 0.030, 2.8, 0.2);
        padTimer = 3.8;
      } else if (currentEraId === 'ice_winter') {
        playFeltNote(cPad.bass, 0.036, 3.8, 0, 620);
        padTimer = 4.2;
      } else if (currentEraId === 'moon_sea' && climaxTension > 0.08) {
        playWarmString(cPad.bass, 0.030 + climaxTension * 0.036, 3.6, 0);
        padTimer = Math.max(2.2, 3.6 - climaxTension * 1.1);
      } else if (currentEraId === 'moon_sea' && (seaMood === 'boil' || seaMood === 'ash')) {
        // 撞击沸海 / 尘幕灰海：孤寂低沉大提琴暗影长音铺底
        playWarmString(cPad.bass * 0.85, seaMood === 'boil' ? 0.048 : 0.036, 4.8, 0);
        padTimer = 4.4;
      } else if (currentEraId === 'moon_sea' && (seaMood === 'kelp' || seaMood === 'ascent' || seaMood === 'dawn')) {
        // 荧光海藻峡谷 & 破晓重返：渐强温润希望弦乐铺底！
        playWarmString(cPad.bass, 0.046, 4.6, 0);
        playWarmString(cPad.notes[1], seaMood === 'kelp' ? 0.028 : 0.042, 4.4, 0.25);
        if (seaMood !== 'kelp') playWarmString(cPad.notes[2], 0.034, 4.2, 0.50);
        padTimer = 4.2;
      } else {
        padTimer = 3.5;
      }
    }

    // 2. 纪元 II 火海心跳鼓 & 第 1 关第 3 幕「落月巨潮逃亡」渐急定音鼓脉冲！
    if (currentEraId === 'fire_sea') {
      drumTimer -= dt;
      if (drumTimer <= 0) {
        playFireDrum(0.11 + musicLevel * 0.015, 84 + (chordIndex % 2) * 10);
        drumTimer = Math.max(0.72, 1.35 - musicLevel * 0.14);
      }
    } else if (currentEraId === 'moon_sea' && climaxTension > 0.08) {
      drumTimer -= dt;
      if (drumTimer <= 0) {
        var tPulse = 0.075 + climaxTension * 0.11;
        playFireDrum(tPulse, 74 + climaxTension * 22 + (chordIndex % 2) * 8);
        drumTimer = Math.max(0.44, 0.96 - climaxTension * 0.48);
      }
    } else if (currentEraId === 'moon_sea' && seaMood === 'boil') {
      drumTimer -= dt;
      if (drumTimer <= 0) {
        playFireDrum(0.085, 62 + (chordIndex % 2) * 6);
        drumTimer = 1.45;
      }
    }

    // 3. 主旋律织体（随 6 个纪元自动切换钢琴 / 风铃 / 荒漠拨弦 / 晴春旋律 / 巨林星辉）
    musicTimer -= dt;
    if (musicTimer <= 0) {
      var chord = getChord();
      var n = chord.notes;
      var i1 = Math.floor(Math.random() * n.length);
      var i2 = (i1 + 2) % n.length;

      if (currentEraId === 'ice_winter') {
        playIceChime(n[i1], 0.036, 2.8, 0);
        if (Math.random() < 0.7) playIceChime(n[i2], 0.028, 3.0, 0.26);
      } else if (currentEraId === 'thawed_wasteland') {
        playPluckNote(n[i1], 0.044, 1.9, 0);
        if (Math.random() < 0.65) playPluckNote(n[i2], 0.036, 2.1, 0.28);
      } else if (currentEraId === 'sprout_meadow') {
        playFeltNote(chord.bass, 0.044, 2.6, 0, 1180);
        playFeltNote(n[i1], 0.042, 2.0, 0.10, 1520);
        playFeltNote(n[i2], 0.038, 2.2, 0.28, 1680);
      } else if (currentEraId === 'giant_forest') {
        playFeltNote(n[i1], 0.042, 2.5, 0, 1460);
        playIceChime(n[i2], 0.034, 2.8, 0.22);
        if (musicLevel >= 2) playIceChime(n[n.length - 1], 0.026, 3.0, 0.44);
      } else if (currentEraId === 'fire_sea') {
        playFeltNote(n[i1], 0.040, 2.0, 0, 960);
        if (Math.random() < 0.6) playFeltNote(n[i2], 0.034, 1.8, 0.20, 1120);
      } else {
        // 纪元 I 月潮之海：随 7 幕情绪演进自动切换配器织体！
        if (climaxTension > 0.12) {
          playFeltNote(chord.bass, 0.050, 2.0, 0, 1180);
          playFeltNote(n[i1], 0.044, 1.5, 0.08, 1560);
          playFeltNote(n[i2], 0.038, 1.5, 0.22, 1680);
          if (climaxTension > 0.45) playIceChime(n[n.length - 1], 0.026 + climaxTension * 0.014, 1.8, 0.34);
        } else if (seaMood === 'ash') {
          // 尘幕灰海：孤寂稀疏极简单音
          playFeltNote(chord.bass, 0.040, 3.6, 0, 620);
          if (Math.random() < 0.65) playFeltNote(n[i1], 0.028, 2.8, 0.32, 820);
        } else if (seaMood === 'kelp' || seaMood === 'ascent') {
          // 荧光海藻峡谷 & 上升洋流：澄澈梦幻星海风铃 + 温润钢琴
          playFeltNote(chord.bass, 0.042, 3.0, 0, 1180);
          playIceChime(n[i1], 0.034, 2.6, 0.08);
          playIceChime(n[i2], 0.030, 2.8, 0.28);
        } else {
          playFeltNote(chord.bass, 0.046, 3.2, 0, 820);
          playFeltNote(n[i1], 0.040, 2.4, 0.14, 1280);
          if (musicLevel >= 2) playFeltNote(n[i2], 0.032, 2.4, 0.38, 1460);
        }
      }

      if (Math.random() < (0.42 + climaxTension * 0.28)) chordIndex = (chordIndex + 1) % sc.chords.length;
      var baseGap = Math.max(0.68, 3.1 - musicLevel * 0.48 - climaxTension * 1.35);
      musicTimer = baseGap + Math.random() * (climaxTension > 0.2 ? 0.35 : 1.1);
    }
  }

  function suspend() {
    if (!initialized || !ctx) return;
    try {
      setBoosting(false, 0);
      setIceScrape(0, false);
      setGrinding(false, null, 0);
      setUnderwater(0);
      setClimaxTension(0);
      if (ctx.state === 'running') ctx.suspend();
    } catch (e) {}
  }

  function resume() {
    if (!initialized || !ctx) return;
    try {
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) {}
  }

  function setMuted(flag) {
    muted = !!flag;
    if (master && ctx) {
      master.gain.setTargetAtTime(muted ? 0 : 0.84, ctx.currentTime, 0.12);
    }
  }

  function setVolumes(mVol, sVol) {
    if (typeof mVol === 'number') musicVol = Math.max(0, Math.min(1, mVol));
    if (typeof sVol === 'number') sfxVol = Math.max(0, Math.min(1, sVol));
    if (ctx && musicBus) musicBus.gain.setTargetAtTime(musicVol, ctx.currentTime, 0.08);
    if (ctx && sfxBus) sfxBus.gain.setTargetAtTime(sfxVol, ctx.currentTime, 0.08);
  }

  function updateBoatAmbience(boat, dt) {
    if (!initialized || muted || !ctx || !boat) return;
    var now = ctx.currentTime;
    var inSub = !!(boat.isDiving || boat.inAbyss);
    var spinNorm = Math.max(0, Math.min(1, (boat.propSpinRate || 0) / 30));
    var surfSpd = Math.min(1, Math.abs(boat.vx || 0) / 280);

    if (motorGain && motorOsc && motorSubOsc && motorFilter) {
      var targetMotorVol = inSub ? (spinNorm * 0.036) : 0.0001;
      var baseFreq = 58 + spinNorm * 46;
      motorOsc.frequency.setTargetAtTime(baseFreq, now, 0.10);
      motorSubOsc.frequency.setTargetAtTime(baseFreq * 2.0, now, 0.10);
      motorFilter.frequency.setTargetAtTime(160 + spinNorm * 220, now, 0.10);
      motorGain.gain.setTargetAtTime(targetMotorVol, now, 0.12);
    }

    if (lapGain && lapFilter) {
      if (!inSub && boat.inWater) {
        lapFilter.frequency.setTargetAtTime(620 + surfSpd * 520, now, 0.15);
        lapGain.gain.setTargetAtTime(0.014 + surfSpd * 0.032, now, 0.16);
      } else if (inSub) {
        lapFilter.frequency.setTargetAtTime(260 + spinNorm * 160, now, 0.20);
        lapGain.gain.setTargetAtTime(0.008 + spinNorm * 0.018, now, 0.18);
      } else {
        lapGain.gain.setTargetAtTime(0.0001, now, 0.18);
      }
    }
  }

  return {
    init: init,
    update: update,
    suspend: suspend,
    resume: resume,
    setBoosting: setBoosting,
    setIceScrape: setIceScrape,
    setGrinding: setGrinding,
    setUnderwater: setUnderwater,
    setClimaxTension: setClimaxTension,
    setSeaMood: setSeaMood,
    playDawnAscentFanfare: playDawnAscentFanfare,
    playCrystalShatter: playCrystalShatter,
    playDiveIn: playDiveIn,
    playBreach: playBreach,
    playTidalRoar: playTidalRoar,
    playMeteorSplash: playMeteorSplash,
    playStageClear: playStageClear,
    playIceLand: playIceLand,
    playWhaleBounce: playWhaleBounce,
    playFeverIgnite: playFeverIgnite,
    playBellChime: playBellChime,
    playRelicFound: playRelicFound,
    playBasaltStep: playBasaltStep,
    playGeyserErupt: playGeyserErupt,
    playBrazierIgnite: playBrazierIgnite,
    playWoodSmash: playWoodSmash,
    playCloudGlide: playCloudGlide,
    playPressurePulse: playPressurePulse,
    playSonarPing: playSonarPing,
    playCloudJump: playCloudJump,
    playBreachShockwave: playBreachShockwave,
    playImpactBoom: playImpactBoom,
    playHydroDash: playHydroDash,
    playAirPocketRefill: playAirPocketRefill,
    playDeepWhaleSong: playDeepWhaleSong,
    playSardineShimmer: playSardineShimmer,
    playMantaGlide: playMantaGlide,
    playAnglerBanish: playAnglerBanish,
    playActiveSonarPing: playActiveSonarPing,
    playResonanceChord: playResonanceChord,
    playRhythmCue: playRhythmCue,
    playMoteSlot: playMoteSlot,
    playShrineAwaken: playShrineAwaken,
    playHarborAwakenFinale: playHarborAwakenFinale,
    playIceCrack: playIceCrack,
    playPrismRotate: playPrismRotate,
    playPortalTransit: playPortalTransit,
    playShutterSnap: playShutterSnap,
    playSubMorph: playSubMorph,
    playHarborMoor: playHarborMoor,
    playBountyComplete: playBountyComplete,
    playSplash: playSplash,
    playSteamRefill: playSteamRefill,
    playOarStroke: playOarStroke,
    playHookCatch: playHookCatch,
    playSpringBounce: playSpringBounce,
    playVineSlice: playVineSlice,
    playUpdraft: playUpdraft,
    playMountChord: playMountChord,
    playEraFanfare: playEraFanfare,
    playZoneChime: playZoneChime,
    playSkyFallSplash: playSkyFallSplash,
    playFinaleChord: playFinaleChord,
    setMuted: setMuted,
    setVolumes: setVolumes,
    updateBoatAmbience: updateBoatAmbience,
    getVolumes: function () { return { musicVol: musicVol, sfxVol: sfxVol }; },
    isMuted: function () { return muted; }
  };
})();
