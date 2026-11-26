window.MT = window.MT || {};

window.MT.Audio = (function () {
  var ctx = null;
  var master = null;
  var initialized = false;
  var muted = false;

  var seaGain = null;
  var seaFilter = null;
  var boostGain = null;
  var boostFilter = null;
  var delayNode = null;
  var delayFeedback = null;

  // 缓慢循环的四和弦进行：Dmaj9 -> Bm7 -> Gmaj7 -> A6
  var CHORDS = [
    { name: 'Dmaj9', bass: 146.83, notes: [293.66, 369.99, 440.00, 554.37, 659.25, 739.99, 880.00] },
    { name: 'Bm7',   bass: 123.47, notes: [246.94, 293.66, 369.99, 440.00, 587.33, 659.25, 739.99] },
    { name: 'Gmaj7', bass: 196.00, notes: [246.94, 293.66, 369.99, 440.00, 493.88, 587.33, 739.99] },
    { name: 'A6',    bass: 220.00, notes: [277.18, 329.63, 369.99, 440.00, 554.37, 659.25, 739.99] }
  ];

  var chordIndex = 0;
  var chordTimer = 11.0;
  var musicTimer = 1.4;
  var gramophoneLevel = 0;
  var tideProgress = 0;

  var phraseStep = 0;
  var lastPickupNote = 0;
  var lastPickupTime = 0;
  var lastSteamTime = 0;
  var lastReefTime = 0;
  var lastClinkTime = 0;
  var lastStrainTime = 0;
  var lastJellyLiftTime = 0;
  var lastRocketWhistleTime = 0;
  var lastRampTime = 0;
  var lastThermalTime = 0;
  var lastCloudTouchTime = 0;
  var lastStreamTime = 0;
  var lastCrestTime = 0;
  var lastWindRingTime = 0;
  var lastSonarTime = 0;
  var lastWinchTime = 0;
  var lastWhaleTime = 0;

  function createNoiseBuffer(audioCtx, sec, pink) {
    var len = Math.floor(audioCtx.sampleRate * sec);
    var buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    var ch = buf.getChannelData(0);
    var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (var i = 0; i < len; i++) {
      var w = Math.random() * 2 - 1;
      if (pink) {
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.96900 * b2 + w * 0.1538520;
        b3 = 0.86650 * b3 + w * 0.3104856;
        b4 = 0.55000 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.0168980;
        ch[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.04;
        b6 = w * 0.115926;
      } else {
        ch[i] = w * 0.3;
      }
    }
    return buf;
  }

  function init() {
    if (initialized) {
      if (ctx && ctx.state === 'suspended') ctx.resume();
      return;
    }
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.85;
    master.connect(ctx.destination);

    delayNode = ctx.createDelay(1.0);
    delayNode.delayTime.value = 0.38;
    delayFeedback = ctx.createGain();
    delayFeedback.gain.value = 0.32;
    var delayFilter = ctx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.value = 1650;

    delayNode.connect(delayFilter);
    delayFilter.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayFilter.connect(master);

    var seaSrc = ctx.createBufferSource();
    seaSrc.buffer = createNoiseBuffer(ctx, 4.5, true);
    seaSrc.loop = true;

    seaFilter = ctx.createBiquadFilter();
    seaFilter.type = 'lowpass';
    seaFilter.frequency.value = 420;
    seaFilter.Q.value = 0.6;

    var lfo = ctx.createOscillator();
    lfo.frequency.value = 0.14;
    var lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 185;
    lfo.connect(lfoDepth);
    lfoDepth.connect(seaFilter.frequency);

    seaGain = ctx.createGain();
    seaGain.gain.value = 0.21;

    seaSrc.connect(seaFilter);
    seaFilter.connect(seaGain);
    seaGain.connect(master);
    seaSrc.start();
    lfo.start();

    var boostSrc = ctx.createBufferSource();
    boostSrc.buffer = createNoiseBuffer(ctx, 2.0, false);
    boostSrc.loop = true;

    boostFilter = ctx.createBiquadFilter();
    boostFilter.type = 'bandpass';
    boostFilter.frequency.value = 340;
    boostFilter.Q.value = 1.1;

    boostGain = ctx.createGain();
    boostGain.gain.value = 0.0001;

    boostSrc.connect(boostFilter);
    boostFilter.connect(boostGain);
    boostGain.connect(master);
    boostSrc.start();

    initialized = true;
    musicTimer = 1.4;
  }

  function getCurrentChord() {
    return CHORDS[chordIndex];
  }

  function pickMelodicNote(preferHigh) {
    var notes = getCurrentChord().notes;
    var minIdx = preferHigh ? 2 : 0;
    var maxIdx = preferHigh ? notes.length - 1 : Math.min(notes.length - 1, 4);

    var stepDelta = (Math.random() < 0.65) ? 1 : -1;
    if (Math.random() < 0.25) stepDelta *= 2;
    phraseStep = Math.max(minIdx, Math.min(maxIdx, phraseStep + stepDelta));

    var candidate = notes[phraseStep];
    if (Math.abs(candidate - lastPickupNote) < 1) {
      phraseStep = phraseStep + 1 <= maxIdx ? phraseStep + 1 : minIdx;
      candidate = notes[phraseStep];
    }
    lastPickupNote = candidate;
    return candidate;
  }

  function playFeltNote(freq, vol, dur, delayOffset, brightness) {
    if (!initialized || muted) return;
    var t = ctx.currentTime + (delayOffset || 0);
    var microDetune = 1 + (Math.random() - 0.5) * 0.0022;
    var f = freq * microDetune;

    var osc = ctx.createOscillator();
    var over = ctx.createOscillator();
    var gain = ctx.createGain();
    var lp = ctx.createBiquadFilter();

    osc.type = 'sine';
    over.type = 'triangle';
    osc.frequency.setValueAtTime(f, t);
    over.frequency.setValueAtTime(f * 2, t);

    var cutoff = (brightness || 1150) * (0.85 + Math.random() * 0.3);
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(cutoff, t);
    lp.frequency.exponentialRampToValueAtTime(340, t + dur);

    var overGain = ctx.createGain();
    overGain.gain.value = 0.13;

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(lp);
    over.connect(overGain);
    overGain.connect(lp);
    lp.connect(gain);
    gain.connect(master);
    gain.connect(delayNode);

    osc.start(t);
    over.start(t);
    osc.stop(t + dur + 0.08);
    over.stop(t + dur + 0.08);
  }

  function playWaterDrop() {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    var base = 420 + Math.random() * 220;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * 1.55, now + 0.085);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.036, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
    osc.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  function playSplash(strength) {
    if (!initialized || muted) return;
    var s = Math.max(0.2, Math.min(1.5, strength || 0.7));
    var now = ctx.currentTime;
    var src = ctx.createBufferSource();
    src.buffer = createNoiseBuffer(ctx, 0.45, true);

    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(580 * s, now);
    bp.frequency.exponentialRampToValueAtTime(210, now + 0.38);
    bp.Q.value = 0.9;

    var g = ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.16 * s, now + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

    src.connect(bp);
    bp.connect(g);
    g.connect(master);
    src.start(now);
    src.stop(now + 0.45);
  }

  function playSteamRefill(intensity) {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    if (now - lastSteamTime < 0.65) return;
    lastSteamTime = now;

    var lvl = Math.max(0.35, Math.min(1.0, intensity || 0.7));
    var src = ctx.createBufferSource();
    src.buffer = createNoiseBuffer(ctx, 0.75, false);

    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(2400, now);
    bp.frequency.exponentialRampToValueAtTime(680, now + 0.65);
    bp.Q.value = 1.6;

    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.095 * lvl, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.68);

    src.connect(bp);
    bp.connect(g);
    g.connect(master);
    src.start(now);
    src.stop(now + 0.72);
  }

  function playOarStroke() {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    var src = ctx.createBufferSource();
    src.buffer = createNoiseBuffer(ctx, 0.25, true);
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(460, now);
    lp.frequency.exponentialRampToValueAtTime(150, now + 0.22);

    var g = ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.072, now + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

    src.connect(lp);
    lp.connect(g);
    g.connect(master);
    src.start(now);
    src.stop(now + 0.26);
  }

  function playHookCatch() {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    if (now - lastPickupTime < 0.16) return;
    lastPickupTime = now;

    playWaterDrop();
    var note = pickMelodicNote(true);
    playFeltNote(note, 0.052 + Math.random() * 0.015, 0.95, 0.02, 1250);
  }

  // 碎片收集：轻柔单音；攒满 3 份合成升级：温暖展开和弦
  function playMountChord(type, isUpgrade) {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    if (now - lastPickupTime < 0.14) return;
    lastPickupTime = now;

    var chord = getCurrentChord();
    if (!isUpgrade) {
      var single = pickMelodicNote(false);
      playFeltNote(single, 0.052, 1.4, 0, 1020);
      return;
    }

    // 3 份合成装船：三音温暖和声，极具里程碑成就感
    var n1 = pickMelodicNote(false);
    var n2 = pickMelodicNote(true);
    playFeltNote(chord.bass, 0.078, 2.3, 0, 740);
    if (type === 'thruster') {
      playFeltNote(n1, 0.072, 1.9, 0.10, 1080);
      playFeltNote(n2, 0.058, 2.2, 0.22, 1280);
    } else if (type === 'balloon') {
      playFeltNote(n1, 0.062, 2.0, 0.08, 1400);
      playFeltNote(n2, 0.066, 2.4, 0.20, 1580);
    } else if (type === 'gramophone') {
      playFeltNote(n1, 0.065, 2.2, 0.12, 1200);
      playFeltNote(n2, 0.060, 2.6, 0.28, 1380);
    } else {
      playFeltNote(n1, 0.066, 2.0, 0.10, 1120);
      playFeltNote(n2, 0.056, 2.3, 0.24, 1280);
    }
  }

  // 驶入新海域时的遥远钟鸣氛围音
  function playZoneChime() {
    if (!initialized || muted) return;
    var chord = getCurrentChord();
    playFeltNote(chord.bass, 0.06, 3.2, 0, 620);
    playFeltNote(chord.notes[2], 0.045, 3.0, 0.22, 920);
    playFeltNote(chord.notes[4], 0.036, 3.2, 0.48, 1100);
  }

  function playSkyFallSplash() {
    if (!initialized || muted) return;
    playSplash(0.75);
    var n = getCurrentChord().notes[2];
    playFeltNote(n, 0.032, 1.2, 0.08, 900);
  }

  // Step 3A · 暗礁轻擦木舟声、水下铁钩碰石、重物拉绳受力与水母托举和声
  function playReefBump(strength) {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    if (now - lastReefTime < 0.48) return;
    lastReefTime = now;

    var s = Math.max(0.35, Math.min(1.2, strength || 0.7));
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(132, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.16);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.11 * s, now + 0.014);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.19);
    osc.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + 0.21);

    playSplash(0.45 * s);
  }

  function playHookClink() {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    if (now - lastClinkTime < 0.28) return;
    lastClinkTime = now;

    var osc = ctx.createOscillator();
    var bp = ctx.createBiquadFilter();
    var g = ctx.createGain();
    osc.type = 'triangle';
    var f = 540 + Math.random() * 190;
    osc.frequency.setValueAtTime(f, now);
    osc.frequency.exponentialRampToValueAtTime(f * 0.78, now + 0.09);

    bp.type = 'bandpass';
    bp.frequency.value = 820;
    bp.Q.value = 2.4;

    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.048, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

    osc.connect(bp);
    bp.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  function playRopeStrain(tension) {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    var t = Math.max(0, Math.min(1, tension || 0.5));
    var gap = Math.max(0.24, 0.52 - t * 0.24);
    if (now - lastStrainTime < gap) return;
    lastStrainTime = now;

    var osc = ctx.createOscillator();
    var lp = ctx.createBiquadFilter();
    var g = ctx.createGain();
    osc.type = 'sawtooth';
    var base = 98 + t * 68;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.linearRampToValueAtTime(base * 1.12, now + 0.09);

    lp.type = 'lowpass';
    lp.frequency.value = 290 + t * 220;

    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.018 + t * 0.024, now + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    osc.connect(lp);
    lp.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  function playRopeSnap() {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.22);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.085, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    osc.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + 0.26);
    playSplash(0.55);
  }

  function playJellyLift() {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    if (now - lastJellyLiftTime < 2.4) return;
    lastJellyLiftTime = now;

    var notes = getCurrentChord().notes;
    var n1 = notes[Math.min(notes.length - 1, 3)];
    var n2 = notes[Math.min(notes.length - 1, 5)];
    playFeltNote(n1, 0.036, 2.2, 0, 1450);
    playFeltNote(n2, 0.032, 2.5, 0.16, 1650);
  }

  // Step 3B · 第三海域（火箭坠落带）天降呼啸、激波落水、金属跳台跃升、热流蒸汽与空中掠伞音效
  function playRocketWhistle() {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    if (now - lastRocketWhistleTime < 2.2) return;
    lastRocketWhistleTime = now;

    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    var lp = ctx.createBiquadFilter();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(760, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 1.45);

    lp.type = 'lowpass';
    lp.frequency.value = 1100;

    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.028, now + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);

    osc.connect(lp);
    lp.connect(g);
    g.connect(master);
    g.connect(delayNode);
    osc.start(now);
    osc.stop(now + 1.55);
  }

  function playShockwaveSplash(strength) {
    if (!initialized || muted) return;
    var s = Math.max(0.45, Math.min(1.4, strength || 1.0));
    var now = ctx.currentTime;

    var sub = ctx.createOscillator();
    var sg = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(118, now);
    sub.frequency.exponentialRampToValueAtTime(36, now + 0.42);
    sg.gain.setValueAtTime(0.0001, now);
    sg.gain.linearRampToValueAtTime(0.16 * s, now + 0.02);
    sg.gain.exponentialRampToValueAtTime(0.0001, now + 0.46);
    sub.connect(sg);
    sg.connect(master);
    sub.start(now);
    sub.stop(now + 0.48);

    playSplash(1.15 * s);
    playSteamRefill(0.75 * s);
  }

  function playRampLaunch() {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    if (now - lastRampTime < 0.7) return;
    lastRampTime = now;

    var src = ctx.createBufferSource();
    src.buffer = createNoiseBuffer(ctx, 0.45, false);
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(420, now);
    bp.frequency.exponentialRampToValueAtTime(1650, now + 0.34);
    bp.Q.value = 1.5;

    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.085, now + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

    src.connect(bp);
    bp.connect(g);
    g.connect(master);
    src.start(now);
    src.stop(now + 0.45);

    var notes = getCurrentChord().notes;
    playFeltNote(notes[2], 0.045, 1.3, 0.02, 1320);
    playFeltNote(notes[Math.min(notes.length - 1, 5)], 0.042, 1.6, 0.11, 1520);
  }

  function playThermalLift() {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    if (now - lastThermalTime < 0.9) return;
    lastThermalTime = now;

    var src = ctx.createBufferSource();
    src.buffer = createNoiseBuffer(ctx, 0.7, true);
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(520, now);
    bp.frequency.exponentialRampToValueAtTime(1180, now + 0.58);
    bp.Q.value = 1.1;

    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.058, now + 0.14);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.66);

    src.connect(bp);
    bp.connect(g);
    g.connect(master);
    src.start(now);
    src.stop(now + 0.68);
  }

  function playAirSnatch() {
    if (!initialized || muted) return;
    var notes = getCurrentChord().notes;
    var n1 = notes[Math.min(notes.length - 1, 4)];
    var n2 = notes[notes.length - 1];
    playFeltNote(n1, 0.058, 1.6, 0, 1550);
    playFeltNote(n2, 0.052, 2.0, 0.09, 1780);
  }

  // Step 3C · 浮空云海着陆柔音、月光失重上升流与三大潮汐终章和弦演出
  function playCloudTouch() {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    if (now - lastCloudTouchTime < 0.7) return;
    lastCloudTouchTime = now;

    var notes = getCurrentChord().notes;
    playFeltNote(notes[1], 0.044, 1.8, 0, 1280);
    playFeltNote(notes[4], 0.036, 2.2, 0.08, 1560);
  }

  function playGravityStream() {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    if (now - lastStreamTime < 1.35) return;
    lastStreamTime = now;

    var notes = getCurrentChord().notes;
    var hi = notes[Math.min(notes.length - 1, 5)];
    playFeltNote(hi, 0.026, 2.6, 0, 1480);
    playFeltNote(hi * 1.5, 0.014, 2.8, 0.14, 1720);
  }

  function playEndingFinale(endingKey) {
    if (!initialized || muted) return;
    var chord = CHORDS[0];
    playFeltNote(chord.bass, 0.09, 5.2, 0, 760);
    if (endingKey === 'flight') {
      var rise = [293.66, 369.99, 440.00, 554.37, 659.25, 739.99, 880.00, 1108.73];
      for (var i = 0; i < rise.length; i++) {
        playFeltNote(rise[i], 0.055 - i * 0.003, 3.8, 0.12 + i * 0.19, 1380 + i * 75);
      }
    } else if (endingKey === 'symphony') {
      var sym = [293.66, 440.00, 554.37, 659.25, 739.99, 880.00];
      for (var j = 0; j < sym.length; j++) {
        playFeltNote(sym[j], 0.052, 4.8, 0.18 + j * 0.28, 1180 + j * 65);
      }
      playFeltNote(146.83, 0.068, 5.4, 1.4, 680);
    } else {
      var lan = [440.00, 554.37, 659.25, 880.00, 1108.73, 1318.51];
      for (var k = 0; k < lan.length; k++) {
        playFeltNote(lan[k], 0.044, 4.2, 0.15 + k * 0.26, 1520 + k * 60);
      }
    }
  }

  // Phase 1 · 掠水自动拾取、完美跃浪蓝焰、月风加速环连击与潮汐光柱苏醒音效
  function playAutoCollect() {
    if (!initialized || muted) return;
    playWaterDrop();
    var note = pickMelodicNote(true);
    playFeltNote(note, 0.046, 1.05, 0.015, 1360);
  }

  function playPerfectCrest() {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    if (now - lastCrestTime < 0.65) return;
    lastCrestTime = now;

    var src = ctx.createBufferSource();
    src.buffer = createNoiseBuffer(ctx, 0.42, false);
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(520, now);
    bp.frequency.exponentialRampToValueAtTime(1920, now + 0.34);
    bp.Q.value = 1.4;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.088, now + 0.035);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    src.connect(bp);
    bp.connect(g);
    g.connect(master);
    src.start(now);
    src.stop(now + 0.42);

    var notes = getCurrentChord().notes;
    playFeltNote(notes[1], 0.052, 1.5, 0, 1380);
    playFeltNote(notes[Math.min(notes.length - 1, 4)], 0.056, 1.8, 0.07, 1650);
  }

  function playWindRing(combo) {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    if (now - lastWindRingTime < 0.25) return;
    lastWindRingTime = now;

    var c = Math.max(1, Math.min(6, combo || 1));
    var notes = getCurrentChord().notes;
    var idx = Math.min(notes.length - 1, c);
    var baseFreq = notes[idx];
    playFeltNote(baseFreq, 0.058, 1.7, 0, 1520 + c * 90);
    playFeltNote(baseFreq * 1.5, 0.036, 2.0, 0.08, 1780 + c * 80);

    var src = ctx.createBufferSource();
    src.buffer = createNoiseBuffer(ctx, 0.35, true);
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(750 + c * 140, now);
    bp.frequency.exponentialRampToValueAtTime(1600 + c * 150, now + 0.3);
    bp.Q.value = 1.8;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.055, now + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.33);
    src.connect(bp);
    bp.connect(g);
    g.connect(master);
    src.start(now);
    src.stop(now + 0.36);
  }

  function playPillarAwaken() {
    if (!initialized || muted) return;
    var chord = CHORDS[0];
    playFeltNote(chord.bass, 0.085, 4.4, 0, 740);
    playFeltNote(chord.notes[2], 0.062, 3.8, 0.18, 1180);
    playFeltNote(chord.notes[4], 0.056, 4.2, 0.38, 1460);
    playFeltNote(chord.notes[6], 0.048, 4.5, 0.62, 1720);
  }

  // Phase 2 · 主动声波脉冲、古钟齐鸣、深海巨鲸吟唱、锚链拉扯与四海地标苏醒音效
  function playSonarPulse(gLevel) {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    if (now - lastSonarTime < 0.35) return;
    lastSonarTime = now;

    var lv = gLevel || 0;
    var chord = getCurrentChord();
    var root = chord.notes[Math.min(chord.notes.length - 1, 1 + lv)];
    playFeltNote(root, 0.058 + lv * 0.008, 2.2, 0, 1480 + lv * 140);
    playFeltNote(root * 1.5, 0.036 + lv * 0.006, 2.5, 0.08, 1780);
    if (lv >= 2) {
      playFeltNote(chord.bass * 2, 0.032, 2.6, 0.14, 980);
    }
  }

  function playBellChime(freq) {
    if (!initialized || muted) return;
    var f = freq || 369.99;
    playFeltNote(f, 0.082, 3.6, 0, 1620);
    playFeltNote(f * 2.0, 0.038, 2.6, 0.02, 2100);
    playFeltNote(f * 3.0, 0.018, 1.8, 0.04, 2400);
  }

  function playWhaleSong() {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    if (now - lastWhaleTime < 3.5) return;
    lastWhaleTime = now;

    var osc = ctx.createOscillator();
    var over = ctx.createOscillator();
    var lp = ctx.createBiquadFilter();
    var g = ctx.createGain();

    osc.type = 'sine';
    over.type = 'triangle';
    osc.frequency.setValueAtTime(118, now);
    osc.frequency.exponentialRampToValueAtTime(178, now + 0.9);
    osc.frequency.exponentialRampToValueAtTime(132, now + 2.6);

    over.frequency.setValueAtTime(236, now);
    over.frequency.exponentialRampToValueAtTime(356, now + 0.9);
    over.frequency.exponentialRampToValueAtTime(264, now + 2.6);

    lp.type = 'lowpass';
    lp.frequency.value = 520;

    var og = ctx.createGain();
    og.gain.value = 0.22;

    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.095, now + 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 2.85);

    osc.connect(lp);
    over.connect(og);
    og.connect(lp);
    lp.connect(g);
    g.connect(master);
    g.connect(delayNode);

    osc.start(now);
    over.start(now);
    osc.stop(now + 2.95);
    over.stop(now + 2.95);
  }

  function playAnchorLatch() {
    if (!initialized || muted) return;
    playHookClink();
    var n = getCurrentChord().notes[2];
    playFeltNote(n, 0.048, 0.95, 0.03, 1380);
  }

  function playAnchorWinch(progress) {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    if (now - lastWinchTime < 0.24) return;
    lastWinchTime = now;

    var p = Math.max(0, Math.min(1, progress || 0));
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260 + p * 340, now);
    osc.frequency.exponentialRampToValueAtTime(180 + p * 260, now + 0.065);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.042, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    osc.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  function playLandmarkSolved() {
    if (!initialized || muted) return;
    var chord = CHORDS[0];
    playFeltNote(chord.bass, 0.088, 4.2, 0, 740);
    playFeltNote(chord.notes[0], 0.068, 3.4, 0.12, 1180);
    playFeltNote(chord.notes[2], 0.064, 3.6, 0.26, 1380);
    playFeltNote(chord.notes[4], 0.062, 4.0, 0.42, 1620);
    playFeltNote(chord.notes[6], 0.056, 4.4, 0.60, 1860);
  }

  function setBoosting(active, fuelRatio) {
    if (!initialized) return;
    var now = ctx.currentTime;
    var ratio = typeof fuelRatio === 'number' ? fuelRatio : 1;
    boostGain.gain.setTargetAtTime(active ? (0.09 + ratio * 0.05) : 0.0001, now, 0.08);
    boostFilter.frequency.setTargetAtTime(active ? (300 + ratio * 220) : 220, now, 0.1);
  }

  function update(dt, gLevel, tide, fogDensity, cloudFactor) {
    if (!initialized || muted) return;
    gramophoneLevel = gLevel || 0;
    tideProgress = tide || 0;
    var fog = typeof fogDensity === 'number' ? fogDensity : 0;
    var cloud = typeof cloudFactor === 'number' ? cloudFactor : 0;

    chordTimer -= dt;
    if (chordTimer <= 0) {
      chordIndex = (chordIndex + 1) % CHORDS.length;
      chordTimer = 11.5 + Math.random() * 3.5;
    }

    if (seaGain) {
      var targetSea = (0.18 + tideProgress * 0.07) * (1 - fog * 0.22);
      seaGain.gain.setTargetAtTime(targetSea, ctx.currentTime, 0.5);
    }
    if (seaFilter) {
      var targetCutoff = 420 - fog * 155 - cloud * 70;
      seaFilter.frequency.setTargetAtTime(Math.max(180, targetCutoff), ctx.currentTime, 0.6);
    }
    if (delayFeedback) {
      var targetFb = 0.32 + cloud * 0.14;
      delayFeedback.gain.setTargetAtTime(targetFb, ctx.currentTime, 0.7);
    }

    musicTimer -= dt;
    if (musicTimer <= 0) {
      var chord = getCurrentChord();
      var note = chord.notes[Math.floor(Math.random() * chord.notes.length)];
      playFeltNote(note, 0.026 + gramophoneLevel * 0.011, 2.5 + Math.random() * 1.1, 0, 980);

      if (gramophoneLevel >= 1 && Math.random() < 0.58) {
        playFeltNote(chord.bass, 0.028 + gramophoneLevel * 0.008, 3.1, 0.18, 680);
      }
      if ((gramophoneLevel >= 2 || cloud > 0.45) && Math.random() < (0.45 + cloud * 0.25)) {
        var upper = chord.notes[Math.min(chord.notes.length - 1, 4 + Math.floor(Math.random() * 3))];
        playFeltNote(upper, 0.022 + cloud * 0.008, 2.4 + cloud * 0.8, 0.36, 1340 + cloud * 240);
      }
      var baseGap = Math.max(1.4, 3.9 - gramophoneLevel * 0.72);
      musicTimer = baseGap + Math.random() * 1.7;
    }
  }

  function setMuted(flag) {
    muted = !!flag;
    if (master && ctx) {
      master.gain.setTargetAtTime(muted ? 0 : 0.85, ctx.currentTime, 0.12);
    }
  }

  return {
    init: init,
    update: update,
    setBoosting: setBoosting,
    playSplash: playSplash,
    playSteamRefill: playSteamRefill,
    playOarStroke: playOarStroke,
    playHookCatch: playHookCatch,
    playMountChord: playMountChord,
    playZoneChime: playZoneChime,
    playSkyFallSplash: playSkyFallSplash,
    playReefBump: playReefBump,
    playHookClink: playHookClink,
    playRopeStrain: playRopeStrain,
    playRopeSnap: playRopeSnap,
    playJellyLift: playJellyLift,
    playRocketWhistle: playRocketWhistle,
    playShockwaveSplash: playShockwaveSplash,
    playRampLaunch: playRampLaunch,
    playThermalLift: playThermalLift,
    playAirSnatch: playAirSnatch,
    playCloudTouch: playCloudTouch,
    playGravityStream: playGravityStream,
    playEndingFinale: playEndingFinale,
    playAutoCollect: playAutoCollect,
    playPerfectCrest: playPerfectCrest,
    playWindRing: playWindRing,
    playPillarAwaken: playPillarAwaken,
    playSonarPulse: playSonarPulse,
    playBellChime: playBellChime,
    playWhaleSong: playWhaleSong,
    playAnchorLatch: playAnchorLatch,
    playAnchorWinch: playAnchorWinch,
    playLandmarkSolved: playLandmarkSolved,
    setMuted: setMuted,
    isMuted: function () { return muted; }
  };
})();
