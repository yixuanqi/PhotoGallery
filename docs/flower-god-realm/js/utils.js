/* ===== 6 大差异化切花原型映射 ===== */
const ARCHETYPE_MAP = {
  plum: "frost_sweep",
  camellia: "frost_sweep",
  apricot: "rain_curtain",
  hibiscus: "rain_curtain",
  peach: "petal_vortex",
  osmanthus: "petal_vortex",
  peony: "imperial_bloom",
  hollyhock: "imperial_bloom",
  pomegranate: "ember_surge",
  chrysanthemum: "ember_surge",
  lotus: "water_ripple",
  narcissus: "water_ripple",
};

const ARCHETYPE_LABELS = {
  frost_sweep: "风雪卷墨",
  rain_curtain: "烟雨晕染",
  petal_vortex: "落英旋风",
  imperial_bloom: "金粉耀幕",
  ember_surge: "炽火升腾",
  water_ripple: "凌波水镜",
};

function getFlowerArchetype(flower) {
  if (!flower) return "idle";
  return ARCHETYPE_MAP[flower.visual_profile] || "water_ripple";
}

function createPaperGrainPattern(ctx, size = 256) {
  const tile = document.createElement("canvas");
  tile.width = size; tile.height = size;
  const tctx = tile.getContext("2d");
  const img = tctx.createImageData(size, size);
  const data = img.data;
  let seed = 133791;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const fine = (rand() - 0.5) * 44;
      const wave = Math.sin(x * 0.14 + y * 0.05) * 8 + Math.cos(y * 0.19 - x * 0.04) * 7;
      const base = 128 + fine + wave;
      data[idx] = Math.max(0, Math.min(255, base + 4));
      data[idx + 1] = Math.max(0, Math.min(255, base + 1));
      data[idx + 2] = Math.max(0, Math.min(255, base - 5));
      data[idx + 3] = 28;
    }
  }
  tctx.putImageData(img, 0, 0);
  tctx.strokeStyle = "rgba(245, 236, 218, 0.045)";
  tctx.lineWidth = 0.8;
  for (let i = 0; i < 42; i++) {
    const x0 = rand() * size, y0 = rand() * size, len = 14 + rand() * 34, ang = (rand() - 0.5) * 0.55;
    tctx.beginPath(); tctx.moveTo(x0, y0);
    tctx.quadraticCurveTo(x0 + Math.cos(ang) * len * 0.5, y0 + Math.sin(ang) * len * 0.5 + (rand() - 0.5) * 5, x0 + Math.cos(ang) * len, y0 + Math.sin(ang) * len);
    tctx.stroke();
  }
  return ctx.createPattern(tile, "repeat");
}

function hexToRgb(hex) {
  const clean = (hex || "#111314").replace("#", "");
  const num = parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}
function lerpColor(c1, c2, t) {
  const k = Math.max(0, Math.min(1, t));
  return { r: c1.r + (c2.r - c1.r) * k, g: c1.g + (c2.g - c1.g) * k, b: c1.b + (c2.b - c1.b) * k };
}
function rgba(c, a = 1) {
  return `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${Math.max(0, Math.min(1, a))})`;
}

const SEASON_PALETTES = [
  { bg_deep: hexToRgb("#101618"), bg_mid: hexToRgb("#1e2c2e"), mist: hexToRgb("#6e8e8a"), primary: hexToRgb("#ecc8c2"), accent: hexToRgb("#c88a7a"), glow: hexToRgb("#f5efe2"), ink: hexToRgb("#152022") },
  { bg_deep: hexToRgb("#0c1517"), bg_mid: hexToRgb("#172d30"), mist: hexToRgb("#59827e"), primary: hexToRgb("#e8b8c4"), accent: hexToRgb("#79a993"), glow: hexToRgb("#e8f7f2"), ink: hexToRgb("#102124") },
  { bg_deep: hexToRgb("#121312"), bg_mid: hexToRgb("#24241b"), mist: hexToRgb("#8a7d58"), primary: hexToRgb("#e6c773"), accent: hexToRgb("#c4933b"), glow: hexToRgb("#fff5d8"), ink: hexToRgb("#1a1b15") },
  { bg_deep: hexToRgb("#0e131a"), bg_mid: hexToRgb("#1d2836"), mist: hexToRgb("#798fa8"), primary: hexToRgb("#e4c5cb"), accent: hexToRgb("#bf4d5b"), glow: hexToRgb("#f2f4f8"), ink: hexToRgb("#161d26") },
];

const paletteFromConfig = (pal) => ({
  bg_deep: hexToRgb(pal.bg_deep), bg_mid: hexToRgb(pal.bg_mid), mist: hexToRgb(pal.mist),
  primary: hexToRgb(pal.primary), accent: hexToRgb(pal.accent), glow: hexToRgb(pal.glow), ink: hexToRgb(pal.ink),
});

const clonePalette = (p) => ({
  bg_deep: { ...p.bg_deep }, bg_mid: { ...p.bg_mid }, mist: { ...p.mist },
  primary: { ...p.primary }, accent: { ...p.accent }, glow: { ...p.glow }, ink: { ...p.ink },
});

const blendPalettes = (a, b, t) => ({
  bg_deep: lerpColor(a.bg_deep, b.bg_deep, t), bg_mid: lerpColor(a.bg_mid, b.bg_mid, t),
  mist: lerpColor(a.mist, b.mist, t), primary: lerpColor(a.primary, b.primary, t),
  accent: lerpColor(a.accent, b.accent, t), glow: lerpColor(a.glow, b.glow, t), ink: lerpColor(a.ink, b.ink, t),
});

const easeOutCubic = (x) => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);
const easeOutQuint = (x) => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 5);

function evalQuad(p0, p1, p2, t) {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
    tx: 2 * mt * (p1.x - p0.x) + 2 * t * (p2.x - p1.x),
    ty: 2 * mt * (p1.y - p0.y) + 2 * t * (p2.y - p1.y),
  };
}

/* ===== 手绘宣纸笔触与工笔花卉核心原语（去 AI 感 + 精修牡丹/蜀葵/太湖石） ===== */
function makeSeededRand(seed) {
  let s = (Math.floor(seed) || 1337) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function drawHandLine(ctx, x0, y0, x1, y1, width, color, wobble = 1.6, seed = 1) {
  const rand = makeSeededRand(seed);
  const dx = x1 - x0, dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return;
  const nx = -dy / dist, ny = dx / dist;
  const segs = Math.max(4, Math.min(22, Math.floor(dist / 22)));
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = color;
  let px = x0, py = y0;
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    const taper = Math.sin(t * Math.PI);
    const off = (rand() - 0.5) * 2 * wobble * (0.35 + 0.65 * taper);
    const qx = x0 + dx * t + nx * off;
    const qy = y0 + dy * t + ny * off;
    ctx.lineWidth = Math.max(0.6, width * (0.72 + 0.36 * taper + (rand() - 0.5) * 0.18));
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(qx, qy);
    ctx.stroke();
    px = qx; py = qy;
  }
  ctx.restore();
}

function drawHandCircle(ctx, cx, cy, r, width, color, wobble = 2.2, seed = 7) {
  const rand = makeSeededRand(seed);
  const segs = 56;
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = color;
  const pts = [];
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const dr = Math.sin(a * 5 + seed) * wobble * 0.55 + Math.cos(a * 9 - seed * 0.6) * wobble * 0.35 + (rand() - 0.5) * wobble * 0.5;
    pts.push({ x: cx + Math.cos(a) * (r + dr), y: cy + Math.sin(a) * (r + dr) });
  }
  for (let i = 0; i < segs; i++) {
    const a = pts[i], b = pts[(i + 1) % segs];
    ctx.lineWidth = Math.max(0.7, width * (0.78 + 0.34 * Math.sin(i * 0.6 + seed)));
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  ctx.restore();
}

function drawHandPolygon(ctx, cx, cy, r, sides, rot, width, color, wobble = 1.8, seed = 11) {
  const verts = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2 + rot;
    verts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  for (let i = 0; i < sides; i++) {
    const a = verts[i], b = verts[(i + 1) % sides];
    drawHandLine(ctx, a.x, a.y, b.x, b.y, width, color, wobble, seed + i * 31);
  }
}

