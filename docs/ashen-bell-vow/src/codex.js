// Codex (晦渊残卷): Bestiary stats, Lore Tablet archive, Achievements + Ink Unlock Banner, and Room Map Stats
import {
  COLORS, ROOMS, RELICS, LORE_TABLETS, PICKUPS_DEF, ALTARS, VOID_BARRIERS,
  WORLD_MIN_X, WORLD_MIN_Y, MAP_COLS, MAP_ROWS, MAP_CELL_W, MAP_CELL_H
} from './config.js';
import { G } from './state.js';
import { WEAPON_ORDER } from './weapons.js';
import { audio } from './audio.js';
import { t, isEn, locAchievement, getCanvasFont } from './i18n.js';

export const MAP_PIN_TYPES = [
  { id: 'wall', label: '暗墙', color: '#38bdf8', hint: '标记可击破暗墙或隐秘通道' },
  { id: 'barrier', label: '结界', color: '#c084fc', hint: '标记待「幽影穿身」穿透的暗蚀结界' },
  { id: 'foe', label: '强敌', color: '#f87171', hint: '标记强敌、首领或待回溯目标' }
];

export const BESTIARY_ENTRIES = [
  {
    kind: 'sentinel',
    name: '持矛枯骨哨兵',
    title: '沉钟回廊 · 守夜旧卒',
    isBoss: false,
    habitat: '枯骨长廊 · 沉渊钟井',
    tactic: '平刺金芒可精准弹反接断钟返；猩红「危」突刺须以 Shift 闪避。',
    lore: '即便灯火早已熄灭，残破的铠甲仍循着旧日钟声机械巡守长廊。'
  },
  {
    kind: 'wraith',
    name: '悬灯怨灵',
    title: '游荡火灵 · 魂火寄宿体',
    isBoss: false,
    habitat: '枯骨长廊 · 沉渊钟井 · 初钟圣阶',
    tactic: '精准弹反可将怨灵火球「归元」反弹秒杀；或用幽丝钩索直接打断蓄力。',
    lore: '坠入墨蚀的守灯人残念，提着渗血的铜灯徘徊于高穹之下。'
  },
  {
    kind: 'golem',
    name: '守钟铁卫',
    title: '重盾青铜卫士',
    isBoss: false,
    habitat: '沉渊钟井 · 初钟圣阶',
    tactic: '正面轻斩会被青铜巨盾弹开；用居合一闪、三段重劈、幽鸣灵刃、镇魂钟鸣或弹反即可破盾。',
    lore: '铸钟师以整块钟铜铸就的活体门扉，唯有重器与共振能裂其盾锋。'
  },
  {
    kind: 'priest',
    name: '敲钟祭司',
    title: '咏钟授盾者',
    isBoss: false,
    habitat: '沉渊钟井 · 残钟地窖 · 初钟圣阶',
    tactic: '咏钟时会为同伴赋予金钟护盾；用钩索直扑或远程灵刃打断咏钟可造成 1.5 倍削势。',
    lore: '高台上的诵经枯僧，仍企图以残破摇铃替同伴唤回旧日庇佑。'
  },
  {
    kind: 'duelist',
    name: '连刃武者',
    title: '断誓双刀客',
    isBoss: false,
    habitat: '沉渊钟井 · 残钟地窖 · 初钟圣阶',
    tactic: '招牌三连斩为「快—快—慢」打铁节奏，稳住三连完美弹反即可极速崩毁其架势。',
    lore: '曾随第一代守誓者征战的双刃剑客，失智后只余肌肉记忆里的凌厉连斩。'
  },
  {
    kind: 'leech',
    name: '倒挂墨蛭',
    title: '穹顶伏袭魔物',
    isBoss: false,
    habitat: '枯骨长廊 · 残钟地窖 · 初钟圣阶',
    tactic: '栖息于高台底部与地窖穹顶，抖动预警后垂直扑落；用 W+斩上挑截击可造成 +45% 额外伤害。',
    lore: '汲取滴落墨蚀而生的软体异兽，常潜伏于提灯光照不及的暗影夹缝。'
  },
  {
    kind: 'dummy',
    name: '青铜演武钟偶',
    title: '老铸钟匠 · 试锋机偶',
    isBoss: false,
    habitat: '起点 · 熄灯祭坛庭院',
    tactic: '挥刀激活，按 [E] 切换全招式/弹反/危技/木桩四种模式，零惩罚演练全套战斗机制。',
    lore: '盲眼老铸钟匠 · 砺亲手打制的青铜试锋人偶，为每位新醒的提灯者磨砺剑心。'
  },
  {
    kind: 'boss',
    name: '断钟骑士 · 晦',
    title: '第一幕首领 · 寂静守誓',
    isBoss: true,
    habitat: '断钟礼拜堂',
    tactic: '二阶段「墨钟长鸣」的猩红墨潮需钩索滞空，或击鸣礼拜堂两侧悬灯触发「清钟破潮」。',
    lore: '亲手守在礼拜堂门前的断钟重骑，以永不熄灭的沉默隔绝外界与深井。'
  },
  {
    kind: 'boss2',
    name: '沉渊铸钟师 · 寂',
    title: '第二幕首领 · 万钟齐喑',
    isBoss: true,
    habitat: '沉渊铸钟殿',
    tactic: '善用墨翼步与穹顶钩环立体机动；弹反其钟盾冲锋可震碎护盾，二阶段击鸣双悬灯可破除共振。',
    lore: '长年盘踞熔炉之底的古钟铸造者，试图以闯入者的魂火重铸沉渊之声。'
  },
  {
    kind: 'boss3',
    name: '初钟圣骸 · 渊',
    title: '终幕首领 · 寂灭初鸣',
    isBoss: true,
    habitat: '初钟圣心',
    tactic: '三幕完整打铁交响：掌握三响与五响断誓连舞的慢刀节奏，二/三幕借悬灯破除终末钟潮。',
    lore: '千年初钟吞噬历代守誓者魂火凝成的圣骸，既是永夜的囚笼，也是旧誓最后的回声。'
  },
  {
    kind: 'falcon',
    name: '衔铃风隼',
    title: '绝风巡弋 · 鸣铃猛禽',
    isBoss: false,
    habitat: '绝风断塔 · 霜骸圣脊',
    tactic: '高空鸣铃蓄势后俯冲直扑；在金芒闪现时精准弹反可令其失衡坠落并承受巨额削势。',
    lore: '脚爪仍系着残破铜铃的苍隼，借断塔罡风盘旋于悬崖之上，猎杀一切攀登者。'
  },
  {
    kind: 'fungus',
    name: '孢蚀菌傀',
    title: '古林寄生 · 毒雾行尸',
    isBoss: false,
    habitat: '枯墨古林',
    tactic: '重拍可弹反；原地喷吐的毒孢云与阵亡残留孢雾皆可用 [W+U/R] 镇魂钟鸣一举驱散。',
    lore: '被发光墨菌彻底吞噬的旧日林卒，每一次挥臂都伴随刺鼻的腐绿孢雾。'
  },
  {
    kind: 'frostguard',
    name: '寒戟骸卫',
    title: '霜脊重卒 · 冻血长戟',
    isBoss: false,
    habitat: '霜骸圣脊',
    tactic: '攻击附带寒霜积蓄，满额将触发冻伤并迟缓移速；精准弹反寒戟平挥、闪避猩红霜刺可免受侵蚀。',
    lore: '在圣脊极寒中冻结成冰雕的旧誓卫士，长戟锋刃凝结着永不融化的霜髓。'
  },
  {
    kind: 'warden_wind',
    name: '截风巡塔使 · 朔',
    title: '绝风守誓精英 · 乘风双刃',
    isBoss: true,
    habitat: '绝风断塔',
    tactic: '善用断塔罡风与钩环周旋；其空中风刃齐射可精准弹反归元，近身双刃连斩遵循打铁节奏。',
    lore: '曾独守绝风断塔高空的巡塔剑使，即便塔身倾颓，仍以双刃截断一切逆风而上者。'
  },
  {
    kind: 'warden_forest',
    name: '盘根古钟精 · 枯',
    title: '古林守誓精英 · 盘根钟铠',
    isBoss: true,
    habitat: '枯墨古林',
    tactic: '全身覆有坚韧树皮钟铠，轻斩会被大幅减伤；用居合、重劈、下劈、弹反或镇魂钟鸣破甲并净化毒孢云。',
    lore: '枯墨古林深处吞没了古钟的千年树精，盘根错节间仍回荡着沉闷的旧誓钟鸣。'
  },
  {
    kind: 'warden_mountain',
    name: '断剑霜侯 · 凛',
    title: '霜脊守誓精英 · 寒刃居合',
    isBoss: true,
    habitat: '霜骸圣脊',
    tactic: '招招附带寒霜积蓄；稳住三至四连寒刃打铁与居合反制，二阶段须提防冰晶斩波与霜脊地波。',
    lore: '立誓守护霜骸剑冢的冷峻剑侯，手中半截寒霜大剑曾斩断无数妄图窃火的闯入者。'
  },
  {
    kind: 'boss4',
    name: '初铸残影 · 铸',
    title: '隐藏终局首领 · 三刃始祖',
    isBoss: true,
    habitat: '初钟圣心 · 残誓回响',
    tactic: '动态切换断刃、钟锤与引魂摇铃三系姿态；面对其同源奥义反制铃球时精准弹反可反震巨额架势！',
    lore: '斩落初钟圣骸与三境守誓后方于钟心浮现的第一代铸钟者残影，亦是一切三系兵刃的源头。'
  }
];

