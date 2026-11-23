// Offscreen 2x Supersampled Bitmap Glyph & Badge Atlas (v32.0 144Hz Anti-Thrash Cache)
// Eliminates Skia CJK glyph cache thrashing under G.cam.zoom !== 1 and removes per-frame ctx.font / measureText / fillText churn.
import { COLORS } from '../config.js';
import { t, isEn, getLocale, getCanvasFont } from '../i18n.js';

const MAX_GLYPH_ENTRIES = 280;
const MAX_BADGE_ENTRIES = 64;
const SUPERSAMPLE = (typeof window !== 'undefined' && (window.devicePixelRatio || 1) >= 2) ? 3 : 2;

const _glyphCache = new Map();
const _badgeCache = new Map();
let _measureCtx = null;

const _stats = {
  hits: 0,
  misses: 0,
  prewarmed: 0
};

function getMeasureCtx() {
  if (!_measureCtx) {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 4;
    _measureCtx = c.getContext('2d');
  }
  return _measureCtx;
}

function lruGet(map, key) {
  const val = map.get(key);
  if (val !== undefined) {
    // Refresh recency for LRU eviction
    map.delete(key);
    map.set(key, val);
    _stats.hits++;
    return val;
  }
  _stats.misses++;
  return undefined;
}

function lruSet(map, key, val, maxEntries) {
  if (map.size >= maxEntries) {
    const firstKey = map.keys().next().value;
    if (firstKey !== undefined) map.delete(firstKey);
  }
  map.set(key, val);
}

/**
 * Bake a text string (with optional hard dark drop shadow) into a tight 2x supersampled offscreen canvas.
 */
function getOrBakeGlyph(text, size, bold, color, shadowColor, shadowOffX, shadowOffY, customFont) {
  const str = String(text);
  const loc = getLocale();
  const fontStr = customFont || getCanvasFont(size, bold);
  const key = `${loc}|${fontStr}|${color}|${shadowColor || ''}|${shadowOffX}|${shadowOffY}|${str}`;
  const cached = lruGet(_glyphCache, key);
  if (cached) return cached;

  const mctx = getMeasureCtx();
  mctx.font = fontStr;
  const tw = Math.ceil(mctx.measureText(str).width);
  const padX = Math.max(4, Math.ceil(size * 0.25)) + Math.ceil(Math.abs(shadowOffX || 0));
  const padTop = Math.max(5, Math.ceil(size * 0.35));
  const padBot = Math.max(6, Math.ceil(size * 0.42)) + Math.ceil(Math.abs(shadowOffY || 0));
  const logW = Math.max(8, tw + padX * 2);
  const logH = Math.max(12, Math.ceil(size) + padTop + padBot);
  const baselineY = padTop + Math.ceil(size * 0.82);

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(2, Math.ceil(logW * SUPERSAMPLE));
  canvas.height = Math.max(2, Math.ceil(logH * SUPERSAMPLE));
  const c = canvas.getContext('2d');
  c.scale(SUPERSAMPLE, SUPERSAMPLE);
  c.font = fontStr;
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';

  const cx = logW * 0.5;
  if (shadowColor) {
    c.fillStyle = shadowColor;
    c.fillText(str, cx + shadowOffX, baselineY + shadowOffY);
  }
  c.fillStyle = color;
  c.fillText(str, cx, baselineY);

  const entry = { canvas, logW, logH, baselineY, textW: tw };
  lruSet(_glyphCache, key, entry, MAX_GLYPH_ENTRIES);
  return entry;
}

/**
 * Draw cached bitmap text using a single ctx.drawImage() blit (zero ctx.font / fillText in render loop).
 * Coordinates (x, y) match Canvas alphabetic baseline semantics so visual placement is pixel-identical.
 */
export function drawCachedText(ctx, text, x, y, opts = {}) {
  if (!text && text !== 0) return;
  const size = opts.size || 15;
  const bold = opts.bold !== undefined ? !!opts.bold : true;
  const color = opts.color || COLORS.parchment;
  const shadowColor = opts.shadow ? (opts.shadowColor || '#06080d') : '';
  const shadowOffX = opts.shadow ? (opts.shadowOffX !== undefined ? opts.shadowOffX : 1.5) : 0;
  const shadowOffY = opts.shadow ? (opts.shadowOffY !== undefined ? opts.shadowOffY : 1.5) : 0;
  const align = opts.align || 'center';
  const customFont = opts.font || '';

  const entry = getOrBakeGlyph(text, size, bold, color, shadowColor, shadowOffX, shadowOffY, customFont);
  let dx = x - entry.logW * 0.5;
  if (align === 'left') dx = x - (entry.logW - entry.textW) * 0.5;
  else if (align === 'right') dx = x - entry.logW + (entry.logW - entry.textW) * 0.5;
  const dy = y - entry.baselineY;
  ctx.drawImage(entry.canvas, dx, dy, entry.logW, entry.logH);
}

/**
 * Draw a cached dark-backed bordered UI badge (prompts, grapple reticle key, dummy DPS plaque, wall inscriptions).
 * Eliminates per-frame measureText + fillRect + strokeRect + fillText.
 */