/* 淡墨太湖石（皱、漏、瘦、透，替代僵硬直线栏杆与光柱） */
function drawTaihuRock(ctx, x, y, rw, rh, pal, alpha = 0.85, seed = 41) {
  const rand = makeSeededRand(seed);
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;

  const outline = [
    [-0.46, 0.42], [-0.52, 0.14], [-0.38, -0.18], [-0.44, -0.44],
    [-0.18, -0.58], [0.06, -0.46], [0.28, -0.54], [0.46, -0.26],
    [0.36, -0.02], [0.50, 0.22], [0.42, 0.44], [0.05, 0.48],
  ].map(([px, py]) => ({
    x: px * rw + (rand() - 0.5) * rw * 0.06,
    y: py * rh + (rand() - 0.5) * rh * 0.06,
  }));

  // 底层淡墨晕染主体
  ctx.beginPath();
  outline.forEach((p, i) => {
    const next = outline[(i + 1) % outline.length];
    const mx = (p.x + next.x) * 0.5, my = (p.y + next.y) * 0.5;
    if (i === 0) ctx.moveTo(mx, my);
    else ctx.quadraticCurveTo(p.x, p.y, mx, my);
  });
  ctx.closePath();
  const rg = ctx.createLinearGradient(-rw * 0.4, -rh * 0.55, rw * 0.4, rh * 0.48);
  rg.addColorStop(0, rgba(pal.mist, 0.26));
  rg.addColorStop(0.5, rgba(pal.bg_mid, 0.52));
  rg.addColorStop(1, rgba(pal.ink, 0.82));
  ctx.fillStyle = rg;
  ctx.fill();

  // 石面皴擦暗部与孔洞（透漏感）
  ctx.fillStyle = rgba(pal.bg_deep, 0.56);
  ctx.beginPath();
  ctx.ellipse(-rw * 0.12, -rh * 0.08, rw * 0.11, rh * 0.14, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(rw * 0.17, rh * 0.08, rw * 0.08, rh * 0.09, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // 枯笔石廓勾线与披麻皴
  ctx.strokeStyle = rgba(pal.mist, 0.34);
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  outline.forEach((p, i) => {
    const next = outline[(i + 1) % outline.length];
    const mx = (p.x + next.x) * 0.5, my = (p.y + next.y) * 0.5;
    if (i === 0) ctx.moveTo(mx, my);
    else ctx.quadraticCurveTo(p.x, p.y, mx, my);
  });
  ctx.closePath();
  ctx.stroke();

  for (let i = 0; i < 6; i++) {
    const sx = (rand() - 0.5) * rw * 0.55;
    const sy = (rand() - 0.5) * rh * 0.52;
    drawHandLine(ctx, sx, sy, sx + (rand() - 0.4) * rw * 0.22, sy + rh * (0.12 + rand() * 0.16), 1.0, rgba(pal.ink, 0.42), 1.8, seed + i * 19);
  }
  ctx.restore();
}

/* 牡丹真实三裂掌状复叶（石绿 + 花青 + 微微胭脂叶尖） */
function drawPeonyLeafCluster(ctx, x, y, ang, scale, pal) {
  if (scale <= 0.02) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.scale(scale, scale);

  // 叶柄
  ctx.strokeStyle = "rgba(56, 48, 38, 0.85)";
  ctx.lineWidth = 2.0;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(10, -2, 22, 0); ctx.stroke();

  const leaflets = [
    { ox: 22, oy: 0, rot: 0, len: 58, wid: 20, tone: 0 },
    { ox: 18, oy: -4, rot: -0.68, len: 46, wid: 16, tone: 1 },
    { ox: 18, oy: 4, rot: 0.68, len: 44, wid: 15, tone: 2 },
  ];

  leaflets.forEach((lf) => {
    ctx.save();
    ctx.translate(lf.ox, lf.oy);
    ctx.rotate(lf.rot);
    const lg = ctx.createLinearGradient(0, 0, lf.len, 0);
    lg.addColorStop(0, lf.tone === 0 ? "rgba(28, 52, 42, 0.92)" : "rgba(22, 44, 36, 0.88)");
    lg.addColorStop(0.72, "rgba(42, 70, 56, 0.88)");
    lg.addColorStop(1, "rgba(92, 62, 64, 0.78)"); // 传统工笔牡丹叶尖微染赭红
    ctx.fillStyle = lg;

    // 牡丹特有的三浅裂叶廓
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(lf.len * 0.25, -lf.wid * 0.95, lf.len * 0.56, -lf.wid * 1.05, lf.len * 0.68, -lf.wid * 0.52);
    ctx.quadraticCurveTo(lf.len * 0.76, -lf.wid * 0.72, lf.len, 0);
    ctx.quadraticCurveTo(lf.len * 0.76, lf.wid * 0.72, lf.len * 0.68, lf.wid * 0.52);
    ctx.bezierCurveTo(lf.len * 0.56, lf.wid * 1.05, lf.len * 0.25, lf.wid * 0.95, 0, 0);
    ctx.closePath();
    ctx.fill();

    // 淡青叶脉与勾勒
    ctx.strokeStyle = "rgba(154, 178, 152, 0.28)";
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.moveTo(2, 0); ctx.lineTo(lf.len * 0.88, 0);
    ctx.moveTo(lf.len * 0.28, 0); ctx.lineTo(lf.len * 0.54, -lf.wid * 0.52);
    ctx.moveTo(lf.len * 0.28, 0); ctx.lineTo(lf.len * 0.54, lf.wid * 0.52);
    ctx.stroke();
    ctx.restore();
  });
  ctx.restore();
}

/* 精修工笔牡丹：3/4 微俯立体花冠 + 翻卷波浪瓣 + 瓣基绛红至蛤粉白晕染 + 细密金蕊 */
function drawArtisticPeony(ctx, x, y, rad, pal, scale = 1, t = 0, seed = 1) {
  if (scale <= 0.02) return;
  const rand = makeSeededRand(seed * 97 + 13);
  const deepCrimson = { r: 108, g: 28, b: 44 };
  const midRose = lerpColor(pal.primary, { r: 214, g: 112, b: 130 }, 0.45);
  const shellWhite = { r: 247, g: 235, b: 228 };

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // 底层极克制的水墨暗托（非霓虹发光）
  const baseShadow = ctx.createRadialGradient(0, rad * 0.08, rad * 0.1, 0, rad * 0.08, rad * 1.05);
  baseShadow.addColorStop(0, "rgba(28, 12, 18, 0.45)");
  baseShadow.addColorStop(1, "rgba(28, 12, 18, 0)");
  ctx.fillStyle = baseShadow;
  ctx.beginPath(); ctx.ellipse(0, rad * 0.08, rad * 1.05, rad * 0.82, 0, 0, Math.PI * 2); ctx.fill();

  // 绘制单片带波浪缺口与筋脉的牡丹花瓣
  const drawRuffledPetal = (px, py, rot, len, wid, depthIdx, notchSeed) => {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rot);
    const n1 = (notchSeed - 0.5) * 0.18;
    const pg = ctx.createLinearGradient(0, 0, 0, -len);
    if (depthIdx === 0) {
      // 后层外瓣：色沉润厚
      pg.addColorStop(0, rgba(deepCrimson, 0.94));
      pg.addColorStop(0.52, rgba(lerpColor(deepCrimson, midRose, 0.62), 0.9));
      pg.addColorStop(1, rgba(lerpColor(midRose, shellWhite, 0.52), 0.88));
    } else if (depthIdx === 1) {
      // 中层翻卷瓣：过渡柔和
      pg.addColorStop(0, rgba(deepCrimson, 0.92));
      pg.addColorStop(0.45, rgba(midRose, 0.94));
      pg.addColorStop(0.88, rgba(lerpColor(midRose, shellWhite, 0.72), 0.95));
      pg.addColorStop(1, rgba(shellWhite, 0.96));
    } else {
      // 内层抱心瓣：绛心玉边，层次最明
      pg.addColorStop(0, "rgba(92, 20, 36, 0.95)");
      pg.addColorStop(0.42, rgba(midRose, 0.94));
      pg.addColorStop(0.82, rgba(shellWhite, 0.96));
      pg.addColorStop(1, "rgba(255, 248, 242, 0.98)");
    }

    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.moveTo(-wid * 0.22, 0);
    ctx.bezierCurveTo(-wid * 0.78, -len * 0.34, -wid * 0.96, -len * 0.84, -wid * 0.44, -len * (0.96 + n1));
    // 牡丹瓣缘标志性的自然波浪缺口
    ctx.quadraticCurveTo(-wid * 0.18, -len * (1.06 - n1 * 0.5), -wid * 0.04, -len * (0.93 + n1 * 0.4));
    ctx.quadraticCurveTo(wid * 0.16, -len * (1.05 + n1 * 0.6), wid * 0.46, -len * (0.95 - n1));
    ctx.bezierCurveTo(wid * 0.96, -len * 0.82, wid * 0.78, -len * 0.34, wid * 0.22, 0);
    ctx.closePath();
    ctx.fill();

    // 瓣缘蛤粉细线提亮 + 瓣心胭脂细筋
    ctx.strokeStyle = rgba(shellWhite, depthIdx === 2 ? 0.55 : 0.34);
    ctx.lineWidth = 0.85;
    ctx.stroke();

    ctx.strokeStyle = rgba(deepCrimson, 0.26);
    ctx.lineWidth = 0.7;
    for (let v = -1; v <= 1; v++) {
      ctx.beginPath();
      ctx.moveTo(v * wid * 0.08, -len * 0.08);
      ctx.quadraticCurveTo(v * wid * 0.22, -len * 0.42, v * wid * 0.32, -len * 0.72);
      ctx.stroke();
    }
    ctx.restore();
  };

  // 第 1 层：后方高挑护瓣（呈 3/4 微俯视角，上方高、左右宽）
  const backAngles = [-1.18, -0.72, -0.26, 0.22, 0.68, 1.15];
  backAngles.forEach((a, i) => {
    const jitter = (rand() - 0.5) * 0.12 + Math.sin(t * 0.6 + i) * 0.015;
    drawRuffledPetal(
      Math.sin(a) * rad * 0.14,
      -rad * 0.08 - Math.cos(a) * rad * 0.08,
      a + jitter,
      rad * (0.86 + (i % 2) * 0.12),
      rad * 0.44,
      0,
      rand()
    );
  });

  // 第 2 层：左右与前方舒展翻卷外裙瓣（形成立体碗盘结构）
  const skirtSpecs = [
    { a: -1.85, ox: -0.22, oy: 0.06, l: 0.78, w: 0.46 },
    { a: 1.85, ox: 0.22, oy: 0.06, l: 0.78, w: 0.46 },
    { a: -2.42, ox: -0.18, oy: 0.18, l: 0.66, w: 0.48 },
    { a: 2.42, ox: 0.18, oy: 0.18, l: 0.66, w: 0.48 },
    { a: -2.92, ox: -0.06, oy: 0.22, l: 0.56, w: 0.46 },
    { a: 2.92, ox: 0.06, oy: 0.22, l: 0.56, w: 0.46 },
  ];
  skirtSpecs.forEach((sp, i) => {
    drawRuffledPetal(
      sp.ox * rad,
      sp.oy * rad,
      sp.a + (rand() - 0.5) * 0.1,
      rad * sp.l,
      rad * sp.w,
      1,
      rand()
    );
  });

  // 第 3 层：中层错落叠瓣（向心微卷）
  const midAngles = [-0.95, -0.45, 0.05, 0.55, 1.02, -1.52, 1.54];
  midAngles.forEach((a, i) => {
    drawRuffledPetal(
      Math.sin(a) * rad * 0.12,
      rad * 0.02 - Math.cos(a) * rad * 0.05,
      a + (rand() - 0.5) * 0.1,
      rad * (0.64 + (i % 3) * 0.06),
      rad * 0.36,
      1,
      rand()
    );
  });

  // 花心深绛暗窝（奠定立体深度）
  const throat = ctx.createRadialGradient(0, rad * 0.02, 2, 0, rad * 0.02, rad * 0.34);
  throat.addColorStop(0, "rgba(72, 14, 28, 0.92)");
  throat.addColorStop(0.65, "rgba(116, 28, 46, 0.58)");
  throat.addColorStop(1, "rgba(116, 28, 46, 0)");
  ctx.fillStyle = throat;
  ctx.beginPath(); ctx.ellipse(0, rad * 0.02, rad * 0.34, rad * 0.24, 0, 0, Math.PI * 2); ctx.fill();

  // 细密金蕊（丝细而密，避免实心黄圆球）
  ctx.lineCap = "round";
  for (let s = 0; s < 22; s++) {
    const sa = -Math.PI * 0.95 + (s / 21) * Math.PI * 0.9 + (rand() - 0.5) * 0.12;
    const sl = rad * (0.18 + rand() * 0.16);
    const sx = Math.cos(sa) * sl * 1.15;
    const sy = Math.sin(sa) * sl * 0.72 + rad * 0.02;
    ctx.strokeStyle = "rgba(226, 184, 92, 0.82)";
    ctx.lineWidth = 0.85;
    ctx.beginPath(); ctx.moveTo(0, rad * 0.05); ctx.quadraticCurveTo(sx * 0.5, sy - 4, sx, sy); ctx.stroke();
    ctx.fillStyle = s % 3 === 0 ? "#fff2c6" : "#e8be58";
    ctx.beginPath(); ctx.ellipse(sx, sy, 2.0, 1.3, sa, 0, Math.PI * 2); ctx.fill();
  }

  // 第 4 层：前方低矮抱心护瓣（半掩花蕊，制造纵深真实感）
  [-0.52, 0.02, 0.54].forEach((a) => {
    drawRuffledPetal(
      Math.sin(a) * rad * 0.14,
      rad * 0.18,
      a * 0.75,
      rad * 0.36,
      rad * 0.34,
      2,
      rand()
    );
  });

  ctx.restore();
}

/* 牡丹半含花苞 */
function drawPeonyBud(ctx, x, y, rad, ang, scale, pal) {
  if (scale <= 0.02) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.scale(scale, scale);
  // 紧抱的绛红花蕾
  const bg = ctx.createLinearGradient(0, 0, 0, -rad * 1.4);
  bg.addColorStop(0, "rgba(104, 24, 42, 0.95)");
  bg.addColorStop(0.65, rgba(pal.primary, 0.92));
  bg.addColorStop(1, "rgba(248, 234, 228, 0.95)");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-rad * 0.78, -rad * 0.35, -rad * 0.64, -rad * 1.18, 0, -rad * 1.42);
  ctx.bezierCurveTo(rad * 0.64, -rad * 1.18, rad * 0.78, -rad * 0.35, 0, 0);
  ctx.closePath();
  ctx.fill();
  // 外包尖绿色萼片
  ctx.fillStyle = "rgba(34, 62, 46, 0.94)";
  [-0.42, 0.42].forEach((s) => {
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.quadraticCurveTo(s * rad * 1.5, -rad * 0.45, s * rad * 1.15, -rad * 1.02);
    ctx.quadraticCurveTo(s * rad * 0.55, -rad * 0.32, 0, 4);
    ctx.fill();
  });
  ctx.restore();
}

