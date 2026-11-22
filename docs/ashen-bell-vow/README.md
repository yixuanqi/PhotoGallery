# 灰钟残誓 (Ashen Bell Vow) — v32.0 模块化重构与 144Hz 字形/背景缓存提速版

## v32.0 核心工程重构与性能提速
- **4 个超大型 JS 核心模块门面式解耦（0 循环依赖、外部接口 100% 兼容）**：
  * **渲染管线 (`src/renderer.js` 5682 → 239 行)**：拆分为 `src/render/renderShared.js`、`worldRenderer.js`、`playerRenderer.js`、`enemyRenderer.js`、`bossRenderer.js`、`vfxRenderer.js`，并新增 `glyphAtlas.js` 与 `backdropCache.js`。
  * **界面与舆图 (`src/ui.js` 3806 → 48 行)**：通过 `uiHooks` 彻底消除循环依赖，拆分为 `src/ui/uiShared.js`、`mapUi.js`、`hudCore.js`、`modalsUi.js`、`progressionUi.js`。
  * **敌兵与首领 AI (`src/ai.js` 3218 → 48 行)**：拆分为 `src/ai/enemiesAi.js`（常规敌兵与演武钟偶）、`wardensAi.js`（三境守誓精英）、`bossesAi.js`（四大首领）。
  * **战斗结算 (`src/combat.js` 2250 → 4 行)**：形成严格有向无环图 `src/combat/damageCombat.js` → `worldCombat.js` → `playerCombat.js`。
- **144Hz 字形位图图集缓存 (`src/render/glyphAtlas.js`)**：
  * 引入 2× 超采样离屏 LRU 位图缓存（启动与切换语言自动预热「危/斩/封/精准弹反/断钟返」等高频战字与交互徽章），渲染主循环彻底清零 `fillText`、`ctx.font` 与逐帧 `measureText`，消除 `G.cam.zoom !== 1` 微距缩放下的 Skia 字形缓存击穿。
- **静态背景石构离屏缓存 (`src/render/backdropCache.js`) + 零逐帧渐变分配**：
  * 懒烘焙圣所尖拱、6 扇哥特长窗、礼拜堂破碎高窗与半埋断钟（P1/P2）、铸造坑高炉与坩埚、r09 热风铁栅（热/冷态）、r15 古钟树窟、墓碑与骨堆；同时缓存 `drawBoss4MirrorFloor()` 渐变条，主渲染循环实现 **0 次逐帧渐变分配**。
- **可观测性与静态自检升级 (`verify_project.py` / `src/main.js` / `src/benchmark.js`)**：
  * `verify_project.py` 新增相对导入 `.js` 后缀、大小写严格一致、DFS 循环依赖拦截、HTML 脚本入口与 `start_game.bat` 纯 ASCII + CRLF 校验。
  * F8 实时剖析器与 F9 10 秒 A/B 战斗压测报告同步接入「字形图集命中率 / 缓存项数」与「静态背景缓存块数」指标。

---

# 灰钟残誓 (Ashen Bell Vow) — v31.0 可缩放跃迁舆图与三境生态联动版

## v31.0 核心升级
- **羊皮纸大地图升级为可缩放/拖拽导航与点击祭坛跃迁（`src/ui.js` / `index.html` / `styles.css`）**：
  * `fullMapCanvas` 升格至 `760×310`，支持**滚轮以光标为中心无级缩放（100%–320%）**、**左键拖拽平移**，打开时自动聚焦角色附近，工具栏新增 `− / + / 居中 / 全境` 快捷控制。
  * 在「查看房间」模式下悬浮任意已点燃祭坛会亮起金环与跃迁浮标，**点击即可直接提灯跃迁**（首领战与回响期间自动锁定防误触）；全部首领点位均改为从 `BOSSES_DEF` / `ENEMIES_DEF` 数据驱动渲染。
- **垂直跨房镜头前瞻与平滑过渡（`src/world.js`）**：
  * 为 `r09↔r12`（乘风穿顶）、`r10↔r14`（深根落井）、`r15↔r10`（孢伞连跃）等垂直贯通房增加**竖向速度前瞻偏移（vertical velocity lookahead）**与**跨缝平滑越界视野**，扩大垂直相邻房提前解遮罩距离，消除高速切房时的镜头骤跳与黑幕闪烁。
- **三境守誓精英二阶段专属场景机制（`src/ai.js` / `src/renderer.js`）**：
  * **截风巡塔使 · 朔**：二阶段定期掀起左右反转的**「逆风狂澜」**横风丝带并施加侧风推力；
  * **盘根古钟精 · 枯**：二阶段周期性触发**「树心古钟震鸣」**并在两侧唤醒毒孢云，鼓励以镇魂钟鸣净孢反打；
  * **断剑霜侯 · 凛**：二阶段召唤**「绝脊暴风雪」**斜掠风雪与冰霜压迫，远程拖延会持续积蓄寒霜，引导近身打铁决胜。
- **生态因果链世界状态联动（`src/player.js` / `src/combat.js` / `src/renderer.js`）**：
  * 斩落「沉渊铸钟师 · 寂」后，`r09_wind_spire` 炉底铁栅由炽热橙焰转为冷却蓝金余烬并浮现因果提示；
  * 穿过 `r16_frost_tomb` / `r11_frost_ridge` 融雪瀑布会触发 5.5s **「潮湿」**状态：寒霜积蓄加速 +30%，但施放「镇魂钟鸣」可借水汽传导获得 **+18% 范围与 +15% 伤害/削势增幅**。

---