export function drawCachedBadge(ctx, label, x, y, opts = {}) {
  if (!label) return;
  const loc = getLocale();
  const size = opts.size || 13;
  const bold = !!opts.bold;
  const fontStr = opts.font || getCanvasFont(size, bold);
  const bg = opts.bg || 'rgba(8, 12, 20, 0.85)';
  const border = opts.border !== undefined ? opts.border : 'rgba(245, 158, 11, 0.65)';
  const borderW = opts.borderW || 1.2;
  const textCol = opts.color || COLORS.goldBright;
  const minW = opts.minW || 88;
  const maxW = opts.maxW || 420;
  const padX = opts.padX !== undefined ? opts.padX : 13;
  const h = opts.h || 24;
  const textOffY = opts.textOffY !== undefined ? opts.textOffY : 2;
  const boxTopOff = opts.boxTopOff !== undefined ? opts.boxTopOff : -15;

  const key = `${loc}|${fontStr}|${bg}|${border}|${textCol}|${minW}|${h}|${label}`;
  let entry = lruGet(_badgeCache, key);
  if (!entry) {
    const mctx = getMeasureCtx();
    mctx.font = fontStr;
    const rawW = Math.ceil(mctx.measureText(label).width) + padX * 2;
    const boxW = Math.min(maxW, Math.max(minW, rawW));
    const margin = 3;
    const logW = boxW + margin * 2;
    const logH = h + margin * 2;

    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(logW * SUPERSAMPLE);
    canvas.height = Math.ceil(logH * SUPERSAMPLE);
    const c = canvas.getContext('2d');
    c.scale(SUPERSAMPLE, SUPERSAMPLE);

    c.fillStyle = bg;
    c.fillRect(margin, margin, boxW, h);
    if (border) {
      c.strokeStyle = border;
      c.lineWidth = borderW;
      c.strokeRect(margin, margin, boxW, h);
    }
    c.font = fontStr;
    c.textAlign = 'center';
    c.textBaseline = 'alphabetic';
    c.fillStyle = textCol;
    const textY = margin - boxTopOff + textOffY;
    c.fillText(label, logW * 0.5, textY);

    entry = { canvas, logW, logH, boxW, margin, boxTopOff };
    lruSet(_badgeCache, key, entry, MAX_BADGE_ENTRIES);
  }

  ctx.drawImage(
    entry.canvas,
    x - entry.logW * 0.5,
    y + entry.boxTopOff - entry.margin,
    entry.logW,
    entry.logH
  );
  return entry.boxW;
}

export function clearGlyphAtlas() {
  _glyphCache.clear();
  _badgeCache.clear();
  _stats.prewarmed = 0;
}

export function prewarmGlyphAtlas() {
  const en = isEn();
  const danger = t('ren.dangerGlyph');
  const prewarmSpecs = [
    // Danger telegraphs (enemies, wardens & bosses)
    [danger, en ? 14 : 22, true, COLORS.crimsonBright, false],
    [danger, en ? 15 : 23, true, COLORS.crimsonBright, false],
    [danger, en ? 15 : 24, true, COLORS.crimsonBright, false],
    [danger, en ? 19 : 30, true, COLORS.crimsonBright, true],
    [t('ren.dangerTide'), en ? 19 : 30, true, COLORS.crimsonBright, true],
    [t('ren.dangerNova'), en ? 19 : 28, true, COLORS.crimsonBright, true],
    [t('ren.dangerEclipse'), en ? 19 : 30, true, COLORS.crimsonBright, true],
    // Execution & Talisman sigils
    [t('ren.execGlyph'), en ? 9.5 : 13, true, '#ffffff', false],
    [t('ren.sealGlyph'), en ? 7.5 : 12, true, COLORS.goldBright, false],
    // High-frequency combat floating callouts
    [t('combat.parryPerfect'), 18, true, COLORS.goldBright, true],
    [t('combat.parryStreak', 2), 23, true, COLORS.goldBright, true],
    [t('combat.parryStreak', 3), 23, true, COLORS.goldBright, true],
    [t('combat.parryStreak4', 4), 23, true, COLORS.goldBright, true],
    [t('combat.blockGray'), 15, true, '#cbd5e1', true],
    [t('combat.riposte'), 18, true, COLORS.goldBright, true],
    [t('combat.iai'), 18, true, COLORS.goldBright, true],
    [t('combat.evade'), 18, true, COLORS.cyanBright, true],
    [t('combat.execution'), 23, true, COLORS.crimsonBright, true],
    [t('combat.shieldBreak'), 18, true, COLORS.goldBright, true],
    [t('combat.bellQuake'), 18, true, COLORS.cyanBright, true],
    [t('combat.orbReflect'), 18, true, COLORS.goldBright, true],
    [t('combat.sealDetonate'), 23, true, COLORS.goldBright, true],
    [t('hud.frostBuildup'), 11.5, true, '#e0f2fe', false],
    [t('hud.frostChilled'), 11.5, true, '#e0f2fe', false],
    [t('hud.wetStatus'), 10.5, true, '#7dd3fc', false]
  ];

  let bakedCount = 0;
  for (let i = 0; i < prewarmSpecs.length; i++) {
    const [txt, sz, bold, col, sh] = prewarmSpecs[i];
    if (!txt) continue;
    getOrBakeGlyph(txt, sz, bold, col, sh ? '#06080d' : '', sh ? 1.5 : 0, sh ? 1.5 : 0, '');
    bakedCount++;
  }
  // Reset warmup misses so runtime hit-rate reflects real gameplay frames cleanly
  _stats.hits = 0;
  _stats.misses = 0;
  _stats.prewarmed = bakedCount;
}

export function getGlyphAtlasStats() {
  const total = _stats.hits + _stats.misses;
  return {
    entries: _glyphCache.size + _badgeCache.size,
    glyphEntries: _glyphCache.size,
    badgeEntries: _badgeCache.size,
    hits: _stats.hits,
    misses: _stats.misses,
    hitRate: total > 0 ? (_stats.hits / total) * 100 : 100,
    prewarmed: _stats.prewarmed
  };
}
