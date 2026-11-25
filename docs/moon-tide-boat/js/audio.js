window.MT = window.MT || {};

window.MT.Audio = (function () {
  var ctx = null;
  var master = null;
  var initialized = false;
  var muted = false;

  // 环境与推进器通道
  var seaGain = null;
  var seaFilter = null;
  var boostGain = null;
  var boostFilter = null;
  var delayNode = null;
  var delayFeedback = null;

  // 稀疏程序化毡锤钢琴 / 风铃和弦调度
  var musicTimer = 0;
  var gramophoneLevel = 0;
  var tideProgress = 0;
  // 温暖的大调五声音阶 (D major / F# minor 漂浮浪漫感)
  var SCALE = [293.66, 329.63, 369.99, 440.0, 493.88, 587.33, 659.25, 739.99, 880.0];
  var BASS = [146.83, 164.81, 185.0, 220.0];

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

    // 温暖空间回声总线（供钢琴、风铃、打捞泛音使用）
    delayNode = ctx.createDelay(1.0);
    delayNode.delayTime.value = 0.36;
    delayFeedback = ctx.createGain();
    delayFeedback.gain.value = 0.34;
    var delayFilter = ctx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.value = 1800;

    delayNode.connect(delayFilter);
    delayFilter.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayFilter.connect(master);

    // 1. 柔和海浪声
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
    lfoDepth.gain.value = 190;
    lfo.connect(lfoDepth);
    lfoDepth.connect(seaFilter.frequency);

    seaGain = ctx.createGain();
    seaGain.gain.value = 0.22;

    seaSrc.connect(seaFilter);
    seaFilter.connect(seaGain);
    seaGain.connect(master);
    seaSrc.start();
    lfo.start();

    // 2. 迷你推进器喷火呼啸声
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
    musicTimer = 1.2;
  }

  function playFeltNote(freq, vol, dur, delayOffset) {
    if (!initialized || muted) return;
    var t = ctx.currentTime + (delayOffset || 0);
    var osc = ctx.createOscillator();
    var over = ctx.createOscillator();
    var gain = ctx.createGain();
    var lp = ctx.createBiquadFilter();

    osc.type = 'sine';
    over.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    over.frequency.setValueAtTime(freq * 2, t);

    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1400, t);
    lp.frequency.exponentialRampToValueAtTime(420, t + dur);

    var overGain = ctx.createGain();
    overGain.gain.value = 0.16;

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(lp);
    over.connect(overGain);
    overGain.connect(lp);
    lp.connect(gain);
    gain.connect(master);
    gain.connect(delayNode);

    osc.start(t);
    over.start(t);
    osc.stop(t + dur + 0.06);
    over.stop(t + dur + 0.06);
  }

  function playSplash(strength) {
    if (!initialized || muted) return;
    var s = Math.max(0.2, Math.min(1.5, strength || 0.7));
    var now = ctx.currentTime;
    var src = ctx.createBufferSource();
    src.buffer = createNoiseBuffer(ctx, 0.45, true);

    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(620 * s, now);
    bp.frequency.exponentialRampToValueAtTime(220, now + 0.38);
    bp.Q.value = 0.9;

    var g = ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.18 * s, now + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

    src.connect(bp);
    bp.connect(g);
    g.connect(master);
    src.start(now);
    src.stop(now + 0.45);
  }

  function playOarStroke() {
    if (!initialized || muted) return;
    var now = ctx.currentTime;
    var src = ctx.createBufferSource();
    src.buffer = createNoiseBuffer(ctx, 0.25, true);
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(480, now);
    lp.frequency.exponentialRampToValueAtTime(160, now + 0.22);

    var g = ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.08, now + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

    src.connect(lp);
    lp.connect(g);
    g.connect(master);
    src.start(now);
    src.stop(now + 0.26);
  }

  function playHookCatch() {
    if (!initialized || muted) return;
    // 清脆水下铜钩咬合声
    playFeltNote(659.25, 0.08, 0.5, 0);
    playFeltNote(987.77, 0.055, 0.7, 0.05);
  }

  function playMountChord(type) {
    if (!initialized || muted) return;
    if (type === 'thruster') {
      playFeltNote(293.66, 0.1, 1.3, 0);
      playFeltNote(440.0, 0.09, 1.5, 0.09);
      playFeltNote(587.33, 0.08, 1.8, 0.18);
    } else if (type === 'balloon') {
      playFeltNote(493.88, 0.08, 1.6, 0);
      playFeltNote(659.25, 0.08, 1.8, 0.1);
      playFeltNote(880.0, 0.07, 2.2, 0.22);
    } else if (type === 'gramophone') {
      playFeltNote(369.99, 0.09, 2.0, 0);
      playFeltNote(440.0, 0.08, 2.1, 0.12);
      playFeltNote(587.33, 0.09, 2.4, 0.24);
      playFeltNote(739.99, 0.07, 2.6, 0.36);
    } else {
      playFeltNote(329.63, 0.08, 1.6, 0);
      playFeltNote(493.88, 0.08, 1.8, 0.11);
      playFeltNote(659.25, 0.06, 2.0, 0.22);
    }
  }

  function playSkyFallSplash() {
    if (!initialized || muted) return;
    playSplash(0.85);
    playFeltNote(587.33, 0.04, 1.2, 0.06);
  }

  function setBoosting(active) {
    if (!initialized) return;
    var now = ctx.currentTime;
    boostGain.gain.setTargetAtTime(active ? 0.14 : 0.0001, now, 0.08);
    boostFilter.frequency.setTargetAtTime(active ? 440 : 240, now, 0.1);
  }

  function update(dt, gLevel, tide) {
    if (!initialized || muted) return;
    gramophoneLevel = gLevel || 0;
    tideProgress = tide || 0;

    if (seaGain) {
      var targetSea = 0.19 + tideProgress * 0.08;
      seaGain.gain.setTargetAtTime(targetSea, ctx.currentTime, 0.5);
    }

    // 随留声机等级逐步变丰富的稀疏深夜旋律
    musicTimer -= dt;
    if (musicTimer <= 0) {
      var note = SCALE[Math.floor(Math.random() * SCALE.length)];
      playFeltNote(note, 0.032 + gramophoneLevel * 0.014, 2.4 + Math.random() * 1.1, 0);

      if (gramophoneLevel >= 1 && Math.random() < 0.65) {
        var bass = BASS[Math.floor(Math.random() * BASS.length)];
        playFeltNote(bass, 0.03 + gramophoneLevel * 0.01, 3.0, 0.16);
      }
      if (gramophoneLevel >= 2 && Math.random() < 0.55) {
        var high = SCALE[Math.min(SCALE.length - 1, Math.floor(Math.random() * 4) + 5)];
        playFeltNote(high, 0.028, 2.2, 0.34);
      }
      var baseGap = Math.max(1.15, 3.6 - gramophoneLevel * 0.75);
      musicTimer = baseGap + Math.random() * 1.6;
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
    playOarStroke: playOarStroke,
    playHookCatch: playHookCatch,
    playMountChord: playMountChord,
    playSkyFallSplash: playSkyFallSplash,
    setMuted: setMuted,
    isMuted: function () { return muted; }
  };
})();