/* 蜀葵宽大掌状五裂叶 */
function drawHollyhockLeaf(ctx, x, y, ang, size, scale = 1) {
  if (scale <= 0.02) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.scale(scale, scale);

  const lg = ctx.createRadialGradient(size * 0.25, 0, 2, size * 0.38, 0, size);
  lg.addColorStop(0, "rgba(32, 50, 44, 0.92)");
  lg.addColorStop(0.7, "rgba(48, 70, 58, 0.86)");
  lg.addColorStop(1, "rgba(68, 86, 72, 0.76)");
  ctx.fillStyle = lg;

  // 五裂宽阔掌状叶轮廓
  const lobes = [-1.18, -0.58, 0, 0.58, 1.18];
  const lens = [0.64, 0.88, 1.0, 0.88, 0.64];
  ctx.beginPath();
  ctx.moveTo(0, 0);
  lobes.forEach((la, i) => {
    const r = size * lens[i];
    const spread = 0.28;
    const x1 = Math.cos(la - spread) * r * 0.72, y1 = Math.sin(la - spread) * r * 0.72;
    const xt = Math.cos(la) * r, yt = Math.sin(la) * r;
    const x2 = Math.cos(la + spread) * r * 0.72, y2 = Math.sin(la + spread) * r * 0.72;
    ctx.quadraticCurveTo(x1, y1, xt, yt);
    ctx.quadraticCurveTo(x2, y2, Math.cos(la + 0.3) * r * 0.46, Math.sin(la + 0.3) * r * 0.46);
  });
  ctx.closePath();
  ctx.fill();

  // 五道放射叶脉
  ctx.strokeStyle = "rgba(156, 178, 158, 0.28)";
  ctx.lineWidth = 0.85;
  lobes.forEach((la, i) => {
    const r = size * lens[i] * 0.82;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(la) * r, Math.sin(la) * r); ctx.stroke();
  });
  ctx.restore();
}

