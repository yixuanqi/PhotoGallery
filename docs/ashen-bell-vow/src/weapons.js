// Data-Driven Three-Weapon Archetype Registry (Broken Blade / Abyssal Bell-Maul / Soul-Calling Bell Staff)
// Pure zero-import module so state, combat, player, world, renderer & UI can consume movesets with zero circularity.

export const WEAPON_ORDER = ['blade', 'hammer', 'bell'];

export const WEAPONS = {
  blade: {
    id: 'blade',
    hotkey: '1',
    defaultUnlocked: true,
    comboCount: 3,
    name: '灰钟断刃',
    nameEn: 'Ashen Broken Blade',
    shortName: '断刃',
    shortNameEn: 'Blade',
    tag: '快刀见切 · 居合一闪',
    tagEn: 'Agile Parry & Iai',
    color: '#e6dec8',
    glowKey: 'gold',
    summary: '轻快敏捷的残破野太刀。流畅三连斩易于随时闪避与弹反，长按蓄力「居合 · 一闪」高速穿刺破盾，弹反派生「断钟返」双倍吸血。',
    summaryEn: 'Agile broken odachi. Crisp 3-hit combo, hold for piercing Iai Flash lunge, and Bell-Breaker Riposte with 2x rally.',
    unlockHint: '初始执刃 · 醒于熄灯祭坛',
    unlockHintEn: 'Starting weapon · Awakened at the Extinguished Altar',
    traits: ['3连快斩 · 标准弹反窗 · 机动极佳', '长按：居合一闪（高速突刺破盾）', '切刃技：流影拔刀（高速切入回魂）'],
    traitsEn: ['Fast 3-hit · Balanced parry & mobility', 'Hold: Iai Flash piercing lunge', 'Switch Strike: Flash Draw (+Soul)'],
    passives: {
      parryWindowBonusMs: 0,
      blockWindowBonusMs: 0,
      blockChipMult: 1.0,
      parryPostureMult: 1.0,
      postureDmgMult: 1.0,
      soulGainMult: 1.0,
      spellCostMult: 1.0,
      spellDmgMult: 1.0,
      chargeTimeMult: 1.0,
      moveSpeedMult: 1.0
    },
    moves: {
      slash1:  { dmg: 19, posture: 11, rally: 10, heavy: false, breaksShield: false, dur: 0.18, cd: 0.16, activeEnd: 0.11, lungeVx: 110, box: { fwd: 82, back: 4, top: 28, h: 54 }, slashType: 'slash1', slashLife: 0.18 },
      slash2:  { dmg: 21, posture: 12, rally: 11, heavy: false, breaksShield: false, dur: 0.18, cd: 0.16, activeEnd: 0.11, lungeVx: 135, box: { fwd: 86, back: 4, top: 24, h: 50 }, slashType: 'slash2', slashLife: 0.18 },
      slash3:  { dmg: 30, posture: 22, rally: 15, heavy: true,  breaksShield: true,  dur: 0.25, cd: 0.27, activeEnd: 0.14, lungeVx: 245, box: { fwd: 96, back: 6, top: 36, h: 68 }, slashType: 'slash3', slashLife: 0.23 },
      up:      { dmg: 24, posture: 15, rally: 12, heavy: false, breaksShield: false, dur: 0.18, cd: 0.16, activeEnd: 0.12, lungeVx: 0,   box: { up: true, w: 84, h: 76 },          slashType: 'up',     slashLife: 0.18 },
      pogo:    { dmg: 22, posture: 14, rally: 12, heavy: false, breaksShield: false, dur: 0.18, cd: 0.16, activeEnd: 0.16, lungeVx: 0,   box: { pogo: true, w: 72, h: 56 },        slashType: 'pogo',   slashLife: 0.18 },
      iai:     { dmg: 48, posture: 32, rally: 20, heavy: true,  breaksShield: true,  dur: 0.24, cd: 0.20, activeEnd: 0.17, lungeVx: 730, lungeTimer: 0.15, iframe: 0.16, box: { fwd: 138, back: 24, top: 30, h: 56 }, slashType: 'iai',     slashLife: 0.34, floatKey: 'combat.iai' },
      counter: { dmg: 42, posture: 36, rally: 26, heavy: true,  breaksShield: true,  dur: 0.24, cd: 0.18, activeEnd: 0.14, lungeVx: 360, iframe: 0.16, box: { fwd: 118, back: 12, top: 38, h: 72 }, slashType: 'counter', slashLife: 0.28, floatKey: 'combat.riposte' },
      switch:  { dmg: 32, posture: 22, rally: 18, heavy: false, breaksShield: false, dur: 0.20, cd: 0.16, activeEnd: 0.13, lungeVx: 490, lungeTimer: 0.11, iframe: 0.15, bonusSoul: 14, box: { fwd: 116, back: 16, top: 30, h: 58 }, slashType: 'iai', slashLife: 0.25, floatKey: 'combat.switchBlade' }
    }
  },

  hammer: {
    id: 'hammer',
    hotkey: '2',
    defaultUnlocked: false,
    comboCount: 2,
    name: '镇渊钟锤',
    nameEn: 'Abyssal Bell-Maul',
    shortName: '钟锤',
    shortNameEn: 'Maul',
    tag: '双手重器 · 霸体碎岳',
    tagEn: 'Two-Handed Armor Crusher',
    color: '#f59e0b',
    glowKey: 'gold',
    summary: '老铸钟匠以断钟余铁重铸的双手青铜巨锤。大开大合的 2 段重拍全招破盾且削韧 ×1.35；二段裂地与长按「陨钟碎岳」自带霸体减伤并轰出裂地震荡波。',
    summaryEn: 'Reforged from shattered bell bronze. Heavy 2-hit crush combo (all swings shatter shields, ×1.35 posture); 2nd slam & Charged Abyssal Sundering grant hyper-armor and unleash a seismic ground wave.',
    unlockHint: '斩落断钟礼拜堂首领「断钟骑士 · 晦」后，回起点找盲眼老铸钟匠 · 砺重铸解锁。',
    unlockHintEn: 'Fell Hui in the Chapel of the Broken Bell, then return to Blind Bell-Smith Li to reforge it.',
    traits: ['2段沉重砸击 · 全招破重盾 · 削势 ×1.35', '二段/蓄力自带霸体减伤 · 轰出裂地震荡波', '切刃技：落钟破岳（霸体瞬砸碎盾）'],
    traitsEn: ['Heavy 2-hit smash · All hits shatter shields (×1.35 posture)', '2nd Hit & Hold: Hyper-armor slam + seismic wave', 'Switch Strike: Falling Maul armored crush'],
    passives: {
      parryWindowBonusMs: -4,
      blockWindowBonusMs: 25,
      blockChipMult: 0.80,
      parryPostureMult: 1.22,
      postureDmgMult: 1.35,
      soulGainMult: 1.0,
      spellCostMult: 1.0,
      spellDmgMult: 1.0,
      chargeTimeMult: 1.12,
      moveSpeedMult: 0.93
    },
    moves: {
      slash1:  { dmg: 30, posture: 26, rally: 16, heavy: true, breaksShield: true, dur: 0.30, cd: 0.29, activeEnd: 0.17, lungeVx: 135, guardArmor: 0.16, armorMult: 0.65, knockbackVx: 245, box: { fwd: 102, back: 14, top: 36, h: 66 }, slashType: 'hammerSweep', slashLife: 0.26 },
      slash2:  { dmg: 44, posture: 40, rally: 22, heavy: true, breaksShield: true, dur: 0.36, cd: 0.35, activeEnd: 0.20, lungeVx: 220, guardArmor: 0.30, armorMult: 0.45, shockwaveR: 110, knockbackVx: 295, knockupVy: -215, wallDmg: 2, box: { fwd: 110, back: 18, top: 44, h: 78 }, slashType: 'hammerSlam', slashLife: 0.30, floatKey: 'combat.hammerSlam' },
      up:      { dmg: 32, posture: 26, rally: 16, heavy: true, breaksShield: true, dur: 0.28, cd: 0.27, activeEnd: 0.16, lungeVx: 0,   knockupVy: -240, box: { up: true, w: 104, h: 86 },           slashType: 'hammerUp',    slashLife: 0.25 },
      pogo:    { dmg: 30, posture: 24, rally: 16, heavy: true, breaksShield: true, dur: 0.24, cd: 0.22, activeEnd: 0.18, lungeVx: 0,   box: { pogo: true, w: 88, h: 66 },         slashType: 'hammerPogo',  slashLife: 0.24 },
      iai:     { dmg: 58, posture: 54, rally: 28, heavy: true, breaksShield: true, dur: 0.38, cd: 0.32, activeEnd: 0.24, lungeVx: 360, lungeTimer: 0.14, guardArmor: 0.40, armorMult: 0.35, shockwaveR: 140, knockbackVx: 340, knockupVy: -250, wallDmg: 3, box: { fwd: 122, back: 24, top: 46, h: 82 }, slashType: 'hammerQuake', slashLife: 0.36, floatKey: 'combat.hammerCharge', projectile: { kind: 'hammerWave', count: 1, dmg: 34, posture: 30, speed: 540, life: 0.62, r: 28, breaksShield: true, heavy: true, soulOnHit: 12 } },
      counter: { dmg: 52, posture: 62, rally: 32, heavy: true, breaksShield: true, dur: 0.30, cd: 0.22, activeEnd: 0.18, lungeVx: 260, iframe: 0.22, guardArmor: 0.30, armorMult: 0.40, shockwaveR: 148, knockbackVx: 320, knockupVy: -225, wallDmg: 2, box: { fwd: 124, back: 20, top: 46, h: 80 }, slashType: 'hammerCounter', slashLife: 0.34, floatKey: 'combat.hammerCounter' },
      switch:  { dmg: 42, posture: 42, rally: 22, heavy: true, breaksShield: true, dur: 0.28, cd: 0.24, activeEnd: 0.18, lungeVx: 215, guardArmor: 0.32, armorMult: 0.40, shockwaveR: 120, bonusSoul: 12, knockbackVx: 285, knockupVy: -210, wallDmg: 2, box: { fwd: 114, back: 20, top: 42, h: 74 }, slashType: 'hammerSlam', slashLife: 0.30, floatKey: 'combat.switchHammer' }
    }
  },

  bell: {
    id: 'bell',
    hotkey: '3',
    defaultUnlocked: false,
    comboCount: 3,
    name: '引魂摇铃',
    nameEn: 'Soul-Calling Bell Staff',
    shortName: '摇铃',
    shortNameEn: 'Bell',
    tag: '中程法术 · 摄魂共鸣',
    tagEn: 'Mid-Range Harmonic Caster',
    color: '#38bdf8',
    glowKey: 'cyan',
    summary: '青铜引魂铃杖。魂火回复 +35%、法术耗蓝 -20% 且法术伤害 +25%；轻击挥出穿透音环（远距可敲灯/解钟谜），长按释放三连追踪「摄魂铃矢」，弹反触发环形「镇魂回响」。',
    summaryEn: 'Bronze soul-calling staff. +35% Soul gain, -20% spell cost & +25% spell DMG; attacks launch piercing harmonic rings, hold fires 3 homing Spirit Darts, and parries unleash a 360° Requiem Pulse.',
    unlockHint: '潜入沉渊钟井西侧「残钟地窖」，在东侧暗道半埋断钟骸旁的深处秘龛中寻得。',
    unlockHintEn: 'Explore the Crypt of Shards west of the Abyssal Bell Well; hidden in the eastern sunken alcove beside the fallen bell.',
    traits: ['回魂 ×1.35 · 法术耗蓝 -20% · 法术伤害 +25%', '3连挥铃发射穿透音环 · 长按3枚追踪铃矢', '切刃技：退步双鸣（后跃双环风筝回魂）'],
    traitsEn: ['×1.35 Soul · -20% spell cost · +25% spell DMG', '3-Hit piercing rings · Hold 3-dart homing volley', 'Switch Strike: Recoil Chime backstep + twin rings'],
    passives: {
      parryWindowBonusMs: -6,
      blockWindowBonusMs: 0,
      blockChipMult: 1.05,
      parryPostureMult: 1.0,
      postureDmgMult: 1.0,
      soulGainMult: 1.35,
      spellCostMult: 0.80,
      spellDmgMult: 1.25,
      chargeTimeMult: 0.92,
      moveSpeedMult: 1.04
    },
    moves: {
      slash1:  { dmg: 12, posture: 9,  rally: 8,  heavy: false, breaksShield: false, dur: 0.20, cd: 0.18, activeEnd: 0.10, lungeVx: 35,   box: { fwd: 64, back: 8, top: 26, h: 52 }, slashType: 'bellRing1', slashLife: 0.22, projectile: { kind: 'bellWave', count: 1, dmg: 16, posture: 10, speed: 560, life: 0.44, r: 16, soulOnHit: 9 } },
      slash2:  { dmg: 13, posture: 10, rally: 9,  heavy: false, breaksShield: false, dur: 0.21, cd: 0.19, activeEnd: 0.10, lungeVx: 40,   box: { fwd: 66, back: 8, top: 26, h: 52 }, slashType: 'bellRing2', slashLife: 0.22, projectile: { kind: 'bellWave', count: 2, dmg: 12, posture: 7,  speed: 590, life: 0.42, r: 13, spreadY: 16, soulOnHit: 6 } },
      slash3:  { dmg: 18, posture: 16, rally: 12, heavy: true,  breaksShield: true,  dur: 0.27, cd: 0.29, activeEnd: 0.12, lungeVx: -55,  box: { fwd: 72, back: 10, top: 30, h: 58 }, slashType: 'bellRing3', slashLife: 0.26, projectile: { kind: 'bellWave', count: 1, dmg: 28, posture: 22, speed: 520, life: 0.56, r: 23, breaksShield: true, heavy: true, soulOnHit: 14 } },
      up:      { dmg: 20, posture: 14, rally: 11, heavy: false, breaksShield: false, dur: 0.20, cd: 0.18, activeEnd: 0.12, lungeVx: 0,    box: { up: true, w: 98, h: 86 },          slashType: 'bellUp',   slashLife: 0.22 },
      pogo:    { dmg: 20, posture: 14, rally: 12, heavy: false, breaksShield: false, dur: 0.20, cd: 0.18, activeEnd: 0.16, lungeVx: 0,    box: { pogo: true, w: 84, h: 64 },        slashType: 'bellPogo', slashLife: 0.22 },
      iai:     { dmg: 18, posture: 16, rally: 14, heavy: true,  breaksShield: true,  dur: 0.25, cd: 0.24, activeEnd: 0.12, lungeVx: -95,  iframe: 0.14, box: { fwd: 78, back: 12, top: 32, h: 60 }, slashType: 'bellVolley', slashLife: 0.30, floatKey: 'combat.bellVolley', projectile: { kind: 'bellHoming', count: 3, dmg: 19, posture: 13, speed: 480, life: 1.05, r: 12, breaksShield: true, soulOnHit: 10 } },
      counter: { dmg: 36, posture: 36, rally: 24, heavy: true,  breaksShield: true,  dur: 0.24, cd: 0.18, activeEnd: 0.14, lungeVx: 0,    iframe: 0.20, box: { radial: 165 }, slashType: 'bellCounter', slashLife: 0.32, floatKey: 'combat.bellCounter', disperseOrbs: true, ringProps: true, bonusSoul: 24 },
      switch:  { dmg: 16, posture: 14, rally: 12, heavy: false, breaksShield: true,  dur: 0.22, cd: 0.18, activeEnd: 0.12, lungeVx: -270, iframe: 0.16, bonusSoul: 18, box: { fwd: 74, back: 12, top: 28, h: 54 }, slashType: 'bellRing3', slashLife: 0.26, floatKey: 'combat.switchBell', projectile: { kind: 'bellWave', count: 2, dmg: 18, posture: 12, speed: 610, life: 0.48, r: 16, spreadY: 18, breaksShield: true, heavy: true, soulOnHit: 8 } }
    }
  }
};

export function normalizeWeaponId(id) {
  if (id === 'shield') return 'hammer';
  return WEAPONS[id] ? id : 'blade';
}

export function getWeaponById(id) {
  return WEAPONS[normalizeWeaponId(id)] || WEAPONS.blade;
}

export function getWeaponMoveDef(weaponId, moveType) {
  const w = getWeaponById(weaponId);
  return w.moves[moveType] || WEAPONS.blade.moves[moveType] || WEAPONS.blade.moves.slash1;
}
