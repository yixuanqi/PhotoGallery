// Offline Pre-Baked Procedural Web Audio SFX & BGM Instrument Synthesis Recipes (split from src/audio.js in v43.0)
export function buildSfxBakeTasks(makeNoise) {
    const tasks = [
      // 1. Slashes
      ['slash_light', 0.22, (c, out) => {
        const n = c.createBufferSource(); n.buffer = makeNoise(c);
        const bp = c.createBiquadFilter(); bp.type = 'bandpass';
        bp.frequency.setValueAtTime(1380, 0); bp.frequency.exponentialRampToValueAtTime(380, 0.13); bp.Q.value = 1.5;
        const g = c.createGain(); g.gain.setValueAtTime(0.17, 0); g.gain.exponentialRampToValueAtTime(0.001, 0.14);
        n.connect(bp); bp.connect(g); g.connect(out); n.start(0); n.stop(0.16);
        const osc = c.createOscillator(); const og = c.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(1120, 0); osc.frequency.exponentialRampToValueAtTime(520, 0.11);
        og.gain.setValueAtTime(0.032, 0); og.gain.exponentialRampToValueAtTime(0.0008, 0.12);
        osc.connect(og); og.connect(out); osc.start(0); osc.stop(0.14);
      }],
      ['slash_heavy', 0.24, (c, out) => {
        const n = c.createBufferSource(); n.buffer = makeNoise(c);
        const bp = c.createBiquadFilter(); bp.type = 'bandpass';
        bp.frequency.setValueAtTime(1050, 0); bp.frequency.exponentialRampToValueAtTime(240, 0.18); bp.Q.value = 1.15;
        const g = c.createGain(); g.gain.setValueAtTime(0.24, 0); g.gain.exponentialRampToValueAtTime(0.001, 0.19);
        n.connect(bp); bp.connect(g); g.connect(out); n.start(0); n.stop(0.21);
        const osc = c.createOscillator(); const og = c.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(760, 0); osc.frequency.exponentialRampToValueAtTime(290, 0.11);
        og.gain.setValueAtTime(0.055, 0); og.gain.exponentialRampToValueAtTime(0.0008, 0.12);
        osc.connect(og); og.connect(out); osc.start(0); osc.stop(0.14);
      }],
      // 2. Hits
      ['hit_light', 0.16, (c, out) => {
        const osc = c.createOscillator(); const g = c.createGain();
        osc.type = 'triangle'; osc.frequency.setValueAtTime(235, 0); osc.frequency.exponentialRampToValueAtTime(52, 0.11);
        g.gain.setValueAtTime(0.24, 0); g.gain.exponentialRampToValueAtTime(0.001, 0.12);
        osc.connect(g); g.connect(out); osc.start(0); osc.stop(0.14);
        const n = c.createBufferSource(); n.buffer = makeNoise(c);
        const hp = c.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.setValueAtTime(3200, 0); hp.Q.value = 1.2;
        const ng = c.createGain(); ng.gain.setValueAtTime(0.15, 0); ng.gain.exponentialRampToValueAtTime(0.001, 0.06);
        n.connect(hp); hp.connect(ng); ng.connect(out); n.start(0); n.stop(0.08);
      }],
      ['hit_heavy', 0.28, (c, out) => {
        const osc = c.createOscillator(); const g = c.createGain();
        osc.type = 'triangle'; osc.frequency.setValueAtTime(195, 0); osc.frequency.exponentialRampToValueAtTime(38, 0.18);
        g.gain.setValueAtTime(0.36, 0); g.gain.exponentialRampToValueAtTime(0.001, 0.19);
        osc.connect(g); g.connect(out); osc.start(0); osc.stop(0.21);
        const n = c.createBufferSource(); n.buffer = makeNoise(c);
        const hp = c.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.setValueAtTime(2600, 0); hp.Q.value = 1.2;
        const ng = c.createGain(); ng.gain.setValueAtTime(0.24, 0); ng.gain.exponentialRampToValueAtTime(0.001, 0.095);
        n.connect(hp); hp.connect(ng); ng.connect(out); n.start(0); n.stop(0.11);
        const ring = c.createOscillator(); const rg = c.createGain();
        ring.type = 'sine'; ring.frequency.setValueAtTime(1180, 0); ring.frequency.exponentialRampToValueAtTime(920, 0.22);
        rg.gain.setValueAtTime(0.075, 0); rg.gain.exponentialRampToValueAtTime(0.0008, 0.24);
        ring.connect(rg); rg.connect(out); ring.start(0); ring.stop(0.26);
      }],
      // 3. Parries
      ['parry_perfect', 0.48, (c, out) => {
        const n = c.createBufferSource(); n.buffer = makeNoise(c);
        const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.setValueAtTime(3400, 0);
        const ng = c.createGain(); ng.gain.setValueAtTime(0.28, 0); ng.gain.exponentialRampToValueAtTime(0.001, 0.055);
        n.connect(hp); hp.connect(ng); ng.connect(out); n.start(0); n.stop(0.07);
        const freqs = [1046, 1568, 2489, 3620, 4698];
        for (let i = 0; i < freqs.length; i++) {
          const f = freqs[i];
          const osc = c.createOscillator(); const g = c.createGain();
          osc.type = i % 2 === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(f, 0); osc.frequency.exponentialRampToValueAtTime(f * 0.965, 0.42);
          g.gain.setValueAtTime(0.24 / (i * 0.68 + 1), 0); g.gain.exponentialRampToValueAtTime(0.0007, 0.44);
          osc.connect(g); g.connect(out); osc.start(0); osc.stop(0.46);
        }
        const sub = c.createOscillator(); const sg = c.createGain();
        sub.type = 'sine'; sub.frequency.setValueAtTime(293.6, 0); sub.frequency.exponentialRampToValueAtTime(260, 0.36);
        sg.gain.setValueAtTime(0.14, 0); sg.gain.exponentialRampToValueAtTime(0.0008, 0.38);
        sub.connect(sg); sg.connect(out); sub.start(0); sub.stop(0.40);
      }],
      ['parry_block', 0.20, (c, out) => {
        const osc = c.createOscillator(); const g = c.createGain();
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, 0); osc.frequency.exponentialRampToValueAtTime(95, 0.14);
        g.gain.setValueAtTime(0.19, 0); g.gain.exponentialRampToValueAtTime(0.001, 0.16);
        osc.connect(g); g.connect(out); osc.start(0); osc.stop(0.17);
        const n = c.createBufferSource(); n.buffer = makeNoise(c);
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(1400, 0); bp.Q.value = 1.6;
        const ng = c.createGain(); ng.gain.setValueAtTime(0.14, 0); ng.gain.exponentialRampToValueAtTime(0.001, 0.08);
        n.connect(bp); bp.connect(ng); ng.connect(out); n.start(0); n.stop(0.09);
      }],
      // 4. Combat cues & bells
      ['glint_fast', 0.16, (c, out) => {
        const freqs = [1567.98, 2349.32];
        for (let i = 0; i < freqs.length; i++) {
          const f = freqs[i]; const t0 = i * 0.015;
          const osc = c.createOscillator(); const g = c.createGain();
          osc.type = i === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(f, t0); osc.frequency.exponentialRampToValueAtTime(f * 0.94, 0.10);
          g.gain.setValueAtTime(0.075 / (i + 1), t0); g.gain.exponentialRampToValueAtTime(0.0006, 0.11);
          osc.connect(g); g.connect(out); osc.start(t0); osc.stop(0.13);
        }
      }],
      ['glint_delayed', 0.24, (c, out) => {
        const freqs = [1174.66, 1760.0, 2637.0];
        for (let i = 0; i < freqs.length; i++) {
          const f = freqs[i]; const t0 = i * 0.015;
          const osc = c.createOscillator(); const g = c.createGain();
          osc.type = i === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(f, t0); osc.frequency.exponentialRampToValueAtTime(f * 1.06, 0.16);
          g.gain.setValueAtTime(0.095 / (i + 1), t0); g.gain.exponentialRampToValueAtTime(0.0006, 0.18);
          osc.connect(g); g.connect(out); osc.start(t0); osc.stop(0.20);
        }
      }],
      ['finisher_deflect', 0.72, (c, out) => {
        const freqs = [587.33, 880.0, 1318.5, 2093.0, 3135.96];
        for (let i = 0; i < freqs.length; i++) {
          const f = freqs[i];
          const osc = c.createOscillator(); const g = c.createGain();
          osc.type = i % 2 === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(f, 0); osc.frequency.exponentialRampToValueAtTime(f * 0.985, 0.65);
          g.gain.setValueAtTime(0.18 / (i * 0.55 + 1), 0); g.gain.exponentialRampToValueAtTime(0.0007, 0.68);
          osc.connect(g); g.connect(out); osc.start(0); osc.stop(0.70);
        }
      }],
      ['danger_alert', 0.34, (c, out) => {
        const freqs = [740, 1108];
        for (let i = 0; i < freqs.length; i++) {
          const f = freqs[i];
          const osc = c.createOscillator(); const g = c.createGain();
          osc.type = 'sawtooth'; osc.frequency.setValueAtTime(f, 0); osc.frequency.linearRampToValueAtTime(f * 0.86, 0.28);
          g.gain.setValueAtTime(0.11 / (i + 1), 0); g.gain.exponentialRampToValueAtTime(0.001, 0.30);
          osc.connect(g); g.connect(out); osc.start(0); osc.stop(0.32);
        }
      }],
      ['bell_toll', 1.78, (c, out) => {
        const freqs = [146.8, 220, 349.2, 587.3];
        for (let i = 0; i < freqs.length; i++) {
          const f = freqs[i];
          const osc = c.createOscillator(); const g = c.createGain();
          osc.type = 'sine'; osc.frequency.setValueAtTime(f, 0); osc.frequency.exponentialRampToValueAtTime(f * 0.985, 1.6);
          g.gain.setValueAtTime(0.2 / (i * 0.8 + 1), 0); g.gain.exponentialRampToValueAtTime(0.0008, 1.7);
          osc.connect(g); g.connect(out); osc.start(0); osc.stop(1.75);
        }
      }],
      ['distant_bell', 2.4, (c, out) => {
        const freqs = [146.8, 293.6, 440.0];
        for (let i = 0; i < freqs.length; i++) {
          const f = freqs[i];
          const osc = c.createOscillator(); const g = c.createGain();
          osc.type = 'sine'; osc.frequency.setValueAtTime(f, 0); osc.frequency.exponentialRampToValueAtTime(f * 0.992, 2.2);
          g.gain.setValueAtTime(0.032 / (i + 1), 0); g.gain.exponentialRampToValueAtTime(0.0005, 2.3);
          osc.connect(g); g.connect(out); osc.start(0); osc.stop(2.35);
        }
      }],
      ['amb_drip', 0.42, (c, out) => {
        const osc = c.createOscillator(); const g = c.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, 0);
        osc.frequency.exponentialRampToValueAtTime(1640, 0.055);
        osc.frequency.exponentialRampToValueAtTime(1120, 0.36);
        g.gain.setValueAtTime(0.0004, 0);
        g.gain.linearRampToValueAtTime(0.058, 0.01);
        g.gain.exponentialRampToValueAtTime(0.0004, 0.38);
        osc.connect(g); g.connect(out); osc.start(0); osc.stop(0.40);
      }],
      ['amb_ember_crack', 0.24, (c, out) => {
        const n = c.createBufferSource(); n.buffer = makeNoise(c);
        const bp = c.createBiquadFilter(); bp.type = 'bandpass';
        bp.frequency.setValueAtTime(2400, 0); bp.frequency.exponentialRampToValueAtTime(980, 0.16); bp.Q.value = 2.6;
        const g = c.createGain();
        g.gain.setValueAtTime(0.075, 0); g.gain.exponentialRampToValueAtTime(0.0005, 0.19);
        n.connect(bp); bp.connect(g); g.connect(out); n.start(0); n.stop(0.21);
      }],
      ['amb_chapel_choir', 2.6, (c, out) => {
        const freqs = [146.83, 220.0, 293.66, 349.23];
        for (let i = 0; i < freqs.length; i++) {
          const osc = c.createOscillator(); const lp = c.createBiquadFilter(); const g = c.createGain();
          osc.type = i % 2 === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(freqs[i], 0);
          lp.type = 'lowpass'; lp.frequency.setValueAtTime(520, 0);
          g.gain.setValueAtTime(0.0004, 0);
          g.gain.linearRampToValueAtTime(0.024 / (i * 0.5 + 1), 0.75);
          g.gain.exponentialRampToValueAtTime(0.0004, 2.5);
          osc.connect(lp); lp.connect(g); g.connect(out); osc.start(0); osc.stop(2.55);
        }
      }],
      ['heartbeat', 0.44, (c, out) => {
        const offs = [0, 0.22];
        for (let i = 0; i < 2; i++) {
          const off = offs[i];
          const osc = c.createOscillator(); const g = c.createGain();
          osc.type = 'sine'; osc.frequency.setValueAtTime(i === 0 ? 58 : 48, off);
          osc.frequency.exponentialRampToValueAtTime(28, off + 0.14);
          g.gain.setValueAtTime(i === 0 ? 0.18 : 0.12, off); g.gain.exponentialRampToValueAtTime(0.001, off + 0.16);
          osc.connect(g); g.connect(out); osc.start(off); osc.stop(off + 0.18);
        }
      }],
      ['pogo_lantern', 0.38, (c, out) => {
        const freqs = [880, 1320];
        for (let i = 0; i < 2; i++) {
          const f = freqs[i];
          const osc = c.createOscillator(); const g = c.createGain();
          osc.type = 'sine'; osc.frequency.setValueAtTime(f, 0); osc.frequency.exponentialRampToValueAtTime(f * 0.96, 0.32);
          g.gain.setValueAtTime(0.13 / (i + 1), 0); g.gain.exponentialRampToValueAtTime(0.001, 0.35);
          osc.connect(g); g.connect(out); osc.start(0); osc.stop(0.36);
        }
      }],
      ['iai_ready', 0.20, (c, out) => {
        const osc = c.createOscillator(); const g = c.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(1320, 0); osc.frequency.exponentialRampToValueAtTime(2200, 0.12);
        g.gain.setValueAtTime(0.12, 0); g.gain.exponentialRampToValueAtTime(0.001, 0.16);
        osc.connect(g); g.connect(out); osc.start(0); osc.stop(0.18);
      }],
      ['iai_slash', 0.30, (c, out) => {
        const n = c.createBufferSource(); n.buffer = makeNoise(c);
        const bp = c.createBiquadFilter(); bp.type = 'bandpass';
        bp.frequency.setValueAtTime(2000, 0); bp.frequency.exponentialRampToValueAtTime(550, 0.13); bp.Q.value = 1.5;
        const ng = c.createGain(); ng.gain.setValueAtTime(0.17, 0); ng.gain.exponentialRampToValueAtTime(0.001, 0.14);
        n.connect(bp); bp.connect(ng); ng.connect(out); n.start(0); n.stop(0.16);
        const osc = c.createOscillator(); const g = c.createGain();
        osc.type = 'triangle'; osc.frequency.setValueAtTime(1480, 0); osc.frequency.exponentialRampToValueAtTime(420, 0.22);
        g.gain.setValueAtTime(0.18, 0); g.gain.exponentialRampToValueAtTime(0.001, 0.25);
        osc.connect(g); g.connect(out); osc.start(0); osc.stop(0.27);
      }],
      ['counter_slash', 0.32, (c, out) => {
        const osc1 = c.createOscillator(); const g1 = c.createGain();
        osc1.type = 'triangle'; osc1.frequency.setValueAtTime(1480, 0); osc1.frequency.exponentialRampToValueAtTime(420, 0.22);
        g1.gain.setValueAtTime(0.18, 0); g1.gain.exponentialRampToValueAtTime(0.001, 0.25);
        osc1.connect(g1); g1.connect(out); osc1.start(0); osc1.stop(0.27);
        const osc2 = c.createOscillator(); const g2 = c.createGain();
        osc2.type = 'sine'; osc2.frequency.setValueAtTime(1760, 0); osc2.frequency.exponentialRampToValueAtTime(1180, 0.26);
        g2.gain.setValueAtTime(0.15, 0); g2.gain.exponentialRampToValueAtTime(0.001, 0.28);
        osc2.connect(g2); g2.connect(out); osc2.start(0); osc2.stop(0.30);
      }],
      ['detonate', 0.44, (c, out) => {
        const osc = c.createOscillator(); const g = c.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(160, 0); osc.frequency.exponentialRampToValueAtTime(32, 0.35);
        g.gain.setValueAtTime(0.40, 0); g.gain.exponentialRampToValueAtTime(0.001, 0.38);
        osc.connect(g); g.connect(out); osc.start(0); osc.stop(0.40);
        const freqs = [1046, 1568, 2489];
        for (let i = 0; i < freqs.length; i++) {
          const o = c.createOscillator(); const og = c.createGain();
          o.type = 'triangle'; o.frequency.setValueAtTime(freqs[i], 0);
          og.gain.setValueAtTime(0.18 / (i + 1), 0); og.gain.exponentialRampToValueAtTime(0.0008, 0.36);
          o.connect(og); og.connect(out); o.start(0); o.stop(0.38);
        }
      }],
      ['heal', 0.52, (c, out) => {
        const freqs = [440, 554, 659];
        for (let i = 0; i < 3; i++) {
          const t0 = i * 0.06;
          const osc = c.createOscillator(); const g = c.createGain();
          osc.type = 'sine'; osc.frequency.setValueAtTime(freqs[i], t0);
          g.gain.setValueAtTime(0.10, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.35);
          osc.connect(g); g.connect(out); osc.start(t0); osc.stop(t0 + 0.36);
        }
      }],
      ['soul_cast', 0.40, (c, out) => {
        const freqs = [587, 880, 1318];
        for (let i = 0; i < 3; i++) {
          const osc = c.createOscillator(); const g = c.createGain();
          osc.type = i === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freqs[i], 0); osc.frequency.exponentialRampToValueAtTime(freqs[i] * 0.78, 0.32);
          g.gain.setValueAtTime(0.12 / (i + 1), 0); g.gain.exponentialRampToValueAtTime(0.001, 0.35);
          osc.connect(g); g.connect(out); osc.start(0); osc.stop(0.37);
        }
      }],
      ['grapple_launch', 0.20, (c, out) => {
        const n = c.createBufferSource(); n.buffer = makeNoise(c);
        const hp = c.createBiquadFilter(); hp.type = 'highpass';
        hp.frequency.setValueAtTime(1600, 0); hp.frequency.exponentialRampToValueAtTime(4200, 0.14);
        const g = c.createGain(); g.gain.setValueAtTime(0.18, 0); g.gain.exponentialRampToValueAtTime(0.001, 0.16);
        n.connect(hp); hp.connect(g); g.connect(out); n.start(0); n.stop(0.17);
      }],
      ['grapple_latch', 0.20, (c, out) => {
        const freqs = [1480, 2320];
        for (let i = 0; i < 2; i++) {
          const osc = c.createOscillator(); const g = c.createGain();
          osc.type = 'triangle'; osc.frequency.setValueAtTime(freqs[i], 0);
          osc.frequency.exponentialRampToValueAtTime(freqs[i] * 0.94, 0.14);
          g.gain.setValueAtTime(0.14 / (i + 1), 0); g.gain.exponentialRampToValueAtTime(0.001, 0.16);
          osc.connect(g); g.connect(out); osc.start(0); osc.stop(0.17);
        }
      }],
      ['grapple_tick', 0.08, (c, out) => {
        // v46.5 Ultra-crisp subtle bronze clasp click for grapple target switching (zero ear fatigue!)
        const freqs = [1960, 2940];
        for (let i = 0; i < 2; i++) {
          const osc = c.createOscillator(); const g = c.createGain();
          osc.type = i === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freqs[i], 0);
          osc.frequency.exponentialRampToValueAtTime(freqs[i] * 1.06, 0.045);
          g.gain.setValueAtTime(i === 0 ? 0.085 : 0.045, 0);
          g.gain.exponentialRampToValueAtTime(0.001, 0.055);
          osc.connect(g); g.connect(out); osc.start(0); osc.stop(0.06);
        }
      }],
      ['wraith_shot', 0.30, (c, out) => {
        const osc = c.createOscillator(); const g = c.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(520, 0); osc.frequency.exponentialRampToValueAtTime(240, 0.24);
        g.gain.setValueAtTime(0.09, 0); g.gain.exponentialRampToValueAtTime(0.001, 0.26);
        osc.connect(g); g.connect(out); osc.start(0); osc.stop(0.28);
      }],
      ['tide_roar', 0.52, (c, out) => {
        const n = c.createBufferSource(); n.buffer = makeNoise(c);
        const lp = c.createBiquadFilter(); lp.type = 'lowpass';
        lp.frequency.setValueAtTime(240, 0); lp.frequency.linearRampToValueAtTime(620, 0.22);
        lp.frequency.exponentialRampToValueAtTime(140, 0.50);
        const g = c.createGain(); g.gain.setValueAtTime(0.28, 0); g.gain.exponentialRampToValueAtTime(0.001, 0.50);
        n.connect(lp); lp.connect(g); g.connect(out); n.start(0); n.stop(0.50);
        const osc = c.createOscillator(); const og = c.createGain();
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(92, 0); osc.frequency.exponentialRampToValueAtTime(42, 0.45);
        og.gain.setValueAtTime(0.16, 0); og.gain.exponentialRampToValueAtTime(0.001, 0.48);
        osc.connect(og); og.connect(out); osc.start(0); osc.stop(0.50);
      }],
      ['footstep', 0.07, (c, out) => {
        const n = c.createBufferSource(); n.buffer = makeNoise(c);
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(480, 0); bp.Q.value = 1.8;
        const g = c.createGain(); g.gain.setValueAtTime(0.055, 0); g.gain.exponentialRampToValueAtTime(0.001, 0.045);
        n.connect(bp); bp.connect(g); g.connect(out); n.start(0); n.stop(0.055);
      }],
      ['land', 0.12, (c, out) => {
        const osc = c.createOscillator(); const g = c.createGain();
        osc.type = 'triangle'; osc.frequency.setValueAtTime(135, 0); osc.frequency.exponentialRampToValueAtTime(44, 0.08);
        g.gain.setValueAtTime(0.13, 0); g.gain.exponentialRampToValueAtTime(0.001, 0.09);
        osc.connect(g); g.connect(out); osc.start(0); osc.stop(0.10);
      }],
      ['wing_jump', 0.26, (c, out) => {
        const n = c.createBufferSource(); n.buffer = makeNoise(c);
        const bp = c.createBiquadFilter(); bp.type = 'bandpass';
        bp.frequency.setValueAtTime(520, 0); bp.frequency.exponentialRampToValueAtTime(1450, 0.14); bp.Q.value = 1.3;
        const g = c.createGain(); g.gain.setValueAtTime(0.16, 0); g.gain.exponentialRampToValueAtTime(0.001, 0.16);
        n.connect(bp); bp.connect(g); g.connect(out); n.start(0); n.stop(0.18);
        const freqs = [587.3, 880];
        for (let i = 0; i < 2; i++) {
          const osc = c.createOscillator(); const og = c.createGain();
          osc.type = 'sine'; osc.frequency.setValueAtTime(freqs[i], i * 0.03);
          osc.frequency.exponentialRampToValueAtTime(freqs[i] * 1.18, 0.20);
          og.gain.setValueAtTime(0.075 / (i + 1), i * 0.03); og.gain.exponentialRampToValueAtTime(0.0008, 0.22);
          osc.connect(og); og.connect(out); osc.start(i * 0.03); osc.stop(0.24);
        }
      }],
      ['shield_break', 0.32, (c, out) => {
        const osc = c.createOscillator(); const g = c.createGain();
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(220, 0); osc.frequency.exponentialRampToValueAtTime(55, 0.24);
        g.gain.setValueAtTime(0.26, 0); g.gain.exponentialRampToValueAtTime(0.001, 0.26);
        osc.connect(g); g.connect(out); osc.start(0); osc.stop(0.28);
      }],
      ['gray_shatter', 0.24, (c, out) => {
        const n = c.createBufferSource(); n.buffer = makeNoise(c);
        const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.setValueAtTime(2400, 0);
        const ng = c.createGain(); ng.gain.setValueAtTime(0.16, 0); ng.gain.exponentialRampToValueAtTime(0.001, 0.18);
        n.connect(hp); hp.connect(ng); ng.connect(out); n.start(0); n.stop(0.20);
        const freqs = [1980, 1420, 960];
        for (let i = 0; i < 3; i++) {
          const t0 = i * 0.025;
          const osc = c.createOscillator(); const g = c.createGain();
          osc.type = 'sine'; osc.frequency.setValueAtTime(freqs[i], t0);
          osc.frequency.exponentialRampToValueAtTime(freqs[i] * 0.62, t0 + 0.14);
          g.gain.setValueAtTime(0.075, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.16);
          osc.connect(g); g.connect(out); osc.start(t0); osc.stop(t0 + 0.17);
        }
      }],
      ['bell_quake', 0.70, (c, out) => {
        const freqs = [110, 220, 329.6, 523.25, 880];
        for (let i = 0; i < freqs.length; i++) {
          const f = freqs[i];
          const osc = c.createOscillator(); const g = c.createGain();
          osc.type = i === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(f * 1.04, 0); osc.frequency.exponentialRampToValueAtTime(f * 0.94, 0.62);
          g.gain.setValueAtTime(0.22 / (i * 0.65 + 1), 0); g.gain.exponentialRampToValueAtTime(0.0008, 0.66);
          osc.connect(g); g.connect(out); osc.start(0); osc.stop(0.68);
        }
        const n = c.createBufferSource(); n.buffer = makeNoise(c);
        const bp = c.createBiquadFilter(); bp.type = 'bandpass';
        bp.frequency.setValueAtTime(920, 0); bp.frequency.exponentialRampToValueAtTime(180, 0.28); bp.Q.value = 1.1;
        const ng = c.createGain(); ng.gain.setValueAtTime(0.24, 0); ng.gain.exponentialRampToValueAtTime(0.001, 0.30);
        n.connect(bp); bp.connect(ng); ng.connect(out); n.start(0); n.stop(0.32);
      }],
      ['res_bell_single', 1.02, (c, out) => {
        const freqs = [440, 660, 1056];
        for (let i = 0; i < 3; i++) {
          const osc = c.createOscillator(); const g = c.createGain();
          osc.type = i === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freqs[i], 0); osc.frequency.exponentialRampToValueAtTime(freqs[i] * 0.992, 0.95);
          g.gain.setValueAtTime(0.14 / (i * 0.7 + 1), 0); g.gain.exponentialRampToValueAtTime(0.0006, 0.98);
          osc.connect(g); g.connect(out); osc.start(0); osc.stop(1.0);
        }
      }],
      ['res_bell_harmony', 1.56, (c, out) => {
        const freqs = [440, 550, 660, 880];
        for (let i = 0; i < 4; i++) {
          const t0 = i * 0.045;
          const osc = c.createOscillator(); const g = c.createGain();
          osc.type = i === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freqs[i], t0); osc.frequency.exponentialRampToValueAtTime(freqs[i] * 0.992, 1.45);
          g.gain.setValueAtTime(0.16 / (i * 0.7 + 1), t0); g.gain.exponentialRampToValueAtTime(0.0006, 1.50);
          osc.connect(g); g.connect(out); osc.start(t0); osc.stop(1.54);
        }
      }],
      ['shade_dash', 0.28, (c, out) => {
        const n = c.createBufferSource(); n.buffer = makeNoise(c);
        const bp = c.createBiquadFilter(); bp.type = 'bandpass';
        bp.frequency.setValueAtTime(1900, 0); bp.frequency.exponentialRampToValueAtTime(340, 0.22); bp.Q.value = 1.9;
        const ng = c.createGain(); ng.gain.setValueAtTime(0.22, 0); ng.gain.exponentialRampToValueAtTime(0.001, 0.24);
        n.connect(bp); bp.connect(ng); ng.connect(out); n.start(0); n.stop(0.25);
        const freqs = [311.1, 622.3];
        for (let i = 0; i < 2; i++) {
          const osc = c.createOscillator(); const g = c.createGain();
          osc.type = i === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freqs[i] * 1.25, 0); osc.frequency.exponentialRampToValueAtTime(freqs[i] * 0.72, 0.24);
          g.gain.setValueAtTime(0.11 / (i + 1), 0); g.gain.exponentialRampToValueAtTime(0.0008, 0.25);
          osc.connect(g); g.connect(out); osc.start(0); osc.stop(0.26);
        }
      }],
      ['shade_burst', 0.32, (c, out) => {
        const freqs = [185, 370, 740, 1175];
        for (let i = 0; i < 4; i++) {
          const osc = c.createOscillator(); const g = c.createGain();
          osc.type = i === 0 ? 'sawtooth' : 'sine';
          osc.frequency.setValueAtTime(freqs[i], 0); osc.frequency.exponentialRampToValueAtTime(freqs[i] * 0.58, 0.26);
          g.gain.setValueAtTime(0.15 / (i * 0.65 + 1), 0); g.gain.exponentialRampToValueAtTime(0.0008, 0.28);
          osc.connect(g); g.connect(out); osc.start(0); osc.stop(0.30);
        }
      }],
      ['echo_reclaim', 0.78, (c, out) => {
        const freqs = [392.0, 493.88, 587.33, 783.99];
        for (let i = 0; i < 4; i++) {
          const t0 = i * 0.055;
          const osc = c.createOscillator(); const g = c.createGain();
          osc.type = 'sine'; osc.frequency.setValueAtTime(freqs[i], t0);
          g.gain.setValueAtTime(0.13, t0); g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.55);
          osc.connect(g); g.connect(out); osc.start(t0); osc.stop(t0 + 0.58);
        }
      }],
      ['shadow_blink', 0.36, (c, out) => {
        const freqs = [987.77, 1479.98, 440];
        for (let i = 0; i < 3; i++) {
          const t0 = i * 0.03;
          const osc = c.createOscillator(); const g = c.createGain();
          osc.type = i === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freqs[i], t0); osc.frequency.exponentialRampToValueAtTime(freqs[i] * 0.76, t0 + 0.24);
          g.gain.setValueAtTime(0.11 / (i + 1), t0); g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.26);
          osc.connect(g); g.connect(out); osc.start(t0); osc.stop(t0 + 0.28);
        }
      }],
      ['shield_bash', 0.36, (c, out) => {
        const sub = c.createOscillator(); const sg = c.createGain();
        sub.type = 'triangle';
        sub.frequency.setValueAtTime(165, 0); sub.frequency.exponentialRampToValueAtTime(42, 0.24);
        sg.gain.setValueAtTime(0.42, 0); sg.gain.exponentialRampToValueAtTime(0.001, 0.26);
        sub.connect(sg); sg.connect(out); sub.start(0); sub.stop(0.28);
        const freqs = [310, 642, 1180];
        for (let i = 0; i < 3; i++) {
          const osc = c.createOscillator(); const g = c.createGain();
          osc.type = i === 0 ? 'sawtooth' : 'triangle';
          osc.frequency.setValueAtTime(freqs[i], 0); osc.frequency.exponentialRampToValueAtTime(freqs[i] * 0.88, 0.30);
          g.gain.setValueAtTime(0.16 / (i + 1), 0); g.gain.exponentialRampToValueAtTime(0.0008, 0.32);
          osc.connect(g); g.connect(out); osc.start(0); osc.stop(0.34);
        }
        const n = c.createBufferSource(); n.buffer = makeNoise(c);
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(980, 0); bp.Q.value = 1.4;
        const ng = c.createGain(); ng.gain.setValueAtTime(0.22, 0); ng.gain.exponentialRampToValueAtTime(0.001, 0.12);
        n.connect(bp); bp.connect(ng); ng.connect(out); n.start(0); n.stop(0.14);
      }],
      ['bell_chime_cast', 0.48, (c, out) => {
        const freqs = [587.33, 1174.66, 1760.0, 2793.83];
        for (let i = 0; i < freqs.length; i++) {
          const osc = c.createOscillator(); const g = c.createGain();
          osc.type = i === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freqs[i], 0); osc.frequency.exponentialRampToValueAtTime(freqs[i] * 0.992, 0.42);
          g.gain.setValueAtTime(0.13 / (i * 0.72 + 1), 0); g.gain.exponentialRampToValueAtTime(0.0006, 0.44);
          osc.connect(g); g.connect(out); osc.start(0); osc.stop(0.46);
        }
      }],
      ['weapon_swap', 0.22, (c, out) => {
        const n = c.createBufferSource(); n.buffer = makeNoise(c);
        const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.setValueAtTime(2400, 0);
        const ng = c.createGain(); ng.gain.setValueAtTime(0.14, 0); ng.gain.exponentialRampToValueAtTime(0.001, 0.08);
        n.connect(hp); hp.connect(ng); ng.connect(out); n.start(0); n.stop(0.09);
        const osc = c.createOscillator(); const g = c.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(740, 0.02); osc.frequency.exponentialRampToValueAtTime(1180, 0.16);
        g.gain.setValueAtTime(0.12, 0.02); g.gain.exponentialRampToValueAtTime(0.0008, 0.19);
        osc.connect(g); g.connect(out); osc.start(0.02); osc.stop(0.20);
      }],
      ['wall_slam', 0.38, (c, out) => {
        const sub = c.createOscillator(), sg = c.createGain(); sub.type = 'triangle';
        sub.frequency.setValueAtTime(145, 0); sub.frequency.exponentialRampToValueAtTime(34, 0.24);
        sg.gain.setValueAtTime(0.42, 0); sg.gain.exponentialRampToValueAtTime(0.0008, 0.28);
        sub.connect(sg); sg.connect(out); sub.start(0); sub.stop(0.30);
        const n = c.createBufferSource(), bp = c.createBiquadFilter(), ng = c.createGain();
        n.buffer = makeNoise(c); bp.type = 'bandpass'; bp.Q.value = 1.1;
        bp.frequency.setValueAtTime(760, 0); bp.frequency.exponentialRampToValueAtTime(190, 0.28);
        ng.gain.setValueAtTime(0.32, 0); ng.gain.exponentialRampToValueAtTime(0.0008, 0.32);
        n.connect(bp); bp.connect(ng); ng.connect(out); n.start(0); n.stop(0.34);
      }],
      ['air_slam', 0.56, (c, out) => {
        const sub = c.createOscillator(), sg = c.createGain(); sub.type = 'triangle';
        sub.frequency.setValueAtTime(170, 0); sub.frequency.exponentialRampToValueAtTime(28, 0.40);
        sg.gain.setValueAtTime(0.46, 0); sg.gain.exponentialRampToValueAtTime(0.0008, 0.44);
        sub.connect(sg); sg.connect(out); sub.start(0); sub.stop(0.46);
        [220, 329.63, 587.33].forEach((f, i) => {
          const o = c.createOscillator(), g = c.createGain(); o.type = i === 0 ? 'triangle' : 'sine';
          o.frequency.setValueAtTime(f, 0); o.frequency.exponentialRampToValueAtTime(f * 0.92, 0.48);
          g.gain.setValueAtTime(0.18 / (i * 0.65 + 1), 0); g.gain.exponentialRampToValueAtTime(0.0007, 0.50);
          o.connect(g); g.connect(out); o.start(0); o.stop(0.52);
        });
        const n = c.createBufferSource(), lp = c.createBiquadFilter(), ng = c.createGain();
        n.buffer = makeNoise(c); lp.type = 'lowpass';
        lp.frequency.setValueAtTime(980, 0); lp.frequency.exponentialRampToValueAtTime(140, 0.34);
        ng.gain.setValueAtTime(0.28, 0); ng.gain.exponentialRampToValueAtTime(0.001, 0.36);
        n.connect(lp); lp.connect(ng); ng.connect(out); n.start(0); n.stop(0.38);
      }],
      ['crumble', 0.30, (c, out) => {
        const n = c.createBufferSource(); n.buffer = makeNoise(c);
        const lp = c.createBiquadFilter(); lp.type = 'lowpass';
        lp.frequency.setValueAtTime(720, 0); lp.frequency.exponentialRampToValueAtTime(140, 0.24);
        const g = c.createGain(); g.gain.setValueAtTime(0.18, 0); g.gain.exponentialRampToValueAtTime(0.001, 0.26);
        n.connect(lp); lp.connect(g); g.connect(out); n.start(0); n.stop(0.28);
      }],
      ['falcon_cry', 0.36, (c, out) => {
        const osc = c.createOscillator(); const g = c.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1920, 0); osc.frequency.exponentialRampToValueAtTime(980, 0.28);
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(1580, 0); bp.Q.value = 3.2;
        g.gain.setValueAtTime(0.16, 0); g.gain.exponentialRampToValueAtTime(0.0008, 0.32);
        osc.connect(bp); bp.connect(g); g.connect(out); osc.start(0); osc.stop(0.34);
        const bell = c.createOscillator(); const bg = c.createGain();
        bell.type = 'sine'; bell.frequency.setValueAtTime(2640, 0.03);
        bg.gain.setValueAtTime(0.09, 0.03); bg.gain.exponentialRampToValueAtTime(0.0006, 0.34);
        bell.connect(bg); bg.connect(out); bell.start(0.03); bell.stop(0.35);
      }],
      ['wind_blade', 0.26, (c, out) => {
        const n = c.createBufferSource(); n.buffer = makeNoise(c);
        const bp = c.createBiquadFilter(); bp.type = 'bandpass';
        bp.frequency.setValueAtTime(1850, 0); bp.frequency.exponentialRampToValueAtTime(620, 0.22); bp.Q.value = 2.4;
        const g = c.createGain(); g.gain.setValueAtTime(0.20, 0); g.gain.exponentialRampToValueAtTime(0.0008, 0.24);
        n.connect(bp); bp.connect(g); g.connect(out); n.start(0); n.stop(0.25);
      }],
      ['spore_bounce', 0.30, (c, out) => {
        const osc = c.createOscillator(); const g = c.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(155, 0); osc.frequency.exponentialRampToValueAtTime(520, 0.14); osc.frequency.exponentialRampToValueAtTime(340, 0.26);
        g.gain.setValueAtTime(0.24, 0); g.gain.exponentialRampToValueAtTime(0.0008, 0.28);
        osc.connect(g); g.connect(out); osc.start(0); osc.stop(0.29);
        const ch = c.createOscillator(); const cg = c.createGain();
        ch.type = 'triangle'; ch.frequency.setValueAtTime(659.25, 0.04);
        cg.gain.setValueAtTime(0.08, 0.04); cg.gain.exponentialRampToValueAtTime(0.0006, 0.27);
        ch.connect(cg); cg.connect(out); ch.start(0.04); ch.stop(0.28);
      }],
      ['spore_burst', 0.42, (c, out) => {
        const n = c.createBufferSource(); n.buffer = makeNoise(c);
        const bp = c.createBiquadFilter(); bp.type = 'bandpass';
        bp.frequency.setValueAtTime(920, 0); bp.frequency.exponentialRampToValueAtTime(280, 0.38); bp.Q.value = 1.6;
        const g = c.createGain(); g.gain.setValueAtTime(0.22, 0); g.gain.exponentialRampToValueAtTime(0.0008, 0.40);
        n.connect(bp); bp.connect(g); g.connect(out); n.start(0); n.stop(0.41);
        const sub = c.createOscillator(); const sg = c.createGain();
        sub.type = 'triangle'; sub.frequency.setValueAtTime(140, 0); sub.frequency.exponentialRampToValueAtTime(62, 0.26);
        sg.gain.setValueAtTime(0.14, 0); sg.gain.exponentialRampToValueAtTime(0.001, 0.28);
        sub.connect(sg); sg.connect(out); sub.start(0); sub.stop(0.30);
      }],
      ['spore_purify', 0.46, (c, out) => {
        const freqs = [587.33, 880.0, 1318.5];
        for (let i = 0; i < freqs.length; i++) {
          const t0 = i * 0.035;
          const osc = c.createOscillator(); const g = c.createGain();
          osc.type = 'sine'; osc.frequency.setValueAtTime(freqs[i], t0);
          osc.frequency.exponentialRampToValueAtTime(freqs[i] * 1.06, t0 + 0.36);
          g.gain.setValueAtTime(0.11 / (i * 0.5 + 1), t0); g.gain.exponentialRampToValueAtTime(0.0006, t0 + 0.38);
          osc.connect(g); g.connect(out); osc.start(t0); osc.stop(t0 + 0.40);
        }
        const n = c.createBufferSource(); n.buffer = makeNoise(c);
        const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.setValueAtTime(2200, 0);
        const ng = c.createGain(); ng.gain.setValueAtTime(0.12, 0); ng.gain.exponentialRampToValueAtTime(0.001, 0.26);
        n.connect(hp); hp.connect(ng); ng.connect(out); n.start(0); n.stop(0.28);
      }],
      ['bark_crack', 0.38, (c, out) => {
        const n = c.createBufferSource(); n.buffer = makeNoise(c);
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(640, 0); bp.Q.value = 1.9;
        const ng = c.createGain(); ng.gain.setValueAtTime(0.28, 0); ng.gain.exponentialRampToValueAtTime(0.001, 0.24);
        n.connect(bp); bp.connect(ng); ng.connect(out); n.start(0); n.stop(0.26);
        const osc = c.createOscillator(); const g = c.createGain();
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(175, 0); osc.frequency.exponentialRampToValueAtTime(52, 0.32);
        g.gain.setValueAtTime(0.22, 0); g.gain.exponentialRampToValueAtTime(0.0008, 0.35);
        osc.connect(g); g.connect(out); osc.start(0); osc.stop(0.36);
      }],
      ['frost_build', 0.22, (c, out) => {
        const freqs = [1567.98, 2349.32];
        for (let i = 0; i < 2; i++) {
          const osc = c.createOscillator(); const g = c.createGain();
          osc.type = 'sine'; osc.frequency.setValueAtTime(freqs[i], i * 0.02);
          g.gain.setValueAtTime(0.08, i * 0.02); g.gain.exponentialRampToValueAtTime(0.0006, 0.20);
          osc.connect(g); g.connect(out); osc.start(i * 0.02); osc.stop(0.21);
        }
      }],
      ['ult_blade', 0.62, (c, out) => {
        const cuts = [0, 0.08, 0.16, 0.24, 0.34];
        for (let i = 0; i < cuts.length; i++) {
          const t0 = cuts[i];
          const n = c.createBufferSource(); n.buffer = makeNoise(c);
          const bp = c.createBiquadFilter(); bp.type = 'bandpass';
          bp.frequency.setValueAtTime(2200 + i * 240, t0); bp.frequency.exponentialRampToValueAtTime(520, t0 + 0.14); bp.Q.value = 1.6;
          const ng = c.createGain(); ng.gain.setValueAtTime(0.18, t0); ng.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.16);
          n.connect(bp); bp.connect(ng); ng.connect(out); n.start(t0); n.stop(t0 + 0.17);
          const osc = c.createOscillator(); const og = c.createGain();
          osc.type = i === cuts.length - 1 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(1174.66 * (1 + i * 0.12), t0);
          osc.frequency.exponentialRampToValueAtTime(587.33, t0 + 0.22);
          og.gain.setValueAtTime(i === cuts.length - 1 ? 0.20 : 0.12, t0);
          og.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.24);
          osc.connect(og); og.connect(out); osc.start(t0); osc.stop(t0 + 0.26);
        }
      }],
      ['ult_hammer', 1.18, (c, out) => {
        const sub = c.createOscillator(); const sg = c.createGain();
        sub.type = 'triangle'; sub.frequency.setValueAtTime(125, 0); sub.frequency.exponentialRampToValueAtTime(28, 0.55);
        sg.gain.setValueAtTime(0.46, 0); sg.gain.exponentialRampToValueAtTime(0.0008, 0.62);
        sub.connect(sg); sg.connect(out); sub.start(0); sub.stop(0.65);
        const freqs = [110, 146.83, 220, 329.63, 587.33];
        for (let i = 0; i < freqs.length; i++) {
          const osc = c.createOscillator(); const g = c.createGain();
          osc.type = i < 2 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freqs[i], 0.02); osc.frequency.exponentialRampToValueAtTime(freqs[i] * 0.96, 1.08);
          g.gain.setValueAtTime(0.24 / (i * 0.55 + 1), 0.02); g.gain.exponentialRampToValueAtTime(0.0006, 1.12);
          osc.connect(g); g.connect(out); osc.start(0.02); osc.stop(1.15);
        }
        const n = c.createBufferSource(); n.buffer = makeNoise(c);
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(640, 0); lp.frequency.exponentialRampToValueAtTime(120, 0.45);
        const ng = c.createGain(); ng.gain.setValueAtTime(0.26, 0); ng.gain.exponentialRampToValueAtTime(0.001, 0.48);
        n.connect(lp); lp.connect(ng); ng.connect(out); n.start(0); n.stop(0.50);
      }],
      ['ult_bell', 1.10, (c, out) => {
        const notes = [293.66, 349.23, 440.0, 587.33, 880.0, 1174.66];
        for (let i = 0; i < notes.length; i++) {
          const t0 = i * 0.055;
          const osc = c.createOscillator(); const g = c.createGain();
          osc.type = i % 2 === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(notes[i], t0);
          g.gain.setValueAtTime(0.0006, t0);
          g.gain.linearRampToValueAtTime(0.14 / (i * 0.35 + 1), t0 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0006, t0 + 0.72);
          osc.connect(g); g.connect(out); osc.start(t0); osc.stop(t0 + 0.75);
        }
      }],
      ['boss4_swap', 0.42, (c, out) => {
        const freqs = [392.0, 587.33, 880.0, 1174.66];
        for (let i = 0; i < freqs.length; i++) {
          const t0 = i * 0.025;
          const osc = c.createOscillator(); const g = c.createGain();
          osc.type = i % 2 === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freqs[i], t0);
          osc.frequency.exponentialRampToValueAtTime(freqs[i] * 1.06, t0 + 0.24);
          g.gain.setValueAtTime(0.14 / (i * 0.4 + 1), t0);
          g.gain.exponentialRampToValueAtTime(0.0006, t0 + 0.30);
          osc.connect(g); g.connect(out); osc.start(t0); osc.stop(t0 + 0.32);
        }
      }],
      ['boss4_iai', 0.40, (c, out) => {
        const n = c.createBufferSource(); n.buffer = makeNoise(c);
        const bp = c.createBiquadFilter(); bp.type = 'bandpass';
        bp.frequency.setValueAtTime(2800, 0); bp.frequency.exponentialRampToValueAtTime(480, 0.22); bp.Q.value = 1.9;
        const ng = c.createGain(); ng.gain.setValueAtTime(0.24, 0); ng.gain.exponentialRampToValueAtTime(0.0008, 0.24);
        n.connect(bp); bp.connect(ng); ng.connect(out); n.start(0); n.stop(0.25);
        const osc = c.createOscillator(); const g = c.createGain();
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(1480, 0); osc.frequency.exponentialRampToValueAtTime(340, 0.26);
        g.gain.setValueAtTime(0.13, 0); g.gain.exponentialRampToValueAtTime(0.0007, 0.28);
        osc.connect(g); g.connect(out); osc.start(0); osc.stop(0.30);
      }],
      ['boss4_counter', 0.65, (c, out) => {
        const freqs = [146.83, 293.66, 440.0, 739.99, 1174.66];
        for (let i = 0; i < freqs.length; i++) {
          const osc = c.createOscillator(); const g = c.createGain();
          osc.type = i < 2 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freqs[i], 0);
          osc.frequency.exponentialRampToValueAtTime(freqs[i] * 0.985, 0.58);
          g.gain.setValueAtTime(0.22 / (i * 0.55 + 1), 0);
          g.gain.exponentialRampToValueAtTime(0.0006, 0.60);
          osc.connect(g); g.connect(out); osc.start(0); osc.stop(0.62);
        }
      }],
      ['forge_trait', 0.68, (c, out) => {
        const freqs = [587.33, 880.0, 1318.5, 1760.0];
        for (let i = 0; i < freqs.length; i++) {
          const t0 = i * 0.04;
          const osc = c.createOscillator(); const g = c.createGain();
          osc.type = i === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freqs[i], t0);
          g.gain.setValueAtTime(0.15 / (i * 0.45 + 1), t0);
          g.gain.exponentialRampToValueAtTime(0.0006, t0 + 0.48);
          osc.connect(g); g.connect(out); osc.start(t0); osc.stop(t0 + 0.50);
        }
      }],
      ['relic_refine', 0.96, (c, out) => {
        const anvil = c.createBufferSource(); anvil.buffer = makeNoise(c);
        const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.setValueAtTime(2800, 0);
        const ag = c.createGain(); ag.gain.setValueAtTime(0.20, 0); ag.gain.exponentialRampToValueAtTime(0.0008, 0.09);
        anvil.connect(hp); hp.connect(ag); ag.connect(out); anvil.start(0); anvil.stop(0.11);
        const notes = [440.0, 659.25, 880.0, 1318.51, 1760.0, 2637.02];
        for (let i = 0; i < notes.length; i++) {
          const t0 = i * 0.048;
          const osc = c.createOscillator(); const g = c.createGain();
          osc.type = i < 2 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(notes[i], t0);
          osc.frequency.exponentialRampToValueAtTime(notes[i] * 1.006, t0 + 0.62);
          g.gain.setValueAtTime(0.0005, t0);
          g.gain.linearRampToValueAtTime(0.16 / (i * 0.36 + 1), t0 + 0.015);
          g.gain.exponentialRampToValueAtTime(0.0005, t0 + 0.66);
          osc.connect(g); g.connect(out); osc.start(t0); osc.stop(t0 + 0.68);
        }
      }],
      ['frost_shatter', 0.44, (c, out) => {
        const n = c.createBufferSource(); n.buffer = makeNoise(c);
        const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.setValueAtTime(3100, 0);
        const ng = c.createGain(); ng.gain.setValueAtTime(0.24, 0); ng.gain.exponentialRampToValueAtTime(0.0008, 0.34);
        n.connect(hp); hp.connect(ng); ng.connect(out); n.start(0); n.stop(0.36);
        const freqs = [2637, 2093, 1568, 1175];
        for (let i = 0; i < freqs.length; i++) {
          const t0 = i * 0.028;
          const osc = c.createOscillator(); const g = c.createGain();
          osc.type = 'triangle'; osc.frequency.setValueAtTime(freqs[i], t0);
          osc.frequency.exponentialRampToValueAtTime(freqs[i] * 0.68, t0 + 0.26);
          g.gain.setValueAtTime(0.10, t0); g.gain.exponentialRampToValueAtTime(0.0006, t0 + 0.28);
          osc.connect(g); g.connect(out); osc.start(t0); osc.stop(t0 + 0.30);
        }
      }],
      // 5. BGM Instrument Voices (pre-baked at D4/D3, pitched via playbackRate -> 1 node per note!)
      ['bgm_pluck', 0.58, (c, out) => {
        const freq = 293.66;
        const osc = c.createOscillator(); const lp = c.createBiquadFilter(); const g = c.createGain();
        osc.type = 'triangle'; osc.frequency.setValueAtTime(freq, 0);
        lp.type = 'lowpass'; lp.frequency.setValueAtTime(1520, 0); lp.frequency.exponentialRampToValueAtTime(340, 0.52);
        g.gain.setValueAtTime(0.0005, 0); g.gain.linearRampToValueAtTime(0.13, 0.012); g.gain.exponentialRampToValueAtTime(0.0005, 0.54);
        osc.connect(lp); lp.connect(g); g.connect(out); osc.start(0); osc.stop(0.56);
      }],
      ['bgm_chime', 1.65, (c, out) => {
        const freq = 293.66;
        const mults = [1, 2.003, 2.98];
        for (let i = 0; i < 3; i++) {
          const osc = c.createOscillator(); const g = c.createGain();
          osc.type = 'sine'; osc.frequency.setValueAtTime(freq * mults[i], 0);
          g.gain.setValueAtTime(0.0004, 0); g.gain.linearRampToValueAtTime(0.11 / (i * 1.4 + 1), 0.015);
          g.gain.exponentialRampToValueAtTime(0.0004, 1.55 / (i * 0.45 + 1));
          osc.connect(g); g.connect(out); osc.start(0); osc.stop(1.60);
        }
      }],
      ['bgm_bass', 0.38, (c, out) => {
        const osc = c.createOscillator(); const lp = c.createBiquadFilter(); const g = c.createGain();
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(146.83 * 0.5, 0);
        lp.type = 'lowpass'; lp.frequency.setValueAtTime(280, 0);
        g.gain.setValueAtTime(0.0006, 0); g.gain.linearRampToValueAtTime(0.17, 0.02); g.gain.exponentialRampToValueAtTime(0.0006, 0.34);
        osc.connect(lp); lp.connect(g); g.connect(out); osc.start(0); osc.stop(0.36);
      }],
      ['bgm_drum_acc', 0.27, (c, out) => {
        const osc = c.createOscillator(); const g = c.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(112, 0); osc.frequency.exponentialRampToValueAtTime(34, 0.22);
        g.gain.setValueAtTime(0.34, 0); g.gain.exponentialRampToValueAtTime(0.0008, 0.24);
        osc.connect(g); g.connect(out); osc.start(0); osc.stop(0.26);
      }],
      ['bgm_drum_soft', 0.20, (c, out) => {
        const osc = c.createOscillator(); const g = c.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(84, 0); osc.frequency.exponentialRampToValueAtTime(34, 0.15);
        g.gain.setValueAtTime(0.20, 0); g.gain.exponentialRampToValueAtTime(0.0008, 0.16);
        osc.connect(g); g.connect(out); osc.start(0); osc.stop(0.18);
      }],
      ['bgm_tap_acc', 0.09, (c, out) => {
        const n = c.createBufferSource(); n.buffer = makeNoise(c);
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(1650, 0); bp.Q.value = 3.2;
        const g = c.createGain(); g.gain.setValueAtTime(0.14, 0); g.gain.exponentialRampToValueAtTime(0.0006, 0.065);
        n.connect(bp); bp.connect(g); g.connect(out); n.start(0); n.stop(0.08);
      }],
      ['anvil_tap', 0.34, (c, out) => {
        // Crisp distant-friendly bronze anvil strike (Bell-Smith Li rhythmic forging)
        [1180, 2360, 3540].forEach((f, idx) => {
          const osc = c.createOscillator(); const g = c.createGain();
          osc.type = idx === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(f, 0);
          osc.frequency.exponentialRampToValueAtTime(f * 0.985, 0.26);
          const pk = idx === 0 ? 0.16 : idx === 1 ? 0.11 : 0.055;
          g.gain.setValueAtTime(0.0005, 0);
          g.gain.linearRampToValueAtTime(pk, 0.003);
          g.gain.exponentialRampToValueAtTime(0.0005, 0.28 - idx * 0.05);
          osc.connect(g); g.connect(out); osc.start(0); osc.stop(0.32);
        });
        const n = c.createBufferSource(); n.buffer = makeNoise(c);
        const hp = c.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.setValueAtTime(3200, 0); hp.Q.value = 2.6;
        const ng = c.createGain(); ng.gain.setValueAtTime(0.11, 0); ng.gain.exponentialRampToValueAtTime(0.0005, 0.045);
        n.connect(hp); hp.connect(ng); ng.connect(out); n.start(0); n.stop(0.06);
      }],
      ['bgm_tap_soft', 0.09, (c, out) => {
        const n = c.createBufferSource(); n.buffer = makeNoise(c);
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(1650, 0); bp.Q.value = 3.2;
        const g = c.createGain(); g.gain.setValueAtTime(0.075, 0); g.gain.exponentialRampToValueAtTime(0.0006, 0.065);
        n.connect(bp); bp.connect(g); g.connect(out); n.start(0); n.stop(0.08);
      }]
    ];
    return tasks;
}