export const ACHIEVEMENTS_DEF = [
  { id: 'first_parry', name: '初鸣打铁', desc: '完成首次精准弹反，听见断刃与青铜的清脆共鸣。' },
  { id: 'parry_streak_4', name: '铁鸣四连', desc: '单次交锋中达成 4 连及以上精准弹反。' },
  { id: 'first_exec', name: '断誓一斩', desc: '击崩敌方架势并完成首次黑白反色处决。' },
  { id: 'boss_hui', name: '断钟寂灭', desc: '于断钟礼拜堂斩落「断钟骑士 · 晦」。' },
  { id: 'boss_ji', name: '沉渊熄炉', desc: '于沉渊铸钟殿斩落「沉渊铸钟师 · 寂」。' },
  { id: 'boss_yuan', name: '初钟终末', desc: '于初钟圣心斩落最终首领「初钟圣骸 · 渊」。' },
  { id: 'all_tablets', name: '晦渊拾碑人', desc: '寻得并研读晦渊全境全部 11 座风化残碑。' },
  { id: 'all_relics', name: '十一印归灯', desc: '寻得并解锁全部 11 枚晦渊与秘境圣物。' },
  { id: 'synergy_awakened', name: '双印共鸣', desc: '在祭坛同时铭刻特定双圣物，激活隐藏机制羁绊。' },
  { id: 'no_hit_echo', name: '无伤断誓', desc: '在任意残誓回响中零受创通关，夺得 S+ 评级。' },
  { id: 'rush_clear', name: '三钟宗师', desc: '在祭坛残誓回响中通关「三钟终试（晦→寂→渊）」。' },
  { id: 'vow_or_ngplus', name: '绝誓轮回', desc: '踏入残誓轮回（二周目 NG+）或在 4 誓制约下破除回响。' },
  { id: 'chronicler_complete', name: '拾碑知己', desc: '助沉渊钟井的游方拾碑客 · 墨尘完成全部三卷《晦渊全史》拓录。' },
  { id: 'keeper_dawn_wick', name: '残灯赴晓', desc: '携「破晓初印」回访初钟圣顶的旧誓守灯人 · 汐，承接终誓灯芯。' },
  { id: 'three_weapons', name: '三刃齐鸣', desc: '集齐灰钟断刃、镇渊钟锤与引魂摇铃全部三系兵刃。' },
  { id: 'three_biomes', name: '三境踏破', desc: '踏足绝风断塔、枯墨古林与霜骸圣脊全部三大秘境生态。' },
  { id: 'three_wardens', name: '三境斩誓', desc: '分别击败绝风断塔、枯墨古林与霜骸圣脊的全部三位秘境守誓精英。' },
  { id: 'warden_rush_clear', name: '三境连破', desc: '在祭坛残誓回响中通关「三境守誓连战（朔→枯→凛）」。' },
  { id: 'weapon_trait_forged', name: '百炼成锋', desc: '在盲眼老铸钟匠处为任意三系兵刃淬炼首个专属流派词条。' },
  { id: 'weapon_ultimate_cast', name: '满印绝响', desc: '攒满全部墨印并施放一次三系兵刃专属「满印共鸣奥义」。' },
  { id: 'boss_zhu', name: '初铸终末', desc: '于祭坛残誓回响中击败隐藏终局首领「初铸残影 · 铸」。' },
  { id: 'seven_bells_clear', name: '七响归寂', desc: '在祭坛残誓回响中通关终极连战「晦渊七响终试（晦→寂→朔→枯→凛→渊→铸）」。' }
];

