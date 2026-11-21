// Zero-allocation rolling-window per-module Profiler & Monitor Refresh-Rate Integer Divisor Pacer
// Pure leaf module (zero imports) so audio.js, renderer.js, ui.js & main.js can all instrument safely.

const CAP = 300;
const STD_HZ = [60, 75, 90, 100, 120, 144, 165, 180, 240];

function newBuf() {
  return new Float32Array(CAP);
}

class FrameProfiler {
  constructor() {
    // Monitor refresh rate auto-detection (fed on EVERY raw rAF before any skipping)
    this._prevRawTs = 0;
    this._rafSamples = new Float32Array(48);
    this._rafCount = 0;
    this._rafIdx = 0;
    this.detectedHz = 60;
    this.hzLocked = false;
    this._rafTick = 0;

    // Rolling ring buffers (zero per-frame heap allocations)
    this.cap = CAP;
    this.idx = 0;
    this.count = 0;
    this.frameMs = newBuf();
    this.jsMs = newBuf();
    this.updateMs = newBuf();
    this.audioMs = newBuf();
    this.lightingMs = newBuf();
    this.worldMs = newBuf();
    this.entitiesMs = newBuf();
    this.vfxMs = newBuf();
    this.hudMs = newBuf();
    this.sfxCalls = new Uint16Array(CAP);

    // Scratch buffers for zero-allocation percentile sorting & sparkline rendering
    this._scratch = new Float32Array(CAP);
    this._recentBuf = new Float32Array(CAP);
    this.longStalls = 0;
    this.maxStallMs = 0;

    // Current-frame accumulators
    this._cur = {
      update: 0,
      audio: 0,
      lighting: 0,
      world: 0,
      entities: 0,
      vfx: 0,
      hud: 0,
      sfx: 0
    };

    // Approximate V8 Minor/Major GC drop counter (Chromium performance.memory)
    this._prevHeap = 0;
    this.gcDrops = 0;
    this.heapMB = 0;

    // Dedicated recording session for A/B Benchmark (unlimited up to 2400 frames)
    this._recActive = false;
    this._rec = null;
  }

  onRawRaf(ts) {
    if (this._prevRawTs > 0) {
      const dt = ts - this._prevRawTs;
      if (dt >= 3.2 && dt <= 40) {
        this._rafSamples[this._rafIdx] = dt;
        this._rafIdx = (this._rafIdx + 1) % this._rafSamples.length;
        if (this._rafCount < this._rafSamples.length) this._rafCount++;
        if (this._rafCount >= 16 && (this._rafCount === 16 || this._rafCount === 32 || this._rafCount === 48 || !this.hzLocked)) {
          this._recomputeHz();
        }
      }
    }
    this._prevRawTs = ts;
  }

  _recomputeHz() {
    const n = this._rafCount;
    if (n < 12) return;
    const tmp = this._scratch;
    for (let i = 0; i < n; i++) tmp[i] = this._rafSamples[i];
    tmp.subarray(0, n).sort();
    const medMs = tmp[n >> 1];
    if (medMs <= 0) return;
    const rawHz = 1000 / medMs;
    let best = Math.round(rawHz);
    for (let i = 0; i < STD_HZ.length; i++) {
      if (Math.abs(rawHz - STD_HZ[i]) / STD_HZ[i] <= 0.085) {
        best = STD_HZ[i];
        break;
      }
    }
    this.detectedHz = Math.max(30, Math.min(360, best));
    if (n >= 32) this.hzLocked = true;
  }

  getRefreshHz() {
    return this.detectedHz;
  }

  getDivisorOptions() {
    const hz = this.detectedHz;
    const opts = [
      { div: 1, label: `跟随屏幕 (${hz}Hz)` },
      { div: 2, label: `半频稳帧 (${Math.round(hz / 2)} FPS)` }
    ];
    if (hz >= 144) {
      const target3 = Math.round(hz / 3);
      opts.push({ div: 3, label: `三分频 (${target3} FPS)` });
    }
    if (hz >= 230) {
      opts.push({ div: 4, label: `四分频 (${Math.round(hz / 4)} FPS)` });
    }
    return opts;
  }

