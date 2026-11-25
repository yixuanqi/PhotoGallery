(() => {
  const CB = window.CB;

  // 云海空中花房 · 减法精修版：
  // 第1关(friction): 仅露水滑道 + 台球木箱 + 秘露瓶 + 菌伞/弹柱
  // 第2关(gravity):  仅浮空星轨仪 + 日光折射棱镜 + 玻璃花架/弹柱
  // 第3关(stealth):  仅花粉隐身花苞 + 共鸣风铃串 + 向日葵花闸 + 花坛掩体
  // 第4关(fusion):   支路各自纯净，2×2大中庭与最终花穹金库进行双物理融合终极考题

  const PLANTER_PALETTES = [
    { leaf: '#5ca878', leafDark: '#3f7d58', bloom: '#ff8da1', title: '云绒花' },
    { leaf: '#539e85', leafDark: '#387362', bloom: '#ffd859', title: '日光葵' },
    { leaf: '#62a868', leafDark: '#417848', bloom: '#7bc6f2', title: '风铃草' },
    { leaf: '#4d967c', leafDark: '#336b58', bloom: '#c89cf2', title: '星露兰' },
    { leaf: '#6ab072', leafDark: '#46824e', bloom: '#ffad70', title: '晴空蕨' },
  ];

  const BIOME_DEW_COLORS = {
    sun_glasshouse: ['#f2a649', '#48bfd4'],
    lotus_pond: ['#3cb6c9', '#56c2a8'],
    ancient_vine: ['#e06c88', '#8d75c9'],
  };

  function pick(arr, rng) {
    return arr[Math.floor(rng() * arr.length)];
  }

  function makeBook(cx, cy, w, h, rng) {
    const pal = pick(PLANTER_PALETTES, rng);
    return {
      type: 'book',
      shape: 'rect',
      x: cx - w / 2,
      y: cy - h / 2,
      w,
      h,
      height: 26 + Math.floor(rng() * 6),
      color: pal.leaf,
      spine: pal.leafDark,
      bloom: pal.bloom,
      title: pal.title,
      seed: Math.floor(rng() * 9999),
      bounce: 0.72,
      destructible: false,
    };
  }

  function makeEraser(cx, cy, w, h) {
    return {
      type: 'eraser',
      shape: 'rect',
      x: cx - w / 2,
      y: cy - h / 2,
      w,
      h,
      height: 24,
      bounce: 1.55,
      hitFlash: 0,
      destructible: false,
    };
  }

  function makeRuler(cx, cy, w, h) {
    return {
      type: 'ruler',
      shape: 'rect',
      x: cx - w / 2,
      y: cy - h / 2,
      w,
      h,
      height: 14,
      bounce: 0.75,
      destructible: false,
    };
  }

  function makeCrate(cx, cy, size = 44, opts = {}) {
    return {
      type: 'crate',
      shape: 'rect',
      x: cx - size / 2,
      y: cy - size / 2,
      w: size,
      h: size * 0.86,
      height: 25,
      vx: 0,
      vy: 0,
      mass: 1.0,
      sliding: false,
      onDewSlide: false,
      slideBounceCount: 0,
      slideSoundTimer: 0,
      trail: [],
      keepExactPos: !!opts.keepExactPos,
      bounce: 0.72,
      destructible: true,
      hp: 76,
      maxHp: 76,
      hitFlash: 0,
      wobble: 0,
      broken: false,
    };
  }

  function makeChest(cx, cy, isGiant = false, opts = {}) {
    const w = isGiant ? 88 : 60;
    const h = isGiant ? 56 : 40;
    return {
      type: 'chest',
      shape: 'rect',
      x: cx - w / 2,
      y: cy - h / 2,
      w,
      h,
      height: isGiant ? 34 : 24,
      isGiant,
      isStarterChest: !!opts.isStarterChest,
      fixedCurioId: opts.fixedCurioId || null,
      bounce: 0.6,
      destructible: false,
      opened: false,
      unlocking: false,
      openProgress: 0,
      openDuration: opts.openDuration ?? (isGiant ? 1.85 : 0.85),
      openAnim: 0,
      lockTickAccum: 0,
      wobble: 0,
      hitFlash: 0,
    };
  }

  function makeBumper(cx, cy, r = 23) {
    return {
      type: 'bumper',
      shape: 'circle',
      x: cx,
      y: cy,
      r,
      height: 24,
      bounce: 1.65,
      hitFlash: 0,
      destructible: false,
    };
  }

  function makeInkwell(cx, cy, color = '#3cb6c9', opts = {}) {
    return {
      type: 'inkwell',
      shape: 'circle',
      x: cx,
      y: cy,
      r: 17,
      height: 24,
      color,
      keepExactPos: !!opts.keepExactPos,
      bounce: 0.5,
      destructible: true,
      hp: 16,
      maxHp: 16,
      hitFlash: 0,
      wobble: 0,
      broken: false,
    };
  }

  let prismUid = 1;
  function makePrism(cx, cy, angle = 0) {
    const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    return {
      id: `prism_${prismUid++}`,
      type: 'prism',
      shape: 'circle',
      x: cx,
      y: cy,
      r: 20,
      height: 28,
      angle: snapped,
      visualAngle: snapped,
      hitFlash: 0,
      pulse: 0,
      bounce: 1.0,
      destructible: false,
    };
  }

  function makePollenBud(cx, cy) {
    return {
      type: 'pollen_bud',
      shape: 'circle',
      x: cx,
      y: cy,
      r: 17,
      height: 22,
      hp: 14,
      maxHp: 14,
      hitFlash: 0,
      wobble: 0,
      broken: false,
      bounce: 0.4,
      destructible: true,
    };
  }

  function makeChime(cx, cy) {
    return {
      type: 'chime',
      shape: 'circle',
      x: cx,
      y: cy,
      r: 16,
      height: 30,
      ringAnim: 0,
      ringCooldown: 0,
      hitFlash: 0,
      bounce: 0.85,
      destructible: false,
    };
  }

  let orreryUid = 1;
  function makeOrrery(cx, cy, polarity = 1) {
    return {
      id: `orrery_${orreryUid++}`,
      type: 'orrery',
      shape: 'circle',
      x: cx,
      y: cy,
      r: 18,
      height: 30,
      fieldRadius: 215,
      gravity: 5200,
      polarity: polarity >= 0 ? 1 : -1,
      hitFlash: 0,
      pulse: 0,
      slingshotGlow: 0,
      bounce: 1.0,
      destructible: false,
    };
  }

  // ==================== 严格按主题与命题生成清爽房间 ====================
  function buildRoomProps(room, rng, dims = { CELL_W: 540, CELL_H: 420 }, stage = null) {
    const props = [];
    const { x, y, w, h, gw, gh, role, kind, biome, cells } = room;
    const { CELL_W, CELL_H } = dims;
    const theme = room.subTheme || (stage ? stage.theme : 'friction');
    const cx = x + w / 2;
    const cy = y + h / 2;
    const dewColors = BIOME_DEW_COLORS[biome] || BIOME_DEW_COLORS.lotus_pond;
    const dew = () => pick(dewColors, rng);
    const starterCurioId = stage ? stage.starterCurioId : 'billiard_wax';

    // 1. 出生登船台：极简干净，仅放置「本关专属 1~2 件教学示范机关 + 启程花匣」
    if (role === 'spawn') {
      props.push(makeChest(x + 112, y + 98, false, {
        isStarterChest: true,
        fixedCurioId: starterCurioId,
        openDuration: 0.45,
      }));
      if (theme === 'friction') {
        // 滑道左侧台球木箱 -> 右侧秘露花蜜瓶，蓄力一枪立刻演示冰壶连撞！
        props.push(makeCrate(x + 178, y + 314, 42, { keepExactPos: true }));
        props.push(makeInkwell(x + w - 168, y + 314, '#3cb6c9', { keepExactPos: true }));
      } else if (theme === 'gravity') {
        // 一座干净的浮空星轨仪 + 一座日光折射棱镜，蓄力即见完整弯道与分光预判
        props.push(makeOrrery(x + w - 138, y + 122, 1));
        props.push(makePrism(x + w - 118, y + h - 102, Math.PI));
      } else if (theme === 'stealth') {
        // 一颗花粉隐身花苞 + 一串共鸣风铃，轻点静音即可体验潜行与诱敌
        props.push(makePollenBud(x + 114, y + h - 102));
        props.push(makeChime(x + w - 116, y + 110));
      } else {
        // 第 4 关终章：左星轨、下滑道木箱，简洁明快
        props.push(makeOrrery(x + w - 130, y + 112, 1));
        props.push(makeCrate(x + 188, y + 314, 42, { keepExactPos: true }));
      }
      return props;
    }

    // 2. 太阳花穹金库：按本关物理主题定制守护布局
    if (role === 'vault') {
      props.push(makeChest(cx, cy, true));
      if (theme === 'friction') {
        props.push(makeCrate(cx - 136, cy - 86, 44));
        props.push(makeCrate(cx + 136, cy + 86, 44));
        props.push(makeBumper(cx + 132, cy - 78, 22));
        props.push(makeBumper(cx - 132, cy + 78, 22));
        props.push(makeInkwell(x + w - 92, y + 88, dew()));
      } else if (theme === 'gravity') {
        props.push(makeOrrery(cx - 152, cy - 78, 1));
        props.push(makeOrrery(cx + 152, cy + 78, 1));
        props.push(makePrism(cx + 146, cy - 78, Math.PI * 0.75));
        props.push(makePrism(cx - 146, cy + 78, -Math.PI * 0.25));
      } else if (theme === 'stealth') {
        props.push(makePollenBud(cx - 136, cy - 78));
        props.push(makePollenBud(cx + 136, cy + 78));
        props.push(makeChime(cx + 136, cy - 78));
        props.push(makeBook(cx - 144, cy + 76, 98, 60, rng));
      } else {
        // 第 4 关终极融合金库：星轨仪 + 棱镜 + 滑道木箱 + 花粉苞
        props.push(makeOrrery(cx - 148, cy - 82, 1));
        props.push(makePrism(cx + 148, cy - 82, Math.PI * 0.75));
        props.push(makeCrate(cx - 142, cy + 88, 44));
        props.push(makePollenBud(cx + 142, cy + 88));
      }
      return props;
    }

    // 3. 热气球撤离坞：中央留足清晰撤离圈，角落按主题配 2~3 件防守机关
    if (role === 'extract') {
      if (theme === 'friction') {
        props.push(makeCrate(x + 106, y + 92, 44));
        props.push(makeCrate(x + w - 106, y + h - 92, 44));
        props.push(makeInkwell(x + w - 106, y + 92, dew()));
      } else if (theme === 'gravity') {
        props.push(makeOrrery(x + 116, y + 96, -1)); // 斥力星轨偏折敌弹
        props.push(makePrism(x + w - 114, y + h - 96, Math.PI * 0.75));
      } else if (theme === 'stealth') {
        props.push(makePollenBud(x + 110, y + 92));
        props.push(makeChime(x + w - 110, y + h - 92));
        props.push(makePollenBud(x + w - 110, y + 92));
      } else {
        props.push(makeOrrery(x + 116, y + 96, -1));
        props.push(makePollenBud(x + w - 110, y + 92));
        props.push(makeCrate(x + w - 108, y + h - 92, 44));
      }
      return props;
    }

    // 4. 第 4 关专属 2×2 水镜花庭大中庭（有意识的跨物理双联考题，清晰对称不杂乱）
    if (kind === 'atrium') {
      props.push(makeOrrery(cx, cy - 12, 1));
      props.push(makePrism(cx - 215, cy - 138, Math.PI * 0.25));
      props.push(makePrism(cx + 215, cy - 138, Math.PI * 0.75));
      props.push(makeBumper(cx - 215, cy + 132, 25));
      props.push(makeBumper(cx + 215, cy + 132, 25));
      props.push(makeChest(cx, cy - 196, false));
      // 下方露水滑道配双台球木箱：先用星轨/漩涡聚怪，再推箱连扫！
      props.push(makeCrate(cx - 72, cy + 114, 44));
      props.push(makeCrate(cx + 72, cy + 114, 44));
      props.push(makePollenBud(cx - 265, cy));
      props.push(makeChime(cx + 265, cy));
      return props;
    }

    // 5. 3 格 L 型观景花廊（按主题清晰聚焦：拐角 1 个主角机关 + 两翼干净配合）
    if (kind === 'lshape') {
      let pivot = cells[0];
      const arms = [];
      for (const c of cells) {
        let adj = 0;
        for (const o of cells) {
          if (Math.abs(c.gx - o.gx) + Math.abs(c.gy - o.gy) === 1) adj++;
        }
        if (adj === 2) pivot = c;
      }
      for (const c of cells) {
        if (c !== pivot) arms.push(c);
      }

      const pcx = pivot.gx * CELL_W + CELL_W / 2;
      const pcy = pivot.gy * CELL_H + CELL_H / 2;
      const targetArm = arms[0] || pivot;
      const armAngle = Math.atan2(targetArm.gy - pivot.gy, targetArm.gx - pivot.gx);

      if (theme === 'friction') {
        props.push(makeEraser(pcx, pcy, 110, 56));
        arms.forEach((arm, idx) => {
          const acx = arm.gx * CELL_W + CELL_W / 2;
          const acy = arm.gy * CELL_H + CELL_H / 2;
          const isH = arm.gy === pivot.gy;
          if (idx === 0) {
            props.push(makeCrate(acx - (isH ? 64 : 0), acy - (isH ? 0 : 48), 44));
            props.push(makeInkwell(acx + (isH ? 76 : 0), acy + (isH ? 0 : 58), dew()));
            props.push(makeChest(acx, acy + (isH ? 82 : 0), false));
          } else {
            props.push(makeCrate(acx, acy, 44));
            props.push(makeBumper(acx + (isH ? 96 : 82), acy - (isH ? 64 : 0), 23));
          }
        });
      } else if (theme === 'gravity') {
        // 拐角一座浮空星轨仪，绕 90° 弯道直接打击盲区翼廊！
        props.push(makeOrrery(pcx, pcy, 1));
        arms.forEach((arm, idx) => {
          const acx = arm.gx * CELL_W + CELL_W / 2;
          const acy = arm.gy * CELL_H + CELL_H / 2;
          const isH = arm.gy === pivot.gy;
          if (idx === 0) {
            props.push(makePrism(acx, acy, armAngle));
            props.push(makeChest(acx + (isH ? 0 : 78), acy + (isH ? 76 : 0), false));
          } else {
            props.push(makeBook(acx, acy, isH ? 128 : 82, isH ? 68 : 114, rng));
            props.push(makeBumper(acx + (isH ? 105 : 80), acy + (isH ? 58 : -64), 22));
          }
        });
      } else {
        // 古藤潜行 L 廊：拐角掩体 + 双翼花粉隐身与风铃诱敌
        props.push(makeBook(pcx, pcy, 108, 76, rng));
        props.push(makePollenBud(pcx - 104, pcy - 74));
        arms.forEach((arm, idx) => {
          const acx = arm.gx * CELL_W + CELL_W / 2;
          const acy = arm.gy * CELL_H + CELL_H / 2;
          if (idx === 0) {
            props.push(makeChime(acx + 76, acy - 52));
            props.push(makeChest(acx - 78, acy + 58, false));
          } else {
            props.push(makePollenBud(acx, acy));
            props.push(makeInkwell(acx + 88, acy + 60, dew()));
          }
        });
      }
      return props;
    }

    // 6. 2×1 或 1×2 拱廊（按主题打造一条极具辨识度的招牌长廊！）
    if (kind === 'corridor') {
      const isH = gw > gh;
      if (theme === 'friction') {
        // 冰壶保龄球长廊：超长露水滑道 + 双台球木箱 + 末端花蜜瓶
        if (isH) {
          props.push(makeCrate(cx - 165, cy, 44));
          props.push(makeCrate(cx - 45, cy, 44));
          props.push(makeInkwell(cx + 185, cy, dew()));
          props.push(makeBumper(cx + 255, cy - 72, 22));
          props.push(makeChest(cx, cy - 92, false));
        } else {
          props.push(makeCrate(cx, cy - 135, 44));
          props.push(makeCrate(cx, cy - 35, 44));
          props.push(makeInkwell(cx, cy + 145, dew()));
          props.push(makeBumper(cx - 98, cy + 185, 22));
        }
      } else if (theme === 'gravity') {
        // 双星轨 S 弯弹弓长廊：一正一反双星轨仪，拉出华丽 S 型曲线弹道！
        if (isH) {
          props.push(makeOrrery(cx - 155, cy - 28, 1));
          props.push(makeOrrery(cx + 155, cy + 28, -1));
          props.push(makeRuler(cx, cy, 130, 34));
          props.push(makeChest(cx, cy - 95, false));
        } else {
          props.push(makeOrrery(cx - 28, cy - 125, 1));
          props.push(makeOrrery(cx + 28, cy + 125, -1));
          props.push(makePrism(cx + 98, cy, Math.PI));
        }
      } else {
        // 古藤潜行花廊：错落大花坛 + 花粉隐身跳点 + 风铃诱敌
        if (isH) {
          props.push(makeBook(cx - 185, cy - 42, 134, 72, rng));
          props.push(makeBook(cx + 185, cy + 42, 134, 72, rng));
          props.push(makePollenBud(cx, cy));
          props.push(makeChime(cx - 190, cy + 78));
          props.push(makeChest(cx + 190, cy - 78, false));
        } else {
          props.push(makeBook(cx - 56, cy - 145, 108, 86, rng));
          props.push(makeBook(cx + 56, cy + 145, 108, 86, rng));
          props.push(makePollenBud(cx, cy));
          props.push(makeChime(cx + 88, cy - 155));
        }
      }
      return props;
    }

    // 7. 常规 1×1 花室：严格「一房一命题」，每关 4 种不重复精修命题 × 随机镜像
    const fx = rng() < 0.5 ? 1 : -1;
    const fy = rng() < 0.5 ? 1 : -1;
    const ox = (dx) => cx + dx * fx;
    const oy = (dy) => cy + dy * fy;
    const arch = room.archetypeIdx !== undefined ? room.archetypeIdx : Math.floor(rng() * 4);

    if (theme === 'friction') {
      if (arch === 0) {
        // 命题 1：直线冰壶保龄球（露水滑道 + 双木箱 + 秘露瓶）
        props.push(makeCrate(ox(-92), cy, 44));
        props.push(makeCrate(ox(14), cy, 44));
        props.push(makeInkwell(ox(116), cy, dew()));
      } else if (arch === 1) {
        // 命题 2：菌伞弹箱角（云朵菌伞 + 滑道木箱反手弹射）
        props.push(makeEraser(cx, oy(-56), 118, 54));
        props.push(makeCrate(ox(-86), oy(52), 44));
        props.push(makeCrate(ox(86), oy(52), 44));
      } else if (arch === 2) {
        // 命题 3：诱敌打滑风铃桩（中央花坛分割，露水滑道配风铃弹柱）
        props.push(makeBook(ox(-96), oy(-54), 104, 68, rng));
        props.push(makeBumper(ox(96), oy(48), 24));
        props.push(makeCrate(ox(96), oy(-56), 44));
        props.push(makeInkwell(ox(-96), oy(58), dew()));
      } else {
        // 命题 4：双箱交叉撞击局
        props.push(makeCrate(ox(-78), oy(-42), 44));
        props.push(makeCrate(ox(78), oy(42), 44));
        props.push(makeBumper(cx, cy, 23));
      }
    } else if (theme === 'gravity') {
      if (arch === 0) {
        // 命题 1：星轨绕花坛盲射（中央星轨仪 + 对角两座花坛掩体）
        props.push(makeOrrery(cx, cy, 1));
        props.push(makeBook(ox(-116), oy(-52), 108, 70, rng));
        props.push(makeBook(ox(116), oy(52), 108, 70, rng));
      } else if (arch === 1) {
        // 命题 2：双日光棱镜交叉分光室
        props.push(makePrism(ox(-92), oy(-46), fx > 0 ? 0 : Math.PI));
        props.push(makePrism(ox(92), oy(46), fx > 0 ? Math.PI : 0));
        props.push(makeRuler(cx, cy, 120, 32));
      } else if (arch === 2) {
        // 命题 3：双极星轨（左吸右斥，玩出蛇形弹道）
        props.push(makeOrrery(ox(-95), oy(-36), 1));
        props.push(makeOrrery(ox(95), oy(36), -1));
        props.push(makeBumper(cx, oy(-76), 22));
      } else {
        // 命题 4：星轨 + 棱镜连招（弯道先打棱镜再一分为二！）
        props.push(makeOrrery(ox(-76), oy(0), 1));
        props.push(makePrism(ox(96), oy(-48), Math.PI * 0.75));
        props.push(makeBook(ox(96), oy(58), 104, 64, rng));
      }
    } else {
      // stealth（古藤密廊）
      if (arch === 0) {
        // 命题 1：声东击西风铃庭
        props.push(makeBook(cx, cy, 120, 78, rng));
        props.push(makeChime(ox(116), oy(-68)));
        props.push(makePollenBud(ox(-116), oy(68)));
      } else if (arch === 1) {
        // 命题 2：双花苞潜行跳点
        props.push(makePollenBud(ox(-92), oy(-46)));
        props.push(makePollenBud(ox(92), oy(46)));
        props.push(makeBook(ox(96), oy(-56), 102, 66, rng));
        props.push(makeBook(ox(-96), oy(56), 102, 66, rng));
      } else if (arch === 2) {
        // 命题 3：风铃引怪踩花露
        props.push(makeRuler(cx, oy(-54), 190, 34));
        props.push(makeChime(ox(-104), oy(56)));
        props.push(makeInkwell(ox(-52), oy(56), dew()));
        props.push(makePollenBud(ox(108), oy(56)));
      } else {
        // 命题 4：藤蔓花坛静谧伏击角
        props.push(makeBook(ox(-78), oy(0), 112, 126, rng));
        props.push(makePollenBud(ox(86), oy(-58)));
        props.push(makeChime(ox(96), oy(64)));
      }
    }

    if (role === 'treasure' && !props.some((p) => p.type === 'chest')) {
      props.push(makeChest(ox(112), oy(-68), false));
    }

    return props;
  }

  // ==================== 三层手绘环境密度 + 严格避让滑道/地标/门洞，彻底消除拼凑感 ====================
  function buildRoomDecors(room, doorways, rng, dims = { CELL_W: 540, CELL_H: 420 }, stage = null) {
    const ground = [];
    const edge = [];
    const slides = [];
    const { CELL_W, CELL_H } = dims;
    const { biome, cells, cellKeys, role, kind, x, y, w, h } = room;
    const theme = room.subTheme || (stage ? stage.theme : 'friction');
    const cx = x + w / 2;
    const cy = y + h / 2;
    const keyOf = (gx, gy) => `${gx},${gy}`;

    const isNearDoor = (px, py, pad = 62) => {
      for (const d of doorways) {
        if (Math.hypot(px - d.cx, py - d.cy) < pad) return true;
      }
      return false;
    };

    const petalPalettes = {
      sun_glasshouse: ['#ffd866', '#ff9eb5', '#fff4cc'],
      lotus_pond: ['#ffa6be', '#8ee2f5', '#fffdf0'],
      ancient_vine: ['#c7a3f5', '#ffad85', '#a2e0a8'],
    };
    const petalsCol = petalPalettes[biome] || petalPalettes.sun_glasshouse;

    const addSlide = (s) => {
      slides.push(s);
      ground.push(s);
    };

    // 1. 严格遵守物理分家：仅「晨露荷塘 (friction)」与「终极花穹融合房 (fusion)」铺设嵌入式露水滑道
    if (theme === 'friction' || theme === 'fusion') {
      if (role === 'spawn') {
        addSlide({
          kind: 'dew_slide',
          x: cx - 126,
          y: y + 286,
          w: 252,
          h: 56,
          orient: 'h',
          seed: 11,
        });
      } else if (kind === 'atrium') {
        addSlide({
          kind: 'dew_slide',
          x: cx - 230,
          y: cy + 84,
          w: 460,
          h: 60,
          orient: 'h',
          seed: 22,
        });
      } else if (kind === 'corridor' && theme === 'friction') {
        if (room.gw > room.gh) {
          addSlide({ kind: 'dew_slide', x: cx - 265, y: cy - 30, w: 530, h: 60, orient: 'h', seed: 33 });
        } else {
          addSlide({ kind: 'dew_slide', x: cx - 30, y: cy - 210, w: 60, h: 420, orient: 'v', seed: 34 });
        }
      } else if (kind === 'lshape' && theme === 'friction') {
        for (const c of cells) {
          const horiz = rng() < 0.55;
          addSlide({
            kind: 'dew_slide',
            x: c.gx * CELL_W + (horiz ? 85 : CELL_W / 2 - 29),
            y: c.gy * CELL_H + (horiz ? CELL_H / 2 - 29 : 72),
            w: horiz ? 370 : 58,
            h: horiz ? 58 : 276,
            orient: horiz ? 'h' : 'v',
            seed: c.gx * 17 + c.gy,
          });
        }
      } else if (role === 'vault' && theme === 'friction') {
        addSlide({ kind: 'dew_slide', x: cx - 180, y: cy - 114, w: 360, h: 52, orient: 'h', seed: 41 });
        addSlide({ kind: 'dew_slide', x: cx - 180, y: cy + 62, w: 360, h: 52, orient: 'h', seed: 42 });
      } else if (role !== 'extract' && theme === 'friction') {
        const arch = room.archetypeIdx ?? 0;
        if (arch === 0) {
          addSlide({ kind: 'dew_slide', x: cx - 175, y: cy - 30, w: 350, h: 60, orient: 'h', seed: 50 });
        } else if (arch === 1) {
          addSlide({ kind: 'dew_slide', x: cx - 165, y: cy + 20, w: 330, h: 58, orient: 'h', seed: 51 });
        } else {
          const horiz = arch === 2;
          addSlide({
            kind: 'dew_slide',
            x: cx - (horiz ? 165 : 30),
            y: cy - (horiz ? 30 : 128),
            w: horiz ? 330 : 60,
            h: horiz ? 60 : 256,
            orient: horiz ? 'h' : 'v',
            seed: 52 + arch,
          });
        }
      }
    }

    // 2. 构建严格的地面禁区（所有滑道、罗盘/金库/撤离地标、门洞），杜绝装饰乱叠
    const blockedRects = slides.map((s) => ({ x: s.x, y: s.y, w: s.w, h: s.h }));
    const blockedCircles = [];
    if (role === 'spawn') {
      blockedCircles.push({ x: cx, y: cy - 22, r: 80 });
      // 避开登船台上方短标题区
      blockedRects.push({ x: cx - 140, y: y + 34, w: 280, h: 36 });
    } else if (role === 'vault') {
      blockedRects.push({ x: cx - 154, y: cy - 104, w: 308, h: 208 });
    } else if (role === 'extract') {
      blockedCircles.push({ x: cx, y: cy, r: 108 });
    } else if (role === 'atrium') {
      blockedCircles.push({ x: cx, y: cy, r: 198 });
    }

    const hitsBlocked = (px, py, rad = 16, padExtra = 0) => {
      const r = rad + padExtra;
      if (isNearDoor(px, py, 64 + rad * 0.5)) return true;
      for (const rc of blockedRects) {
        if (px + r > rc.x && px - r < rc.x + rc.w && py + r > rc.y && py - r < rc.y + rc.h) {
          return true;
        }
      }
      for (const cc of blockedCircles) {
        if (Math.hypot(px - cc.x, py - cc.y) < cc.r + r) return true;
      }
      return false;
    };

    const placedWater = [];
    const pickCleanSpot = (x0, y0, marginX, marginY, rad, padExtra = 8, tries = 14) => {
      const spanX = Math.max(20, CELL_W - marginX * 2);
      const spanY = Math.max(20, CELL_H - marginY * 2);
      for (let t = 0; t < tries; t++) {
        const px = x0 + marginX + rng() * spanX;
        const py = y0 + marginY + rng() * spanY;
        if (hitsBlocked(px, py, rad, padExtra)) continue;
        let overlapWater = false;
        for (const pw of placedWater) {
          if (Math.hypot(px - pw.x, py - pw.y) < pw.r + rad + 10) {
            overlapWater = true;
            break;
          }
        }
        if (overlapWater) continue;
        return { x: px, y: py };
      }
      return null;
    };

    const tileToneSet = new Set();

    for (const c of cells) {
      const x0 = c.gx * CELL_W;
      const y0 = c.gy * CELL_H;

      // 2A. 柔和无硬边水彩青苔晕染（完全避开滑道与地标）
      const mossCount = biome === 'ancient_vine' ? 4 : 2;
      for (let i = 0; i < mossCount; i++) {
        const rad = 24 + rng() * 18;
        const spot = pickCleanSpot(x0, y0, 62, 58, rad, 10, 10);
        if (!spot) continue;
        ground.push({
          kind: 'moss',
          x: spot.x,
          y: spot.y,
          rx: rad * (1.1 + rng() * 0.35),
          ry: rad * (0.72 + rng() * 0.25),
          rot: rng() * Math.PI,
          alpha: 0.14 + rng() * 0.1,
          tone: biome === 'lotus_pond' ? '#6ec7b8' : '#76bf82',
        });
      }

      // 2B. 有机荷塘浅水洼（出生房与中庭不乱刷，且严格避开滑道/门洞，零重叠！）
      if (biome === 'lotus_pond' && role !== 'atrium' && role !== 'spawn' && role !== 'extract') {
        const rx = 38 + rng() * 20;
        const ry = 22 + rng() * 11;
        const boundR = Math.max(rx, ry) + 8;
        const spot = pickCleanSpot(x0, y0, 78, 72, boundR, 18, 16);
        if (spot) {
          placedWater.push({ x: spot.x, y: spot.y, r: boundR });
          // 预生成有机波浪岸线瓣点，彻底告别生硬规则椭圆
          const lobes = [];
          const segs = 10;
          for (let s = 0; s < segs; s++) {
            const ang = (s / segs) * Math.PI * 2;
            const jitter = 0.84 + rng() * 0.32;
            lobes.push({
              x: Math.cos(ang) * rx * jitter,
              y: Math.sin(ang) * ry * jitter,
            });
          }
          ground.push({
            kind: 'water_strip',
            x: spot.x,
            y: spot.y,
            rx,
            ry,
            rot: (rng() - 0.5) * 0.28,
            lobes,
            hasLily: rng() < 0.78,
            lilyAng: rng() * Math.PI * 2,
          });
        }
      }

      // 2C. 对齐 64×64 地砖网格的自然水彩色差砖（替代浮在砖缝上的歪斜白方块！）
      for (let i = 0; i < 4; i++) {
        const col = Math.floor((x0 + 64 + rng() * (CELL_W - 128)) / 64);
        const row = Math.floor((y0 + 64 + rng() * (CELL_H - 128)) / 64);
        const tk = `${col},${row}`;
        if (tileToneSet.has(tk)) continue;
        const rowOffset = theme === 'gravity' ? 0 : (Math.abs(row) % 2) * 32;
        const tx = col * 64 + rowOffset;
        const ty = row * 64;
        const tcx = tx + 32;
        const tcy = ty + 32;
        if (tcx < x0 + 52 || tcx > x0 + CELL_W - 52 || tcy < y0 + 52 || tcy > y0 + CELL_H - 52) continue;
        if (hitsBlocked(tcx, tcy, 34, 6)) continue;
        let onWater = false;
        for (const pw of placedWater) {
          if (Math.hypot(tcx - pw.x, tcy - pw.y) < pw.r + 34) { onWater = true; break; }
        }
        if (onWater) continue;
        tileToneSet.add(tk);
        ground.push({
          kind: 'flagstone',
          x: tx,
          y: ty,
          w: 64,
          h: 64,
          warm: rng() < 0.55,
          alpha: 0.14 + rng() * 0.12,
        });
      }

      // 2D. 轻柔花瓣落英（避开滑道与地标中心）
      for (let i = 0; i < 3; i++) {
        const spot = pickCleanSpot(x0, y0, 58, 56, 16, 8, 10);
        if (!spot) continue;
        const dots = [];
        for (let k = 0; k < 4; k++) {
          dots.push({
            dx: (rng() - 0.5) * 24,
            dy: (rng() - 0.5) * 16,
            r: 2.0 + rng() * 1.9,
            c: pick(petalsCol, rng),
          });
        }
        ground.push({ kind: 'petals', x: spot.x, y: spot.y, dots });
      }

      // 2E. 物理摇曳草丛（严格避开滑道、水洼与地标）
      const grassCount = biome === 'ancient_vine' ? 5 : 3;
      for (let i = 0; i < grassCount; i++) {
        const spot = pickCleanSpot(x0, y0, 56, 56, 14, 12, 12);
        if (!spot) continue;
        ground.push({
          kind: 'grass',
          x: spot.x,
          y: spot.y,
          blades: 3 + Math.floor(rng() * 2),
          scale: 0.8 + rng() * 0.4,
          sway: 0,
          swayVel: 0,
          phase: rng() * 6.28,
          flower: rng() < 0.42 ? pick(petalsCol, rng) : null,
        });
      }

      // 3. 沿墙园艺小件（避开门洞与滑道端头）
      const edgeItems = ['pot', 'cloche', 'watering_can', 'pot', 'fern_cluster'];
      const tryEdge = (ex, ey) => {
        if (isNearDoor(ex, ey, 72)) return;
        for (const s of slides) {
          if (ex > s.x - 18 && ex < s.x + s.w + 18 && ey > s.y - 18 && ey < s.y + s.h + 18) return;
        }
        edge.push({
          kind: pick(edgeItems, rng),
          x: ex,
          y: ey,
          bloom: pick(petalsCol, rng),
          flip: rng() < 0.5 ? 1 : -1,
          seed: rng() * 100,
        });
      };

      if (!cellKeys.has(keyOf(c.gx, c.gy - 1))) {
        tryEdge(x0 + 82 + rng() * 60, y0 + 36);
        tryEdge(x0 + CELL_W - 142 + rng() * 60, y0 + 36);
      }
      if (!cellKeys.has(keyOf(c.gx, c.gy + 1))) {
        tryEdge(x0 + 95 + rng() * 80, y0 + CELL_H - 32);
        if (rng() < 0.65) tryEdge(x0 + CELL_W - 165 + rng() * 70, y0 + CELL_H - 32);
      }
      if (!cellKeys.has(keyOf(c.gx - 1, c.gy))) {
        tryEdge(x0 + 36, y0 + 86 + rng() * 60);
      }
      if (!cellKeys.has(keyOf(c.gx + 1, c.gy))) {
        tryEdge(x0 + CELL_W - 36, y0 + CELL_H - 150 + rng() * 60);
      }
    }

    return { ground, edge };
  }

  CB.roomTemplates = { buildRoomProps, buildRoomDecors };
})();