export function createFreshCodex() {
  return {
    readTablets: [],
    bestiary: {},
    achievements: [],
    discoveredSynergies: []
  };
}

export function ensureCodexState() {
  if (!G.worldState) return null;
  if (!G.worldState.codex || typeof G.worldState.codex !== 'object') {
    G.worldState.codex = createFreshCodex();
  }
  const c = G.worldState.codex;
  if (!Array.isArray(c.readTablets)) c.readTablets = [];
  if (!c.bestiary || typeof c.bestiary !== 'object') c.bestiary = {};
  if (!Array.isArray(c.achievements)) c.achievements = [];
  if (!Array.isArray(c.discoveredSynergies)) c.discoveredSynergies = [];
  if (!Array.isArray(G.worldState.mapPins)) G.worldState.mapPins = [];
  return c;
}

function getBestiaryEntry(kind) {
  const c = ensureCodexState();
  if (!c || !kind) return null;
  let rec = c.bestiary[kind];
  if (!rec) {
    rec = { seen: true, kills: 0, parries: 0, executions: 0 };
    c.bestiary[kind] = rec;
  }
  return rec;
}

export function recordBestiaryEvent(kind, eventType = 'seen') {
  if (!kind || G.benchActive) return;
  const rec = getBestiaryEntry(kind);
  if (!rec) return;
  rec.seen = true;
  if (eventType === 'kill') rec.kills = (rec.kills || 0) + 1;
  else if (eventType === 'parry') rec.parries = (rec.parries || 0) + 1;
  else if (eventType === 'execution') rec.executions = (rec.executions || 0) + 1;
}