// ==================== BESPOKE TITLE INTRO CINEMATIC AUDIO SUITE (v44.4) ====================
// Dedicated theatrical sound design for "破刃断钟" — ZERO shared in-game combat SFX!

export function synthIntroOmen(c, dest, noiseBuf) {
  const t = c.currentTime;
  const master = c.createGain();
  master.gain.setValueAtTime(0.0005, t);
  master.gain.linearRampToValueAtTime(0.46, t + 0.55);
  master.gain.exponentialRampToValueAtTime(0.0005, t + 2.25);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(220, t);
  lp.frequency.linearRampToValueAtTime(460, t + 0.7);
  lp.frequency.exponentialRampToValueAtTime(150, t + 2.2);
  master.connect(lp);
  lp.connect(dest);

  // Dark cathedral bronze hum (D2 + A2 + muted D3)
  [
    [73.42, 'sine', 0.52],
    [110.00, 'triangle', 0.24],
    [146.83, 'sine', 0.20]
  ].forEach(([freq, type, amp]) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.985, t + 2.2);
    g.gain.setValueAtTime(amp, t);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + 2.3);
  });

  // Subtle cold abyssal draft exhale
  if (noiseBuf) {
    const n = c.createBufferSource();
    n.buffer = noiseBuf;
    n.loop = true;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(310, t);
    bp.Q.value = 1.8;
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.0005, t);
    ng.gain.linearRampToValueAtTime(0.16, t + 0.65);
    ng.gain.exponentialRampToValueAtTime(0.0005, t + 2.15);
    n.connect(bp); bp.connect(ng); ng.connect(dest);
    n.start(t); n.stop(t + 2.2);
  }
}