/* 精修工笔蜀葵：微侧漏斗碗形大瓣 + 皱褶边 + 放射绛紫脉纹 + 标志性细长雄蕊柱 */
function drawArtisticHollyhock(ctx, x, y, rad, pal, scale = 1, facingDir = 1, seed = 1) {
  if (scale <= 0.02) return;
  const rand = makeSeededRand(seed * 61 + 7);
  const throatDeep = { r: 92, g: 34, b: 64 };
  const petalMid = lerpColor(pal.primary, { r: 204, g: 132, b: 162 }, 0.4);
  const petalEdge = { r: 246, g: 235, b: 242 };

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // 短花梗与后方托萼
  ctx.strokeStyle = "rgba(48, 66, 52, 0.9)";
  ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.moveTo(-facingDir * rad * 0.55, rad * 0.28); ctx.quadraticCurveTo(-facingDir * rad * 0.22, rad * 0.14, 0, 0); ctx.stroke();

  // 轻微侧仰透视矩阵（避免正面大圆饼贴纸感）
  ctx.rotate(facingDir * 0.26);
  ctx.scale(0.84, 0.96);

  // 5 片宽楔形皱褶大花瓣（错落叠压）
  const angles = [-Math.PI * 0.86, -Math.PI * 0.44, -Math.PI * 0.04, Math.PI * 0.38, Math.PI * 0.78];
  angles.forEach((baseA, idx) => {
    const a = baseA + (rand() - 0.5) * 0.08;
    const len = rad * (0.94 + (idx % 2) * 0.1);
    const wid = rad * 0.62;
    ctx.save();
    ctx.rotate(a);

    const pg = ctx.createLinearGradient(0, 0, len, 0);
    pg.addColorStop(0, rgba(throatDeep, 0.95));
    pg.addColorStop(0.28, rgba(lerpColor(throatDeep, petalMid, 0.55), 0.92));
    pg.addColorStop(0.76, rgba(petalMid, 0.9));
    pg.addColorStop(1, rgba(petalEdge, 0.94));
    ctx.fillStyle = pg;

    // 宽楔形薄绸皱褶瓣廓
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(len * 0.34, -wid * 0.34, len * 0.74, -wid * 0.82, len * 0.95, -wid * 0.54);
    ctx.quadraticCurveTo(len * 1.07, -wid * 0.22, len * 0.98, 0);
    ctx.quadraticCurveTo(len * 1.06, wid * 0.24, len * 0.94, wid * 0.54);
    ctx.bezierCurveTo(len * 0.74, wid * 0.82, len * 0.34, wid * 0.34, 0, 0);
    ctx.closePath();
    ctx.fill();

    // 瓣缘细腻柔边
    ctx.strokeStyle = rgba(petalEdge, 0.36);
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // 蜀葵最具辨识度的放射状深绛脉纹
    ctx.strokeStyle = rgba(throatDeep, 0.34);
    ctx.lineWidth = 0.75;
    [-0.36, -0.18, 0, 0.18, 0.36].forEach((vy) => {
      ctx.beginPath();
      ctx.moveTo(len * 0.08, 0);
      ctx.quadraticCurveTo(len * 0.45, wid * vy * 0.55, len * 0.82, wid * vy);
      ctx.stroke();
    });
    ctx.restore();
  });

  // 深色花喉底影
  const throat = ctx.createRadialGradient(0, 0, 1, 0, 0, rad * 0.28);
  throat.addColorStop(0, "rgba(62, 18, 42, 0.92)");
  throat.addColorStop(0.7, "rgba(110, 44, 78, 0.42)");
  throat.addColorStop(1, "rgba(110, 44, 78, 0)");
  ctx.fillStyle = throat;
  ctx.beginPath(); ctx.arc(0, 0, rad * 0.28, 0, Math.PI * 2); ctx.fill();

  // 蜀葵标志性：细长微弯的乳黄合生雄蕊柱
  const colLen = rad * 0.56;
  const colEndX = facingDir * colLen;
  const colEndY = -rad * 0.14;
  ctx.strokeStyle = "#f2dfa6";
  ctx.lineWidth = Math.max(2.2, rad * 0.09);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(facingDir * colLen * 0.55, rad * 0.05, colEndX, colEndY);
  ctx.stroke();

  // 雄蕊柱外围细密乳白/淡金花粉粒
  for (let k = 0; k < 12; k++) {
    const u = 0.34 + (k / 11) * 0.62;
    const px = facingDir * colLen * u + (rand() - 0.5) * 4;
    const py = colEndY * u + (rand() - 0.5) * 6;
    ctx.fillStyle = k % 2 === 0 ? "#fff5d2" : "#e3ba64";
    ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/* 蜀葵枝顶纺锤形花苞 */
function drawHollyhockBud(ctx, x, y, size, ang, scale, pal) {
  if (scale <= 0.02) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.scale(scale, scale);
  // 淡紫红露出花蕾尖
  ctx.fillStyle = rgba(pal.primary, 0.88);
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.35);
  ctx.quadraticCurveTo(-size * 0.36, -size * 0.95, 0, -size * 1.45);
  ctx.quadraticCurveTo(size * 0.36, -size * 0.95, 0, -size * 0.35);
  ctx.fill();
  // 青绿尖萼托裹
  ctx.fillStyle = "rgba(44, 66, 52, 0.94)";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-size * 0.46, -size * 0.35, -size * 0.28, -size * 0.92);
  ctx.lineTo(0, -size * 0.62);
  ctx.lineTo(size * 0.28, -size * 0.92);
  ctx.quadraticCurveTo(size * 0.46, -size * 0.35, 0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}


/* ===== 精修四花工笔兼写意核心原语（梅花 / 水仙 / 山茶 / 荷花） ===== */

/* 苍劲多节折枝（用于老梅、山茶，带顿挫拐角与枯笔飞白） */
function drawGnarledBranch(ctx, pts, wStart, wEnd, color, progress = 1, seed = 1) {
  if (!pts || pts.length < 2 || progress <= 0.01) return;
  const rand = makeSeededRand(seed * 73 + 11);
  const segCount = pts.length - 1;
  const totalPos = Math.max(0, Math.min(1, progress)) * segCount;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (let s = 0; s < segCount; s++) {
    const segP = Math.max(0, Math.min(1, totalPos - s));
    if (segP <= 0) break;
    const p0 = pts[s], p1 = pts[s + 1];
    const subSteps = 12;
    const maxK = Math.max(1, Math.floor(subSteps * segP));
    const dx = p1.x - p0.x, dy = p1.y - p0.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;

    let ax = p0.x, ay = p0.y;
    for (let k = 1; k <= maxK; k++) {
      const f = k / subSteps;
      const gFrac = (s + f) / segCount;
      const bend = Math.sin(f * Math.PI) * (rand() - 0.5) * 6.5;
      const bx = p0.x + dx * f + nx * bend;
      const by = p0.y + dy * f + ny * bend;
      // 关节处略粗形成苍老节疤
      const knot = (k === 1 && s > 0) ? 1.24 : 1.0;
      const w = Math.max(0.9, (wStart + (wEnd - wStart) * gFrac) * knot * (0.86 + rand() * 0.24));

      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();

      // 老干边缘轻扫一道浅灰飞白，增强国画焦墨枯润感
      if (w > 4.2 && k % 2 === 0) {
        ctx.strokeStyle = "rgba(218, 224, 232, 0.10)";
        ctx.lineWidth = Math.max(0.8, w * 0.24);
        ctx.beginPath();
        ctx.moveTo(ax + nx * w * 0.24, ay + ny * w * 0.24);
        ctx.lineTo(bx + nx * w * 0.24, by + ny * w * 0.24);
        ctx.stroke();
      }
      ax = bx; ay = by;
    }
  }
  ctx.restore();
}

/* 1. 多姿态宋画写意梅花（支持 front / side / back / bud，告别统一圆点贴图） */
function drawArtisticPlum(ctx, x, y, size, pal, scale = 1, pose = "front", rot = 0, seed = 1) {
  if (scale <= 0.02) return;
  const rand = makeSeededRand(seed * 53 + 19);
  const calyxColor = "rgba(74, 34, 42, 0.94)";
  const blush = lerpColor(pal.accent, pal.primary, 0.38);
  const ivory = { r: 248, g: 240, b: 238 };

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(scale, scale);

  if (pose === "bud") {
    // 紧抱朱砂小花蕾 + 紫褐花萼
    ctx.fillStyle = calyxColor;
    ctx.beginPath(); ctx.ellipse(0, size * 0.16, size * 0.34, size * 0.26, 0, 0, Math.PI * 2); ctx.fill();
    const bg = ctx.createRadialGradient(-size * 0.08, -size * 0.18, 1, 0, -size * 0.12, size * 0.42);
    bg.addColorStop(0, rgba(pal.primary, 0.96));
    bg.addColorStop(0.58, rgba(pal.accent, 0.95));
    bg.addColorStop(1, "rgba(128, 32, 46, 0.95)");
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(-size * 0.26, size * 0.08);
    ctx.bezierCurveTo(-size * 0.38, -size * 0.24, -size * 0.18, -size * 0.56, 0, -size * 0.58);
    ctx.bezierCurveTo(size * 0.18, -size * 0.56, size * 0.38, -size * 0.24, size * 0.26, size * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return;
  }

  const drawPlumPetal = (px, py, ang, rx, ry, alpha = 0.94) => {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(ang);
    const pg = ctx.createRadialGradient(-rx * 0.35, 0, 1, 0, 0, Math.max(rx, ry) * 1.15);
    pg.addColorStop(0, rgba(blush, alpha * 0.88));
    pg.addColorStop(0.48, rgba(pal.primary, alpha * 0.94));
    pg.addColorStop(0.88, rgba(ivory, alpha * 0.96));
    pg.addColorStop(1, rgba(ivory, alpha * 0.82));
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.ellipse(rx * 0.42, 0, rx * 0.58, ry * 0.54, 0, 0, Math.PI * 2);
    ctx.fill();
    // 极轻素墨勾瓣边，去塑料渐变感
    ctx.strokeStyle = rgba(ivory, 0.28);
    ctx.lineWidth = 0.65;
    ctx.stroke();
    ctx.restore();
  };

  if (pose === "side") {
    // 侧面杯状梅花：侧出紫褐花萼 + 3 片舒展侧瓣 + 探出花丝
    const petals = [
      { a: -0.62, rx: size * 0.72, ry: size * 0.54, al: 0.84 },
      { a: 0.62,  rx: size * 0.72, ry: size * 0.54, al: 0.84 },
      { a: -0.05, rx: size * 0.86, ry: size * 0.66, al: 0.95 },
    ];
    petals.forEach((pt) => drawPlumPetal(0, 0, pt.a + (rand() - 0.5) * 0.08, pt.rx, pt.ry, pt.al));
    // 细韧探出的金黄花丝
    ctx.strokeStyle = "rgba(232, 206, 152, 0.84)";
    ctx.lineWidth = 0.75;
    for (let s = 0; s < 7; s++) {
      const sa = -0.58 + (s / 6) * 1.16;
      const sl = size * (0.58 + rand() * 0.28);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(Math.cos(sa) * sl * 0.55, Math.sin(sa) * sl * 0.55 - 2, Math.cos(sa) * sl, Math.sin(sa) * sl);
      ctx.stroke();
      ctx.fillStyle = "#f4dca2";
      ctx.beginPath(); ctx.arc(Math.cos(sa) * sl, Math.sin(sa) * sl, 1.15, 0, Math.PI * 2); ctx.fill();
    }
    // 侧视花托与萼片
    ctx.fillStyle = calyxColor;
    ctx.beginPath();
    ctx.moveTo(-size * 0.34, 0);
    ctx.quadraticCurveTo(-size * 0.04, -size * 0.26, size * 0.22, -size * 0.22);
    ctx.quadraticCurveTo(size * 0.06, 0, size * 0.22, size * 0.22);
    ctx.quadraticCurveTo(-size * 0.04, size * 0.26, -size * 0.34, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return;
  }

  if (pose === "back") {
    // 背花：花瓣在后、五裂紫褐花萼与短蒂在前（宋画墨梅点睛笔法）
    ctx.scale(0.92, 0.82);
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2 + (rand() - 0.5) * 0.14;
      drawPlumPetal(0, 0, a, size * (0.78 + rand() * 0.1), size * 0.66, 0.84);
    }
    ctx.fillStyle = calyxColor;
    for (let c = 0; c < 5; c++) {
      const ca = (c / 5) * Math.PI * 2 + 0.32;
      ctx.beginPath();
      ctx.ellipse(Math.cos(ca) * size * 0.20, Math.sin(ca) * size * 0.20, size * 0.20, size * 0.11, ca, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(42, 22, 26, 0.96)";
    ctx.beginPath(); ctx.arc(0, 0, size * 0.14, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return;
  }

  // front：3/4 微倾自然梅花（椭圆透视压扁，花瓣大小有细微变化）
  ctx.scale(1.0, 0.86);
  for (let p = 0; p < 5; p++) {
    const a = (p / 5) * Math.PI * 2 + (rand() - 0.5) * 0.15;
    const rx = size * (0.82 + (rand() - 0.5) * 0.16);
    const ry = size * (0.68 + (rand() - 0.5) * 0.14);
    drawPlumPetal(Math.cos(a) * size * 0.08, Math.sin(a) * size * 0.08, a, rx, ry, 0.92);
  }
  // 淡赭花心 + 错落长短弯丝花蕊
  ctx.fillStyle = "rgba(116, 42, 48, 0.65)";
  ctx.beginPath(); ctx.arc(0, 0, size * 0.14, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(238, 214, 158, 0.84)";
  ctx.lineWidth = 0.72;
  for (let s = 0; s < 10; s++) {
    const sa = (s / 10) * Math.PI * 2 + (rand() - 0.5) * 0.2;
    const sl = size * (0.34 + rand() * 0.20);
    const cx = Math.cos(sa + 0.14) * sl * 0.55;
    const cy = Math.sin(sa + 0.14) * sl * 0.55;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(cx, cy, Math.cos(sa) * sl, Math.sin(sa) * sl); ctx.stroke();
    ctx.fillStyle = s % 3 === 0 ? "#fff2cc" : "#e8c474";
    ctx.beginPath(); ctx.arc(Math.cos(sa) * sl, Math.sin(sa) * sl, 1.15, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/* 2. 工笔水仙：柔韧带状剑叶 + 洁白鳞茎 + 伞形多花序与立体金盏副冠 */
function drawNarcissusBlade(ctx, x0, y0, x1, y1, x2, y2, width, tone = 0, progress = 1) {
  if (progress <= 0.02) return;
  const steps = 18, maxS = Math.max(2, Math.floor(steps * Math.min(1, progress)));
  const leftPts = [], rightPts = [];
  for (let i = 0; i <= maxS; i++) {
    const t = i / steps;
    const pt = evalQuad({ x: x0, y: y0 }, { x: x1, y: y1 }, { x: x2, y: y2 }, t);
    const tlen = Math.hypot(pt.tx, pt.ty) || 1;
    const nx = -pt.ty / tlen, ny = pt.tx / tlen;
    // 水仙叶基部窄、中段宽厚、叶尖圆润微尖
    const halfW = width * 0.5 * (0.48 + 0.52 * Math.sin(Math.pow(t, 0.72) * Math.PI));
    leftPts.push({ x: pt.x + nx * halfW, y: pt.y + ny * halfW });
    rightPts.push({ x: pt.x - nx * halfW, y: pt.y - ny * halfW });
  }
  ctx.save();
  const lg = ctx.createLinearGradient(x0, y0, x2, y2);
  if (tone === 0) {
    lg.addColorStop(0, "rgba(196, 212, 194, 0.52)");
    lg.addColorStop(0.22, "rgba(56, 98, 92, 0.88)");
    lg.addColorStop(0.75, "rgba(74, 122, 112, 0.88)");
    lg.addColorStop(1, "rgba(104, 146, 134, 0.84)");
  } else {
    lg.addColorStop(0, "rgba(168, 192, 180, 0.45)");
    lg.addColorStop(0.25, "rgba(38, 72, 70, 0.86)");
    lg.addColorStop(1, "rgba(58, 102, 96, 0.82)");
  }
  ctx.fillStyle = lg;
  ctx.beginPath();
  leftPts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  for (let i = rightPts.length - 1; i >= 0; i--) ctx.lineTo(rightPts[i].x, rightPts[i].y);
  ctx.closePath();
  ctx.fill();

  // 叶片微明折脊线，塑造丝带立体感
  ctx.strokeStyle = "rgba(182, 216, 206, 0.24)";
  ctx.lineWidth = 0.85;
  ctx.beginPath();
  for (let i = 0; i <= maxS; i++) {
    const t = i / steps;
    const pt = evalQuad({ x: x0, y: y0 }, { x: x1, y: y1 }, { x: x2, y: y2 }, t);
    if (i === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawNarcissusBulb(ctx, x, y, scale = 1) {
  if (scale <= 0.02) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  // 洁白细须根轻浸水中
  ctx.strokeStyle = "rgba(222, 232, 228, 0.36)";
  ctx.lineWidth = 0.9;
  for (let i = -5; i <= 5; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 4.5, 10);
    ctx.quadraticCurveTo(i * 6.5, 22, i * 8 + Math.sin(i) * 4, 34 + (Math.abs(i) % 3) * 4);
    ctx.stroke();
  }
  // 饱满主鳞茎与两侧子球（传统水仙工笔必备）
  [[-26, 4, 18, 14], [26, 5, 17, 13], [0, 0, 28, 22]].forEach(([bx, by, rx, ry], idx) => {
    const bg = ctx.createRadialGradient(bx - rx * 0.25, by - ry * 0.25, 2, bx, by, rx * 1.2);
    bg.addColorStop(0, "rgba(238, 236, 224, 0.88)");
    bg.addColorStop(0.68, "rgba(176, 184, 170, 0.78)");
    bg.addColorStop(1, "rgba(92, 106, 98, 0.72)");
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.ellipse(bx, by, rx, ry, idx === 0 ? -0.2 : idx === 1 ? 0.2 : 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(244, 244, 234, 0.25)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  });
  ctx.restore();
}

function drawSingleNarcissusBloom(ctx, x, y, size, pal, scale = 1, tilt = 0.25, dir = 1, seed = 1) {
  if (scale <= 0.02) return;
  const rand = makeSeededRand(seed * 41 + 9);
  const ivory = { r: 246, g: 250, b: 252 };
  const coolShade = { r: 162, g: 192, b: 204 };

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // 细嫩弯曲小花梗 + 浅绿子房花管
  ctx.strokeStyle = "rgba(86, 132, 118, 0.88)";
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(-dir * size * 0.52, size * 0.32);
  ctx.quadraticCurveTo(-dir * size * 0.22, size * 0.14, 0, 0);
  ctx.stroke();

  // 透视倾斜（告别正面米字星号贴纸！）
  ctx.rotate(tilt);
  ctx.scale(0.84, 0.94);

  // 外三片 + 内三片错开微卷的玉白花被片
  const order = [0, 2, 4, 1, 3, 5];
  order.forEach((p) => {
    const isOuter = p % 2 === 0;
    const a = (p / 6) * Math.PI * 2 - Math.PI / 6 + (rand() - 0.5) * 0.08;
    const len = size * (isOuter ? 1.0 : 0.92);
    const wid = size * (isOuter ? 0.36 : 0.33);
    ctx.save();
    ctx.rotate(a);
    const pg = ctx.createLinearGradient(0, 0, len, 0);
    pg.addColorStop(0, rgba(coolShade, isOuter ? 0.85 : 0.72));
    pg.addColorStop(0.28, rgba(ivory, 0.95));
    pg.addColorStop(0.82, "rgba(255, 255, 255, 0.96)");
    pg.addColorStop(1, rgba(coolShade, 0.76));
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(len * 0.30, -wid * 0.92, len * 0.76, -wid * 0.88, len, 0);
    ctx.bezierCurveTo(len * 0.76, wid * 0.88, len * 0.30, wid * 0.92, 0, 0);
    ctx.closePath();
    ctx.fill();
    // 玉瓣中脉微阴与柔边
    ctx.strokeStyle = rgba(coolShade, 0.34);
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(len * 0.12, 0); ctx.lineTo(len * 0.82, 0); ctx.stroke();
    ctx.restore();
  });

  // 立体金盏杯状副冠（带杯壁阴影、波浪金边与深橘杯口）
  const cupR = size * 0.30;
  const cupOffX = dir * size * 0.06;
  const cupOffY = -size * 0.03;

  // 杯身外侧微暗金影
  const cupOuter = ctx.createRadialGradient(cupOffX - cupR * 0.25, cupOffY - cupR * 0.25, 1, cupOffX, cupOffY, cupR * 1.15);
  cupOuter.addColorStop(0, "#ffe484");
  cupOuter.addColorStop(0.62, "#e0ae3c");
  cupOuter.addColorStop(1, "#a66d1c");
  ctx.fillStyle = cupOuter;
  ctx.beginPath();
  for (let i = 0; i <= 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const wave = 1 + Math.sin(a * 6) * 0.08;
    const px = cupOffX + Math.cos(a) * cupR * wave;
    const py = cupOffY + Math.sin(a) * cupR * 0.84 * wave;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // 杯内暗窝与一点淡绿花心
  const cupIn = ctx.createRadialGradient(cupOffX + dir * 2, cupOffY, 1, cupOffX, cupOffY, cupR * 0.65);
  cupIn.addColorStop(0, "rgba(136, 78, 16, 0.88)");
  cupIn.addColorStop(0.75, "rgba(214, 152, 42, 0.55)");
  cupIn.addColorStop(1, "rgba(255, 232, 144, 0)");
  ctx.fillStyle = cupIn;
  ctx.beginPath(); ctx.ellipse(cupOffX + dir * 1.5, cupOffY, cupR * 0.64, cupR * 0.52, 0, 0, Math.PI * 2); ctx.fill();

  // 杯口亮金提边 + 三点细蕊
  ctx.strokeStyle = "rgba(255, 246, 198, 0.78)";
  ctx.lineWidth = 0.95;
  ctx.beginPath(); ctx.ellipse(cupOffX, cupOffY, cupR * 0.96, cupR * 0.80, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "#fff8d8";
  for (let k = 0; k < 3; k++) {
    const ka = (k / 3) * Math.PI * 2;
    ctx.beginPath(); ctx.arc(cupOffX + Math.cos(ka) * 2.8, cupOffY + Math.sin(ka) * 2.2, 1.1, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawNarcissusStemCluster(ctx, x0, y0, x1, y1, x2, y2, size, pal, g, dir = 1, seed = 1) {
  const stemG = easeOutCubic(Math.min(1, g * 1.35));
  if (stemG <= 0.02) return;
  // 淡青柔韧花葶
  drawNarcissusBlade(ctx, x0, y0, x1, y1, x2, y2, 5.4, 1, stemG);
  const headG = easeOutCubic(Math.max(0, (g - 0.22) * 1.65));
  if (headG <= 0.02) return;

  // 纸质半透明佛焰苞（水仙花葶顶端标志特征）
  ctx.save();
  ctx.translate(x2, y2);
  ctx.scale(headG, headG);
  ctx.fillStyle = "rgba(212, 200, 174, 0.44)";
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.quadraticCurveTo(-dir * 12, -10, -dir * 4, -26);
  ctx.quadraticCurveTo(dir * 8, -10, 4, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 一茎抽出 3 朵高低错落、姿态微垂的伞形花序
  drawSingleNarcissusBloom(ctx, x2 + dir * size * 0.62, y2 - size * 0.10, size * 0.82, pal, headG, dir * 0.42, dir, seed + 1);
  drawSingleNarcissusBloom(ctx, x2 - dir * size * 0.42, y2 - size * 0.56, size * 0.86, pal, headG, -dir * 0.28, -dir, seed + 2);
  drawSingleNarcissusBloom(ctx, x2 + dir * size * 0.16, y2 - size * 0.92, size, pal, headG, dir * 0.18, dir, seed + 3);
}

/* 3. 工笔重瓣山茶（蜡质厚叶 + 叠瓦心形红瓣 + 疏密折枝，告别一排红甜甜圈） */
function drawCamelliaLeaf(ctx, x, y, ang, len, wid, scale = 1, hasSnow = false) {
  if (scale <= 0.02) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.scale(scale, scale);

  const lg = ctx.createLinearGradient(0, -wid, len, wid);
  lg.addColorStop(0, "rgba(14, 42, 28, 0.96)");
  lg.addColorStop(0.55, "rgba(26, 68, 44, 0.94)");
  lg.addColorStop(1, "rgba(44, 88, 56, 0.90)");
  ctx.fillStyle = lg;

  // 椭圆形革质厚叶（微微尖头）
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(len * 0.22, -wid * 1.05, len * 0.72, -wid * 0.98, len, 0);
  ctx.bezierCurveTo(len * 0.72, wid * 0.98, len * 0.22, wid * 1.05, 0, 0);
  ctx.closePath();
  ctx.fill();

  // 革质叶面微高光 + 清晰浅绿主侧脉
  ctx.strokeStyle = "rgba(146, 186, 148, 0.34)";
  ctx.lineWidth = 1.0;
  ctx.beginPath(); ctx.moveTo(3, 0); ctx.lineTo(len * 0.88, 0); ctx.stroke();
  ctx.lineWidth = 0.65;
  for (let i = 1; i <= 4; i++) {
    const u = i * 0.18;
    ctx.beginPath();
    ctx.moveTo(len * u, 0); ctx.quadraticCurveTo(len * (u + 0.08), -wid * 0.45, len * (u + 0.16), -wid * 0.65);
    ctx.moveTo(len * u, 0); ctx.quadraticCurveTo(len * (u + 0.08), wid * 0.45, len * (u + 0.16), wid * 0.65);
    ctx.stroke();
  }

  // 冬庭山茶叶面轻覆薄雪
  if (hasSnow) {
    ctx.fillStyle = "rgba(244, 248, 250, 0.42)";
    ctx.beginPath();
    ctx.ellipse(len * 0.44, -wid * 0.28, len * 0.28, wid * 0.26, -0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawArtisticCamellia(ctx, x, y, rad, pal, scale = 1, tilt = 0.16, seed = 1) {
  if (scale <= 0.02) return;
  const rand = makeSeededRand(seed * 89 + 5);
  const deepRed = { r: 108, g: 18, b: 30 };
  const vermilion = lerpColor(pal.primary, { r: 218, g: 64, b: 74 }, 0.55);
  const petalRim = { r: 248, g: 162, b: 164 };

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.scale(scale, scale * 0.90);

  // 底层微暗投影托出立体厚重感
  const sh = ctx.createRadialGradient(0, rad * 0.08, rad * 0.15, 0, rad * 0.08, rad * 1.05);
  sh.addColorStop(0, "rgba(20, 8, 10, 0.45)");
  sh.addColorStop(1, "rgba(20, 8, 10, 0)");
  ctx.fillStyle = sh;
  ctx.beginPath(); ctx.arc(0, rad * 0.08, rad * 1.05, 0, Math.PI * 2); ctx.fill();

  // 山茶标志性的倒心形微凹厚瓣
  const drawWaxyPetal = (ang, len, wid, layer) => {
    ctx.save();
    ctx.rotate(ang);
    const pg = ctx.createLinearGradient(0, 0, len, 0);
    if (layer === 0) {
      pg.addColorStop(0, rgba(deepRed, 0.96));
      pg.addColorStop(0.55, rgba(lerpColor(deepRed, vermilion, 0.72), 0.95));
      pg.addColorStop(1, rgba(vermilion, 0.94));
    } else if (layer === 1) {
      pg.addColorStop(0, rgba(deepRed, 0.95));
      pg.addColorStop(0.45, rgba(vermilion, 0.96));
      pg.addColorStop(0.92, rgba(petalRim, 0.94));
      pg.addColorStop(1, "rgba(254, 198, 198, 0.94)");
    } else {
      pg.addColorStop(0, "rgba(92, 12, 22, 0.96)");
      pg.addColorStop(0.50, rgba(vermilion, 0.96));
      pg.addColorStop(1, rgba(petalRim, 0.96));
    }
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.moveTo(0, -wid * 0.16);
    ctx.bezierCurveTo(len * 0.36, -wid * 0.88, len * 0.94, -wid * 0.82, len * 0.98, -wid * 0.16);
    // 心形浅凹瓣顶
    ctx.quadraticCurveTo(len * 0.90, 0, len * 0.98, wid * 0.16);
    ctx.bezierCurveTo(len * 0.94, wid * 0.82, len * 0.36, wid * 0.88, 0, wid * 0.16);
    ctx.closePath();
    ctx.fill();

    // 瓣间暗线与蜡质反光边
    ctx.strokeStyle = layer === 2 ? "rgba(255, 212, 210, 0.38)" : "rgba(74, 10, 18, 0.38)";
    ctx.lineWidth = 0.85;
    ctx.stroke();
    ctx.restore();
  };

  // 4 层叠瓦交错厚瓣（从外到内旋转错位，绝非同心圆圈）
  const layers = [
    { cnt: 7, r: rad * 1.00, w: rad * 0.56, offset: 0.12, idx: 0 },
    { cnt: 7, r: rad * 0.78, w: rad * 0.48, offset: 0.58, idx: 1 },
    { cnt: 6, r: rad * 0.56, w: rad * 0.38, offset: 0.25, idx: 1 },
    { cnt: 5, r: rad * 0.36, w: rad * 0.28, offset: 0.82, idx: 2 },
  ];
  layers.forEach((ly) => {
    for (let i = 0; i < ly.cnt; i++) {
      const a = (i / ly.cnt) * Math.PI * 2 + ly.offset + (rand() - 0.5) * 0.16;
      drawWaxyPetal(a, ly.r * (0.94 + rand() * 0.12), ly.w, ly.idx);
    }
  });

  // 深绛花心仅露出点点细密金蕊（不画成大黄圆饼）
  ctx.fillStyle = "rgba(84, 12, 22, 0.92)";
  ctx.beginPath(); ctx.arc(0, 0, rad * 0.15, 0, Math.PI * 2); ctx.fill();
  for (let s = 0; s < 11; s++) {
    const sa = (s / 11) * Math.PI * 2 + rand() * 0.3;
    const sr = rad * (0.05 + rand() * 0.11);
    ctx.fillStyle = s % 2 === 0 ? "#fae29e" : "#dfa946";
    ctx.beginPath(); ctx.arc(Math.cos(sa) * sr, Math.sin(sa) * sr, 1.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawCamelliaBud(ctx, x, y, rad, ang, scale, pal) {
  if (scale <= 0.02) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.scale(scale, scale);
  // 紧实圆形红蕾
  const bg = ctx.createRadialGradient(-rad * 0.2, -rad * 0.55, 2, 0, -rad * 0.48, rad * 0.9);
  bg.addColorStop(0, "#f27a82");
  bg.addColorStop(0.55, rgba(pal.primary, 0.96));
  bg.addColorStop(1, "rgba(104, 16, 28, 0.96)");
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.ellipse(0, -rad * 0.56, rad * 0.58, rad * 0.68, 0, 0, Math.PI * 2); ctx.fill();
  // 层叠绿褐鳞片萼托
  ctx.fillStyle = "rgba(42, 68, 44, 0.95)";
  [-0.36, 0, 0.36].forEach((ox) => {
    ctx.beginPath(); ctx.ellipse(ox * rad, -rad * 0.14, rad * 0.34, rad * 0.24, ox * 0.5, 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();
}

/* 4. 工笔写意荷花与舒卷荷叶（告别几何椭圆+辐条与尖刺扇面） */
function drawArtisticLotusPad(ctx, x, y, rx, ry, rot = -0.06, scale = 1, seed = 1) {
  if (scale <= 0.02) return;
  const rand = makeSeededRand(seed * 67 + 3);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(scale, scale);

  // 波浪起伏的自然有机荷叶轮廓（带叶缺口）
  const segs = 44;
  const pts = [];
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const wave = 1 + Math.sin(a * 7 + seed) * 0.055 + Math.cos(a * 11 - seed * 0.5) * 0.032;
    // 前侧一处轻微荷叶自然V形缺口
    const notchDiff = Math.abs(((a - 1.35 + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    const notch = notchDiff < 0.24 ? (1 - (0.24 - notchDiff) * 0.85) : 1;
    pts.push({ x: Math.cos(a) * rx * wave * notch, y: Math.sin(a) * ry * wave * notch, a });
  }

  // 叶面深花青与石绿水墨晕染（中心微亮、叶缘沉厚）
  const pg = ctx.createRadialGradient(-rx * 0.12, -ry * 0.16, rx * 0.05, 0, 0, rx * 1.05);
  pg.addColorStop(0, "rgba(74, 118, 98, 0.88)");
  pg.addColorStop(0.45, "rgba(34, 78, 66, 0.90)");
  pg.addColorStop(0.86, "rgba(20, 54, 48, 0.92)");
  pg.addColorStop(1, "rgba(56, 86, 72, 0.86)");

  ctx.beginPath();
  pts.forEach((p, i) => {
    const next = pts[(i + 1) % segs];
    const mx = (p.x + next.x) * 0.5, my = (p.y + next.y) * 0.5;
    if (i === 0) ctx.moveTo(mx, my);
    else ctx.quadraticCurveTo(p.x, p.y, mx, my);
  });
  ctx.closePath();
  ctx.fillStyle = pg;
  ctx.fill();

  // 上翻的淡青灰叶背折边（宋画荷叶点睛立体感）
  ctx.fillStyle = "rgba(116, 152, 134, 0.58)";
  ctx.beginPath();
  ctx.moveTo(-rx * 0.72, -ry * 0.42);
  ctx.quadraticCurveTo(-rx * 0.15, -ry * 1.18, rx * 0.54, -ry * 0.56);
  ctx.quadraticCurveTo(-rx * 0.05, -ry * 0.82, -rx * 0.72, -ry * 0.42);
  ctx.closePath();
  ctx.fill();

  // 叶脐（偏心微黄绿凹点）与柔和弯曲分叉叶脉（绝非笔直辐条）
  const cx = -rx * 0.06, cy = -ry * 0.08;
  for (let v = 0; v < 11; v++) {
    const a = (v / 11) * Math.PI * 2 + (rand() - 0.5) * 0.16;
    const lenR = 0.82 + rand() * 0.08;
    const tx = Math.cos(a) * rx * lenR, ty = Math.sin(a) * ry * lenR;
    const mx = cx + (tx - cx) * 0.52 + Math.sin(a * 3) * 8;
    const my = cy + (ty - cy) * 0.52 + Math.cos(a * 2) * 4;
    const vg = ctx.createLinearGradient(cx, cy, tx, ty);
    vg.addColorStop(0, "rgba(174, 206, 174, 0.34)");
    vg.addColorStop(0.7, "rgba(132, 174, 152, 0.16)");
    vg.addColorStop(1, "rgba(132, 174, 152, 0)");
    ctx.strokeStyle = vg;
    ctx.lineWidth = 0.95;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.quadraticCurveTo(mx, my, tx, ty); ctx.stroke();

    // 末梢小分叉叶脉
    if (v % 2 === 0) {
      const bx = cx + (tx - cx) * 0.66, by = cy + (ty - cy) * 0.66;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(Math.cos(a + 0.14) * rx * 0.86, Math.sin(a + 0.14) * ry * 0.86);
      ctx.stroke();
    }
  }
  ctx.fillStyle = "rgba(168, 198, 154, 0.65)";
  ctx.beginPath(); ctx.ellipse(cx, cy, 5.5, 3.0, 0, 0, Math.PI * 2); ctx.fill();

  // 叶缘微焦赭勾边
  ctx.strokeStyle = "rgba(128, 162, 142, 0.24)";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  pts.forEach((p, i) => {
    const next = pts[(i + 1) % segs];
    const mx = (p.x + next.x) * 0.5, my = (p.y + next.y) * 0.5;
    if (i === 0) ctx.moveTo(mx, my);
    else ctx.quadraticCurveTo(p.x, p.y, mx, my);
  });
  ctx.closePath();
  ctx.stroke();

  ctx.restore();
}

/* 卷筒状嫩荷叶（小荷才露尖尖角，打破大叶单调感） */
function drawRolledLotusLeaf(ctx, x, y, len, ang, scale = 1) {
  if (scale <= 0.02) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.scale(scale, scale);
  const rg = ctx.createLinearGradient(-len * 0.45, 0, len * 0.45, 0);
  rg.addColorStop(0, "rgba(42, 86, 68, 0.90)");
  rg.addColorStop(0.5, "rgba(96, 138, 114, 0.88)");
  rg.addColorStop(1, "rgba(32, 68, 56, 0.92)");
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.moveTo(-len * 0.55, -8);
  ctx.quadraticCurveTo(0, -18, len * 0.52, -6);
  ctx.quadraticCurveTo(len * 0.28, 12, 0, 10);
  ctx.quadraticCurveTo(-len * 0.28, 12, -len * 0.55, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(164, 198, 174, 0.26)";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore();
}

/* 立体工笔重瓣荷花（舟形柔和宽瓣 + 胭脂尖晕染 + 嫩绿莲蓬 + 一圈金须） */
function drawArtisticLotus(ctx, x, y, rad, pal, scale = 1, openAmt = 1, seed = 1) {
  if (scale <= 0.02) return;
  const rand = makeSeededRand(seed * 71 + 17);
  const tipCrimson = { r: 214, g: 82, b: 118 };
  const midPink = lerpColor(pal.primary, { r: 242, g: 186, b: 202 }, 0.45);
  const baseJade = { r: 242, g: 248, b: 238 };

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  const drawLotusPetal = (rot, len, wid, alpha, curveDir = 0) => {
    ctx.save();
    ctx.rotate(rot);
    const pg = ctx.createLinearGradient(0, 0, 0, -len);
    pg.addColorStop(0, rgba(baseJade, alpha * 0.95));
    pg.addColorStop(0.42, rgba(midPink, alpha * 0.94));
    pg.addColorStop(0.84, rgba(tipCrimson, alpha * 0.94));
    pg.addColorStop(1, "rgba(182, 54, 92, 0.96)");
    ctx.fillStyle = pg;

    // 饱满舟形荷瓣（中腹圆润、瓣尖收得自然不尖锐）
    ctx.beginPath();
    ctx.moveTo(-wid * 0.24, 0);
    ctx.bezierCurveTo(-wid * 0.92 + curveDir * 6, -len * 0.34, -wid * 0.72 + curveDir * 8, -len * 0.80, curveDir * 4, -len);
    ctx.bezierCurveTo(wid * 0.72 + curveDir * 8, -len * 0.80, wid * 0.92 + curveDir * 6, -len * 0.34, wid * 0.24, 0);
    ctx.closePath();
    ctx.fill();

    // 淡红细密顺瓣脉纹 + 素雅柔边
    ctx.strokeStyle = "rgba(255, 240, 245, 0.34)";
    ctx.lineWidth = 0.75;
    ctx.stroke();
    ctx.strokeStyle = "rgba(196, 74, 108, 0.22)";
    ctx.lineWidth = 0.65;
    [-0.28, 0, 0.28].forEach((v) => {
      ctx.beginPath();
      ctx.moveTo(v * wid * 0.3, -len * 0.08);
      ctx.quadraticCurveTo(v * wid * 0.65, -len * 0.48, curveDir * 3 + v * wid * 0.14, -len * 0.88);
      ctx.stroke();
    });
    ctx.restore();
  };

  // 花苞模式（openAmt < 0.4）
  if (openAmt < 0.42) {
    drawLotusPetal(-0.18, rad * 0.92, rad * 0.34, 0.86, -0.5);
    drawLotusPetal(0.18, rad * 0.92, rad * 0.34, 0.86, 0.5);
    drawLotusPetal(0, rad * 1.02, rad * 0.38, 0.98, 0);
    ctx.restore();
    return;
  }

  const sp = 0.65 + 0.35 * openAmt;
  // 1. 后层舒展外瓣（左右错开微垂）
  [-1.24, -0.82, -0.36, 0.04, 0.42, 0.86, 1.26].forEach((a, i) => {
    drawLotusPetal(a * sp + (rand() - 0.5) * 0.05, rad * (0.86 + (i === 3 ? 0.12 : 0.04)), rad * 0.33, 0.84, Math.sign(a) * 0.5);
  });

  // 2. 中层托起瓣
  [-0.92, -0.48, 0.0, 0.48, 0.94].forEach((a, i) => {
    drawLotusPetal(a * sp * 0.85, rad * (0.82 + (i === 2 ? 0.10 : 0.02)), rad * 0.32, 0.92, Math.sign(a) * 0.3);
  });

  // 3. 真实嫩绿倒圆锥莲蓬 + 莲子孔 + 环绕金黄莲须
  const podY = -rad * 0.34;
  const podG = ctx.createLinearGradient(0, podY - 12, 0, 0);
  podG.addColorStop(0, "rgba(182, 204, 128, 0.95)");
  podG.addColorStop(1, "rgba(92, 134, 78, 0.95)");
  ctx.fillStyle = podG;
  ctx.beginPath();
  ctx.moveTo(-rad * 0.16, podY);
  ctx.lineTo(rad * 0.16, podY);
  ctx.quadraticCurveTo(rad * 0.10, -rad * 0.10, 0, -2);
  ctx.quadraticCurveTo(-rad * 0.10, -rad * 0.10, -rad * 0.16, podY);
  ctx.closePath();
  ctx.fill();

  // 莲蓬顶面与点点莲子
  ctx.fillStyle = "rgba(216, 224, 146, 0.96)";
  ctx.beginPath(); ctx.ellipse(0, podY, rad * 0.16, rad * 0.065, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(116, 146, 72, 0.82)";
  [[-0.08, 0], [0, -0.02], [0.08, 0], [-0.04, 0.025], [0.05, 0.025]].forEach(([dx, dy]) => {
    ctx.beginPath(); ctx.arc(dx * rad, podY + dy * rad, 1.6, 0, Math.PI * 2); ctx.fill();
  });

  // 细密环绕莲须
  ctx.strokeStyle = "rgba(242, 206, 108, 0.84)";
  ctx.lineWidth = 0.75;
  for (let s = 0; s < 16; s++) {
    const frac = (s / 15) * 2 - 1;
    const sx = frac * rad * 0.28;
    const sy = -rad * (0.28 + (1 - Math.abs(frac)) * 0.14 + rand() * 0.06);
    ctx.beginPath(); ctx.moveTo(frac * rad * 0.08, -rad * 0.10); ctx.quadraticCurveTo(sx * 0.9, sy + 6, sx, sy); ctx.stroke();
    ctx.fillStyle = "#fce292";
    ctx.beginPath(); ctx.arc(sx, sy, 1.35, 0, Math.PI * 2); ctx.fill();
  }

  // 4. 前层微掩花心的抱合瓣（制造前后立体层次）
  [-0.54, 0.02, 0.56].forEach((a) => {
    drawLotusPetal(a * sp * 0.65, rad * 0.54, rad * 0.30, 0.95, -Math.sign(a) * 0.35);
  });

  ctx.restore();
}
