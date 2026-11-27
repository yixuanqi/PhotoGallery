/* ===== 花神启境 · 展演主控状态机（交付正式版 V1.0） ===== */
class FlowerExhibitionApp {
  constructor(config) {
    this.config = config || { flowers: [] };
    this.flowers = this.config.flowers || [];
    this.flowersById = new Map(this.flowers.map((f) => [f.id, f]));
    this.revealDurationMs = Number(this.config.revealDurationMs) || 2600;
    this.returningDurationMs = Number(this.config.returningDurationMs) || 2200;
    this.fallbackFilmDurationMs = Number(this.config.fallbackFilmDurationMs) || 6000;
    this.bootTs = Date.now();

    this.audio = new AudioEngine();
    this.bgRenderer = new BotanicalRenderer(document.getElementById("bg-canvas"));
    this.transitionDirector = new TransitionDirector();
    this.particleField = new ParticleField(document.getElementById("fg-canvas"), this.transitionDirector);
    this.procFilm = new ProceduralFilmFallback(document.getElementById("procedural-film-canvas"));
    this.video = document.getElementById("flower-video");
    this.lastFrameCanvas = document.getElementById("lastframe-canvas");

    this.elRevealMonth = document.getElementById("reveal-month");
    this.elRevealFlower = document.getElementById("reveal-flower");
    this.elRevealScene = document.getElementById("reveal-scene");
    this.elPlayMonth = document.getElementById("playing-month");
    this.elPlayFlower = document.getElementById("playing-flower");
    this.elPlayScene = document.getElementById("playing-scene");
    this.elBlessMonth = document.getElementById("blessing-month");
    this.elBlessFlower = document.getElementById("blessing-flower");
    this.elBlessSub = document.getElementById("blessing-sub");
    this.elBlessPoem = document.getElementById("blessing-poem");
    this.elBlessText = document.getElementById("blessing-text");
    this.elDockStatus = document.getElementById("dock-status");
    this.elDockFlowers = document.getElementById("dock-flowers");
    this.elDockFit = document.getElementById("dock-fit");

    this.state = "idle";
    this.sessionId = 0;
    this.activeFlower = null;
    this.stageTimer = null;
    this.videoPlayGuardTimer = null;
    this.cursorIdleTimer = null;

    // URL 参数支持：?kiosk=1（隐藏控制条与空闲鼠标） | ?fit=cover（全屏铺满） | ?mode=ink（仅看水墨兜底）
    const params = new URLSearchParams(window.location.search);
    this.kioskMode = params.get("kiosk") === "1" || params.get("kiosk") === "true";
    this.forceInkMode = params.get("mode") === "ink";
    this.fitCover = params.get("fit") === "cover" || (this.kioskMode && params.get("fit") !== "contain");

    this.videoCandidates = [];
    this.videoCandidateIdx = 0;
    this.activeVideoLabel = "";
    this.videoLoadFailed = false;
    this.wantVideoPlay = false;
    this.usingProceduralFilm = false;
    this.muted = false;

    this.applyInitialViewFlags();
    this.buildDock();
    this.bindEvents();
    this.startLoop();
  }

  applyInitialViewFlags() {
    if (this.kioskMode) {
      document.body.classList.add("dock-hidden");
      this.scheduleCursorHide();
    }
    if (this.fitCover) {
      document.body.classList.add("fit-cover");
      if (this.elDockFit) {
        this.elDockFit.textContent = "画面：铺满 (C)";
        this.elDockFit.classList.add("active");
      }
    }
  }

  scheduleCursorHide() {
    if (!this.kioskMode) return;
    document.body.classList.remove("cursor-hidden");
    clearTimeout(this.cursorIdleTimer);
    this.cursorIdleTimer = setTimeout(() => {
      document.body.classList.add("cursor-hidden");
    }, 3000);
  }

