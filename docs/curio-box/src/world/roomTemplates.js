(() => {
  const CB = window.CB;

  // 房间内手绘家具与桌面机关模板库
  // 坐标使用归一化比例 (u, v) ∈ [0, 1]，相对于房间内部可用区域，保证任意尺寸都能自适应且永不堵门

  const BOOK_PALETTES = [
    { color: '#4c7065', spine: '#345047', title: '博物志' },
    { color: '#8f4a3f', spine: '#693129', title: '星象录' },
    { color: '#4c6184', spine: '#344562', title: '机械图' },
    { color: '#7d6347', spine: '#5b452f', title: '奇珍集' },
    { color: '#6b5375', spine: '#4c3954', title: '炼金笺' },
  ];

  function pick(arr, rng) {
    return arr[Math.floor(rng() * arr.length)];
  }

  function makeBook(cx, cy, w, h, rng) {
    const pal = pick(BOOK_PALETTES, rng);
    return {
      type: 'book',
      shape: 'rect',
      x: cx - w / 2,
      y: cy - h / 2,
      w,
      h,
      height: 28 + Math.floor(rng() * 8),
      color: pal.color,
      spine: pal.spine,
      title: pal.title,
      bounce: 0.72,
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
      height: 12,
      bounce: 0.75,
    };
  }

  function makeCrate(cx, cy, size = 46) {
    return {
      type: 'crate',
      shape: 'rect',
      x: cx - size / 2,
      y: cy - size / 2,
      w: size,
      h: size * 0.86,
      height: 26,
      bounce: 0.55,
    };
  }

  function makeChest(cx, cy, isGiant = false) {
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
      bounce: 0.6,
    };
  }

  function makeBumper(cx, cy, r = 24) {
    return {
      type: 'bumper',
      shape: 'circle',
      x: cx,
      y: cy,
      r,
      height: 22,
      bounce: 1.65,
      hitFlash: 0,
    };
  }

  function makeInkwell(cx, cy, color = '#4c7fb8') {
    return {
      type: 'inkwell',
      shape: 'circle',
      x: cx,
      y: cy,
      r: 17,
      height: 24,
      color,
      bounce: 0.5,
    };
  }

  // 根据房间职能与尺寸 (gw x gh) 生成内部候选家具列表
  function buildRoomProps(room, rng) {
    const props = [];
    const { x, y, w, h, gw, gh, role } = room;
    const cx = x + w / 2;
    const cy = y + h / 2;

    // 1. 出生点：宽敞整洁，角落摆装饰书与出发木箱
    if (role === 'spawn') {
      props.push(makeCrate(x + 92, y + 86, 42));
      props.push(makeInkwell(x + w - 92, y + 88, '#4a85a8'));
      return props;
    }

    // 2. 高危大金保险库：中央巨型雕花大金宝箱 + 两侧对称护卫弹簧柱与精装典籍
    if (role === 'vault') {
      props.push(makeChest(cx, cy, true));
      props.push(makeBumper(cx - 120, cy - 68, 22));
      props.push(makeBumper(cx + 120, cy - 68, 22));
      props.push(makeBumper(cx - 120, cy + 72, 22));
      props.push(makeBumper(cx + 120, cy + 72, 22));
      return props;
    }

    // 3. 怀表撤离点：中央留出大面积怀表光圈，四角放置轻掩体书本/木箱便于倒计时绕桩
    if (role === 'extract') {
      props.push(makeCrate(x + 95, y + 86, 44));
      props.push(makeCrate(x + w - 95, y + 86, 44));
      props.push(makeCrate(x + 95, y + h - 86, 44));
      props.push(makeCrate(x + w - 95, y + h - 86, 44));
      return props;
    }

    // 4. 2×2 桌面大中庭（橡皮擦弹射游乐场）
    if (gw === 2 && gh === 2) {
      props.push(makeEraser(cx, cy, 134, 66));
      props.push(makeBumper(cx - 210, cy - 135, 28));
      props.push(makeBumper(cx + 210, cy - 135, 28));
      props.push(makeBumper(cx - 210, cy + 135, 28));
      props.push(makeBumper(cx + 210, cy + 135, 28));
      props.push(makeBook(cx - 270, cy, 98, 128, rng));
      props.push(makeBook(cx + 270, cy, 98, 128, rng));
      props.push(makeChest(cx, cy - 180, false));
      props.push(makeInkwell(cx - 95, cy + 145, '#c94c4c'));
      props.push(makeInkwell(cx + 95, cy + 145, '#4c7fb8'));
      return props;
    }

    // 5. 2×1 横向书脊弹射长廊（适合一发钢珠反复折射清场）
    if (gw === 2 && gh === 1) {
      const style = Math.floor(rng() * 2);
      if (style === 0) {
        // 错落书脊折射通道
        props.push(makeBook(cx - 210, cy - 42, 146, 74, rng));
        props.push(makeBook(cx + 210, cy + 42, 146, 74, rng));
        props.push(makeEraser(cx, cy, 108, 54));
        props.push(makeCrate(cx - 260, cy + 72, 44));
        props.push(makeCrate(cx + 260, cy - 72, 44));
      } else {
        // 木尺滑道 + 双弹簧柱
        props.push(makeRuler(cx, cy - 58, 280, 36));
        props.push(makeRuler(cx, cy + 58, 280, 36));
        props.push(makeBumper(cx - 235, cy, 24));
        props.push(makeBumper(cx + 235, cy, 24));
        props.push(makeChest(cx, cy, false));
      }
      return props;
    }

    // 6. 1×2 纵向书脊弹射长廊
    if (gw === 1 && gh === 2) {
      props.push(makeBook(cx - 48, cy - 155, 118, 92, rng));
      props.push(makeBook(cx + 48, cy + 155, 118, 92, rng));
      props.push(makeEraser(cx, cy, 108, 54));
      props.push(makeBumper(cx - 105, cy, 22));
      props.push(makeBumper(cx + 105, cy, 22));
      props.push(makeInkwell(cx + 85, cy - 170, '#c94c4c'));
      props.push(makeCrate(cx - 85, cy + 170, 44));
      return props;
    }

    // 7. 常规 1×1 房间（4 种变化模板，避免单调）
    const variant = Math.floor(rng() * 4);
    if (variant === 0) {
      // 书案双掩体
      props.push(makeBook(cx - 105, cy - 36, 112, 76, rng));
      props.push(makeBook(cx + 105, cy + 36, 112, 76, rng));
      props.push(makeCrate(cx, cy, 44));
    } else if (variant === 1) {
      // 中央弹力橡皮擦 + 墨水瓶
      props.push(makeEraser(cx, cy, 110, 56));
      props.push(makeInkwell(cx - 125, cy - 68, '#4c7fb8'));
      props.push(makeInkwell(cx + 125, cy + 68, '#c94c4c'));
    } else if (variant === 2) {
      // 发条弹珠三角阵（高爽感折射房）
      props.push(makeBumper(cx, cy - 62, 23));
      props.push(makeBumper(cx - 95, cy + 54, 23));
      props.push(makeBumper(cx + 95, cy + 54, 23));
      if (role === 'treasure') props.push(makeChest(cx, cy + 14, false));
    } else {
      // 木尺工作台 + 物资箱
      props.push(makeRuler(cx, cy - 48, 210, 36));
      props.push(makeCrate(cx - 90, cy + 58, 46));
      props.push(makeCrate(cx + 90, cy + 58, 46));
      if (role === 'treasure') props.push(makeChest(cx, cy + 62, false));
    }

    return props;
  }

  CB.roomTemplates = { buildRoomProps };
})();
