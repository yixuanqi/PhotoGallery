// Zero-dependency complete bilingual i18n runtime (zh-CN / en-US) for Ashen Bell Vow v18.3
import { G } from './state.js';
import { storage } from './storage.js';
import { UI_DICT } from './locales/ui.js';
import { WORLD_EN } from './locales/world.js';
import { ENTITIES_EN } from './locales/entities.js';

const LOCALE_KEY = 'ashen_bell_vow_locale_v15';
let localeVersion = 0;
const localeListeners = new Set();

export function getLocale() {
  return (G && G.locale === 'en-US') ? 'en-US' : 'zh-CN';
}

export function isEn() {
  return getLocale() === 'en-US';
}

export function getLocaleVersion() {
  return localeVersion;
}

export function onLocaleChange(fn) {
  if (typeof fn === 'function') localeListeners.add(fn);
  return () => localeListeners.delete(fn);
}

export function t(key, ...args) {
  const loc = getLocale();
  let str = (UI_DICT[loc] && UI_DICT[loc][key] !== undefined)
    ? UI_DICT[loc][key]
    : (UI_DICT['zh-CN'][key] !== undefined ? UI_DICT['zh-CN'][key] : key);
  if (args.length === 1 && args[0] && typeof args[0] === 'object' && !Array.isArray(args[0])) {
    const map = args[0];
    return String(str).replace(/\{(\w+)\}/g, (_, k) => (map[k] !== undefined ? String(map[k]) : `{${k}}`));
  }
  for (let i = 0; i < args.length; i++) {
    const val = String(args[i]);
    str = str.split(`{${i}}`).join(val);
  }
  return adaptTouchText(str);
}

function isTouchPromptMode() {
  if (G && G.isMobile) return true;
  return typeof document !== 'undefined' && !!document.body && document.body.classList.contains('is-mobile');
}

export function adaptTouchText(str) {
  if (!str || !isTouchPromptMode()) return str;
  let out = String(str);
  // Strip desktop shortcut suffixes like " [M]", " [B]", " [F8]", " [F9]"
  out = out.replace(new RegExp('\\s*\\[(?:M|B|F8|F9|Tab|Esc|Enter(?:\\s*/\\s*A)?)\\]', 'g'), '');
  if (isEn()) {
    out = out
      .replace(/Press any key or click to skip/g, 'Tap screen to skip')
      .replace(/KB\+M \/ Xbox & PS Gamepad Ready · \[Enter \/ A\] Begin/g, 'Touch Landscape Controls · Tap to Begin')
      .replace(/KB\+M \/ Xbox & PS Gamepad Ready ·  Begin/g, 'Touch Landscape Controls · Tap to Begin')
      .replace(/\[F\s*\/\s*Mid-Click\s*\/\s*I\]/g, '[Grapple]')
      .replace(/F\/Mid-Click\/I/g, 'Grapple button')
      .replace(/\[1\/2\/3\/X\]/g, '[Swap]')
      .replace(/\[W\+Spell\]/g, 'Flick Spell Up')
      .replace(/\[Air S\+Spell\]/g, 'Air Flick Spell Down')
      .replace(/\bS\+Attack\b/g, 'Flick Slash Down')
      .replace(/\bW\+Attack\b/g, 'Flick Slash Up')
      .replace(/press \[E\]/gi, 'tap [Interact]')
      .replace(/\[E\]/g, '[Interact]')
      .replace(/\bShift\b/g, 'Dash')
      .replace(/\bSpace\b/g, 'Jump')
      .replace(/Left-click map to place pin · Click existing pin or Right-click to erase/g, 'Tap map to place pin · Tap existing pin to erase');
  } else {
    out = out
      .replace(/按任意键或点击跳过/g, '点击屏幕跳过')
      .replace(/键鼠\s*\/\s*Xbox\s*&\s*PS\s*手柄即插即用\s*·\s*启程/g, '横屏触控专属操控 · 点击启程')
      .replace(/\[F\s*\/\s*中键\s*\/\s*I\]/g, '「钩锁」键')
      .replace(/F\s*\/\s*中键\s*\/\s*I/g, '「钩锁」键')
      .replace(/\[1\/2\/3\/X\]/g, '「切刃」键')
      .replace(/1\/2\/3\s*或\s*X/g, '「切刃」键')
      .replace(/空中按\s*S\+法术/g, '空中下滑「法术」')
      .replace(/\[W\+法术\]|W\+法术|W\+法/g, '上滑「法术」')
      .replace(/S\s*\+\s*法/g, '下滑「法术」')
      .replace(/S\s*\+\s*斩/g, '下滑「普攻」')
      .replace(/W\s*\+\s*斩/g, '上滑「普攻」')
      .replace(/按\s*\[E\]/g, '点击「交互」')
      .replace(/\[E\]/g, '「交互」')
      .replace(/\[Q\/H\]|Q\/H/g, '「灯油」键')
      .replace(/\[C\/L\]|C\/L/g, '「墨印」键')
      .replace(/\[M\]/g, '右上小地图')
      .replace(/\[B\]/g, '「设置」手账')
      .replace(/\bShift\b/g, '「闪避」键')
      .replace(/\bSpace\b/g, '「跳跃」键')
      .replace(/左键点击舆图落钉\s*·\s*点击已有图钉或右键抹除/g, '点击舆图落钉 · 再次点击已有图钉抹除 · 双指捏合缩放')
      .replace(/滚轮缩放\s*·\s*左键拖动/g, '双指捏合缩放 · 单指拖动');
  }
  return out;
}