  // Exact integer VSync tick skipping: ZERO timestamp drift, ZERO 144/120 pulldown judder
  shouldSkipFrame(divisor) {
    const d = (divisor | 0);
    if (d <= 1) {
      this._rafTick = 0;
      return false;
    }
    const skip = (this._rafTick % d) !== 0;
    this._rafTick = (this._rafTick + 1) % d;
    return skip;
  }

  beginFrame() {
    const c = this._cur;
    c.update = 0;
    c.audio = 0;
    c.lighting = 0;
    c.world = 0;
    c.entities = 0;
    c.vfx = 0;
    c.hud = 0;
    c.sfx = 0;
  }

  addAudioTime(ms, isSfx = true) {
    this._cur.audio += ms;
    if (isSfx) this._cur.sfx++;
  }

  addModuleTime(name, ms) {
    if (this._cur[name] !== undefined) this._cur[name] += ms;
  }

  resetRolling() {
    this.idx = 0;
    this.count = 0;
    this.gcDrops = 0;
    this.longStalls = 0;
    this.maxStallMs = 0;
  }

  startRecording(maxFrames = 2400) {
    this._recActive = true;
    this._rec = {
      max: maxFrames,
      n: 0,
      gcDrops: 0,
      frameMs: new Float32Array(maxFrames),
      jsMs: new Float32Array(maxFrames),
      updateMs: new Float32Array(maxFrames),
      audioMs: new Float32Array(maxFrames),
      lightingMs: new Float32Array(maxFrames),
      worldMs: new Float32Array(maxFrames),
      entitiesMs: new Float32Array(maxFrames),
      vfxMs: new Float32Array(maxFrames),
      hudMs: new Float32Array(maxFrames),
      sfxCalls: new Uint16Array(maxFrames)
    };
  }

  stopRecording(budgetMs) {
    this._recActive = false;
    const rec = this._rec;
    this._rec = null;
    if (!rec || rec.n === 0) return null;
    return this._summarizeArrays(rec, rec.n, rec.gcDrops, budgetMs);
  }

  endFrame(rawFrameMs, totalJsMs) {
    if (!(rawFrameMs > 0)) return;
    if (rawFrameMs >= 100) {
      this.longStalls++;
      if (rawFrameMs > this.maxStallMs) this.maxStallMs = rawFrameMs;
    }
    const clampedFrameMs = rawFrameMs > 500 ? 500 : rawFrameMs;
    const c = this._cur;
    // Detect heap drops (> 0.8MB) as approximate Minor/Major GC events when exposed by Chromium
    let gcHit = false;
    if (performance && performance.memory) {
      const used = performance.memory.usedJSHeapSize;
      if (this._prevHeap > 0 && (this._prevHeap - used) > 850000) {
        this.gcDrops++;
        gcHit = true;
      }
      this._prevHeap = used;
      this.heapMB = used / 1048576;
    }

    const i = this.idx;
    this.frameMs[i] = clampedFrameMs;
    this.jsMs[i] = totalJsMs;
    this.updateMs[i] = c.update;
    this.audioMs[i] = c.audio;
    this.lightingMs[i] = c.lighting;
    this.worldMs[i] = c.world;
    this.entitiesMs[i] = c.entities;
    this.vfxMs[i] = c.vfx;
    this.hudMs[i] = c.hud;
    this.sfxCalls[i] = c.sfx;
    this.idx = (i + 1) % CAP;
    if (this.count < CAP) this.count++;

    if (this._recActive && this._rec && this._rec.n < this._rec.max) {
      const r = this._rec;
      const k = r.n++;
      r.frameMs[k] = clampedFrameMs;
      r.jsMs[k] = totalJsMs;
      r.updateMs[k] = c.update;
      r.audioMs[k] = c.audio;
      r.lightingMs[k] = c.lighting;
      r.worldMs[k] = c.world;
      r.entitiesMs[k] = c.entities;
      r.vfxMs[k] = c.vfx;
      r.hudMs[k] = c.hud;
      r.sfxCalls[k] = c.sfx;
      if (gcHit) r.gcDrops++;
    }
  }