export function recordTabletRead(tabletId) {
  if (!tabletId || G.benchActive) return;
  const c = ensureCodexState();
  if (!c) return;
  if (!c.readTablets.includes(tabletId)) {
    c.readTablets.push(tabletId);
    if (G.saveDirtyTimer <= 0) G.saveDirtyTimer = 2.0;
  }
  checkAchievements();
}

export function recordSynergyDiscovered(synId) {
  if (!synId || G.benchActive) return;
  const c = ensureCodexState();
  if (!c) return;
  if (!c.discoveredSynergies.includes(synId)) {
    c.discoveredSynergies.push(synId);
    if (G.saveDirtyTimer <= 0) G.saveDirtyTimer = 2.0;
  }
  checkAchievements({ synergy: true });
}

function unlockAchievement(id) {
  const c = ensureCodexState();
  if (!c || c.achievements.includes(id)) return false;
  const def = ACHIEVEMENTS_DEF.find(a => a.id === id);
  if (!def) return false;
  c.achievements.push(id);
  if (!Array.isArray(G.achievementQueue)) G.achievementQueue = [];
  G.achievementQueue.push({
    id: def.id,
    name: def.name,
    desc: def.desc,
    life: 3.4,
    maxLife: 3.4
  });
  if (G.saveDirtyTimer <= 0) G.saveDirtyTimer = 2.5;
  return true;
}