export function setLocale(loc, persist = true) {
  const next = loc === 'en-US' ? 'en-US' : 'zh-CN';
  const changed = !G || G.locale !== next;
  if (G) G.locale = next;
  if (persist) storage.set(LOCALE_KEY, next);
  if (changed) localeVersion++;
  applyStaticI18n();
  for (const fn of localeListeners) {
    try { fn(next, localeVersion); } catch (err) { console.error('[i18n] listener error:', err); }
  }
}

export function toggleLocale(persist = true) {
  const next = isEn() ? 'zh-CN' : 'en-US';
  setLocale(next, persist);
  return next;
}

export function loadSavedLocale() {
  const saved = storage.get(LOCALE_KEY);
  setLocale(saved === 'en-US' ? 'en-US' : 'zh-CN', false);
}

/* ---------- Domain-Specific Entity & World Localizers (Stable ID -> Bilingual) ---------- */

export function locZoneName(zoneOrRoom) {
  const raw = typeof zoneOrRoom === 'string' ? zoneOrRoom : (zoneOrRoom && zoneOrRoom.zoneName);
  if (!isEn()) return raw || '晦渊';
  if (zoneOrRoom && typeof zoneOrRoom === 'object' && zoneOrRoom.id && WORLD_EN.rooms[zoneOrRoom.id]) {
    return WORLD_EN.rooms[zoneOrRoom.id].zoneName;
  }
  return (raw && WORLD_EN.zones[raw]) || raw || WORLD_EN.defaultZone;
}

export function locRoomName(room) {
  if (!room) return isEn() ? WORLD_EN.defaultZone : '晦渊';
  if (!isEn()) return room.name || room.zoneName || '晦渊';
  const entry = room.id && WORLD_EN.rooms[room.id];
  return (entry && entry.name) || room.name || WORLD_EN.defaultZone;
}

export function locSubZone(name) {
  if (!isEn()) return name || '晦渊';
  return (name && WORLD_EN.subZones[name]) || name || WORLD_EN.defaultZone;
}

export function locAltar(altar, field = 'shortName') {
  if (!altar) return isEn() ? 'Sanctuary' : '熄灯祭坛';
  if (!isEn()) return altar[field] || altar.shortName || altar.name || '';
  const entry = altar.id && WORLD_EN.altars[altar.id];
  return (entry && entry[field]) || altar[field] || altar.shortName || altar.name || '';
}

export function locTablet(tablet, field = 'title') {
  if (!tablet) return '';
  const entry = isEn() && tablet.id && WORLD_EN.tablets[tablet.id];
  const out = (entry && entry[field]) || tablet[field] || '';
  return adaptTouchText(out);
}

export function locPickup(pickup, field = 'name') {
  if (!pickup) return '';
  const entry = isEn() && pickup.id && WORLD_EN.pickups[pickup.id];
  const out = (entry && entry[field]) || pickup[field] || '';
  return adaptTouchText(out);
}

export function locPuzzleName(puzzle) {
  if (!puzzle) return '';
  if (!isEn()) return puzzle.name || '';
  return (puzzle.id && WORLD_EN.puzzles[puzzle.id]) || puzzle.name || '';
}

export function locInscription(text) {
  if (!text) return '';
  const out = isEn() ? (WORLD_EN.inscriptions[text] || text) : text;
  return adaptTouchText(out);
}

export function locBiomeAmbience(themeKey, fallback = '') {
  if (!isEn()) return fallback;
  return WORLD_EN.biomes[themeKey] || WORLD_EN.biomes.sanctuary || fallback;
}

export function locNpcName(npc, fallbackKind = 'smith') {
  const kind = (npc && npc.kind) || fallbackKind;
  if (!isEn()) {
    if (npc && npc.name) return npc.name;
    return kind === 'chronicler' ? '游方拾碑客 · 墨尘' : kind === 'keeper' ? '旧誓守灯人 · 汐' : kind === 'scavenger' ? '盲眼拾荒童 · 灰芽' : '盲眼老铸钟匠 · 砺';
  }
  const byId = npc && npc.id && WORLD_EN.npcs[npc.id];
  if (byId) return byId.name;
  if (kind === 'chronicler') return WORLD_EN.npcs.npc_chronicler.name;
  if (kind === 'keeper') return WORLD_EN.npcs.npc_keeper.name;
  if (kind === 'scavenger') return WORLD_EN.npcs.npc_scavenger.name;
  return WORLD_EN.npcs.npc_smith.name;
}

