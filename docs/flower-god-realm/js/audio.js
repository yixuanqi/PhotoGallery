/* ===== 四季雅乐音频引擎（去锯齿波 / 去滑音扫频 / 厅堂自然残响 / 四季四调式） ===== */
const SEASON_SCALES = {
  // 冬（清羽调：清冷高洁）
  winter: [329.63, 392.00, 440.00, 493.88, 587.33, 659.25, 783.99, 880.00],
  // 春（明宫调：轻盈舒展）
  spring: [293.66, 329.63, 392.00, 440.00, 493.88, 587.33, 659.25, 783.99],
  // 夏（温徵调：端庄宽厚）
  summer: [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25],
  // 秋（清角调：清远澄明）
  autumn: [293.66, 329.63, 369.99, 440.00, 493.88, 587.33, 659.25, 739.99],
};

const FLOWER_AUDIO_PROFILES = {
  plum:          { season: "winter", timbre: "jade_chime",    octave: 1.0 },
  camellia:      { season: "winter", timbre: "jade_chime",    octave: 1.0 },
  narcissus:     { season: "winter", timbre: "guzheng_clear", octave: 1.0 },
  apricot:       { season: "spring", timbre: "guzheng_clear", octave: 1.0 },
  peach:         { season: "spring", timbre: "soft_flute",    octave: 1.0 },
  peony:         { season: "summer", timbre: "guqin_warm",    octave: 1.0 },
  pomegranate:   { season: "summer", timbre: "guqin_warm",    octave: 1.0 },
  lotus:         { season: "summer", timbre: "guzheng_clear", octave: 1.0 },
  hollyhock:     { season: "summer", timbre: "guqin_warm",    octave: 1.0 },
  osmanthus:     { season: "autumn", timbre: "soft_flute",    octave: 1.0 },
  chrysanthemum: { season: "autumn", timbre: "guqin_warm",    octave: 1.0 },
  hibiscus:      { season: "autumn", timbre: "guzheng_clear", octave: 1.0 },
};

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.unlocked = false;
    this.enabled = true;
    this.muted = false;
    this.volume = 0.72;
    this.masterGain = null;
    this.reverbSend = null;
    this.activeVoiceBus = null;
    this.flowerPlayCounts = new Map();
  }
  unlock() {
    if (this.unlocked && this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
      return true;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      this.ctx = new Ctx();
      if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
      this.setupMasterChain();
      this.unlocked = true;
      return true;
    } catch { return false; }
  }
  setupMasterChain() {
    if (!this.ctx || this.masterGain) return;
    // 主输出总线 + 柔和厅堂双延迟残响（空间感来源于干净回声，而非怪异滤波扫频）
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.volume;
    this.masterGain.connect(this.ctx.destination);

    const delayL = this.ctx.createDelay(1.0);
    const delayR = this.ctx.createDelay(1.0);
    delayL.delayTime.value = 0.23;
    delayR.delayTime.value = 0.37;

    const fbL = this.ctx.createGain();
    const fbR = this.ctx.createGain();
    fbL.gain.value = 0.24;
    fbR.gain.value = 0.22;

    const damp = this.ctx.createBiquadFilter();
    damp.type = "lowpass";
    damp.frequency.value = 2400;
    damp.Q.value = 0.5;

    const wet = this.ctx.createGain();
    wet.gain.value = 0.22;

    this.reverbSend = this.ctx.createGain();
    this.reverbSend.gain.value = 1.0;

    this.reverbSend.connect(delayL);
    this.reverbSend.connect(delayR);
    delayL.connect(fbL); fbL.connect(damp);
    delayR.connect(fbR); fbR.connect(damp);
    damp.connect(delayR);
    damp.connect(wet);
    delayL.connect(wet);
    delayR.connect(wet);
    wet.connect(this.masterGain);
  }
  applySettings({ volume, muted, ambient_audio }) {
    if (typeof volume === "number") {
      this.volume = Math.max(0, Math.min(1, volume));
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
      }
    }
    if (typeof muted === "boolean") this.muted = muted;
    if (typeof ambient_audio === "boolean") this.enabled = ambient_audio;
  }
  createVoiceBus(fadePrev = true) {
    if (!this.ctx || !this.masterGain) return null;
    const now = this.ctx.currentTime;
    if (fadePrev && this.activeVoiceBus) {
      try {
        const old = this.activeVoiceBus;
        old.gain.cancelScheduledValues(now);
        old.gain.setValueAtTime(Math.max(0.0001, old.gain.value), now);
        old.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
      } catch {}
    }
    const bus = this.ctx.createGain();
    bus.gain.setValueAtTime(1.0, now);
    bus.connect(this.masterGain);
    if (this.reverbSend) bus.connect(this.reverbSend);
    if (fadePrev) this.activeVoiceBus = bus;
    return bus;
  }
  /* 1. 玉磬清音（纯净基音 + 轻柔高泛音，清冷雅致） */
  playJadeChime(bus, freq, delay, dur, peak) {
    const now = this.ctx.currentTime + delay;
    const partials = [
      { ratio: 1.0,   amp: 1.0,  d: dur },
      { ratio: 2.0,   amp: 0.16, d: dur * 0.62 },
      { ratio: 2.756, amp: 0.09, d: dur * 0.38 },
    ];
    partials.forEach((pt) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq * pt.ratio, now);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(Math.max(0.0002, peak * pt.amp), now + 0.016);
      g.gain.exponentialRampToValueAtTime(0.0001, now + pt.d);
      osc.connect(g); g.connect(bus);
      osc.start(now); osc.stop(now + pt.d + 0.06);
    });
  }
  /* 2. 清透古筝弹拨（纯 sine + triangle，彻底移除锯齿波、滑音与共振扫频） */
  playGuzhengClear(bus, freq, delay, dur, peak) {
    const now = this.ctx.currentTime + delay;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const g1 = this.ctx.createGain();
    const g2 = this.ctx.createGain();
    const lp = this.ctx.createBiquadFilter();

    osc1.type = "sine";
    osc2.type = "triangle";
    osc1.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq * 2, now);

    // 柔和无共振峰低通，仅自然柔化高频
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(Math.min(3400, freq * 5.0), now);
    lp.frequency.exponentialRampToValueAtTime(Math.max(600, freq * 1.8), now + dur * 0.85);
    lp.Q.value = 0.5;

    g1.gain.setValueAtTime(0.0001, now);
    g1.gain.linearRampToValueAtTime(Math.max(0.0002, peak), now + 0.012);
    g1.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    g2.gain.setValueAtTime(0.0001, now);
    g2.gain.linearRampToValueAtTime(Math.max(0.0002, peak * 0.24), now + 0.008);
    g2.gain.exponentialRampToValueAtTime(0.0001, now + dur * 0.42);

    osc1.connect(g1); g1.connect(lp);
    osc2.connect(g2); g2.connect(lp);
    lp.connect(bus);

    osc1.start(now); osc2.start(now);
    osc1.stop(now + dur + 0.06); osc2.stop(now + dur + 0.06);
  }
  /* 3. 柔和竹笛长音（纯净正弦慢起音 + 轻八度泛音，不加夸张颤音与怪噪） */
  playSoftFlute(bus, freq, delay, dur, peak) {
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const h2 = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const h2g = this.ctx.createGain();

    osc.type = "sine";
    h2.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    h2.frequency.setValueAtTime(freq * 2, now);
    h2g.gain.setValueAtTime(0.08, now);

    const atk = Math.min(0.45, dur * 0.26);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(Math.max(0.0002, peak), now + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(g); h2.connect(h2g); h2g.connect(g); g.connect(bus);
    osc.start(now); h2.start(now);
    osc.stop(now + dur + 0.06); h2.stop(now + dur + 0.06);
  }
  /* 4. 温润古琴散音（用纯正弦基音 + 少量柔和三角波替代锯齿波，沉稳不发噗） */
  playGuqinWarm(bus, freq, delay, dur, peak) {
    const now = this.ctx.currentTime + delay;
    const base = this.ctx.createOscillator();
    const body = this.ctx.createOscillator();
    const over = this.ctx.createOscillator();
    const lp = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    const bg = this.ctx.createGain();
    const og = this.ctx.createGain();

    base.type = "sine";
    body.type = "triangle";
    over.type = "sine";
    base.frequency.setValueAtTime(freq, now);
    body.frequency.setValueAtTime(freq, now);
    over.frequency.setValueAtTime(freq * 2, now);

    bg.gain.setValueAtTime(0.24, now);
    og.gain.setValueAtTime(0.10, now);

    lp.type = "lowpass";
    lp.frequency.setValueAtTime(Math.min(2200, freq * 4.0), now);
    lp.frequency.exponentialRampToValueAtTime(Math.max(420, freq * 1.5), now + dur * 0.85);
    lp.Q.value = 0.5;

    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(Math.max(0.0002, peak), now + 0.028);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    base.connect(lp);
    body.connect(bg); bg.connect(lp);
    over.connect(og); og.connect(lp);
    lp.connect(g); g.connect(bus);

    base.start(now); body.start(now); over.start(now);
    base.stop(now + dur + 0.06); body.stop(now + dur + 0.06); over.stop(now + dur + 0.06);
  }
  playRevealChord(flowerOrId = 8) {
    if (!this.enabled || this.muted || !this.ctx || this.ctx.state !== "running") return;
    try {
      const isObj = typeof flowerOrId === "object" && flowerOrId !== null;
      const profileKey = isObj ? flowerOrId.visual_profile : "osmanthus";
      const fid = isObj ? flowerOrId.id : (Number(flowerOrId) || 8);
      const spec = FLOWER_AUDIO_PROFILES[profileKey] || { season: "autumn", timbre: "soft_flute" };
      const scale = SEASON_SCALES[spec.season] || SEASON_SCALES.autumn;

      // 每朵花 3 组和谐五声动机轮换，自然不机械
      const prevCount = this.flowerPlayCounts.get(fid) || 0;
      this.flowerPlayCounts.set(fid, prevCount + 1);
      const motifs = [
        [0, 2, 4, 6],
        [2, 4, 5, 7],
        [4, 2, 3, 5],
      ];
      const degs = motifs[(prevCount + fid) % motifs.length];
      const bus = this.createVoiceBus(true);
      if (!bus) return;

      if (spec.timbre === "jade_chime") {
        // 梅/山茶：玉磬清响三声，清朗留白
        this.playJadeChime(bus, scale[degs[0] % scale.length], 0.02, 3.2, 0.052);
        this.playJadeChime(bus, scale[degs[2] % scale.length], 0.32, 3.5, 0.040);
        this.playJadeChime(bus, scale[degs[3] % scale.length], 0.74, 3.9, 0.030);
      } else if (spec.timbre === "guzheng_clear") {
        // 杏/荷/芙蓉/水仙：珠落玉盘般清透弹拨（无滑音、无怪尾音）
        degs.forEach((d, idx) => {
          const delay = 0.02 + idx * 0.20;
          this.playGuzhengClear(bus, scale[d % scale.length], delay, 2.6 + idx * 0.25, 0.048 - idx * 0.005);
        });
      } else if (spec.timbre === "soft_flute") {
        // 桃/桂：轻柔弹拨引出悠扬笛音
        this.playGuzhengClear(bus, scale[degs[0] % scale.length], 0.02, 2.3, 0.036);
        this.playGuzhengClear(bus, scale[degs[1] % scale.length], 0.18, 2.4, 0.032);
        this.playSoftFlute(bus, scale[degs[2] % scale.length], 0.34, 3.0, 0.042);
        this.playJadeChime(bus, scale[degs[3] % scale.length], 0.80, 3.2, 0.024);
      } else {
        // 牡丹/石榴/蜀葵/菊：温润低音古琴散音 + 清朗和声
        this.playGuqinWarm(bus, scale[0] * 0.5, 0.02, 4.0, 0.058);
        this.playGuqinWarm(bus, scale[degs[1] % scale.length], 0.28, 3.3, 0.044);
        this.playGuzhengClear(bus, scale[degs[2] % scale.length], 0.58, 3.0, 0.036);
        this.playJadeChime(bus, scale[degs[3] % scale.length], 0.90, 3.4, 0.022);
      }
    } catch {}
  }
  playBlessingChime(flowerOrId = 8) {
    if (!this.enabled || this.muted || !this.ctx || this.ctx.state !== "running") return;
    try {
      const isObj = typeof flowerOrId === "object" && flowerOrId !== null;
      const profileKey = isObj ? flowerOrId.visual_profile : "osmanthus";
      const spec = FLOWER_AUDIO_PROFILES[profileKey] || { season: "autumn", timbre: "jade_chime" };
      const scale = SEASON_SCALES[spec.season] || SEASON_SCALES.autumn;
      const bus = this.createVoiceBus(false);
      if (!bus) return;

      if (spec.timbre === "jade_chime") {
        this.playJadeChime(bus, scale[4], 0.04, 3.4, 0.038);
        this.playJadeChime(bus, scale[6], 0.44, 3.8, 0.026);
      } else if (spec.timbre === "guzheng_clear") {
        this.playGuzhengClear(bus, scale[3], 0.04, 2.7, 0.036);
        this.playGuzhengClear(bus, scale[5], 0.34, 3.2, 0.028);
      } else if (spec.timbre === "soft_flute") {
        this.playSoftFlute(bus, scale[5], 0.06, 3.0, 0.034);
        this.playJadeChime(bus, scale[7], 0.48, 3.4, 0.020);
      } else {
        this.playGuqinWarm(bus, scale[2], 0.04, 3.6, 0.044);
        this.playJadeChime(bus, scale[5], 0.44, 3.4, 0.024);
      }
    } catch {}
  }
}