  _statsForSeries(arr, n, scratch) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const v = arr[i];
      scratch[i] = v;
      sum += v;
    }
    const view = scratch.subarray(0, n);
    view.sort();
    const p50 = view[Math.min(n - 1, Math.floor(n * 0.50))];
    const p95 = view[Math.min(n - 1, Math.floor(n * 0.95))];
    const p99 = view[Math.min(n - 1, Math.floor(n * 0.99))];
    const max = view[n - 1];
    return { avg: sum / n, p50, p95, p99, max };
  }

  _summarizeArrays(src, n, gcDrops, budgetMs) {
    const scratch = n <= this._scratch.length ? this._scratch : new Float32Array(n);
    const f = this._statsForSeries(src.frameMs, n, scratch);

    // True 1% Low FPS: mean of the worst 1% frame times
    const worstCount = Math.max(1, Math.ceil(n * 0.01));
    let worstSum = 0;
    for (let i = n - worstCount; i < n; i++) worstSum += scratch[i];
    const worstMean = worstSum / worstCount;
    const onePctLowFps = worstMean > 0 ? (1000 / worstMean) : 0;

    // Drop rate: frames exceeding 1.35x target refresh budget (e.g. >9.4ms at 144Hz, >22.5ms at 60Hz)
    const dropThresh = Math.max(budgetMs * 1.35, budgetMs + 2.2);
    let dropCnt = 0;
    let sfxSum = 0;
    for (let i = 0; i < n; i++) {
      if (src.frameMs[i] > dropThresh) dropCnt++;
      sfxSum += src.sfxCalls[i];
    }

    const js = this._statsForSeries(src.jsMs, n, scratch);
    const modules = {
      update: this._statsForSeries(src.updateMs, n, scratch),
      audio: this._statsForSeries(src.audioMs, n, scratch),
      lighting: this._statsForSeries(src.lightingMs, n, scratch),
      world: this._statsForSeries(src.worldMs, n, scratch),
      entities: this._statsForSeries(src.entitiesMs, n, scratch),
      vfx: this._statsForSeries(src.vfxMs, n, scratch),
      hud: this._statsForSeries(src.hudMs, n, scratch)
    };

    return {
      frames: n,
      budgetMs,
      dropThreshMs: dropThresh,
      avgFps: f.avg > 0 ? (1000 / f.avg) : 0,
      onePctLowFps,
      p50: f.p50,
      p95: f.p95,
      p99: f.p99,
      maxFrame: f.max,
      dropCount: dropCnt,
      dropPct: (dropCnt / n) * 100,
      jsAvg: js.avg,
      jsP95: js.p95,
      jsP99: js.p99,
      jsMax: js.max,
      sfxPerFrame: sfxSum / n,
      gcDrops,
      longStalls: this.longStalls,
      maxStallMs: this.maxStallMs,
      heapMB: this.heapMB,
      modules
    };
  }

  computeRollingStats(divisor = 1) {
    if (this.count < 2) return null;
    const budgetMs = (1000 / this.detectedHz) * Math.max(1, divisor | 0);
    return this._summarizeArrays(this, this.count, this.gcDrops, budgetMs);
  }

  getRecentFrameTimes(outCount = 160) {
    const n = Math.min(outCount, this.count, CAP);
    const res = this._recentBuf;
    const start = (this.idx - n + CAP) % CAP;
    for (let i = 0; i < n; i++) {
      res[i] = this.frameMs[(start + i) % CAP];
    }
    return res.subarray(0, n);
  }
}

export const prof = new FrameProfiler();