export function locRelic(relic, field = 'name') {
  if (!relic) return '';
  const id = typeof relic === 'string' ? relic : relic.id;
  if (!isEn()) return (typeof relic === 'object' && relic[field]) || '';
  const entry = id && ENTITIES_EN.relics[id];
  return (entry && entry[field]) || (typeof relic === 'object' && relic[field]) || '';
}

export function locSynergy(syn, field = 'name') {
  if (!syn) return '';
  if (!isEn()) return syn[field] || '';
  const entry = syn.id && ENTITIES_EN.synergies[syn.id];
  return (entry && entry[field]) || syn[field] || '';
}

export function locSmithUpgrade(upg, field = 'name', lv = 0) {
  if (!upg) return '';
  if (!isEn()) {
    if (field === 'bonus') return typeof upg.bonusLabel === 'function' ? upg.bonusLabel(lv) : '';
    return upg[field] || '';
  }
  const entry = upg.id && ENTITIES_EN.smithUpgrades[upg.id];
  if (field === 'bonus') {
    return (entry && typeof entry.bonus === 'function') ? entry.bonus(lv) : (typeof upg.bonusLabel === 'function' ? upg.bonusLabel(lv) : '');
  }
  return (entry && entry[field]) || upg[field] || '';
}

export function locVow(vow, field = 'name') {
  if (!vow) return '';
  if (!isEn()) return vow[field] || '';
  const entry = vow.id && ENTITIES_EN.vows[vow.id];
  return (entry && entry[field]) || vow[field] || '';
}

export function locDummyMode(mode, field = 'label') {
  if (!mode) return '';
  if (!isEn()) return mode[field] || '';
  const entry = mode.id && ENTITIES_EN.dummyModes[mode.id];
  return (entry && entry[field]) || mode[field] || '';
}

export function locBestiary(entry, field = 'name') {
  if (!entry) return '';
  const en = isEn() && entry.kind && ENTITIES_EN.bestiary[entry.kind];
  const out = (en && en[field]) || entry[field] || '';
  return adaptTouchText(out);
}

export function locAchievement(ach, field = 'name') {
  if (!ach) return '';
  if (!isEn()) return ach[field] || '';
  const en = ach.id && ENTITIES_EN.achievements[ach.id];
  return (en && en[field]) || ach[field] || '';
}

export function locPin(pin, field = 'label') {
  if (!pin) return '';
  if (!isEn()) return pin[field] || '';
  const en = pin.id && ENTITIES_EN.mapPins[pin.id];
  return (en && en[field]) || pin[field] || '';
}

export function locBoss(boss, field = 'name') {
  if (!boss) return '';
  const id = typeof boss === 'string' ? boss : boss.id;
  const kind = typeof boss === 'object' ? boss.kind : null;
  if (!isEn()) return (typeof boss === 'object' && boss[field]) || '';
  const en = (id && ENTITIES_EN.bosses[id]) || (kind && ENTITIES_EN.bosses[kind]);
  return (en && en[field]) || (typeof boss === 'object' && boss[field]) || '';
}

export function locActionLabel(actionId, fallback = '') {
  const key = `action.${actionId}`;
  const res = t(key);
  return res === key ? fallback : res;
}

export function getEndingScript(type = 'vow') {
  const k = type === 'dawn' ? 'dawn' : 'vow';
  return {
    title: t(`ending.${k}.title`),
    acts: [0, 1, 2, 3].map(i => ({
      sub: t(`ending.${k}.act${i}.sub`),
      text: t(`ending.${k}.act${i}.text`)
    }))
  };
}

export function getCanvasFont(size, bold = false) {
  const en = isEn();
  const effSize = en ? Math.max(10, Math.round(size * 0.92)) : size;
  const family = en
    ? 'Georgia, "Times New Roman", serif'
    : '"Noto Serif SC", "Microsoft YaHei", serif';
  return `${bold ? 'bold ' : ''}${effSize}px ${family}`;
}

export function applyStaticI18n() {
  const loc = getLocale();
  if (typeof document === 'undefined') return;
  document.documentElement.lang = loc;
  document.body.classList.toggle('lang-en', loc === 'en-US');
  document.title = t('doc.title');

  // Declarative DOM localization via data-i18n / data-i18n-title / data-i18n-aria
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (key) el.setAttribute('title', t(key));
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const key = el.getAttribute('data-i18n-aria');
    if (key) el.setAttribute('aria-label', t(key));
  });

  // Sync quick language toggle button on Title Screen if present
  const titleLangBtn = document.getElementById('btn-title-lang');
  if (titleLangBtn) {
    titleLangBtn.textContent = loc === 'en-US' ? '语言: EN / 中文' : 'Lang: 中文 / EN';
  }
}