export function checkAchievements(ctx = null) {
  if (!G.worldState || G.benchActive) return;
  const c = ensureCodexState();
  if (!c) return;
  const ws = G.worldState;
  const newly = [];
  const tryUnlock = (cond, id) => {
    if (cond && unlockAchievement(id)) newly.push(id);
  };

  let totalParries = G.stats ? (G.stats.parries || 0) : 0;
  let totalExecs = G.stats ? (G.stats.executions || 0) : 0;
  for (const k in c.bestiary) {
    const b = c.bestiary[k];
    if (!b) continue;
    if (b.parries > 0) totalParries += b.parries;
    if (b.executions > 0) totalExecs += b.executions;
  }

  tryUnlock(totalParries >= 1 || (ctx && ctx.parryStreak >= 1), 'first_parry');
  tryUnlock((G.player && G.player.parryStreak >= 4) || (ctx && ctx.parryStreak >= 4), 'parry_streak_4');
  tryUnlock(totalExecs >= 1 || (ctx && ctx.executed), 'first_exec');
  tryUnlock(!!ws.bossDefeated, 'boss_hui');
  tryUnlock(!!ws.boss2Defeated, 'boss_ji');
  tryUnlock(!!ws.boss3Defeated, 'boss_yuan');
  tryUnlock(LORE_TABLETS.length > 0 && c.readTablets.length >= LORE_TABLETS.length, 'all_tablets');
  tryUnlock(ws.unlockedRelics && ws.unlockedRelics.size >= RELICS.length, 'all_relics');
  tryUnlock(c.discoveredSynergies.length >= 1 || (ctx && ctx.synergy), 'synergy_awakened');

  const recs = ws.echoRecords || {};
  const recVals = Object.values(recs);
  const anyNoHit = !!((ctx && ctx.echoNoHit) || recVals.some(r => r && r.noHit));
  const rushDone = !!((ctx && ctx.echoMode === 'rush') || (recs.rush && recs.rush.clears >= 1));
  const wardenRushDone = !!((ctx && ctx.echoMode === 'warden_rush') || (recs.warden_rush && recs.warden_rush.clears >= 1));
  const vowOrNg = !!(
    (ws.ngPlusCycle && ws.ngPlusCycle >= 2) ||
    (ctx && (ctx.ngPlus || ctx.echoVows >= 4)) ||
    recVals.some(r => r && r.bestVows >= 4)
  );
  tryUnlock(anyNoHit, 'no_hit_echo');
  tryUnlock(rushDone, 'rush_clear');
  tryUnlock(vowOrNg, 'vow_or_ngplus');
  const nq = ws.npcQuests || {};
  tryUnlock(Array.isArray(nq.chroniclerClaims) && nq.chroniclerClaims.includes('vol3'), 'chronicler_complete');
  tryUnlock(!!nq.keeperWickGifted, 'keeper_dawn_wick');
  tryUnlock(ws.unlockedWeapons && ws.unlockedWeapons.size >= WEAPON_ORDER.length, 'three_weapons');
  const biomeIds = ['r09_wind_spire', 'r10_ink_woods', 'r11_frost_ridge'];
  const allThreeBiomesVisited = biomeIds.every(rid => {
    const rm = ROOMS.find(r => r.id === rid);
    const st = rm ? getRoomCollectibleStats(rm) : null;
    return !!(st && st.explorePct > 0);
  });
  tryUnlock(allThreeBiomesVisited, 'three_biomes');
  const wardenIds = ['warden_wind_boss', 'warden_forest_boss', 'warden_mountain_boss'];
  const slainMinis = ws.defeatedMiniBosses;
  tryUnlock(!!(slainMinis && wardenIds.every(wid => slainMinis.has(wid))), 'three_wardens');
  tryUnlock(wardenRushDone, 'warden_rush_clear');
  tryUnlock((ws.unlockedWeaponTraits && ws.unlockedWeaponTraits.size >= 1) || (ctx && ctx.traitForged), 'weapon_trait_forged');
  tryUnlock(!!(ctx && ctx.ultimateCast), 'weapon_ultimate_cast');
  const zhuDone = !!(ws.boss4Defeated || (recs.zhu && recs.zhu.clears >= 1) || (ctx && ctx.echoMode === 'zhu'));
  const sevenDone = !!((ctx && ctx.echoMode === 'seven_bells') || (recs.seven_bells && recs.seven_bells.clears >= 1));
  tryUnlock(zhuDone, 'boss_zhu');
  tryUnlock(sevenDone, 'seven_bells_clear');

  if (newly.length > 0 && !G.achievementBanner) {
    G.achievementBanner = G.achievementQueue.shift();
    audio.playResonanceBell(587.33, true);
  }
}

