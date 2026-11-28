window.MT = window.MT || {};

// v13 Step 1：3 座沉海月潮共鸣碑独立微解谜 + 归港荧光洋流 + 全唤醒「暮光灯塔港」永久焕新终章演出
// - 碑① 潮汐浅海碑（x=2080）：声呐唤来银光沙丁鱼群跟随潜艇，带领鱼群穿过碑前 2 道古石门环点亮！
// - 碑② 裂窟月核碑（x=6120）：落月震裂秘窟后，牵引周边 3 颗游离月核光尘运回碑座镶嵌（受击/缺气会散落重来）！
// - 碑③ 晶洞深渊碑（x=7895）：按 Q 开启「慢—快—慢」3 拍声呐回声二重唱，在汇聚光环窗口内用 Q 回应共振！
window.MT.Shrines = (function () {
  var shrines = [];
  var tideRings = [];        // 碑① 专属 2 道古石门环
  var vaultMotes = [];       // 碑② 专属 3 颗游离月核光尘
  var duet = null;           // 碑③ 专属 3 拍声呐回声节拍状态机
  var harborWhales = [];
  var harborLanterns = [];
  var wakeRipples = [];
  var finaleCinematicTimer = 0;
  var finaleWitnessedThisSession = false;

  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function isExplore() {
    return !!(window.MT.Config && window.MT.Config.EXPLORE_MODE);
  }

  function getBedY(x) {
    if (window.MT.Abyss && window.MT.Abyss.getSeabedY) {
      return window.MT.Abyss.getSeabedY(x);
    }
    return 396;
  }

  function isVaultOpenNow() {
    var eras = window.MT.Eras;
    if (!eras || !eras.getWorldClock) return true;
    var wc = (window.MT.Config && window.MT.Config.WORLD_CYCLE) || {};
    var tImp = wc.T_IMPACT || 210;
    return eras.getWorldClock() >= tImp;
  }

  function resetPuzzleEntities() {
    var sh1 = shrines[0];
    var sh2 = shrines[1];
    var sh1Awake = !!(sh1 && sh1.awake);
    var sh2Awake = !!(sh2 && sh2.awake);

    // 碑① 潮汐浅海碑前 2 道古石门环
    tideRings = [
      { id: 0, x: 1845, y: getBedY(1845) - 118, r: 46, lit: sh1Awake, glow: sh1Awake ? 1 : 0, phase: 0.3 },
      { id: 1, x: 1965, y: getBedY(1965) - 102, r: 44, lit: sh1Awake, glow: sh1Awake ? 1 : 0, phase: 1.7 }
    ];

    // 碑② 裂窟月核碑周边 3 颗游离月核光尘（撞击裂窟后浮现）
    var mSpots = [
      { x: 5890, y: getBedY(5890) - 96 },
      { x: 6120, y: getBedY(6120) - 52 }, // 藏在刚震裂的月核秘窟深处
      { x: 6355, y: getBedY(6355) - 108 }
    ];
    vaultMotes = mSpots.map(function (pt, idx) {
      return {
        id: idx,
        homeX: pt.x, homeY: pt.y,
        x: pt.x, y: pt.y,
        state: sh2Awake ? 'slotted' : 'idle', // idle | carried | slotted
        phase: idx * 1.9 + 0.4
      };
    });

    // 碑③ 晶洞深渊碑声呐回声节拍状态机（慢 2.1s -> 快 1.25s -> 慢 2.0s）
    duet = {
      active: false,
      step: 0,        // 0..2
      timer: 0,
      cueTimes: [1.9, 1.25, 1.9],
      hitWindow: 0.72,
      cueFired: false,
      pulseRing: 0
    };
  }

  function buildShrines() {
    shrines = [];
    wakeRipples = [];
    finaleCinematicTimer = 0;
    if (!isExplore()) return;

    var shop = window.MT.Shop;
    var specs = [
      {
        id: 'shrine_shallow',
        name: '潮汐浅海碑',
        puzzleKind: 'fish_rings',
        x: 2080,
        h: 74,
        tilt: -0.05,
        requiresImpact: false,
        runeCol: '148, 246, 255',
        accentCol: '255, 232, 166'
      },
      {
        id: 'shrine_vault',
        name: '裂窟月核碑',
        puzzleKind: 'vault_motes',
        x: 6120,
        h: 82,
        tilt: 0.04,
        requiresImpact: true,
        runeCol: '255, 214, 146',
        accentCol: '154, 244, 255'
      },
      {
        id: 'shrine_geode',
        name: '晶洞深渊碑',
        puzzleKind: 'echo_duet',
        x: 7895,
        h: 84,
        tilt: -0.04,
        requiresImpact: false,
        runeCol: '132, 244, 255',
        accentCol: '255, 238, 176'
      }
    ];

    specs.forEach(function (sp, idx) {
      var awake = !!(shop && shop.hasShrine && shop.hasShrine(sp.id));
      shrines.push(Object.assign({}, sp, {
        awake: awake,
        wakeAnim: awake ? 1.0 : 0.0,
        pulse: 0,
        phase: idx * 2.1 + 0.5
      }));
    });

    resetPuzzleEntities();

    harborWhales = [
      { x: 1020, baseX: 1020, dir: 1, speed: 24, rx: 72, scale: 0.96, phase: 0.4, flash: 0 },
      { x: 1320, baseX: 1320, dir: -1, speed: 20, rx: 56, scale: 0.78, phase: 2.8, flash: 0 }
    ];

    harborLanterns = [];
    for (var i = 0; i < 16; i++) {
      harborLanterns.push({
        x: 240 + (i / 15) * 960 + Math.sin(i * 3.7) * 28,
        y: -18 - (i % 5) * 34,
        vy: 6 + (i % 4) * 3.5,
        phase: i * 1.4,
        r: 2.2 + (i % 3) * 0.9
      });
    }
  }

  function reset() {
    finaleWitnessedThisSession = !!(window.MT.Shop && window.MT.Shop.isHarborFinaleWitnessed && window.MT.Shop.isHarborFinaleWitnessed());
    buildShrines();
  }

  function getAwakenedCount() {
    var n = 0;
    for (var i = 0; i < shrines.length; i++) {
      if (shrines[i].awake) n++;
    }
    return n;
  }

  function isHarborIlluminated() {
    if (!isExplore()) return false;
    if (window.MT.Shop && window.MT.Shop.isHarborIlluminated && window.MT.Shop.isHarborIlluminated()) return true;
    return shrines.length > 0 && getAwakenedCount() >= shrines.length;
  }

  function getFinaleCinematicFactor() {
    if (finaleCinematicTimer <= 0) return 0;
    var u = clamp(finaleCinematicTimer / 4.2, 0, 1);
    return Math.sin(u * Math.PI);
  }

  function getShrineListForCompass() {
    return shrines.map(function (sh) {
      return { id: sh.id, name: sh.name, x: sh.x, awake: !!sh.awake };
    });
  }

  function completeShrineAwakening(sh, boat, eras, onLevelEvent) {
    if (!sh || sh.awake) return;
    sh.awake = true;
    sh.pulse = 1.0;
    var shop = window.MT.Shop;
    var newlySaved = shop && shop.awakenShrine ? shop.awakenShrine(sh.id) : true;
    var cnt = getAwakenedCount();
    var sy = getBedY(sh.x) - sh.h * 0.48;

    wakeRipples.push({ x: sh.x, y: sy, r: 22, maxR: 265, life: 1.55, maxLife: 1.55, col: sh.accentCol });
    wakeRipples.push({ x: sh.x, y: sy, r: 12, maxR: 185, life: 1.25, maxLife: 1.25, col: sh.runeCol });

    if (boat) {
      var mult = (boat.stats && boat.stats.starMult) || 1;
      var bonus = Math.round(45 * mult);
      boat.runStars += bonus;
      boat.breath = 1.0;
      boat.fuel = window.MT.Config.SURF.MAX_FUEL;
      if (eras && eras.addPopup) {
        eras.addPopup(sh.x, sy - 54, '✦ 唤醒「' + sh.name + '」(' + cnt + '/3) +' + bonus + '✦', '#fff2ba');
      }
    }

    if (window.MT.Audio && window.MT.Audio.playShrineAwaken) {
      window.MT.Audio.playShrineAwaken(cnt);
    }
    if (window.MT.RenderWorld && window.MT.RenderWorld.triggerImpact) {
      window.MT.RenderWorld.triggerImpact(0.026, 0.044, 4.4);
    }

    if (cnt >= shrines.length) {
      if (shop && shop.markHarborIlluminated) shop.markHarborIlluminated();
      if (typeof onLevelEvent === 'function') {
        onLevelEvent('shrine_all_awake', { count: cnt, total: shrines.length });
      } else if (typeof window.MT.onCodexDiscover === 'function') {
        window.MT.onCodexDiscover({ kind: 'shrine', id: sh.id, name: '三碑齐鸣 · 归返暮光灯塔港' });
      }
    } else if (newlySaved && typeof window.MT.onCodexDiscover === 'function') {
      window.MT.onCodexDiscover({ kind: 'shrine', id: sh.id, name: sh.name + ' (' + cnt + '/3)' });
    }
  }

  // === 主动声呐与 3 座共鸣碑微解谜交互 ===
  function onActiveSonar(boatX, boatY, radius, boat, eras, onLevelEvent) {
    if (!isExplore() || shrines.length === 0) return false;
    var hit = false;

    for (var i = 0; i < shrines.length; i++) {
      var sh = shrines[i];
      var sy = getBedY(sh.x) - sh.h * 0.48;
      if (Math.hypot(boatX - sh.x, boatY - sy) > radius + 145) continue;

      sh.pulse = 1.0;
      hit = true;

      // 已唤醒古碑再次声呐：回传音环补气
      if (sh.awake) {
        wakeRipples.push({ x: sh.x, y: sy, r: 18, maxR: 170, life: 1.15, maxLife: 1.15, col: sh.runeCol });
        if (boat) boat.breath = Math.min(1.0, (boat.breath || 0) + 0.35);
        if (window.MT.Audio && window.MT.Audio.playResonanceChord) window.MT.Audio.playResonanceChord('crystal');
        continue;
      }

      // 碑① 潮汐浅海碑（银鱼引流解谜）：按 Q 自动唤来银鱼群伴游，并提示带鱼群穿过 2 道古石门环！
      if (sh.puzzleKind === 'fish_rings') {
        if (window.MT.AbyssFauna && window.MT.AbyssFauna.summonNearestSchool) {
          window.MT.AbyssFauna.summonNearestSchool(boatX, boatY);
        }
        var litCnt = tideRings.filter(function (r) { return r.lit; }).length;
        wakeRipples.push({ x: sh.x, y: sy, r: 16, maxR: 145, life: 1.05, maxLife: 1.05, col: sh.runeCol });
        if (eras && eras.addPopup) {
          eras.addPopup(sh.x, sy - 48, '◈ 银鱼已响应！带领鱼群穿过前方石环 (' + litCnt + '/2)', '#ccf6ff');
        }
        continue;
      }

      // 碑② 裂窟月核碑（天象 × 光尘搬运解谜）：撞击前提示静待落月，撞击后高亮周边 3 颗游离光尘方位！
      if (sh.puzzleKind === 'vault_motes') {
        if (!isVaultOpenNow()) {
          if (eras && eras.addPopup) {
            eras.addPopup(sh.x, sy - 48, '◈ 秘窟尚未震裂…静待落月撞击后寻找 3 颗月核光尘', '#ffe8b4');
          }
        } else {
          var slottedN = vaultMotes.filter(function (m) { return m.state === 'slotted'; }).length;
          vaultMotes.forEach(function (m) {
            if (m.state === 'idle') {
              wakeRipples.push({ x: m.x, y: m.y, r: 10, maxR: 88, life: 1.1, maxLife: 1.1, col: sh.accentCol });
            }
          });
          if (eras && eras.addPopup) {
            eras.addPopup(sh.x, sy - 48, '◈ 牵引周边游离月核光尘运回碑座 (' + slottedN + '/3)', '#fff0b8');
          }
        }
        continue;
      }

      // 碑③ 晶洞深渊碑（声呐回声节拍二重唱：慢—快—慢 3 拍！）
      if (sh.puzzleKind === 'echo_duet' && duet) {
        if (!duet.active) {
          duet.active = true;
          duet.step = 0;
          duet.timer = duet.cueTimes[0];
          duet.cueFired = false;
          duet.pulseRing = 0;
          wakeRipples.push({ x: sh.x, y: sy, r: 16, maxR: 155, life: 1.1, maxLife: 1.1, col: sh.runeCol });
          if (eras && eras.addPopup) {
            eras.addPopup(sh.x, sy - 54, '♪ 晶洞二重唱开启：待光环聚拢响起时按 Q 回应 (0/3)', '#d4fbff');
          }
        } else {
          // 判定是否在节奏窗口内回应！
          var inWindow = duet.cueFired && Math.abs(duet.timer) <= duet.hitWindow;
          if (inWindow) {
            duet.step += 1;
            duet.cueFired = false;
            wakeRipples.push({ x: sh.x, y: sy, r: 20, maxR: 190, life: 1.15, maxLife: 1.15, col: sh.accentCol });
            if (window.MT.Audio && window.MT.Audio.playMoteSlot) window.MT.Audio.playMoteSlot(duet.step - 1);
            if (duet.step >= 3) {
              duet.active = false;
              completeShrineAwakening(sh, boat, eras, onLevelEvent);
            } else {
              duet.timer = duet.cueTimes[duet.step];
              if (eras && eras.addPopup) {
                eras.addPopup(sh.x, sy - 52, '♪ 共鸣合拍! (' + duet.step + '/3)', '#fff2ba');
              }
            }
          } else {
            // 抢拍温柔重置节拍窗口，绝不惩罚扣血
            duet.timer = duet.cueTimes[duet.step];
            duet.cueFired = false;
            if (eras && eras.addPopup) {
              eras.addPopup(sh.x, sy - 50, '♪ 稍等古碑光环聚拢发光后再按 Q…', '#cfe8ff');
            }
          }
        }
      }
    }

    if (isHarborIlluminated()) {
      for (var wi = 0; wi < harborWhales.length; wi++) {
        var hw = harborWhales[wi];
        if (Math.abs(boatX - hw.x) <= radius + 120) {
          hw.flash = 1.0;
          wakeRipples.push({ x: hw.x, y: eras.getSurfaceY(hw.x, eras.getTime()) - 12, r: 20, maxR: 150, life: 1.2, maxLife: 1.2, col: '186, 246, 255' });
          if (window.MT.Audio && window.MT.Audio.playResonanceChord) window.MT.Audio.playResonanceChord('whale');
          hit = true;
          break;
        }
      }
    }

    return hit;
  }

  // === 帧更新：驱动 3 座共鸣碑微解谜 + 归港荧光洋流 + 港湾终章演出 ===
  function update(dt, boat, eras, onLevelEvent) {
    if (!isExplore() || shrines.length === 0) return;
    var inSub = !!(boat.isDiving || boat.inAbyss);

    var maxAwakeX = 0;
    for (var i = 0; i < shrines.length; i++) {
      var sh = shrines[i];
      sh.phase += dt * 1.9;
      if (sh.pulse > 0) sh.pulse = Math.max(0, sh.pulse - dt * 1.2);
      var targetA = sh.awake ? 1.0 : 0.0;
      sh.wakeAnim += (targetA - sh.wakeAnim) * Math.min(1, dt * 2.2);
      if (sh.awake && sh.x > maxAwakeX) maxAwakeX = sh.x;
    }

    // ---------------------------------------------------------
    // 解谜 ①：潮汐浅海碑（带领银光沙丁鱼群穿过 2 道古石门环）
    // ---------------------------------------------------------
    var sh1 = shrines[0];
    if (sh1 && !sh1.awake && Math.abs(boat.x - sh1.x) < 700) {
      var litNow = 0;
      for (var r = 0; r < tideRings.length; r++) {
        var rg = tideRings[r];
        rg.phase += dt * 2.4;
        if (rg.lit) {
          rg.glow = Math.min(1, rg.glow + dt * 2.2);
          litNow++;
          continue;
        }
        var fishThrough = window.MT.AbyssFauna && window.MT.AbyssFauna.isSardineSchoolNear && window.MT.AbyssFauna.isSardineSchoolNear(rg.x, rg.y, rg.r + 36);
        var boatThrough = inSub && Math.hypot(boat.x - rg.x, boat.y - rg.y) < rg.r + 38;
        if (fishThrough && boatThrough) {
          rg.lit = true;
          rg.glow = 1.0;
          litNow++;
          wakeRipples.push({ x: rg.x, y: rg.y, r: 16, maxR: 130, life: 1.05, maxLife: 1.05, col: sh1.accentCol });
          if (window.MT.Audio && window.MT.Audio.playMoteSlot) window.MT.Audio.playMoteSlot(litNow - 1);
          if (eras && eras.addPopup) {
            eras.addPopup(rg.x, rg.y - 44, '✦ 银鱼穿环点亮! (' + litNow + '/2)', '#d4faff');
          }
        }
      }
      if (litNow >= tideRings.length) {
        completeShrineAwakening(sh1, boat, eras, onLevelEvent);
      }
    }

    // ---------------------------------------------------------
    // 解谜 ②：裂窟月核碑（撞击震裂后，牵引 3 颗游离月核光尘运回碑座）
    // ---------------------------------------------------------
    var sh2 = shrines[1];
    if (sh2 && !sh2.awake && isVaultOpenNow() && Math.abs(boat.x - sh2.x) < 760) {
      var dropAll = (boat.hurtFlash > 0.55) || (boat.breath <= 0.02);
      var carriedIdx = 0;
      var slottedCount = 0;
      var sh2Y = getBedY(sh2.x) - sh2.h * 0.52;

      for (var mi = 0; mi < vaultMotes.length; mi++) {
        var mt = vaultMotes[mi];
        mt.phase += dt * 3.1;
        if (mt.state === 'slotted') {
          mt.x = sh2.x + (mi - 1) * 14;
          mt.y = sh2Y - 10 + Math.sin(mt.phase) * 2.5;
          slottedCount++;
          continue;
        }
        if (mt.state === 'carried') {
          if (dropAll || !inSub) {
            mt.state = 'idle';
            if (dropAll && eras && eras.addPopup) {
              eras.addPopup(boat.x, boat.y - 44, '月核光尘受震散落，需重新牵引！', '#ffaa88');
            }
            continue;
          }
          var fDirM = (typeof boat.facing === 'number') ? boat.facing : 1;
          var tx = boat.x - fDirM * (42 + carriedIdx * 20);
          var ty = boat.y - 8 + Math.sin(mt.phase * 1.4 + carriedIdx) * 9;
          mt.x += (tx - mt.x) * Math.min(1, dt * 6.5);
          mt.y += (ty - mt.y) * Math.min(1, dt * 6.5);
          carriedIdx++;

          // 送抵碑座自动镶嵌！
          if (Math.hypot(boat.x - sh2.x, boat.y - sh2Y) < 96) {
            mt.state = 'slotted';
            slottedCount++;
            wakeRipples.push({ x: sh2.x, y: sh2Y, r: 14, maxR: 135, life: 1.0, maxLife: 1.0, col: sh2.accentCol });
            if (window.MT.Audio && window.MT.Audio.playMoteSlot) window.MT.Audio.playMoteSlot(slottedCount - 1);
            if (eras && eras.addPopup) {
              eras.addPopup(sh2.x, sh2Y - 42, '✦ 镶嵌月核光尘! (' + slottedCount + '/3)', '#fff2ba');
            }
          }
        } else {
          // idle 状态：温柔回到原位悬浮，潜艇靠近即自动牵引
          mt.x += (mt.homeX - mt.x) * Math.min(1, dt * 2.2);
          mt.y += (mt.homeY + Math.sin(mt.phase) * 7 - mt.y) * Math.min(1, dt * 2.2);
          if (inSub && Math.hypot(boat.x - mt.x, boat.y - mt.y) < 58) {
            mt.state = 'carried';
            if (window.MT.Audio) window.MT.Audio.playHookCatch();
            if (eras && eras.addPopup) {
              eras.addPopup(mt.x, mt.y - 32, '✦ 牵引月核光尘 · 运回裂窟古碑', '#ffe8a4');
            }
          }
        }
      }
      if (slottedCount >= vaultMotes.length) {
        completeShrineAwakening(sh2, boat, eras, onLevelEvent);
      }
    }

    // ---------------------------------------------------------
    // 解谜 ③：晶洞深渊碑（3 拍声呐回声二重唱计时器）
    // ---------------------------------------------------------
    var sh3 = shrines[2];
    if (sh3 && !sh3.awake && duet && duet.active) {
      var sh3Y = getBedY(sh3.x) - sh3.h * 0.52;
      if (Math.hypot(boat.x - sh3.x, boat.y - sh3Y) > 560) {
        duet.active = false;
      } else {
        duet.timer -= dt;
        if (!duet.cueFired && duet.timer <= 0.16) {
          duet.cueFired = true;
          duet.pulseRing = 1.0;
          wakeRipples.push({ x: sh3.x, y: sh3Y, r: 16, maxR: 150, life: 0.95, maxLife: 0.95, col: sh3.accentCol });
          if (window.MT.Audio && window.MT.Audio.playRhythmCue) window.MT.Audio.playRhythmCue(duet.step);
        }
        if (duet.pulseRing > 0) duet.pulseRing = Math.max(0, duet.pulseRing - dt * 1.4);
        // 错过窗口后柔和自动重来当前节拍，不中断体验
        if (duet.timer < -duet.hitWindow) {
          duet.cueFired = false;
          duet.timer = duet.cueTimes[duet.step];
        }
      }
    }

    for (var ri = wakeRipples.length - 1; ri >= 0; ri--) {
      var rp = wakeRipples[ri];
      rp.life -= dt;
      rp.r = rp.maxR * (1 - Math.max(0, rp.life / rp.maxLife));
      if (rp.life <= 0) wakeRipples.splice(ri, 1);
    }

    // 归港荧光洋流物理助推
    if (maxAwakeX > 700 && inSub && boat.x > 560 && boat.x < maxAwakeX + 60) {
      var streamY = getBedY(boat.x) - 96;
      if (Math.abs(boat.y - streamY) < 76) {
        if (boat.vx < -20 || boat.facing < 0) {
          boat.vx = Math.max(-440, boat.vx - 195 * dt);
        }
        boat.breath = Math.min(1.0, (boat.breath || 0) + 0.14 * dt);
        boat.fuel = Math.min(window.MT.Config.SURF.MAX_FUEL, boat.fuel + 0.14 * dt);
      }
    }

    // 全唤醒后「暮光灯塔港」永久焕新演出
    if (isHarborIlluminated()) {
      harborWhales.forEach(function (hw) {
        hw.phase += dt * 1.5;
        if (hw.flash > 0) hw.flash = Math.max(0, hw.flash - dt * 1.4);
        hw.x += hw.speed * hw.dir * dt;
        if (hw.x > 1460) hw.dir = -1;
        else if (hw.x < 840) hw.dir = 1;
      });

      harborLanterns.forEach(function (hl) {
        hl.phase += dt * 1.6;
        hl.y -= hl.vy * dt;
        if (hl.y < -250) {
          hl.y = -12;
          hl.x = 240 + Math.random() * 960;
        }
      });

      if (finaleCinematicTimer > 0) finaleCinematicTimer = Math.max(0, finaleCinematicTimer - dt);

      if (!finaleWitnessedThisSession && boat.x < 1180 && !boat.isDiving) {
        finaleWitnessedThisSession = true;
        finaleCinematicTimer = 4.2;
        if (window.MT.Shop && window.MT.Shop.markHarborFinaleWitnessed) window.MT.Shop.markHarborFinaleWitnessed();
        if (window.MT.Shop && window.MT.Shop.discoverWonder) window.MT.Shop.discoverWonder('wonder_harbor');
        if (window.MT.Audio && window.MT.Audio.playHarborAwakenFinale) window.MT.Audio.playHarborAwakenFinale();
        setTimeout(function () {
          var bNow = window.MT.Physics && window.MT.Physics.getBoat ? window.MT.Physics.getBoat() : boat;
          var snapUrl = (window.MT.Snapshot && window.MT.Snapshot.captureFromLiveCanvas)
            ? window.MT.Snapshot.captureFromLiveCanvas('wonder_harbor', '焕新灯塔港', 660, -45)
            : null;
          if (window.MT.Snapshot) window.MT.Snapshot.triggerShutterFlash();
          if (typeof window.MT.onCodexDiscover === 'function') {
            window.MT.onCodexDiscover({ kind: 'wonder', id: 'wonder_harbor', name: '焕新灯塔港', snapshot: snapUrl });
          } else if (typeof onLevelEvent === 'function' && bNow) {
            onLevelEvent('codex_discover', { kind: 'wonder', id: 'wonder_harbor', name: '焕新灯塔港', snapshot: snapUrl });
          }
        }, 480);
      }
    }
  }

  // === 水下层渲染：归港荧光洋流 + 碑①古石门环 + 碑②游离光尘 + 碑③节拍光环 + 3 座古碑 ===
  function drawUnderWater(ctx, state) {
    if (!isExplore() || shrines.length === 0) return;
    var t = state.t;
    var viewLeft = state.viewLeft;
    var viewRight = state.viewRight;
    var boat = state.boat;

    // 1. 归港荧光洋流
    var maxAwakeX = 0;
    for (var i = 0; i < shrines.length; i++) {
      if (shrines[i].awake && shrines[i].x > maxAwakeX) maxAwakeX = shrines[i].x;
    }
    if (maxAwakeX > 700 && viewLeft < maxAwakeX + 120 && viewRight > 480) {
      var x0 = Math.max(520, Math.floor(viewLeft / 36) * 36);
      var x1 = Math.min(maxAwakeX, viewRight + 36);
      if (x1 > x0 + 36) {
        var allOn = isHarborIlluminated();
        ctx.save();
        ctx.lineCap = 'round';
        for (var ln = -1; ln <= 1; ln++) {
          ctx.strokeStyle = ln === 0
            ? (allOn ? 'rgba(255, 242, 186, 0.34)' : 'rgba(156, 246, 255, 0.30)')
            : 'rgba(128, 232, 248, 0.14)';
          ctx.lineWidth = ln === 0 ? 3.2 : 1.5;
          ctx.beginPath();
          for (var sx = x0; sx <= x1; sx += 36) {
            var sy = getBedY(sx) - 96 + ln * 16 + Math.sin(sx * 0.014 + t * 3.8 + ln) * 9;
            if (sx === x0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
          }
          ctx.stroke();
        }
        var pStep = 130;
        var pStart = Math.floor(x0 / pStep) * pStep;
        for (var px = pStart; px <= x1; px += pStep) {
          var shift = ((t * 78) % pStep);
          var fx = px - shift;
          if (fx < 520 || fx > maxAwakeX) continue;
          var fy = getBedY(fx) - 96 + Math.sin(fx * 0.02 + t * 2.6) * 18;
          ctx.fillStyle = allOn ? 'rgba(255, 244, 198, 0.68)' : 'rgba(196, 252, 255, 0.66)';
          ctx.beginPath(); ctx.arc(fx, fy, 2.0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
    }

    // 2. 碑① 潮汐浅海碑前的 2 道雕刻古石门环（水彩石柱托举圆环，点亮后流光连接古碑！）
    var sh1 = shrines[0];
    if (sh1 && viewLeft < 2240 && viewRight > 1680) {
      ctx.save();
      tideRings.forEach(function (rg) {
        var bedR = getBedY(rg.x);
        var pul = 0.78 + 0.22 * Math.sin(rg.phase);
        // 石柱底座深扎海床
        ctx.fillStyle = '#2d3a50';
        ctx.fillRect(rg.x - 6, rg.y + rg.r - 4, 12, Math.max(20, bedR - (rg.y + rg.r) + 22));

        // 门环柔光光晕
        var gR = ctx.createRadialGradient(rg.x, rg.y, rg.r * 0.5, rg.x, rg.y, rg.r * 1.45);
        gR.addColorStop(0, rg.lit ? ('rgba(255, 236, 174, ' + (0.28 * pul) + ')') : ('rgba(148, 240, 255, ' + (0.12 * pul) + ')'));
        gR.addColorStop(1, 'rgba(148, 240, 255, 0)');
        ctx.fillStyle = gR;
        ctx.beginPath(); ctx.arc(rg.x, rg.y, rg.r * 1.45, 0, Math.PI * 2); ctx.fill();

        // 椭圆透视古石环体（侧视 3D 环质感，潜艇和银鱼群穿中而过！）
        ctx.strokeStyle = rg.lit ? '#4c5c72' : '#323f54';
        ctx.lineWidth = 7.5;
        ctx.beginPath(); ctx.ellipse(rg.x, rg.y, rg.r * 0.36, rg.r, 0, 0, Math.PI * 2); ctx.stroke();

        ctx.strokeStyle = rg.lit ? ('rgba(255, 242, 186, ' + (0.88 * pul) + ')') : ('rgba(154, 242, 255, ' + (0.42 * pul) + ')');
        ctx.lineWidth = rg.lit ? 2.4 : 1.5;
        ctx.beginPath(); ctx.ellipse(rg.x, rg.y, rg.r * 0.36, rg.r, 0, 0, Math.PI * 2); ctx.stroke();

        // 已点亮门环向碑①输送一道细柔银光丝
        if (rg.lit) {
          ctx.strokeStyle = 'rgba(255, 238, 176, 0.34)';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(rg.x, rg.y);
          ctx.quadraticCurveTo((rg.x + sh1.x) * 0.5, rg.y - 26, sh1.x, getBedY(sh1.x) - sh1.h * 0.68);
          ctx.stroke();
        }
      });
      ctx.restore();
    }

    // 3. 3 座沉海月潮共鸣碑主体 + 碑③节拍汇聚光环
    shrines.forEach(function (sh) {
      if (sh.x < viewLeft - 180 || sh.x > viewRight + 180) return;
      var bedY = getBedY(sh.x);
      var wa = sh.wakeAnim || 0;
      var glowStr = clamp(0.16 + wa * 0.84 + sh.pulse * 0.4, 0, 1);
      var breathe = 0.86 + 0.14 * Math.sin(t * 2.6 + sh.phase);

      ctx.save();
      ctx.translate(sh.x, bedY + 12);
      ctx.rotate(sh.tilt);

      if (glowStr > 0.18) {
        var rGlow = 56 + wa * 78;
        var hg = ctx.createRadialGradient(0, -sh.h * 0.56, 6, 0, -sh.h * 0.56, rGlow);
        hg.addColorStop(0.0, 'rgba(' + sh.accentCol + ', ' + (0.34 * glowStr * breathe) + ')');
        hg.addColorStop(0.5, 'rgba(' + sh.runeCol + ', ' + (0.16 * glowStr * breathe) + ')');
        hg.addColorStop(1.0, 'rgba(' + sh.runeCol + ', 0)');
        ctx.fillStyle = hg;
        ctx.beginPath(); ctx.arc(0, -sh.h * 0.56, rGlow, 0, Math.PI * 2); ctx.fill();
      }

      // 古石碑身
      var sg = ctx.createLinearGradient(-18, -sh.h, 20, 16);
      sg.addColorStop(0.0, wa > 0.4 ? '#5c6c84' : '#4a5064');
      sg.addColorStop(0.55, '#2e384e');
      sg.addColorStop(1.0, '#182032');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.moveTo(-20, 24);
      ctx.lineTo(-17, -sh.h * 0.68);
      ctx.quadraticCurveTo(-15, -sh.h - 4, 0, -sh.h - 6);
      ctx.quadraticCurveTo(15, -sh.h - 4, 17, -sh.h * 0.68);
      ctx.lineTo(20, 24);
      ctx.closePath();
      ctx.fill();

      // 碑顶月相符文
      var runeA = (0.22 + wa * 0.78 + sh.pulse * 0.45) * breathe;
      ctx.strokeStyle = 'rgba(' + sh.runeCol + ', ' + clamp(runeA, 0, 1) + ')';
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, -sh.h * 0.68, 7.2, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(' + sh.accentCol + ', ' + clamp(wa * 0.92 + sh.pulse * 0.4, 0.14, 1) + ')';
      ctx.beginPath(); ctx.arc(0, -sh.h * 0.68, 3.6, 0, Math.PI * 2); ctx.fill();

      ctx.beginPath(); ctx.moveTo(0, -sh.h * 0.52); ctx.lineTo(0, -14); ctx.stroke();

      // 按各自解谜进度逐颗点亮碑身符文珠！
      var progN = 0;
      if (sh.awake) progN = 3;
      else if (sh.puzzleKind === 'fish_rings') progN = tideRings.filter(function (r) { return r.lit; }).length;
      else if (sh.puzzleKind === 'vault_motes') progN = vaultMotes.filter(function (m) { return m.state === 'slotted'; }).length;
      else if (sh.puzzleKind === 'echo_duet' && duet) progN = duet.step;

      var totalDots = sh.puzzleKind === 'fish_rings' ? 2 : 3;
      for (var nd = 0; nd < totalDots; nd++) {
        var ny = -sh.h * 0.44 + nd * 13;
        var litDot = nd < progN;
        ctx.fillStyle = litDot ? '#fff4b8' : ('rgba(' + sh.runeCol + ', 0.24)');
        ctx.beginPath(); ctx.arc(0, ny, litDot ? 2.7 : 2.0, 0, Math.PI * 2); ctx.fill();
      }

      if (wa > 0.25) {
        var orbY = -sh.h - 18 + Math.sin(t * 2.8 + sh.phase) * 3.5;
        ctx.globalAlpha = wa;
        ctx.fillStyle = '#fff9df';
        ctx.beginPath(); ctx.arc(0, orbY, 3.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();

      // 碑③ 晶洞二重唱实时汇聚节拍光环 + 顶部三拍进度小圆点
      if (sh.puzzleKind === 'echo_duet' && !sh.awake && duet && duet.active) {
        var cy3 = bedY - sh.h * 0.56;
        var totalT = duet.cueTimes[duet.step] || 1.8;
        var uConv = clamp(duet.timer / totalT, 0, 1);
        var ringR = 26 + uConv * 74;
        var hotWin = duet.cueFired && Math.abs(duet.timer) <= duet.hitWindow;

        ctx.save();
        // 基准目标圈
        ctx.strokeStyle = hotWin ? 'rgba(255, 242, 168, 0.92)' : 'rgba(148, 240, 255, 0.34)';
        ctx.lineWidth = hotWin ? 3.2 : 1.4;
        ctx.beginPath(); ctx.arc(sh.x, cy3, 28, 0, Math.PI * 2); ctx.stroke();

        // 由外向内收缩的节拍引导光环（缩至基准圈且发金光时按 Q！）
        if (uConv > 0.02) {
          ctx.strokeStyle = 'rgba(182, 248, 255, ' + (0.28 + (1 - uConv) * 0.58) + ')';
          ctx.lineWidth = 2.0;
          ctx.beginPath(); ctx.arc(sh.x, cy3, ringR, 0, Math.PI * 2); ctx.stroke();
        }
        // 上方 3 颗节拍进度点
        for (var b3 = 0; b3 < 3; b3++) {
          var bx3 = sh.x + (b3 - 1) * 14;
          var by3 = bedY - sh.h - 24;
          ctx.fillStyle = b3 < duet.step ? '#ffe99c' : (b3 === duet.step && hotWin ? '#a8f8ff' : 'rgba(200, 232, 248, 0.32)');
          ctx.beginPath(); ctx.arc(bx3, by3, b3 < duet.step ? 3.5 : 2.8, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
    });

    // 4. 碑② 裂窟月核碑的 3 颗游离月核光尘（撞击裂窟后显现，牵引时带柔和光丝连向小潜艇！）
    var sh2 = shrines[1];
    if (sh2 && isVaultOpenNow() && viewLeft < 6600 && viewRight > 5650) {
      ctx.save();
      vaultMotes.forEach(function (mt) {
        if (mt.state === 'slotted' && sh2.awake) return;
        var tw = 0.84 + 0.16 * Math.sin(mt.phase * 1.5);
        if (mt.state === 'carried' && boat) {
          ctx.strokeStyle = 'rgba(255, 240, 184, 0.36)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(boat.x, boat.y);
          ctx.quadraticCurveTo((boat.x + mt.x) * 0.5, (boat.y + mt.y) * 0.5 - 10, mt.x, mt.y);
          ctx.stroke();
        }
        var mg = ctx.createRadialGradient(mt.x, mt.y, 1.5, mt.x, mt.y, 24 * tw);
        mg.addColorStop(0.0, 'rgba(255, 252, 224, 0.96)');
        mg.addColorStop(0.45, 'rgba(255, 218, 138, 0.48)');
        mg.addColorStop(1.0, 'rgba(152, 238, 255, 0)');
        ctx.fillStyle = mg;
        ctx.beginPath(); ctx.arc(mt.x, mt.y, 24 * tw, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fffce6';
        ctx.beginPath(); ctx.arc(mt.x, mt.y, 4.8 * tw, 0, Math.PI * 2); ctx.fill();
      });
      ctx.restore();
    }

    if (wakeRipples.length > 0) {
      ctx.save();
      wakeRipples.forEach(function (rp) {
        var a = clamp(rp.life / rp.maxLife, 0, 1);
        ctx.strokeStyle = 'rgba(' + rp.col + ', ' + (a * 0.62) + ')';
        ctx.lineWidth = 2.2 * a + 0.6;
        ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.restore();
    }
  }

  // === 港湾焕新世界层（保持 v12 终章优雅视觉）===
  function drawIlluminatedHarborWorld(ctx, state) {
    if (!isHarborIlluminated()) return;
    var viewLeft = state.viewLeft;
    var viewRight = state.viewRight;
    if (viewLeft > 1750) return;

    var eras = window.MT.Eras;
    var art = window.MT.Art;
    var lampGlow = art.getLampGlowSprite ? art.getLampGlowSprite() : null;
    var t = state.t;

    ctx.save();
    var festoon = [
      { x: 185, y: -38 }, { x: 265, y: -26 }, { x: 345, y: -22 },
      { x: 425, y: -32 }, { x: 515, y: -44 }, { x: 615, y: -62 }, { x: 705, y: -88 }
    ];
    ctx.strokeStyle = 'rgba(232, 204, 162, 0.32)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (var fi = 0; fi < festoon.length; fi++) {
      var fp = festoon[fi];
      if (fi === 0) ctx.moveTo(fp.x, fp.y);
      else {
        var prev = festoon[fi - 1];
        ctx.quadraticCurveTo((prev.x + fp.x) * 0.5, (prev.y + fp.y) * 0.5 + 10, fp.x, fp.y);
      }
    }
    ctx.stroke();

    festoon.forEach(function (fp, idx) {
      var tw = 0.82 + 0.18 * Math.sin(t * 3.2 + idx * 1.4);
      var fy = fp.y + 4 + Math.sin(t * 2.2 + idx) * 1.2;
      if (lampGlow) {
        ctx.save();
        ctx.globalAlpha = 0.55 * tw;
        ctx.drawImage(lampGlow, fp.x - 28, fy - 28, 56, 56);
        ctx.restore();
      }
      ctx.fillStyle = idx % 2 === 0 ? '#fff5cf' : '#c6faee';
      ctx.beginPath(); ctx.arc(fp.x, fy, 2.7, 0, Math.PI * 2); ctx.fill();
    });

    var townLights = [
      { x: 72, y: -74 }, { x: 88, y: -66 }, { x: 108, y: -52 }, { x: 126, y: -40 },
      { x: 146, y: -26 }, { x: 760, y: -52 }, { x: 785, y: -44 }, { x: 815, y: -36 }
    ];
    townLights.forEach(function (tl, idx) {
      var tw = 0.72 + 0.28 * Math.sin(t * 2.5 + idx * 1.9);
      ctx.fillStyle = 'rgba(255, 234, 174, ' + (0.82 * tw) + ')';
      ctx.fillRect(tl.x, tl.y, 3.2, 4.4);
      if (lampGlow) {
        ctx.save();
        ctx.globalAlpha = 0.32 * tw;
        ctx.drawImage(lampGlow, tl.x - 16, tl.y - 16, 36, 36);
        ctx.restore();
      }
    });

    harborLanterns.forEach(function (hl) {
      if (hl.x < viewLeft - 40 || hl.x > viewRight + 40) return;
      var lx = hl.x + Math.sin(hl.phase) * 10;
      var fade = clamp(1 - Math.abs(hl.y + 130) / 140, 0.15, 0.92);
      if (lampGlow) {
        ctx.save();
        ctx.globalAlpha = fade * 0.42;
        ctx.drawImage(lampGlow, lx - 18, hl.y - 18, 36, 36);
        ctx.restore();
      }
      ctx.fillStyle = 'rgba(255, 242, 198, ' + (fade * 0.88) + ')';
      ctx.beginPath(); ctx.arc(lx, hl.y, hl.r, 0, Math.PI * 2); ctx.fill();
    });

    harborWhales.forEach(function (hw) {
      if (hw.x < viewLeft - 180 || hw.x > viewRight + 180) return;
      var wy = eras.getSurfaceY(hw.x, t) + Math.sin(hw.phase) * 5 + 4;
      var rx = hw.rx;
      ctx.save();
      ctx.translate(hw.x, wy);
      ctx.scale(hw.dir, 1);

      var wg = ctx.createRadialGradient(0, -10, 8, 0, -10, rx * 1.15);
      wg.addColorStop(0, 'rgba(154, 246, 232, ' + (0.20 + hw.flash * 0.30) + ')');
      wg.addColorStop(1, 'rgba(116, 224, 240, 0)');
      ctx.fillStyle = wg;
      ctx.beginPath(); ctx.arc(0, -10, rx * 1.15, 0, Math.PI * 2); ctx.fill();

      var bg = ctx.createLinearGradient(0, -24, 0, 22);
      bg.addColorStop(0.0, '#5a9cb8');
      bg.addColorStop(0.55, '#2b5d82');
      bg.addColorStop(1.0, '#143252');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.moveTo(rx * 0.90, 6);
      ctx.bezierCurveTo(rx * 0.44, -25, -rx * 0.62, -24, -rx * 0.96, 12);
      ctx.quadraticCurveTo(-rx * 0.25, 19, rx * 0.90, 6);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(222, 252, 248, 0.56)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(rx * 0.62, -6);
      ctx.quadraticCurveTo(0, -22, -rx * 0.55, -2);
      ctx.stroke();

      var spCycle = (t * 0.45 + hw.phase) % 1;
      if (spCycle < 0.36) {
        var su = spCycle / 0.36;
        var spH = Math.sin(su * Math.PI) * 34;
        ctx.strokeStyle = 'rgba(218, 254, 248, ' + (Math.sin(su * Math.PI) * 0.58) + ')';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(rx * 0.34, -14); ctx.quadraticCurveTo(rx * 0.28, -14 - spH, rx * 0.16, -12 - spH * 0.85);
        ctx.moveTo(rx * 0.34, -14); ctx.quadraticCurveTo(rx * 0.40, -14 - spH, rx * 0.52, -12 - spH * 0.85);
        ctx.stroke();
      }
      ctx.restore();
    });

    ctx.restore();
  }

  return {
    reset: reset,
    getAwakenedCount: getAwakenedCount,
    isHarborIlluminated: isHarborIlluminated,
    getFinaleCinematicFactor: getFinaleCinematicFactor,
    getShrineListForCompass: getShrineListForCompass,
    onActiveSonar: onActiveSonar,
    update: update,
    drawUnderWater: drawUnderWater,
    drawIlluminatedHarborWorld: drawIlluminatedHarborWorld
  };
})();