  buildDock() {
    this.elDockFlowers.innerHTML = "";
    const heroes = new Set([1, 6, 8]);
    for (const f of this.flowers) {
      const btn = document.createElement("button");
      btn.className = "dock-btn" + (heroes.has(f.id) ? " hero" : "");
      btn.dataset.fid = String(f.id);
      btn.textContent = `${f.code} ${f.flower}`;
      const archLabel = ARCHETYPE_LABELS[getFlowerArchetype(f)] || "";
      btn.title = `${f.month} · ${f.flower}（${f.scene}｜${archLabel}）`;
      btn.addEventListener("click", () => {
        this.audio.unlock();
        this.trigger(f.id, true);
      });
      this.elDockFlowers.appendChild(btn);
    }
  }

  /* 构造纯相对路径的视频探测队列（客户只需替换 videos/ 下的同名文件即可生效） */
  buildVideoCandidates(flower) {
    if (this.forceInkMode) return [];
    const dir = (this.config.videoDir || "videos").replace(/\/+$/, "");
    const code = flower.code;
    const isHttp = window.location.protocol === "http:" || window.location.protocol === "https:";
    const suffix = isHttp ? `?v=${this.bootTs}` : "";

    const primary = flower.video || `${dir}/${code}.mp4`;
    const secondary = flower.video_fallback || `${dir}/${code}.webm`;
    const list = [
      { url: `${primary}${suffix}`, label: primary },
      { url: `${secondary}${suffix}`, label: secondary },
    ];
    // 兼容若旧版素材仍放在 assets/videos/ 的情况
    if (!primary.startsWith("assets/")) {
      list.push({ url: `assets/videos/${code}.mp4${suffix}`, label: `assets/videos/${code}.mp4` });
      list.push({ url: `assets/videos/${code}.webm${suffix}`, label: `assets/videos/${code}.webm` });
    }
    return list;
  }

  startVideoCandidateChain(flower, playImmediately = false) {
    clearTimeout(this.videoPlayGuardTimer);
    this.usingProceduralFilm = false;
    this.procFilm.stop();
    document.body.classList.remove("use-procedural-film", "has-lastframe");

    this.videoCandidates = this.buildVideoCandidates(flower);
    this.videoCandidateIdx = 0;
    this.videoLoadFailed = false;
    this.wantVideoPlay = playImmediately;
    this.activeVideoLabel = "";
    this.loadCurrentCandidate(this.sessionId);
  }

  loadCurrentCandidate(sid) {
    if (this.sessionId !== sid) return;
    if (this.videoCandidateIdx >= this.videoCandidates.length) {
      this.videoLoadFailed = true;
      this.activeVideoLabel = "";
      if (this.wantVideoPlay || this.state === "playing") {
        this.startProceduralFilmFallback(sid);
      }
      return;
    }
    const cand = this.videoCandidates[this.videoCandidateIdx];
    this.activeVideoLabel = cand.label;
    try {
      this.video.pause();
      this.video.currentTime = 0;
      this.video.muted = this.muted;
      this.video.src = cand.url;
      this.video.load();
    } catch {
      this.videoCandidateIdx += 1;
      this.loadCurrentCandidate(sid);
    }
  }

  drawRandomFlower() {
    this.audio.unlock();
    const candidates = this.flowers.filter((f) => !this.activeFlower || f.id !== this.activeFlower.id);
    const pick = candidates[Math.floor(Math.random() * candidates.length)] || this.flowers[0];
    if (pick) this.trigger(pick.id, true);
  }