export function updateAchievementBanner(dt) {
  if (G.achievementBanner) {
    G.achievementBanner.life -= dt;
    if (G.achievementBanner.life <= 0) {
      G.achievementBanner = null;
      if (G.achievementQueue && G.achievementQueue.length > 0) {
        G.achievementBanner = G.achievementQueue.shift();
        audio.playResonanceBell(587.33, true);
      }
    }
  } else if (G.achievementQueue && G.achievementQueue.length > 0) {
    G.achievementBanner = G.achievementQueue.shift();
    audio.playResonanceBell(587.33, true);
  }
}

// Crisp zero-DOM-churn calligraphic ink toast rendered directly on Canvas
export function drawAchievementBanner() {
  const b = G.achievementBanner;
  if (!b || b.life <= 0) return;
  const ctx = G.ctx;
  const p = 1 - b.life / b.maxLife;
  const enter = p < 0.12 ? (p / 0.12) : 1;
  const exit = b.life < 0.42 ? (b.life / 0.42) : 1;
  const alpha = Math.max(0, Math.min(1, Math.min(enter, exit)));
  const slideY = (1 - enter) * -18;

  const cx = G.canvasW * 0.5;
  // Sit cleanly below top edge (and below boss banner if active)
  const cy = (G.bossBanner && G.bossBanner.life > 0 ? 182 : 66) + slideY;
  const achDef = ACHIEVEMENTS_DEF.find(a => a.id === b.id) || b;
  const achName = locAchievement(achDef, 'name');
  const achDesc = locAchievement(achDef, 'desc');
  const en = isEn();
  const bw = en ? 388 : 336;
  const bh = en ? 58 : 54;
  const x0 = cx - bw * 0.5;
  const y0 = cy - bh * 0.5;

  ctx.save();
  ctx.globalAlpha = alpha;
  // Dark parchment-ink ribbon
  ctx.fillStyle = 'rgba(10, 14, 22, 0.90)';
  ctx.fillRect(x0, y0, bw, bh);
  // Subtle gold double-border brush frame
  ctx.strokeStyle = COLORS.goldBright;
  ctx.lineWidth = 1.4;
  ctx.strokeRect(x0, y0, bw, bh);
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 + 3, y0 + 3, bw - 6, bh - 6);

  // Left golden bell-seal crest diamond
  const ix = x0 + 28;
  ctx.save();
  ctx.translate(ix, cy);
  ctx.rotate(Math.PI * 0.25);
  ctx.fillStyle = 'rgba(245, 158, 11, 0.24)';
  ctx.strokeStyle = COLORS.goldBright;
  ctx.lineWidth = 1.6;
  ctx.fillRect(-10, -10, 20, 20);
  ctx.strokeRect(-10, -10, 20, 20);
  ctx.restore();
  ctx.fillStyle = COLORS.goldBright;
  ctx.font = getCanvasFont(12, true);
  ctx.textAlign = 'center';
  ctx.fillText(t('codex.achSeal'), ix, cy + 4);

  // Text block
  ctx.textAlign = 'left';
  ctx.font = getCanvasFont(11, true);
  ctx.fillStyle = COLORS.cyanBright;
  ctx.fillText(t('codex.bannerKicker'), x0 + 52, y0 + 18);
  ctx.font = getCanvasFont(15, true);
  ctx.fillStyle = COLORS.goldBright;
  ctx.fillText(achName, x0 + 52, y0 + 37);
  if (en) {
    const shortDesc = achDesc.length > 52 ? achDesc.slice(0, 51) + '…' : achDesc;
    ctx.font = getCanvasFont(10.5, false);
    ctx.fillStyle = COLORS.parchment;
    ctx.fillText(shortDesc, x0 + 52, y0 + 51);
  } else {
    const shortDesc = achDesc.length > 18 ? achDesc.slice(0, 18) + '…' : achDesc;
    ctx.font = getCanvasFont(11, false);
    ctx.fillStyle = COLORS.parchment;
    ctx.fillText(shortDesc, x0 + 148, y0 + 37);
  }
  ctx.restore();
}