export function synthIntroBladeDraw(c, dest, noiseBuf) {
  // Exact 0.94s rising steel draw & golden sightline tension -> 60ms dramatic vacuum breath right before 3.55s slash!
  const t = c.currentTime;
  const cutT = t + 0.94;

  // 1. Cold notched steel glide-scrape (high-Q resonant sweep 850Hz -> 3650Hz)
  if (noiseBuf) {
    const n = c.createBufferSource();
    n.buffer = noiseBuf;
    n.loop = true;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(850, t);
    bp.frequency.exponentialRampToValueAtTime(3650, t + 0.88);
    bp.Q.value = 5.2;
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(650, t);
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.0005, t);
    ng.gain.exponentialRampToValueAtTime(0.26, t + 0.84);
    ng.gain.linearRampToValueAtTime(0.32, t + 0.90);
    ng.gain.exponentialRampToValueAtTime(0.0004, cutT);
    n.connect(bp); bp.connect(hp); hp.connect(ng); ng.connect(dest);
    n.start(t); n.stop(cutT + 0.02);
  }

  // 2. Converging golden sightline tension harmonics (crisp cinema riser, hard-gated for pre-slash breath)
  [
    [587.33, 1174.66, 'sine', 0.095],
    [880.00, 1760.00, 'triangle', 0.055],
    [1760.0, 2637.02, 'sine', 0.032]
  ].forEach(([f0, f1, type, peak]) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f1, t + 0.90);
    g.gain.setValueAtTime(0.0004, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.88);
    g.gain.exponentialRampToValueAtTime(0.0004, cutT);
    osc.connect(g); g.connect(dest);
    osc.start(t); osc.stop(cutT + 0.02);
  });

  // 3. Low inward air-suck sub swell (110Hz -> 58Hz) that cuts dead at 0.94s
  const sub = c.createOscillator();
  const sg = c.createGain();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(112, t);
  sub.frequency.exponentialRampToValueAtTime(56, t + 0.90);
  sg.gain.setValueAtTime(0.0005, t);
  sg.gain.exponentialRampToValueAtTime(0.18, t + 0.87);
  sg.gain.exponentialRampToValueAtTime(0.0004, cutT);
  sub.connect(sg); sg.connect(dest);
  sub.start(t); sub.stop(cutT + 0.02);
}