  bindEvents() {
    window.addEventListener("resize", () => {
      this.bgRenderer.resize();
      this.particleField.resize();
      this.procFilm.resize();
    });
    window.addEventListener("pointermove", () => this.scheduleCursorHide(), { passive: true });
    window.addEventListener("pointerdown", (e) => {
      this.audio.unlock();
      this.scheduleCursorHide();
      // 待机画面点击空白舞台直接抽签，便于触屏/鼠标体验
      if (
        this.state === "idle" &&
        !e.target.closest("#preview-dock") &&
        !e.target.closest("#dock-restore-pill")
      ) {
        this.drawRandomFlower();
      }
    }, { passive: true });

    window.addEventListener("dblclick", (e) => {
      if (!e.target.closest("#preview-dock") && !e.target.closest("#dock-restore-pill")) {
        this.toggleFullscreen();
      }
    });

    document.getElementById("dock-random").addEventListener("click", () => this.drawRandomFlower());
    document.getElementById("dock-reset").addEventListener("click", () => this.reset());
    document.getElementById("dock-fs").addEventListener("click", () => this.toggleFullscreen());
    document.getElementById("dock-hide").addEventListener("click", () => document.body.classList.add("dock-hidden"));
    document.getElementById("dock-restore-pill").addEventListener("click", () => document.body.classList.remove("dock-hidden"));
    document.getElementById("dock-mute").addEventListener("click", (e) => {
      this.muted = !this.muted;
      this.video.muted = this.muted;
      this.audio.applySettings({ muted: this.muted });
      e.currentTarget.textContent = this.muted ? "已静音 (M)" : "声音开 (M)";
    });
    if (this.elDockFit) {
      this.elDockFit.addEventListener("click", () => this.toggleFitMode());
    }

    window.addEventListener("keydown", (ev) => {
      if (ev.key === "f" || ev.key === "F") { this.audio.unlock(); this.toggleFullscreen(); }
      else if (ev.key === "h" || ev.key === "H") { document.body.classList.toggle("dock-hidden"); }
      else if (ev.key === "r" || ev.key === "R") { this.reset(); }
      else if (ev.key === "m" || ev.key === "M") { document.getElementById("dock-mute").click(); }
      else if (ev.key === "c" || ev.key === "C") { this.toggleFitMode(); }
      else if (ev.code === "Space") {
        ev.preventDefault();
        this.drawRandomFlower();
      } else if (/^[1-9]$/.test(ev.key)) {
        // 数字键 1~9 快捷触发 01~09 号花神
        this.audio.unlock();
        this.trigger(Number(ev.key), true);
      } else if (ev.key === "0") {
        this.audio.unlock();
        this.trigger(10, true);
      } else if (ev.key === "-") {
        this.audio.unlock();
        this.trigger(11, true);
      } else if (ev.key === "=") {
        this.audio.unlock();
        this.trigger(12, true);
      }
    });

    this.video.addEventListener("canplay", () => {
      if (this.usingProceduralFilm) return;
      if (this.wantVideoPlay && (this.state === "reveal" || this.state === "playing")) {
        this.playVideoOrFallback(this.sessionId);
      }
    });
    this.video.addEventListener("playing", () => {
      clearTimeout(this.videoPlayGuardTimer);
      if (this.state === "reveal") {
        this.setStage("playing", this.activeFlower);
      } else if (this.state === "playing") {
        this.updateStatusText();
      }
    });
    this.video.addEventListener("ended", () => {
      if (this.state === "playing" && !this.usingProceduralFilm) {
        this.captureLastFrame();
        this.enterBlessing(this.sessionId);
      }
    });
    this.video.addEventListener("error", () => {
      if (this.state !== "reveal" && this.state !== "playing") return;
      const sid = this.sessionId;
      this.videoCandidateIdx += 1;
      if (this.videoCandidateIdx < this.videoCandidates.length) {
        this.loadCurrentCandidate(sid);
      } else {
        this.videoLoadFailed = true;
        this.activeVideoLabel = "";
        if (this.wantVideoPlay || this.state === "playing") {
          this.startProceduralFilmFallback(sid);
        }
      }
    });
  }

  toggleFitMode() {
    this.fitCover = !this.fitCover;
    document.body.classList.toggle("fit-cover", this.fitCover);
    if (this.elDockFit) {
      this.elDockFit.textContent = this.fitCover ? "画面：铺满 (C)" : "画面：完整 (C)";
      this.elDockFit.classList.toggle("active", this.fitCover);
    }
  }