# 灰钟残誓 (Ashen Bell Vow) — v30.0 17 房立体大地图与三境生态因果链完整版

纯程序化水墨手绘、**0 外部 PNG 贴图**、0 外部音频文件、零构建原生 ES Modules。在 v29.0 四大首领视觉与专属舞台重塑的基础上，**v30.0 将全境从 11 间房扩建为 17 间立体四层互联大地图（`X: 0..11180`, `Y: -740..2260`），把「绝风断塔」「枯墨古林」「霜骸圣脊」全面升级为各 3 间互联房间的完整大区，并用自洽的生态因果链贯穿整座晦渊世界**。

## v30.1 关键修复与全境自检
- **启动与隐藏首领崩溃修复**：清理 `src/ai.js` 第 1237 行孤立 `export` 语法错误，修复 `updateBoss4` 中两处未定义函数调用（`pickWeightedBossMove` / `audio.playGlintCue`），优化 `index.html` 启动诊断防误报逻辑并补充内联图标。
- **物理与垂直通路卡关修复**：重写 `src/player.js` 罡风上升气流浮力（正确抵消重力并平滑托举升空，按住 `S` 受控缓降）；移除 `r10_ink_woods` 误挡落井口的暗河，并调整 `r14_woods_cavern` / `r15_woods_heart` 顶层孢伞确保稳定连跃返程。
- **水墨图章与地图完善**：在 `src/stampAtlas.js` 补全 4 种新增程序化图章（`wind_pillar` / `gnarled_tree` / `spore_cluster` / `frost_spike`，共 17 种），`editor.js` 体检新增未注册图章与暗河阻断垂直裂隙告警；羊皮纸详图新增三境守誓精英动态标记。
- **双语同步与零依赖体检脚本**：补齐 v30 新增 9 条墙面铭文英文翻译并更新墨尘对话；新增 **`verify_project.py`**，执行 `python verify_project.py` 可一键静态体检全部 JS、房间 JSON 与双语覆盖率。

## v30.0 核心更新
- **三大秘境全面扩建为“各 3 房间”立体箱庭大区（全境 17 房、9 祭坛、11 残碑）**：
  1. **绝风断塔（3 房高空垂直大区）**：
     - `r09_wind_spire`（风井下口）→ 乘炉底热风上升气流直穿屋顶进入 **`r12_wind_bridge`（千铃悬桥，`y=-740..0`）** → 东入 **`r13_wind_peak`（断塔绝顶）** 迎战「截风巡塔使 · 朔」。
  2. **霜骸圣脊（3 房高空雪峰大区，彻底告别“地下雪山”）**：
     - `r11_frost_ridge`（融雪谷口）→ 东破悬崖进入 3 层纵深攀爬区 **`r16_frost_tomb`（冻剑冢，`1500×2260`，新增高空祭坛「绝巅雪坛」）** → 西登世界最高峰 **`r17_frost_summit`（绝脊霜台，`y=-740..0`）** 迎战「断剑霜侯 · 凛」，且西侧高空断桥直接连通 **`r13_wind_peak`** 构成全境最高环路！
  3. **枯墨古林（3 房地底根窟环路大区）**：
     - `r10_ink_woods`（渗水菌廊）→ 东侧深根裂隙坠入 **`r14_woods_cavern`（盘根溶洞，`y=1520..2260`）** → 西入 **`r15_woods_heart`（古钟树窟）** 迎战「盘根古钟精 · 枯」，击败或穿越后可踏西侧荧光巨孢伞连跃穿过单向烟囱直返 `r10` 与起点圣所捷径。
- **可见的世界生态因果链（`src/renderer.js` / 3 座新增叙事残碑）**：
  * **沉渊古炉余热 → 绝风断塔永续罡风**：`r09_wind_spire` 井底新增发光熔炉排风铁栅与上升火星流，直观揭示 `r05_foundry` 热浪驱动正上方风塔的地理因果（残碑 `lore_wind_furnace`）。
  * **热风融化雪巅 → 冰瀑、墨雨与沉渊暗河**：`r16_frost_tomb` 与 `r11_frost_ridge` 悬崖新增动态融雪瀑布，解释全境永夜墨雨与地下暗河的来源（残碑 `lore_frost_snowmelt`）。
  * **暗河西渗地底 → 滋养枯墨古林与吞钟巨树**：`r14_woods_cavern` 东侧新增暗河渗水拱廊与荧光渗池，`r15_woods_heart` 背景重绘缠绕坠落古钟的千年巨树树心（残碑 `lore_woods_seepage`）。
- **四层大地图引擎与旧存档无缝重投影（`src/config.js` / `src/levelLoader.js` / `src/state.js` / `src/save.js` / `src/world.js` / `src/ui.js` / `src/codex.js`）**：
  * 全面引入 `WORLD_MIN_X / WORLD_MIN_Y / WORLD_SPAN_W / WORLD_SPAN_H`，完整支持天顶负 `Y` 坐标（镜头、垂直跨房视口遮罩解锁、投射物、探索度统计与羊皮纸地图图钉点击）。
  * 探索迷雾网格升级至 **`52×16`**，存档版本升级至 **`v30`**，自动将旧版 `v8`–`v26` 存档的 `44×10` 探索格按世界坐标无缝重投影，不丢进度。

## 本地一键启动 / Local Launch
* **Windows**：直接双击 **`start_game.bat`**（纯 ASCII + CRLF 严格加固）或运行 `python serve_local.py`。
* **macOS / Linux**：运行 **`./start_game.sh`**。
* **游戏入口**：`http://localhost:8080/`
* **实景水墨编辑器**：`http://localhost:8080/editor.html`