export function synthIntroCleaveSlash(c, dest, noiseBuf) {
  // Theatrical "破刃一闪" diagonal razor blade cleave (fits the 0.16s flash + dramatic hitstop freeze!)
  const t = c.currentTime;

  // 1. High-velocity razor air-tear whip ("刷——！": steep 8400Hz -> 1150Hz resonant slash)
  if (noiseBuf) {
    const n1 = c.createBufferSource();
    n1.buffer = noiseBuf;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(8400, t);
    bp.frequency.exponentialRampToValueAtTime(1150, t + 0.125);
    bp.Q.value = 1.5;
    const g1 = c.createGain();
    g1.gain.setValueAtTime(0.001, t);
    g1.gain.linearRampToValueAtTime(0.62, t + 0.005);
    g1.gain.exponentialRampToValueAtTime(0.0006, t + 0.15);
    n1.connect(bp); bp.connect(g1); g1.connect(dest);
    n1.start(t); n1.stop(t + 0.165);

    // Ultra-crisp razor sheen edge (> 4600Hz)
    const n2 = c.createBufferSource();
    n2.buffer = noiseBuf;
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(4600, t);
    const g2 = c.createGain();
    g2.gain.setValueAtTime(0.001, t);
    g2.gain.linearRampToValueAtTime(0.38, t + 0.003);
    g2.gain.exponentialRampToValueAtTime(0.0006, t + 0.085);
    n2.connect(hp); hp.connect(g2); g2.connect(dest);
    n2.start(t); n2.stop(t + 0.10);
  }

  // 2. Dry cold-steel bronze-bite transient (sharp inharmonic metallic shear — NO arcade parry ping!)
  [
    [2640, 2120, 'sawtooth', 0.11, 0.095],
    [4180, 3520, 'triangle', 0.085, 0.085],
    [6320, 5100, 'sine',     0.055, 0.070]
  ].forEach(([f0, f1, type, amp, dur]) => {
    const osc = c.createOscillator();
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(1600, t);
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0008, t);
    g.gain.linearRampToValueAtTime(amp, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    osc.connect(hp); hp.connect(g); g.connect(dest);
    osc.start(t); osc.stop(t + dur + 0.015);
  });

  // 3. Cinematic sub-bass vacuum punch (155Hz -> 34Hz, tight 0.15s envelope locking into the hitstop)
  const sub = c.createOscillator();
  const sg = c.createGain();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(155, t);
  sub.frequency.exponentialRampToValueAtTime(34, t + 0.145);
  sg.gain.setValueAtTime(0.001, t);
  sg.gain.linearRampToValueAtTime(0.58, t + 0.004);
  sg.gain.exponentialRampToValueAtTime(0.0008, t + 0.155);
  sub.connect(sg); sg.connect(dest);
  sub.start(t); sub.stop(t + 0.17);
}