  captureLastFrame() {
    try {
      const vw = this.video.videoWidth, vh = this.video.videoHeight;
      if (!vw || !vh || !this.lastFrameCanvas) return;
      this.lastFrameCanvas.width = vw;
      this.lastFrameCanvas.height = vh;
      const lctx = this.lastFrameCanvas.getContext("2d");
      lctx.drawImage(this.video, 0, 0, vw, vh);
      document.body.classList.add("has-lastframe");
    } catch {
      document.body.classList.remove("has-lastframe");
    }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  }

  populateTypography(flower) {
    this.elRevealMonth.textContent = flower.month;
    this.elRevealFlower.textContent = flower.flower;
    this.elRevealScene.textContent = flower.scene;
    this.elPlayMonth.textContent = flower.month;
    this.elPlayFlower.textContent = flower.flower;
    this.elPlayScene.textContent = flower.scene;
    this.elBlessMonth.textContent = flower.month;
    this.elBlessFlower.textContent = flower.flower;
    const subParts = [flower.scene];
    if (flower.character && flower.character !== "待核验") subParts.unshift(`花神 · ${flower.character}`);
    this.elBlessSub.textContent = subParts.join("  ｜  ");
    this.elBlessPoem.textContent = flower.poem || "";
    this.elBlessText.textContent = flower.blessing || "";
  }

  updateStatusText() {
    const flower = this.activeFlower;
    const archName = flower ? (ARCHETYPE_LABELS[getFlowerArchetype(flower)] || "折枝生长") : "折枝生长";
    const labelMap = {
      idle: "待机 · 四时浮岚",
      reveal: `唤醒 · ${archName}`,
      playing: "影像 · 花神入境",
      blessing: "赠语 · 签文留韵",
      returning: "归境 · 消散回流",
    };
    const fName = flower ? `｜${flower.code} ${flower.month}·${flower.flower}` : "";
    let modeTag = "";
    if (this.state === "playing") {
      if (this.usingProceduralFilm) modeTag = "（水墨兜底绘卷）";
      else if (this.activeVideoLabel) modeTag = `（${this.activeVideoLabel}）`;
    }
    this.elDockStatus.textContent = `${labelMap[this.state] || this.state}${fName}${modeTag}`;
  }

  setStage(nextStage, flower) {
    this.state = nextStage;
    document.body.classList.remove("stage-idle", "stage-reveal", "stage-playing", "stage-blessing", "stage-returning");
    document.body.classList.add(`stage-${nextStage}`);
    document.body.dataset.state = nextStage;
    this.bgRenderer.setStage(nextStage, flower);
    this.particleField.setStage(nextStage, flower);
    this.updateStatusText();

    for (const btn of this.elDockFlowers.querySelectorAll(".dock-btn")) {
      btn.classList.toggle("active", Boolean(flower && btn.dataset.fid === String(flower.id)));
    }
  }

  trigger(flowerId, allowInterrupt = false) {
    if (this.state !== "idle" && !allowInterrupt) return;
    const flower = this.flowersById.get(Number(flowerId));
    if (!flower) return;

    clearTimeout(this.stageTimer);
    clearTimeout(this.videoPlayGuardTimer);
    this.sessionId += 1;
    const sid = this.sessionId;
    this.activeFlower = flower;
    this.usingProceduralFilm = false;
    this.videoLoadFailed = false;
    this.wantVideoPlay = false;
    this.procFilm.stop();
    document.body.classList.remove("use-procedural-film", "has-lastframe");

    this.populateTypography(flower);
    this.transitionDirector.trigger(flower);
    this.setStage("reveal", flower);
    this.audio.playRevealChord(flower);

    this.startVideoCandidateChain(flower, false);

    this.stageTimer = setTimeout(() => {
      if (this.sessionId !== sid || this.state !== "reveal") return;
      this.wantVideoPlay = true;
      this.playVideoOrFallback(sid);
    }, this.revealDurationMs);
  }