export function getRoomCollectibleStats(room) {
  if (!room || !G.worldState) return null;
  const ws = G.worldState;
  const c = ensureCodexState();
  const b = room.bounds;
  // Exploration percentage inside this room's bounds
  let totalCells = 0;
  let seenCells = 0;
  for (let r = 0; r < MAP_ROWS; r++) {
    const cy = WORLD_MIN_Y + (r + 0.5) * MAP_CELL_H;
    if (cy < b.y || cy > b.y + b.h) continue;
    for (let col = 0; col < MAP_COLS; col++) {
      const cx = WORLD_MIN_X + (col + 0.5) * MAP_CELL_W;
      if (cx < b.x || cx > b.x + b.w) continue;
      totalCells++;
      if (ws.explored[r] && ws.explored[r][col]) seenCells++;
    }
  }
  const explorePct = totalCells > 0 ? Math.round((seenCells / totalCells) * 100) : 0;

  let pickupsTotal = 0;
  let pickupsCollected = 0;
  for (let i = 0; i < ws.pickups.length; i++) {
    const pk = ws.pickups[i];
    if (pk.roomId === room.id) {
      pickupsTotal++;
      if (pk.collected) pickupsCollected++;
    }
  }

  let altarsTotal = 0;
  let altarsLit = 0;
  for (let i = 0; i < ALTARS.length; i++) {
    if (ALTARS[i].roomId === room.id) {
      altarsTotal++;
      if (ws.litAltars.has(ALTARS[i].id)) altarsLit++;
    }
  }

  let tabletsTotal = 0;
  let tabletsRead = 0;
  for (let i = 0; i < LORE_TABLETS.length; i++) {
    if (LORE_TABLETS[i].roomId === room.id) {
      tabletsTotal++;
      if (c && c.readTablets.includes(LORE_TABLETS[i].id)) tabletsRead++;
    }
  }

  let secretWallsLeft = 0;
  for (let i = 0; i < ws.secretWalls.length; i++) {
    if (ws.secretWalls[i].roomId === room.id && !ws.secretWalls[i].broken) secretWallsLeft++;
  }

  let barriersCount = 0;
  for (let i = 0; i < VOID_BARRIERS.length; i++) {
    if (VOID_BARRIERS[i].roomId === room.id) barriersCount++;
  }

  return {
    explorePct,
    pickupsTotal,
    pickupsCollected,
    altarsTotal,
    altarsLit,
    tabletsTotal,
    tabletsRead,
    secretWallsLeft,
    barriersCount
  };
}