export function synthIntroBellCleave(c, dest, noiseBuf) {
  // Theatrical "古钟断裂 · 残鸣余韵" — Colossal bronze bell splitting into two pitch-diverging halves!
  const t = c.currentTime;

  // 1. Seismic weight fracture boom (96Hz -> 25Hz sub-drop + deep bronze body thump)
  const boom = c.createOscillator();
  const bg = c.createGain();
  boom.type = 'sine';
  boom.frequency.setValueAtTime(96, t);
  boom.frequency.exponentialRampToValueAtTime(25, t + 0.65);
  bg.gain.setValueAtTime(0.001, t);
  bg.gain.linearRampToValueAtTime(0.62, t + 0.008);
  bg.gain.exponentialRampToValueAtTime(0.0006, t + 0.85);
  boom.connect(bg); bg.connect(dest);
  boom.start(t); boom.stop(t + 0.90);

  if (noiseBuf) {
    // Heavy low-frequency structural crack thud
    const thud = c.createBufferSource();
    thud.buffer = noiseBuf;
    const lpThud = c.createBiquadFilter();
    lpThud.type = 'lowpass';
    lpThud.frequency.setValueAtTime(360, t);
    lpThud.frequency.exponentialRampToValueAtTime(85, t + 0.28);
    const tg = c.createGain();
    tg.gain.setValueAtTime(0.001, t);
    tg.gain.linearRampToValueAtTime(0.42, t + 0.006);
    tg.gain.exponentialRampToValueAtTime(0.0006, t + 0.30);
    thud.connect(lpThud); lpThud.connect(tg); tg.connect(dest);
    thud.start(t); thud.stop(t + 0.32);

    // Molten seared cut-seam sizzle hiss
    const hiss = c.createBufferSource();
    hiss.buffer = noiseBuf;
    const hpHiss = c.createBiquadFilter();
    hpHiss.type = 'bandpass';
    hpHiss.frequency.setValueAtTime(3800, t);
    hpHiss.Q.value = 1.4;
    const hg = c.createGain();
    hg.gain.setValueAtTime(0.0006, t);
    hg.gain.linearRampToValueAtTime(0.16, t + 0.015);
    hg.gain.exponentialRampToValueAtTime(0.0005, t + 0.44);
    hiss.connect(hpHiss); hpHiss.connect(hg); hg.connect(dest);
    hiss.start(t); hiss.stop(t + 0.48);
  }

  // 2. Severed Cracked-Bronze Bell Split Resonance (3.1s cathedral tail with subtle diverging fracture pitch!)
  const bellFilter = c.createBiquadFilter();
  bellFilter.type = 'lowpass';
  bellFilter.frequency.setValueAtTime(3100, t);
  bellFilter.frequency.exponentialRampToValueAtTime(420, t + 2.95);
  bellFilter.Q.value = 1.1;
  bellFilter.connect(dest);

  const partials = [
    // [startHz, endHz, wave, amp, decaySec]
    [73.42,  72.6,   'sine',     0.26, 3.05], // Abyssal sub hum (D2)
    [146.83, 144.2,  'sine',     0.22, 2.85], // Lower bell half fundamental
    [150.40, 152.1,  'sine',     0.15, 2.55], // Upper half detuned beat (cracked metallic wobble!)
    [174.61, 171.8,  'triangle', 0.13, 2.35], // Dark Phrygian minor third (F3)
    [293.66, 283.5,  'sine',     0.14, 1.95], // Cleaved mid ring bending downward
    [415.30, 398.0,  'sine',     0.085, 1.35], // Inharmonic bronze fracture overtone
    [587.33, 562.0,  'triangle', 0.075, 1.15], // High bronze shimmer fading into mist
    [932.33, 888.0,  'sine',     0.045, 0.72]
  ];
  for (let i = 0; i < partials.length; i++) {
    const [f0, f1, type, amp, dur] = partials[i];
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0006, t);
    g.gain.linearRampToValueAtTime(amp, t + 0.007);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    osc.connect(g); g.connect(bellFilter);
    osc.start(t); osc.stop(t + dur + 0.04);
  }

  // 3. Staggered cascading bronze shard clinks flying outward
  const shards = [
    [0.025, 2140, 0.075, 0.13],
    [0.075, 3420, 0.060, 0.11],
    [0.140, 2680, 0.055, 0.14],
    [0.215, 4380, 0.042, 0.09],
    [0.310, 1960, 0.040, 0.15],
    [0.435, 3120, 0.028, 0.12]
  ];
  for (let i = 0; i < shards.length; i++) {
    const [off, freq, amp, dur] = shards[i];
    const st = t + off;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, st);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.94, st + dur);
    g.gain.setValueAtTime(0.0004, st);
    g.gain.linearRampToValueAtTime(amp, st + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0004, st + dur);
    osc.connect(g); g.connect(dest);
    osc.start(st); osc.stop(st + dur + 0.02);
  }
}