  async playVideoOrFallback(sid) {
    if (this.sessionId !== sid) return;
    if (this.videoLoadFailed || this.forceInkMode) {
      this.startProceduralFilmFallback(sid);
      return;
    }

    clearTimeout(this.videoPlayGuardTimer);
    this.videoPlayGuardTimer = setTimeout(() => {
      if (this.sessionId === sid && this.state === "reveal" && !this.usingProceduralFilm) {
        this.startProceduralFilmFallback(sid);
      }
    }, 3200);

    try {
      this.video.muted = this.muted;
      await this.video.play();
      clearTimeout(this.videoPlayGuardTimer);
      if (this.sessionId === sid && this.state === "reveal") {
        this.setStage("playing", this.activeFlower);
      }
    } catch {
      if (this.video.error || this.video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) return;
      try {
        this.video.muted = true;
        await this.video.play();
        clearTimeout(this.videoPlayGuardTimer);
        if (this.sessionId === sid && this.state === "reveal") {
          this.setStage("playing", this.activeFlower);
        }
      } catch {
        if (this.videoCandidateIdx >= this.videoCandidates.length - 1) {
          this.startProceduralFilmFallback(sid);
        }
      }
    }
  }

  startProceduralFilmFallback(sid) {
    if (this.sessionId !== sid || this.usingProceduralFilm) return;
    clearTimeout(this.videoPlayGuardTimer);
    this.usingProceduralFilm = true;
    this.wantVideoPlay = false;
    document.body.classList.add("use-procedural-film");
    this.procFilm.start(this.activeFlower, this.fallbackFilmDurationMs / 1000);
    this.setStage("playing", this.activeFlower);
    clearTimeout(this.stageTimer);
    this.stageTimer = setTimeout(() => {
      if (this.sessionId === sid && this.state === "playing") {
        this.enterBlessing(sid);
      }
    }, this.fallbackFilmDurationMs);
  }

  enterBlessing(sid) {
    if (this.sessionId !== sid) return;
    clearTimeout(this.stageTimer);
    clearTimeout(this.videoPlayGuardTimer);
    this.setStage("blessing", this.activeFlower);
    this.audio.playBlessingChime(this.activeFlower);
    const ms = Math.max(3000, Number(this.activeFlower?.blessing_seconds || 7.5) * 1000);
    this.stageTimer = setTimeout(() => {
      if (this.sessionId === sid && this.state === "blessing") {
        this.enterReturning(sid);
      }
    }, ms);
  }

  enterReturning(sid) {
    if (this.sessionId !== sid) return;
    clearTimeout(this.stageTimer);
    this.setStage("returning", this.activeFlower);
    this.stageTimer = setTimeout(() => {
      if (this.sessionId === sid && this.state === "returning") {
        this.reset();
      }
    }, this.returningDurationMs);
  }

  reset() {
    clearTimeout(this.stageTimer);
    clearTimeout(this.videoPlayGuardTimer);
    this.sessionId += 1;
    this.activeFlower = null;
    this.usingProceduralFilm = false;
    this.videoLoadFailed = false;
    this.wantVideoPlay = false;
    this.activeVideoLabel = "";
    this.procFilm.stop();
    this.transitionDirector.stop();
    document.body.classList.remove("use-procedural-film", "has-lastframe");
    try { this.video.pause(); this.video.removeAttribute("src"); this.video.load(); } catch {}
    this.setStage("idle", null);
  }

  startLoop() {
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      const t = now / 1000;
      this.bgRenderer.render(t, dt);
      if (this.usingProceduralFilm) this.procFilm.render(t);
      this.particleField.render(t, dt);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  window.__fgrApp = new FlowerExhibitionApp(window.FLOWER_GOD_CONFIG);
});
