## v50.0 里程碑商业发行版：合规壳（适龄提示/隐私弹窗/健康忠告/制作名单）+ TapTap 云存档适配器 + 防坏档双备份 + 校验器增强
- **商业合规壳（`src/ui/complianceUi.js` / `index.html` / `styles.css`）**：
  * **标题页合规展示**：左上角版本徽章旁新增自绘线框 **CADPA 12+ 适龄提示徽章按钮**；底栏集成标准 48 字 **《健康游戏忠告》**、软著/ICP/版号集中配置位（`COMPLIANCE_META`）以及「适龄提示 12+ / 隐私与协议 / 制作名单」快捷入口；
  * **首次启动非默认勾选隐私协议弹窗（`#compliance-consent-modal`）**：复选框默认未勾选，「同意并进入」在勾选前保持禁用，拒绝时展示纯单机零敏感权限说明，并支持在隐私弹窗中随时撤回同意（编辑器预览模式自动跳过）；
  * **三合一玄墨碑刻合规弹窗（`#legal-modal`）**：承载 CADPA 12+ 四项说明、隐私政策与用户协议、制作人员名单（Credits），同步在系统设置页底部开放常驻入口。
- **TapTap 云存档适配器 + 自动滚动防坏档 + 存档码导入导出（`src/storage.js` / `src/save.js`）**：
  * 新增 `TapCloudStorageAdapter`：自动识别宿主 `tap.getCloudSaveManager()` / `tap.getFileSystemManager()`，本地同步秒写 + 后台 `2.5s` 节流推送云端（适配平台 60 次/分钟限频），启动与手动同步按 `savedAt` 时间戳自动合并防覆盖；非 TapTap 环境（个人博客 / itch.io / 本地）零报错无缝回落至 `localStorage`；
  * **自动滚动防坏档备份（`_bak`）**：每次写档前将上一份校验合法的主档镜像留存至 `_bak` 槽，主档损坏或写入中断时自动无缝恢复；
  * **带 FNV-1a 32-bit 校验和的 `ABV1:` 存档码导入/导出**：支持 `TextEncoder/TextDecoder` 及旧 WebView `encodeURIComponent` 双路 UTF-8 编解码，在标题页「选择档案」抽屉与「系统设置」均支持一键复制导出与校验导入。
- **校验门控修复（`verify_project.py`）**：
  * 补齐内置 Web/ES6 全局标识 `TextEncoder`、`TextDecoder`、`constructor`、`super`，消除误报并新增 v50.0 合规壳与云存档自动化门控，版本号整体跃升至 **`v50.0`**。

---

## v47.9 生产级压缩混淆构建管线 & 离线 SourceMap v3 生成（`tools/build_release.py` / `tools/minify_obfuscate.py` / `tools/decode_stack.py`）
- **零依赖 JS/CSS 压缩与多层次混淆引擎（`tools/minify_obfuscate.py`）**：
  * **双引擎支持**：默认 `--engine auto` 自动检测本地 `esbuild` 并无缝回落至零依赖内置 Python 3 引擎（Windows 双击 `build_release.bat` 无需安装 Node.js 即可直接跑出生产压缩混淆包），同时支持 `--no-minify`、`--no-obfuscate`、`--no-sourcemap` 调试开关；
  * **四层安全混淆**：① 全 70 模块路径转为数字 ID（`0..69`）并精简打包壳函数；② 跨模块 632 个导出键统一混淆；③ 精确两遍词法作用域分析器对 2,610 个无遮蔽、无简写冲突的模块级符号安全重命名；④ 317 KB 离线三周目世界 JSON 采用双射可逆 ASCII 置换加密（原始体积零膨胀、ZIP 压缩零损失、ES5 毫秒级解码）；
  * **ASI-Safe JS 压缩 + `calc()` 安全 CSS 压缩**：完整去除注释与冗余空白并保留所有 JS 自动分号边界与 CSS `calc()/min()/max()/clamp()` 运算符空格，压缩后强制通过词法括号平衡、重复声明扫描与无 `sourceMappingURL` 泄露审计。
- **标准离线 SourceMap v3 与崩溃堆栈反查工具（`dist/sourcemaps/` + `tools/decode_stack.py`）**：
  * 每次构建自动生成符合 Source Map Revision 3 标准的 `game.bundle.js.map`、`styles.css.map` 与 `symbols.json` 并单独归档至 `dist/ashen_bell_vow_<ver>_sourcemaps_OFFLINE.zip`，严禁打入公开 TapTap/itch 发行包；
  * 新增 `tools/decode_stack.py`，收到线上玩家报错（如 `L12:4832` 或堆栈文本）后可一键离线反查至精确原始 `src/*.js` 文件、行号、原符号名及源码上下文。

---

## v47.8 Boss 场地技能视觉与碰撞收口（射线截断光斑 + 圣光柱落地收口 + 有机荆棘地笼避台避孢伞）
- **射线触地/撞墙精确截断与灼烧光斑（`src/arenaHazards.js` / `src/render/arenaHazardRenderer.js`）**：
  * 新增 `clipRayToSolids()` 与 `getHazardArenaBounds()` 射线-实心体精确截断算法，统一接入终关 Boss「渊」的 **棱镜光束（`prismBeam`）**、**圣光十字阵（`radiantCross` 四向独立截断）** 及霜境守卫「凛」的 **悬冰剑阵（`iceLance`）**；
  * 渲染层与伤害判定线段 1:1 同步在地面、石壁与房间顶界终止，彻底消除光束穿地 `334–714px` 与穿墙 `282px` 现象，并在每个触地/撞墙交点绘制贴合表面法线的灼烧/寒霜光斑环与溅射火星。
- **终关 Boss「渊」圣光柱落地收口与顶部柔和淡入（`src/render/arenaHazardRenderer.js`）**：
  * `solarPillar` 严格收敛于房间顶部 `arenaTopY` 并施加 `82px` 纵向柔和淡入，不再向 `r17_frost_summit` 跨房溢出；
  * 底部由平切矩形升级为贴地扩口光柱 + 白金冲击光环底座与地面横逸光屑，落地观感浑然一体。
- **林境守卫「枯」荆棘地笼与地毯避台避孢伞 + 有机藤柱重绘（`src/ai/wardensAi.js` / `src/arenaHazards.js` / `src/render/arenaHazardRenderer.js`）**：
  * 新增 `getWardenSafeGroundSpan()` 动态避开地面两朵弹性孢伞与左右低矮平台，将 `brambleCage`（笼高收敛至 `132px`）与 `thornCarpet` 严格约束于树窟中央开阔区，彻底消除笼顶/血条穿高台及荆棘盖孢伞；
  * 重绘 `brambleCage` 为扎根泥土的双股缠绕尖刺藤柱与编织藤蔓拱门，并在合拢瞬间增加防夹刺平滑推离逻辑，防止主角被卡在 `18px` 笼壁正中。

---

## v47.7 视觉精修：修复熔浆火柱与高空光柱顶部平切“断柱”观感
- **重绘第二关 Boss「寂」熔浆火柱（`src/render/arenaHazardRenderer.js`：`moltenGeyser`）**：
  * 废除原先硬矩形 `fillRect` 导致的顶部平切“断柱”效果，重塑为**手绘三叉跳动火舌羽流**（外层赤橙熔焰 + 内层白金火芯 + 顶部自然纵向淡出至透明 + 3 枚向上逸散的跳动余烬火舌），预警态同步改为收尖火羽虚影轮廓；
- **全场地竖向光柱/风柱顶部无缝收口（`src/render/arenaHazardRenderer.js`）**：
  * 终关 Boss「渊」天降圣光柱（`solarPillar`）视觉顶端向上延展 `160px` 越出镜头上缘，杜绝高屏宽比视口出现顶部断口；
  * 「寂」天降锻链（`chainDrop`）起点嵌入穹顶石梁内部 `36px`；
  * 风境守卫「朔」罡风龙卷（`galeTornado`）顶部透明度自然衰减至 `0`，彻底消除硬边横切。

---

## v47.6 全境风井侧壁/顶板净空精修 + 悬灯/钩环防嵌板修复与自动化门控
- **修复全图扫描检出的 5 处风井、悬灯与钩环顶板/穿板隐患**：
  * **`r20_bell_galleries`（残钟阁）**：将风井 `wz_gal_1` 移至幽影暗阁外左侧（`x=680..820, y=130..620`），不再穿透暗阁底板 `pillar#10` 与右壁 `pillar#11`，顶部距天花板保留 `69px` 净空；将 `lan_gal_2` 迁出矮暗阁移至东中开阔空域（`x=1130, len=185`），彻底消除钩落脚部嵌板与磕顶。
  * **`r24_frost_seep`（霜渊冰窖）**：将上升风井 `wz_frost_seep_up` 收窄居中至 `x=686..814`（世界 `8626..8754`），左右距竖井两侧实心顶梁各留 `6px` 净空，消除贴壁上升擦头。
  * **`r23_cistern_lock`（断索水闸）**：将悬灯 `lan_cl_1` 移至幽影密室门外空域（`x=470, len=180`），修复灯绳穿透实心顶板 `pillar#11` 及密室内钩落磕顶问题，同时可辅助起跳穿影入室。
  * **`r07_ascent`（初钟圣阶）**：下层双钩环 `anc_asc_r1 / anc_asc_r2` 下移 `35px` 至 `y=1210`，头顶距上方实心厚楼板净空由 `25px` 增至 `60px`，连荡释放不再磕顶。
  * **`r09_wind_spire`（绝风断塔）**：中央风井 `wz_wind_3` 顶部由 `y=60` 微降至 `y=95`（`h: 295 → 260`），距上方千铃悬桥桥底留足 `68px` 缓冲。
- **新增自动化空间净空防回归门控（`verify_project.py` Law 0.5 / 0.5d / 0.5e，覆盖 NG1/NG2/NG3 全周目）**：
  * 强化 **Law 0.5**：同时拦截悬灯灯绳穿透实心墙柱/平台及悬灯钩落机身嵌实心块；
  * 新增 **Law 0.5d**：断言全图风井零侧壁重叠、零低顶板（`< 45px` 头顶净空）遮挡；
  * 新增 **Law 0.5e**：断言全图 73 枚钩环零机身嵌实心块且头顶至少保留 `35px` 净空。

---

## v47.5 紧急修复：盘根溶洞荧光孢伞顶墙卡死并穿房瞬移至沉钟回廊 Bug
- **问题根因**：
  * `r14_woods_cavern`（盘根溶洞）左侧竖井孢伞列（`bp_wc_up1 / mid / up2 / up3`）位于世界 `x=1470`，偏离上方 `r10_ink_woods` 竖井开口（`x=1260..1460`）右缘，导致顶部孢伞 `bp_wc_up3` 右半侧直接顶在实心天花板下方且弹起瞬间将主角头顶 `snap` 进 `r10_ink_woods` 地面内部 `11px`；
  * 当主角头顶卡入天花板并按左键脱身时，`resolveHorizontalAgainst()` 未校验上一帧 `prevX` 方向，误判为从右侧撞墙并将主角沿 `520px` + `1360px` 连续实心地面强行横推 `1880px`，直接穿房瞬移至 `r06_crypt`（沉钟回廊 · 残钟地窖）。
- **地图 + 物理引擎 + 门控三重根治**：
  * **对齐两处竖井孢伞（`data/rooms/r14_woods_cavern.json` / `r15_woods_heart.json`）**：将盘根溶洞竖井孢伞列整体左移至局部 `x=322`（世界 `1402`，完全避开右侧实心顶板 `1460` 并在左侧保留 `103px` 畅通下落通道，`bp_wc_up3` 下移至 `y=104`）；同步将全图扫描发现的古钟树窟出口孢伞列（`bp_wh_exit / mid / top`）由 `x=260` 右移至 `x=318`，完全避开上方 `r10_ink_woods` 左侧实心顶板并在右侧保留 `103px` 下落通道。
  * **引擎级防横推穿房（`src/physics.js` / `src/player.js`）**：`resolveHorizontalAgainst()` 引入 `prevX` 进入侧校验，垂直穿入实心块时严禁触发横向瞬移，并补齐 `vy === 0` 最小纵轴推离；孢伞起跳位置增加顶板碰撞截断，永不再把主角头顶塞进天花板。
  * **自动化防回归校验（`verify_project.py` Law 0.5c）**：对 NG1 / NG2 / NG3 三套世界自动断言所有荧光孢伞上方净空无实心顶板遮挡。

---

## v47.4 Boss 主题特色技全面重塑（第 3 步收官：Boss 2「寂」熔浆火柱/天降铁链 + 风/霜守卫空间大招）
- **扩展通用留场场地机关引擎（`src/arenaHazards.js` / `src/render/arenaHazardRenderer.js`）**：
  * 新增 5 类特色场地技能与手绘水墨几何预警渲染：`moltenGeyser`（熔金裂地预警 + 留场喷涌熔浆火柱）、`chainDrop`（穹顶铁链垂砸）、`galeTornado`（横穿全场的青白螺旋龙卷风柱）、`iceLance`（半空追踪后锁定贯刺的悬冰断剑）及 `frostPatch`（留场叠加寒霜与减速的锯齿冰晶带）。
- **第二关 Boss「沉渊铸钟师 · 寂」重塑为【熔炉铁链 · 留场火柱】主题（`src/ai/bossesAi.js`）**：
  * 开场首招必出 **熔浆火柱阵（`moltenGeysers`）**：地面裂纹预警 `0.78s` 后喷发 `3–4` 道高 `205px` 的留场熔浆火柱（留场 `4.0–4.6s`，保证 `≥ 165px` 安全缝隙）；
  * 新增 **天降锻链垂砸（`chainBarrage`）**：错拍召唤 `3–4` 道穹顶巨链铁锤重砸地面（二阶段落点追加残留火柱）；
  * 贴脸贪刀 4 下触发炉盾霸体震退并立刻衔接火柱或铁链压制，彻底破除贴身站撸。
- **风境守卫「截风巡塔使 · 朔」重塑为【罡风龙卷 · 俯冲风刃】主题（`src/ai/wardensAi.js`）**：
  * 开场首招必出 **罡风龙卷（`galeTornado`）**：`0.72s` 涡环方向预告后生成高 `265px` 的移动青白龙卷柱横扫全场（二阶段双向双龙卷），逼迫玩家二段跳越顶或幽影穿身穿风；
  * 强化高空风刃扇阵（`updraftBarrage`）至 `3–5` 道可弹反风刃；贴脸贪刀 4 下触发罡风震退后跃并立刻甩出龙卷反制。
- **霜境守卫「断剑霜侯 · 凛」重塑为【悬冰剑阵 · 寒域瞬闪】主题（`src/ai/wardensAi.js`）**：
  * 开场首招必出 **悬冰剑阵（`frostSwordArray`）**：半空扇弧浮现 `4–6` 柄晶莹寒冰断剑，先拉出冰蓝激光瞄准线追踪，随后白光锁定错拍齐射贯穿全场并叠加寒霜值；
  * 新增 **极寒冰域（`frostDomain`）**：震地铺设 `320–380px` 锯齿冰晶带留场 `4.8–5.4s`，踩踏快速叠霜并减速，迫使玩家借平台周旋；贴脸贪刀 4 下触发冰爆瞬移拉距并召唤悬冰剑阵。

---

## v47.3 多周目清爽化净化（已拥有神龛全面隐去 + 拾荒商人永久道具继承 + 过时/新手铭文自动静默）
- **全面隐藏已拥有的重复神龛（`src/state.js` / `src/combat/worldCombat.js` / `src/save.js` / `src/ui/progressionUi.js`）**：
  * 扩展 `syncOwnedAbilityPickups()`：除已习得 4 项移动绝技与已解锁兵刃外，同步在开启多周目、读取旧存档及实时拾取满上限后，自动隐藏 **3 处已持有的三境铭印神龛（`realmSeal`）**、**6 处已解锁的世界圣物神龛（`relic`）** 以及 **满 6 瓶上限后的 4 处灯油残芯（`flaskCore`）**；
  * 修复重复拾取已拥有圣物（`ironheart / clapper`）或满灯油残芯（`pickup_flask_abyss`）时意外叠加 `bonusMaxHp / bonusMaxSoul` 的隐性漏洞。
- **修复拾荒商人永久道具漏继承 Bug（`src/ui/progressionUi.js`）**：
  * `startNewGamePlus()` 完整继承 `metScavenger`、`boughtSecretMap`（暗墙秘图）与 `boughtBellSatchel`（古钟囊袋 +15 血/魂），进入二、三周目不再丢失暗墙标记与血蓝上限。
- **清理 17 条多周目过时与纯新手操作铭文（9 个房间 JSON + `src/render/worldRenderer.js`）**：
  * 为 4 条神龛指向铭文补齐精确消失条件：`r03_chapel`（`hideWhenGrappleHook`）、`r04_bell_well`（`hideWhenDoubleJump`）、`r02_corridor`（`hideWhenFlaskMax` + `hideWhenPickup`）、`r07_ascent`（`hideWhenDawnSigil`）；
  * 为枯骨长廊、沉渊钟井、铸钟殿、残钟地窖、绝风断塔、枯墨古林与霜骸圣脊共 **13 条纯一周目操作教学铭文** 标记 `hideInNgPlus: true`，二、三周目自动静默（完整保留全部世界观碑文与区域路线指向）。

---

## v47.2 浮空怪防穿柱体碰撞 + 多周目已习得技能/兵刃神龛去重热修
- **修复图 1 枯骨长廊提灯鬼火穿进带刺柱体（`data/rooms/r02_corridor.json` / `src/physics.js` / `src/ai/enemiesAi.js` / `src/ai/biomeEnemiesAi.js` / `src/ai/exoticEnemiesAi.js`）**：
  * 将 `r02_corridor` 的 `wraith_1` 由紧贴柱体右侧 `2px` 的 `(480, 315)` 移至开阔空域 `(575, 365)`，巡航摆幅全程远离 `pillar#6`（`x=440..478`）；
  * 在 `src/physics.js` 新增 `resolveFlyingEnemySolids(ent)` 实心墙柱推离解算，全面接入 `wraith / cantor / falcon` 三类浮空敌兵，同时为鬼火受惊瞬移补充实心碰撞与视线校验，杜绝全图任何浮空怪穿模进石柱或封闭闸门；
  * `verify_project.py` 新增 **Law 0.5b** 自动化校验，在 NG1/NG2/NG3 三套世界下断言零浮空怪巡航轨道穿实心墙柱。
- **修复图 2 多周目已拥有钩锁/移动绝技或兵刃仍重复刷出神龛（`src/state.js` / `src/ui/progressionUi.js` / `src/save.js`）**：
  * 新增 `syncOwnedAbilityPickups(ws)`，在开启二、三周目（`startNewGamePlus`）及读取已有存档（`applySaveData`）时，自动将主角已掌握的 4 项移动绝技（钩锁/墨翼/穿影/镇岳下砸）与已解锁兵刃神龛标记为已收集，不再在断钟礼拜堂等房间重复刷新；旧 NG+2/NG+3 存档读档即刻生效。

---

## v47.1 紧急热修：第二关 Boss 残誓回响「风井浮空逃出屏幕 + 黑屏遮罩卡死」修复
- **问题根因**：主线开启过铸钟殿高速风井（`foundryValveOpen`）后，在祭坛开启「残誓回响 · 沉渊铸钟师」挑战时，场地内 `wz_foundry_express` 强上升气流仍保持激活且头顶风阀闸门未重新闭合，导致玩家刚向右走即被气流直冲顶出铸钟殿天花板进入上方 `r09_wind_spire` / `r12_wind_bridge`；而镜头仍锁死在 Boss 2 所在 `r05_foundry`，触发房间遮罩将整个屏幕逐渐拉黑卡死。
- **四重根治（`src/state.js` / `src/physics.js` / `src/worldCamera.js`）**：
  * `isWindZoneActive()` 在 Boss 2 激战或残誓回响期间自动关闭 `wz_foundry_express`（同步关闭风境回响时的 `wz_mirror_ascent` 顶井气流）；
  * `refreshDynamicBlockers()` 在 Boss 2 激战或残誓回响期间强制重新闭合铸钟殿顶闸 `FOUNDRY_VENT_GATE_DEF`（同步封锁镜渊顶闸）；
  * `moveAndCollide()` 为全部已唤醒 Boss 补齐纵轴顶部天花板钳位（`ent.y >= activeBoss.arenaTopY`），杜绝任何招式或气流将角色顶出战场上方；
  * `updateRoomVisibility()` 强制将当前激战 Boss 所在房间常驻加入 `visibleRoomIds`，彻底杜绝 Boss 战镜头被房间遮罩拉黑。

---

## v47.0 Boss 主题特色技全面重塑（第 1 步 + 第 2 步：通用场地机关引擎 + 林境荆棘地笼 + 终关圣光审判 + Boss AI 模块拆分）
- **第 1 步 · 通用留场场地技能框架（`src/arenaHazards.js` / `src/render/arenaHazardRenderer.js` / `src/physics.js` / `src/combat/playerCombat.js` / `src/world.js` / `src/renderer.js`）**：
  * 新增 `G.arenaHazards` 四态生命周期框架（`几何预警 telegraph → 实体激活 active → 渐变退场 fade → 自动随 Boss 死亡/脱战清理`）；
  * 支持**物理阻挡且可破坏**的场地实体（`brambleCage`）：阻挡主角走位，但可通过挥砍/重击/法术劈碎（破笼返还 `+18 魂火`）或直接以 **幽影穿身** 穿出；
  * 新增延迟充能追踪光球 `radiantOrb`，支持完美弹反归元反伤与高额削势。
- **第 2 步 · 林境守卫「盘根古钟精 · 枯」重塑为【荆棘倒刺 · 囚笼控场】主题（`src/ai/wardensAi.js`）**：
  * 开场首招必出 **荆棘地毯（`thornCarpet`）**：`0.72s` 翠绿地裂预警后生出长达 `350–430px` 的密排锯齿倒刺并留场 `5.2–6.0s`，踩踏持续掉血并附带减速，逼迫玩家借高台空战；
  * 新增 **可破坏荆棘地笼（`brambleCage`）**：两侧合拢藤蔓虚影预警 `0.78s` 后锁死主角于 `192px` 窄区，并立即在笼心追加穿地根刺逼迫破笼或穿影脱身；
  * 升级 **穿地根刺三连/四连（`rootEruption`）** 为带地面靶环预警的 `rootSpike`；贴脸贪刀 4 下触发霸体震退并立刻甩出地笼/地毯反制站撸。
- **第 2 步 · 第三关终关 Boss「初钟圣骸 · 渊」重塑为【圣光审判 · 棱镜光束】主题（`src/ai/endgameBossesAi.js` / `src/render/bossRenderer.js`）**：
  * 将 `src/ai/bossesAi.js` 拆分为 `bossesAi.js`（共享机制 + 晦/寂）与 `endgameBossesAi.js`（渊/铸），全工程 72 模块零循环依赖、零 `[OVER]` 超限告警；
  * 一阶段开场首招必出 **天降圣光柱（`solarPillars`）**：全屏降下 `3–5` 道带收缩光轨与地面圣印预告的灼热圣光巨柱（保留 `≥ 145px` 安全缝隙）；
  * 新增 **光翼棱镜扫射（`prismSweep`）**：渊浮空展开圣光翼，经 `0.76s` 瞄准激光与扇区预告后释放白金光束横扫全场（二/三阶段双翼对扫）；
  * 新增 **圣光十字斩阵（`radiantCross`）**：悬空凝结圣印延迟引爆全屏「十」字激光（二/三阶段升格为「十」→「×」两拍交替爆发）；
  * 新增 **光球星环（`haloOrbs`）**：围绕自身亮起 `4–6` 枚金白圣光球依次齐射，可精准弹反打回渊造成高额削势；贴脸贪刀 4 下触发光羽震退瞬移拉开距离并衔接圣光审判；同步强化 `drawBoss3` 的黎明圣光轮与施法日芒特效。

---

## v46.9 启动黑屏语法报错热修 & 全工程词法作用域防回归门控
- **修复 `v46.8` 启动黑屏 `Script error.`（`src/player.js`）**：
  * 修复 `updatePlayer()` 中瀑布检测（L1006）与 Boss 激活检测（L1225）在同一词法块内重复声明 `const pMidX` 引发的 `SyntaxError`（重命名为 `bossChkX`）。
- **全工程 69 模块 + 离线单包同名 `const`/`let` 词法作用域全量复核与永久门控（`tools/build_release.py` / `verify_project.py`）**：
  * 新增精确 ES6 词法作用域扫描器 `scan_duplicate_lexical_decls()`（完整配平 `${ ... }` 模板插值、块级作用域、解构赋值、`import` 与函数/箭头参数），复核全部 69 个 JS 模块、`sw.js` 及编译后 44,458 行 `game.bundle.js` 零重复声明；
  * 已永久接入 `verify_project.py` 与 `tools/build_release.py` 的 `audit_bundle_syntax()`，杜绝同名 `const`/`let` 解析错误再次流入发行包。

---

## v46.8 多周目体验重构（无缝过关、保留全移动绝技、修复四 Boss 动态激活、NG2 蚀月大师模式）
- **去掉中途 Boss 结算弹窗（`src/combat/damageCombat.js`）**：
  * 主线击杀 **晦（Boss 1）** 与 **寂（Boss 2）** 不再弹出中断节奏的结算菜单，保留慢动作、钟鸣与开门横幅后直接无缝踏入下一区域；仅终关 **渊（终誓抉择）**、隐藏终关 **铸** 及 **残誓回响挑战** 保留结算菜单。
- **二、三周目完整保留主角全部移动绝技（`src/ui/progressionUi.js` / `src/combat/worldCombat.js` / `src/locales/ui*.js`）**：
  * `startNewGamePlus()` 完整继承 `grappleHook / doubleJump / shadeDash / bellDive`，不再强迫玩家在多周目重走开荒锁技；
  * 重复拾取已习得的技能神龛自动转为「绝技共鸣」发放 `+220 × 周目倍率` 残响，保持探索收益。
- **彻底修复四 Boss 激活触发区间（`src/player.js` / `src/ai/bossesAi.js` / `src/ui/progressionUi.js`）**：
  * 移除 `src/player.js` 中残留的 `2740..3760` / `5650..6720` / `8450..9660` 硬编码 X 触发区以及 Boss 4 偏单侧触发条件，统一改为基于 `arenaMinX + 75 .. arenaMaxX - 75` 的动态双向对称激活，无论从左门还是右门进场均可稳定唤醒。
- **NG2 取消镜像，改版为方案 A「蚀月大师模式」（`tools/assemble_worlds.py` / `src/levelLoader.js` / `src/save.js` / `src/locales/world.js`）**：
  * **NG2 (`ng2_eclipse` · 蚀月大师)**：恢复正向 25 房布局，全境 **17 处小怪重编为跨生态高阶混编小队**（长廊/钟井/地窖/古林/绝风/霜脊/雨阶/水牢），增设 **3 道扫荡暗蚀结界**（专配继承的幽影穿身）、**2 处蚀月专属残响匣（+120）** 与 2 对同层级圣物台重排；
  * **NG3 (`ng3_skyway` · 苍穹长桥)**：在完整承袭 NG2 蚀月大师编队与机关的基础上，接入第 26 号高空模块 `r26_sky_span`（附带高空扫荡结界）与巅峰驻守升级；
  * 旧版镜像 NG2 存档读取时自动双向校准迷雾网格列，零坏档风险。

---

## v46.7 跨房柱体错位与柱帽接缝合并 + 全图悬灯穿平台彻底清理
- **修复图 6 霜脊/冰冢/圣心三房交界双柱错位与穿模（`data/rooms/r08_heart.json` / `r11_frost_ridge.json` / `r16_frost_tomb.json`）**：
  * 收拢 `r08_heart` 东侧封墙柱宽度（`60 → 40px`），不再溢出房界 `20px` 穿进 `r16_frost_tomb`；
  * 移除 `r11_frost_ridge` 错位 `40px` 且纵向交叠 `20px` 的东侧门楣柱，并将 `r16_frost_tomb` 西壁巨柱向下无缝延展至门洞顶（`h: 760 → 960`，世界 `y=0..960`），彻底消除双柱错位穿插。
- **全境柱体四向接缝与柱帽自动合并（`src/levelLoader.js` / `src/renderTerrain.js`）**：
  * 水合阶段自动扫描所有 `pillar` 的 `seamTop / seamBottom / seamLeft / seamRight` 贴合状态；
  * `paintPillarSolid()` 据此自动隐藏埋入相邻柱体/地面的内侧柱帽、柱基与假接缝描边，并在并排贴合侧（如铸钟殿与圣阶交界双壁）将柱帽齐平收口（`pad = 0`），彻底根治跨房柱帽十字穿模。
- **全图悬灯穿平台扫描与 6 处修复（覆盖 NG1 / NG2 / NG3 全周目）**：
  * 修复 **3 处灯体嵌平台**：`r16_frost_tomb` 的 `lan_ft_1`（上移悬停于雪平台上方 `70px`）、`lan_ft_2`（改为自上层平台 `y=642` 底面垂挂并高出下层平台 `65px`）及 `r11_frost_ridge` 的 `lan_frost_2`（左移至 `x=865, len=125` 远离平台角）；
  * 修复 **3 处灯绳穿平台**：`r02_corridor` 的 `lan_1` / `lan_3`（改为自上方平台底面 `y=277` 自然垂挂）及 `r14_woods_cavern` 的 `lan_wc_1`（右移至 `x=480` 避开上层平台边缘）。
- **新增自动化地形美学门控（`verify_project.py` Law 0.5）**：对 NG1 / NG2 / NG3 三套世界同时断言「零竖向柱体内部重叠/短错位」与「零悬灯灯体及灯绳穿平台」。

---

## v46.6 全地面与垂挂敌兵 AI 防卡死重构（防坠崖、撞墙跃阶脱困、孢伞防循环弹怪与边界脱战）
- **统一地面敌兵运动防卡死管线（`src/physics.js`：`hasWalkableAhead` / `findClimbableStepY` / `findWalkableFloorSpan` / `canEnemyAggro` / `moveGroundEnemyWithGuard`，全面接入 9 类地面怪）**：
  * **防坠崖（Ledge Guard）**：巡逻触及平台边缘自动折返，追击触及悬崖停止盲走并定时脱战回撤；`墨丝织蛛` 后跳吐丝（`webShot`）前检测背后是否有实心地面，濒临悬崖时改为原地吐丝，不再自行后跳坠入孢伞坑。
  * **撞墙跃阶与脱困（Step-Up Vault & Wall Escape）**：敏捷地面怪（`weaver / duelist / sentinel / frostguard / drowned`）追击撞墙时自动探测前方 `≤ 88px` 可登高台阶与净空，自动起跳翻越（如盘根溶洞 `70px` 水池台阶）；若被不可翻越的高墙阻挡超过 `0.72s`，自动脱战折返巡逻；`weaver` 垂丝扑击（`silkDrop`）撞墙即弹开收招，杜绝墙角滑落死循环。
  * **边界脱战与防原地空跑（Boundary Leash De-Aggro）**：抵近 `minX / maxX` 边界且玩家超出攻击射程时停止原地空跑，持续 `0.65s` 后自动切回巡逻并附带 `2.4s` `deaggroTimer`（若玩家贴身或攻击则立即清零反击），彻底修复霜骸圣脊寒戟卫隔缝贴空气墙空跑的问题。
  * **跌落动态重锚（Dynamic Floor Re-Anchor）**：敌兵若被玩家击飞跌落到下方楼层（高度差 `> 68px`），自动扫描新楼层连续可行走区间重设 `minX / maxX`，防止被旧平台狭窄范围锁死在坑底。
- **荧光孢伞防无限循环弹怪（`src/ai/enemiesAi.js`：`applyEnemyBiomeCoupling`）**：
  * 孢伞弹飞敌兵时附加 `190–235 px/s` 横向推离速度使敌兵脱离伞面落回平地；若 `3.0s` 内连续弹飞 2 次，自动赋予 `2.6s` 孢伞免疫冷却，杜绝无限垂直蹦床。
- **倒挂墨蛭防半空卡态与坠井回收（`src/ai/enemiesAi.js`：`updateLeech` / `updateEnemyLaunchPhysics`）**：
  * 为 `drop` 增加 `1.18s` 最大下落时长与 `360px` 深度熔断，失手坠入深井自动拉丝回巢；`climb` 状态按实际距离动态计算回巢时限并纳入空中免疫，避免风场/击飞干扰导致悬空卡态；空中失衡结束直接转入 `climb` 而非半空 `crawl`。

---

## v46.5 P2 钩锁交互升级（多目标候补圈 + 推摇杆切锁清脆反馈音 + 可钩敌兵突袭提示）
- **多目标候补圈与更灵敏的方向切锁（`src/combat/playerCombat.js` / `src/state.js` / `src/render/worldRenderer.js`）**：
  * `findBestGrappleTarget()` 同步输出射程与视线内的全部有效钩点与敌兵至 `G.grappleCandidates`（最多 6 个），主动推摇杆或方向键时收紧方向锥权重并降低黏滞回滞（`0.88`），让玩家可随心挑选任意钩点或敌兵；
  * `drawGrappleReticle()` 在所有非主锁定的候补目标上绘制低干扰虚线候补圈，存在 2 个及以上可选目标时在主准星两侧亮起微弱方向箭头，直观传达“推方向可切目标”。
- **切锁清脆听觉与收缩环反馈（`src/audioSfxBank.js` / `src/audio.js` / `src/player.js`）**：
  * 离线烘焙 `grapple_tick` 短促清脆青铜锁扣声（`0.08s`，限频 `95ms` 防疲劳），推方向切换锁定目标或首次锁中敌兵时自动响起并触发 `0.14s` 收缩锁定环（`grappleLockSnapTimer`）。
- **可钩敌兵视觉识别与战术强化（`src/render/worldRenderer.js` / `src/player.js` / `src/locales/uiZh.js` / `src/locales/uiEn.js`）**：
  * 射程内的候补敌兵胸口亮起枯金虚线圈 + 双向箭头徽标；主锁定敌兵时准星切为**枯金外弧 + 朱红内菱 + `钩锁·突袭` 铭牌**，与普通跑图钩环彻底区分；
  * 钩索命中处于读条/前摇的远程与浮空怪（`wraith / priest / cantor / weaver / falcon`）直接打断其招式并提升削势至 `24`（暗影加成 `42`），确立钩索“空中突袭 + 打断高台远程”的独特战斗价值。

---

## v46.4 P1 界面审美全面重塑（去 AI 网页风 · 全线描 SVG 纹章 + 玄墨宣纸枯金碑刻体系 + 文案瘦身）
- **零彩色系统 Emoji → 统一自绘线描 SVG 纹章（`src/emblems.js` / `index.html` / `src/ui/relicBoardUi.js` / `src/ui/skillTreeUi.js` / `src/ui/modalsUi.js` / `src/locales/uiZh.js` / `src/locales/uiEn.js`）**：
  * 在 `src/emblems.js` 新增 13 枚极简手绘单色线描 SVG 图标库 `UI_ICONS`（舆图、残卷、兵刃、圣物、钟誓、鸣钟、齿轮、妖魔、锁印、雷印、轮回、统计、全屏）；
  * 彻底清除全界面 `📜 🗺 ⚔ ⚑ 🔔 ⚙ 👹 ⚡ 🔄 📊 🔒 ⛶ ⚠` 等系统彩色 Emoji，统一替换为 `14×14` 枯金/宣纸线描 SVG；`index.html` 按钮文字独立包裹 `<span data-i18n>` 保证双语切换零图标丢失。
- **「玄墨 · 宣纸 · 枯金」碑刻视觉重构（`styles.css`）**：
  * 全弹窗与面板告别现代 Web 后台的大圆角（`12–16px`）与多彩霓虹蓝紫边框，统一收束为 **`2px` 锐利石碑方角 + 外枯金发丝边与内宣纸双线框**；
  * 标题区配渐变枯金细线，页签去大圆胶囊改为**枯金下划线碑刻页签**，所有主/副按钮、移动端顶部按钮与交互铭牌同步收拢为玄墨铜边方角铭牌，视觉与手绘水墨世界高度统一。
- **弹窗文案瘦身（`src/config.js` / `src/locales/entities.js` / `src/locales/uiZh.js` / `src/locales/uiEn.js`）**：
  * 全面精简祭坛、铁匠、演武台、钟誓制约（4 条）及终誓抉择（双结局）中英文描述，消除冗长“说明书感”，凝练为古雅易读的短句。

---

## v46.3 P0 战斗深度与交互可读性紧急修复（攻弹合一防盲点漏洞修复 + 交互光柱显眼化 + 全局唯一防重叠提示）
- **根治移动端「攻弹合一」100% 无缝无敌拼刀漏洞（`src/combat/playerCombat.js` / `src/combat/damageCombat.js` / `src/entities.js` / `src/player.js`）**：
  * 定位根因：此前断刃轻击冷却 `150ms`，而攻弹合一每次挥刀均赠送 `165–240ms` 拼刀窗，导致手机端狂点普攻即全程无敌，一路平A砍死 Boss、闪避与法术沦为摆设；
  * **防盲点节拍机制**：近战拼刀窗收紧至 **`95–118ms`**，且仅在**主动起手首刀（`slash1 / air1 / dashAttack / up / pogo`）且冷却归零（`clashParryCd: 0.44s`）** 时触发，连段盲点 `L2/L3/H4` 不再送拼刀无敌；
  * **保留打铁连弹手感**：一旦真正成功拼刀（近战拼刀或挥斩弹反弹幕），立即清零 `clashParryCd` 并开启 `0.52s` 连弹窗（`clashChainTimer`）与归零攻击冷却，顺着 Boss 多段连招精准单键 `叮-叮-叮` 依然丝滑，而无脑乱砍会被 Boss 技能与红光技扎实惩罚，重新激活闪避与法术的价值。
- **高对比常驻交互光柱与动态信标（`src/render/worldRenderer.js` / `src/render/puzzleRenderer.js`）**：
  * **熄灯祭坛（存档点）**：无论已点燃或未点燃，均新增柔和呼吸的**垂直光柱（195–225px）+ 中心光丝 + 底座光环 + 飘升萤火**（未点燃时以醒目的冷金白光柱召唤玩家靠近点亮），半屏之外一眼可见；
  * **秘宝/能力拾取物、未读残碑与未拉机关**：统一补齐分色垂直微光束、底座光环与上升光尘（残碑阅读后微光自动收敛以区分已读/未读），彻底与背景装饰物拉开层次。
- **全局唯一聚焦交互提示（彻底杜绝文字挤成一团，`src/combat/worldCombat.js` / `src/render/vfxRenderer.js` / `src/ui/hudCore.js` / `src/player.js`）**：
  * 新增统一最近目标选择器 `findNearestInteractable(px, py)`，场景浮标、移动端底部交互胶囊与实际交互按键 100% 锁定同一个最近目标；
  * 移动端取消画面中悬浮的大段文字框（避免多交互点文字撞车），改为在当前聚焦对象正上方绘制极简**菱形聚焦指针**，具体交互动作清晰交由底部唯一胶囊承接；PC 端严格只显示距离最近的唯一 1 枚提示条。

---

## v46.2 移动端视野极限瘦身、弹窗错位修复与护眼斩杀特效重构
- **步骤 1 · 护眼斩杀与闪光重构（`src/renderer.js` / `src/world.js` / `src/combat/playerCombat.js` / `src/combat/damageCombat.js` / `src/state.js` / `src/save.js` / `src/ui/modalsUi.js`）**：
  * 废除默认处决全屏 `difference` 差值反色闪白（`#f5f2ea`）与 Boss 击杀浅白黄铺屏（`#fef9c3`），改为 **`execKillFocus` 局部斩杀聚焦**——在受击点爆发局部红/金径向光爆与斜向斩裂线，同时外围水墨暗角瞬缩压暗 `160–240ms`，降低屏幕平均亮度且对比度更凌厉；
  * 默认 **柔和护眼（`soft`）** 模式下，全屏 `screenFlash` 映射为深琥珀金/原色外围边缘微晕（中心 48% 通透、透明度封顶 `≤ 0.11`、衰减速率提速至 `dt * 3.4`）；
  * 设置页新增 **「闪光与斩杀特效（护眼）」** 三档切换（`柔和护眼 (默认)` / `关闭闪光` / `经典`）。
- **步骤 2 · 移动端 HUD 极限瘦身、折叠小地图与低干扰键位（`styles.css` / `index.html` / `src/ui/hudCore.js` / `src/input.js` / `src/main.js`）**：
  * 左上角 `.player-status` 去除不透明厚底黑框与 6 枚折行被动能力文字大框及重复武器栏，压成 `192px` 无框 2 行极简条（圆角细血/魂条 + 可点击迷你 `灯油 ●●●` + 极简墨印菱形 + `✦ 残响`）；
  * 右上角默认隐藏常驻 `#zone-banner` 与小地图，收拢为单行半透明胶囊（`🗺` / `设置` / `暂停`），点击 `🗺` 直接打开全屏舆图（设置页新增「右上角常驻小地图」开关可按需重新开启微缩版）；
  * 右下角键位收紧尺寸（主钮 `76px`、内圈 `54–56px`、`切刃 42px` 收拢至最右边缘 `钩锁` 上方），常态透明度默认降至 **`65%`**（按下/满蓄/满印奥义瞬间高亮 `100%`），`#fan-seal` 仅在满印奥义或贴符可爆时浮现，彻底解放中右部视野。
- **步骤 3 · 老铸钟匠与终誓抉择移动端弹窗修复（`styles.css` / `src/ui/skillTreeUi.js`）**：
  * 修复 `#smith-modal` 标题上半截裁切、`× 返回` 压住 `当前持有残响` 及右侧被 TapTap 悬浮胶囊遮挡的问题（单行顶栏 + 残响徽标紧贴头像左侧 `order: 2` + 隐藏移动端冗余底部关闭钮，实现零滚动一屏展示）；
  * 修复 `#skill-preview-canvas` 在移动端因 `height: auto` 被 `overflow: hidden` 截掉下半截主角与地板导致演示框空白的问题（改为 `height: 100%; object-fit: contain` 完整呈现 208×116 动作演示）；
  * 移动端隐藏 `#ending-choice-modal` 顶部重复的 `× 暂缓抉择` 按钮，由底部主按钮承接并让双结局卡片居中更舒展。

---

## v46.1 多周目拓扑重构 · 阶段 3（运行时三周目无缝切图 + 离线三世界打包 + 旧存档兼容）
- **运行时多周目无缝切图与缓存（`src/levelLoader.js` / `src/state.js` / `src/main.js`）**：
  * 新增 `ensureWorldForCycle(cycle)`、`getWorldVariantKeyForCycle(cycle)` 与 `getWorldVariantLabel(cycle)`：一周目加载 **NG1（经典东征 · 25房）**、二周目无缝切入 **NG2（倒影逆钟 · 25房全图镜像）**、三周目及以后切入 **NG3（苍穹长桥 · 26房高空连桥）**，并缓存已载入世界防止重复拉取。
  * 标题页启动与读档继续（`continueSavedGame`）、开新档（`startGame`）、祭坛/结局踏入下周目（`startNewGamePlus`）均按目标周目自动完成世界水合，且在镜像周目（NG2）起点出生/复活时自动朝左面向枯骨长廊出口，同步刷新 `createFoundryCrucibles()`。
- **离线单包全三周目内联（`tools/build_release.py` / `sw.js`）**：
  * `tools/build_release.py` 将 NG1 / NG2 / NG3 三套世界同时内联为 `window.__ABV_OFFLINE_WORLDS__`（保留 `window.__ABV_OFFLINE_WORLD__` 向后兼容），TapTap / 4399 离线 H5 包无需联网即可畅玩三周目异构地图；PWA `sw.js` 同步预缓存三套世界清单。
- **存档完全兼容 + 双语周目世界标识（`src/save.js` / `src/ui/hudCore.js` / `src/ui/relicBoardUi.js` / `src/ui/mapUi.js` / `src/ui/progressionUi.js`）**：
  * 存档新增 `worldVariant` 标记：旧版一周目存档零改动直读，旧版二周目存档自动切入 NG2 并水平翻转已探索迷雾格子以精准对齐镜像房间；
  * 标题页存档槽、祭坛轮回预览条/确认框、结局下周目按钮、周目开场大横幅与大地图副标题全面展示当前/即将进入的世界拓扑名（`经典东征 / 倒影逆钟 / 苍穹长桥`）。

---

## v46.0 多周目拓扑重构 · 阶段 2（离线多周目拼装管线 + 4 项几何防堵墙断言 + NG2/NG3 预烘焙）
- **新增零依赖离线拼装管线 `tools/assemble_worlds.py`（自动接入 `tools/build_release.py` 构建前序步骤）**：
  * 确立 **7 大不可拆分复合生态组块**（`A_Prologue` / `B_BellWell` / `C_WoodsCrypt` / `D_WindSpire` / `E_AscentHeart` / `F_FrostRidge` / `G_Cistern`），将内部环路、隐藏房与单向活板闸绑定于宿主组块内，从根源杜绝改乱或堵死。
  * **NG1 (`data/worlds/world_ng1.json`)**：冻结 25 房基准经典东征箱庭（零差异校验锁定）。
  * **NG2 (`data/worlds/world_ng2.json` + `data/worlds/ng2_rooms/*.json` · 倒影逆钟)**：全图 25 房精确 X 轴水平镜像（覆盖全部 31 类地形/实体/滑墙/风场/贴图/巡逻区间与 Boss 场地边界），并重配 4 处中前期精英化驻兵与 2 对同层级圣物台（保持防软锁能力链零变动）。
  * **NG3 (`data/worlds/world_ng3.json` + `data/worlds/ng3_rooms/*.json` · 苍穹长桥)**：新增第 26 号高空模块 **`r26_sky_span`（绝风苍穹 · 苍穹断桥，`1135×740`）** 填平 `r18_rain_steps ↔ r20_bell_galleries` 断层并雕刻双端 `180px` 净空门洞（附带风场、钩环、风隼/金钟执灯侍、苍穹残响匣与完整双语本地化），形成贯穿东西的屋顶高速环线，同时不破坏 Boss 1 / Boss 2 防绕过法则。
- **升级 `verify_project.py` 为多周目 4 项硬性几何防堵墙校验 + 5-Tier 全通 BFS（同时覆盖 NG1 / NG2 / NG3）**：
  1. **Geo-1**：零房间内部重叠、100% 双向对称邻接与物理接缝接触；
  2. **Geo-2**：所有横向共享接缝净空门高 **`≥ 84px`** 且双侧 `160px` 内必有可站立落脚点；
  3. **Geo-3**：所有纵向竖井净宽 **`≥ 90px`** 且底部弹垫不阻塞下落通道；
  4. **Geo-4**：全局外边界密封检测（无 `> 100px` 踏空漏风缺口）、全道具完整性 + 三套世界 5-Tier BFS 全部 0 软锁、0 越序绕过。
- **同步补强 `src/render/worldRenderer.js`**：Boss 战雾墙 `drawMistBarrier()` 原生适配 `room.mirrored`，镜像周目下自动贴合东侧入口。

---

## v45.9 多周目拓扑重构 · 阶段 1（全引擎硬编码世界坐标彻底解耦）
- **核心架构解耦（零一周目玩法/视觉回归，为阶段 2 多周目组块拼装与水平镜像打底）**：
  * **统一房间相对坐标基元（`src/state.js` / `src/levelLoader.js`）**：新增 `getRoomById`、`roomLocalX`（原生支持 `room.mirrored` 水平镜像）与 `roomLocalY`；`hydrateWorldBundle()` 动态水合 `FIRST_BELL_CORE_POS`、各房间 `PUDDLES` 真实地面 Y（同步修复雨阶/钟楼/水牢水洼与踩水波纹）及 `BONE_CAIRNS` 自动贴地 Y（修复地窖/古林/霜脊骨堆浮空）；`createFoundryCrucibles()` 改为相对 `r05_foundry` 房间边界动态生成。
  * **世界背景地标 100% 绑定宿主房间（`src/render/worldBackdropRenderer.js` / `src/render/renderShared.js`）**：熄灯祭坛石拱、哥特长窗、坍塌雨夜礼拜堂、熔金铸造坑齿轮与铜瀑、星渊天台、炉心镜渊圣环（同步点亮 `r25_mirror_abyss` 本体圣环背景）、绝风热气栅、霜脊雪融瀑布、古林渗水渠与千年钟树洞、墓碑群全部改为相对 `room.bounds` 绘制并支持镜像翻转。
  * **全 Boss AI 与残誓回响出生点去硬编码（`src/ai/bossesAi.js` / `src/ui/progressionUi.js` / `src/world.js` / `src/render/vfxRenderer.js` / `src/render/worldRenderer.js` / `src/render/cinematicRenderer.js`）**：Boss 1/2/3/4 所有冲击波、全屏墨潮、悬停换位与吊灯联动（动态查询本房悬灯）全面改读 `b.arenaMinX / arenaMaxX / arenaFloorY`；7 场残誓回响（四主 Boss + 三境镇守）自动按 `BOSSES_DEF` / `ENEMIES_DEF` 推导对侧落点与朝向。
  * **动态地表与环境水洼解耦（`src/renderTerrain.js` / `src/player.js` / `src/worldCamera.js`）**：草叶、水洼、低空墨雾（移除 `x < 4140` 写死）与雨滴涟漪全部改为按所属房间坐标实时计算。

---

## v45.8 新手起点练习房净化与全图未解锁钩点视觉降噪
- **全图未获得钩锁前的钩点视觉降噪（`src/render/worldRenderer.js`）**：
  * 未拾取「幽丝钩索」前（含击败 Boss 1 但尚未拾取技能的情形），全图所有钩点均渲染为**无光效、无脉冲、无金点的暗淡普通铁环**，避免误导新手以为漏按了某个按键；
  * 同时屏蔽未解锁钩锁时的 `grapple` 动态按键铭文，拾取钩锁后全图钩环瞬间以青金灵光唤醒。
- **起点房间 `r01_sanctuary` 净化为纯粹平地练习关（`data/rooms/r01_sanctuary.json`）**：
  * 彻底移除起点所有空中台阶、石柱、悬灯、滑墙、破壁隐藏房、暗蚀结界、钩点与 4 条能力锁铭文，地面拉通为纯平练武场（仅保留 **熄灯祭坛 + 老铸钟匠·砺 + 青铜演武钟偶**）；
  * 完整保留方案 B 上方 `r19_belfry_outer` 后期开闸一落到底的单向回坛捷径，以及下方 `r10_ink_woods` 后期古林归坛活板门（地面平接零违和）。
- **三枚起点遗留圣物自然迁移并同步线索（旧存档 100% 兼容）**：
  * `pickup_relic_bell`（幽丝断钟）→ 迁至 **`r19_belfry_outer` 断索钟楼**中上层平台；
  * `pickup_relic_core`（苍穹秘宝 · 古钟心核）→ 迁至 **`r18_rain_steps` 淋雨墓阶**高空苍穹平台（同步更新 `r04_bell_well` 铸钟匠遗碑与墨翼步中英文线索）；
  * `pickup_relic_shade`（暗室秘宝 · 幽影钟幕）→ 迁至 **`r06_crypt` 残钟地窖**「幽影穿身」正下方暗蚀结界暗室内，习得穿影即可就近获取。

---

## v45.7 iOS WKWebView / Safari 专项加固（地形与背景显存 LRU 回收 + 防长按系统弹框）
- **地形块与背景架构离屏画布显存 LRU 回收（`src/renderTerrain.js` / `src/render/backdropCache.js`）**：
  * 自动识别 iOS / iPadOS WebKit 环境，将地形块与建筑背景离线烘焙倍率上限收敛至 **`1.5×`**（节省 44% 单块显存的同时保持视网膜清晰度）；
  * 为 `_chunkCache` 与 `_panels` 接入 **O(1) LRU 淘汰队列**（iOS 上限 **10 块地形 + 8 块背景**，Android 16 块、PC 32 块），空块独立记录于零显存 `_emptyChunks`；
  * 每次淘汰或清空缓存时显式将离屏画布设为 **`width = 0; height = 0`** 立即归还 WebKit IOSurface GPU 显存，根治 iPhone 长时间连续跑图触发系统 Jetsam 强杀白屏。
- **iOS 防长按弹框、防误选与防橡皮筋回弹（`styles.css` / `src/input.js`）**：
  * 全局注入 `-webkit-touch-callout: none`、`-webkit-tap-highlight-color: transparent` 与 `overscroll-behavior: none`，移动端摇杆、扇形按键与主画布锁定 `touch-action: none`；
  * 在 `#touch-controls` 与 `#gameCanvas` 拦截 `contextmenu` / `selectstart`，并在非地图界面拦截 Safari `gesturestart`，彻底保证 iPhone 上**长按居合蓄力**与**短按 `0.16s` 轻重变招**零系统弹窗打断。

---

## v45.6 根治「隐身跨房穿墙偷袭」Bug（遮蔽房间 AI 休眠门控 + 远程/瞬移怪视线校验）
- **根治起点高台莫名受到隐身 `-20` 斩击的问题（`src/main.js` / `src/ai/exoticEnemiesAi.js`）**：
  * 定位元凶：起点 `r01_sanctuary` 正上方紧邻已遮蔽房间 `r19_belfry_outer`（断索钟楼），其中新部署的浮空怪「金钟执灯侍（`cantor_belfry_1`）」虽已被渲染层 `isRoomOccluded()` 隐藏，但 `src/main.js` 怪物更新循环未校验房间遮蔽，导致其跨天花板侦测到站在高台上的玩家并直接瞬移穿顶挥出隐身 `-20` 斩击；
  * **全局遮蔽房间 AI 门控（`src/main.js`）**：非回响模式下，凡处于 `isRoomOccluded(enemy.roomId)` 遮蔽房间内的所有敌兵一律休眠，绝不跨房移动、发弹或瞬移；
  * **远程与瞬移怪视线（`hasLineOfSight`）+ 垂直带钳位（`exoticEnemiesAi.js` / `enemiesAi.js` / `biomeEnemiesAi.js`）**：为金钟执灯侍、悬灯怨灵、敲钟祭司与衔铃风隼统一加入实墙视线检测与垂直仇恨范围限制，并将金钟执灯侍瞬移落点锁死在自身房间垂直带内，彻底杜绝任何穿墙偷袭。

---

## v45.5 移动端攻弹合一拼刀、极简防误触键位与祭坛四页签重构
- **攻弹合一拼刀系统（默认手机开启，设置页可切回独立弹反键，`src/combat/playerCombat.js` / `src/combat/damageCombat.js` / `src/player.js`）**：
  * **挥斩弹反敌方弹幕**：普攻刀光命中任意敌方弹幕（怨灵球、风刃、冰棱、墨网、熔铜滴、共鸣波）直接触发完美弹反归元，享有完整顿帧、回魂与墨印收益；
  * **起手 140ms 见切拼刀窗**：按下普攻起手前 `140–165ms` 携带 `clashParryTimer`，迎上敌方近战攻击直接化为完美弹反并清零攻击冷却，支持顺着 Boss 连招单键连点 `叮-叮-叮` 拼刀；超过起手窗回归普通挥砍，防止盲点站撸。
- **右手极简防误触重设计 + 灯油移至左上角 HUD 点击（`styles.css` / `src/input.js` / `src/ui/hudCore.js`）**：
  * 移除右手区的独立 `灯油` 与（合一模式下）`弹反` 按钮，改为直接点击左上角血条下方常驻的 **`灯油 ●●●`**（血量低于 60% 且有药时柔和青金脉冲提示）；
  * **`普攻·拼刀`** 放大至 **`88px`** 黄金主钮，内圈三翼 **`跳跃 / 闪避 / 钩锁`** 放大至 **`64px`** 并与普攻拉开 **`24px+`** 安全隔离带（高频钩锁正式进驻内圈）；
  * 新增圆形半径竞争防误触拦截并将普攻滑招阈值收紧至 `28px`，彻底解决高速连点误触跳跃或上挑。
- **祭坛四页签精简重构 + TapTap 悬浮胶囊全弹窗避让（`index.html` / `src/ui/relicBoardUi.js` / `styles.css` / `src/input.js`）**：
  * 移动端祭坛由左右硬挤双栏改为顶部 **4 页签单屏聚焦**（`⚔ 兵刃` / `✦ 圣物` / `⚑ 跃迁与钟誓` / `🔔 残誓回响`），三张兵刃卡片满宽横排零竖排折字、零裁切（PC 端零回归）；
  * 嵌入式 H5 容器下为全部弹窗 `.modal-top-bar` 统一预留 `112px` 右边距，彻底避免 TapTap 悬浮 `••• | ◉` 压住「✕ 返回游戏」。

---

## v45.4 全三系兵刃武术动作重构（「三轻一重」起承转合 + 轻重派生分支 + 三拍残心动画）
- **三拍非匀速武术发力节奏与「残心」系统（`src/render/playerRenderer.js` / `src/player.js` / `src/combat/playerCombat.js`）**：
  * 引入 `martialBeat()` 三拍曲线（**20% 蓄势拧腰 → 24% 极速爆发甩刃 → 56% 残心驻势**），重结招式收势后自动衔接 **振刀归位（血振）** 动作与刀尖金闪；
  * 新增 **残心取消（Zanshin Cancel）**：重终结/派生技收招瞬间按闪避或弹反，可零硬直取消并回复 **`+14` 魂火**。
- **全三系武器完整「轻重派生分支」零新键实装（`src/weapons.js` / `src/player.js` / `src/render/vfxRenderer.js`）**：
  * **连按普攻默认打出完整起承转合**；在任意轻击后 **短按住普攻 `0.16s` 见青金闪松手** 立即变招（按住满 `0.45s` 仍无缝释放满蓄居合）：
    * **灰钟断刃（三轻一重 + 3 派生）**：`L1 低步斜撩` → `L2 反手平抹` → `L3 错步双段疾刺（单招 2 Hit + 双穿刺光针）` → `H4 跃步断空重劈`；派生 `1轻+重「撩云升龙」`（挑飞敌人接空连）、`2轻+重「回马抽刀」`（后撤无敌微步反扫）、`3轻+重「残心绝空」`；
    * **镇渊钟锤（二轻一重 + 2 派生）**：`L1 拖锤上挑` → `L2 270° 旋腰横抡` → `H3 跃步震岳霸体重砸`；派生 `1轻+重「顶钟铁山撞」`（强撞墙击退）、`2轻+重「残心碎岳」`（附带裂地波）；
    * **引魂摇铃（三轻一重 + 3 派生）**：`L1/L2 正反音环` → `L3 背身旋杖追踪双矢` → `H4 顿杖唤青铜虚钟镇落`（破盾 + 敲灯解谜）；派生 `1轻+重「跃步双振」`（后跃悬空风筝）、`2/3轻+重「残心镇魂钟」`（清弹 + 范围破盾）。

---

## v45.3 主角外观重塑、真实手臂 IK、全角色向左步态修复与零新键招式扩充
- **彻底修复向左移动腿部反向（全角色双足 IK 对称修复）**：
  * 修正 `src/render/playerRenderer.js`、`src/render/enemyRenderer.js`、`src/render/wardenRenderer.js` 与 `src/render/bossRenderer.js` 中步态水平位移漏乘 `facing` 的缺陷，主角及全部双足怪物/镇守/首领向左、向右跑动 100% 流畅自然。
- **主角外观与全身武术动捕升级（`src/render/playerRenderer.js` / `src/player.js` / `src/render/vfxRenderer.js`）**：
  * 重绘为冷峻魂系**裂纹白骨弦月角面具 + 深影尖兜帽 + 高立残领**、带青铜肩扣与动态甩动**分叉猎人长衣摆**、断刃柄端墨红剑穗；
  * 新增**真实双骨 IK 持械手臂**（可见缠布前臂与手套紧握刀柄，钟锤/弹反/重斩双臂协握）；
  * 全身动作联动：每招拥有独立躯干前倾/后仰（`bodyLean`）、地面弓步压低腿势（`lungeSpread`）与独立挥砍轨迹，告别机械旋转；`slash1` 上挑、`slash2` 修长水平横削、`slash3` 高举金红重劈刀光层次分明。
- **零新增按键招式扩充（全三系武器同步支持，`src/weapons.js` / `src/player.js` / `src/combat/playerCombat.js`）**：
  * **冲刺突刺（`dashAttack` · 闪避尾段或结束后 0.24s 内按普攻）**：断刃拉出破空光锥「疾步穿刺」（118px 长距追击）、钟锤霸体「钟锤铁山撞」、摇铃「滑步双振」；
  * **滞空二连与 360° 旋斩（`air1 → air2` · 空中按普攻）**：空中前两招自带微滞空升力（落地/下劈重置），第二刀触发全身 360° 翻滚旋斩与双层水墨旋风刀环（断刃「墨刃回旋」/ 钟锤「旋钟轰轮」/ 摇铃「镇魂旋铃」自带消弹）。

---

## v45.2 新增 3 种非人形生态专属怪（图鉴扩至 22 种）与全境 25 房生态重布
- **新增 3 种高辨识度非人形生态怪（新增 `src/render/exoticEnemyRenderer.js` + `src/ai/exoticEnemiesAi.js`）**：
  * **枯墨古林专属 · `墨丝织蛛`（Ink-Silk Weaver，`weaver`）**：6 足水墨节肢异蛛 + 倒挂发光裂钟腹腔，具备 `fangCombo` 双螯连夹、`silkDrop` 悬丝红光急降扑咬、以及半血/中距跳退吐出的 `webOrb` 粘滞墨网弹（命中触发 `webSlowTimer` 减速 32%，可挥刀斩断或弹反）；
  * **残钟地窖 / 沉渊钟井专属 · `熔铜炉奴`（Cinder-Bell Crawler，`crawler`）**：四足爬行熔铜兽，背负炙热滚烫青铜钟炉，具备 `emberRoll` 灼热火钟滚冲（**完美弹反可将其震翻掀壳进入 2.4s 倒地破防并附带 +45 架势**）、`moltenSpit` 三连抛物线熔铜滴、以及阵亡时的 **0.85s 延迟红圈铜炉自爆（可波及炸伤周遭敌兵）**；
  * **初钟圣阶 / 断索钟楼专属 · `金钟执灯侍`（Gilded Belfry Cantor，`cantor`）**：高挑无腿浮空无面圣仪侍从，周身环绕 3 枚自动旋转小飞钟与金光提灯，具备 `triChimeVolley` 三连金芒钟弹、`blinkSlash` 反风筝闪现背斩、以及连吃 2 刀快攻后的 `sanctumRepel` 金环震退反制。
- **全境 25 房生态怪物重布与图鉴/编辑器全链路同步**：
  * 替换古林、地窖、钟井、圣阶与钟楼中 12 处复用杂兵（`priest` 11→7、`duelist` 7→4、`leech` 9→7、`sentinel` 6→4、`wraith` 6→5），分布 4 只墨丝织蛛、4 只熔铜炉奴与 4 只金钟执灯侍；
  * 同步扩展怪物图鉴至 **22 种**（含双语战术/背景词条、专属 SVG 徽章、立绘摄影棚与关卡编辑器工具栏）。

---

## v45.1 怪物剪影彻底去重、图鉴裁切修复与 9 种老怪技能全面升级
- **7 组高辨识度手绘剪影重绘（新增 `src/render/wardenRenderer.js` + 重构 `src/render/enemyRenderer.js` / `src/ui/codexGallery.js`）**：
  * **`截风巡塔使·朔`** vs **`连刃武者`**：朔彻底移除斗笠，重绘为**悬空鹤翼羽面风使**（鸟喙青铜面具 + 背后不对称青铜风帆双翼 + 绕背三铜铃环 + 双弯月风轮刃）；连刃武者重绘为**低伏弓背刺客**（窄平檐苇笠 + 翻飞暗红围巾 + 前反手短刀/背拖长太刀）；
  * **`断剑霜侯·凛`** vs **`寒戟骸卫`**：凛重绘为**修长剑冢冰侯**（高领收腰斗篷 + 不对称断角单冰冕 + 背后斜插两柄断冰剑 + 拖地超长寒髓太刀）；寒戟骸卫移除三叉冠，重绘为**驼背圆穹裂盔重步兵**（宽檐铁锅盔 + 锯齿雪毛领 + 前臂六角冰晶盾）；
  * **`溺钟潜行者` & `锈锚重锤兵`**：溺钟重绘为深弓 S 形水鬼体态（歪扣肩头裂铜钟 + 垂挂滴水墨藻 + 拖地曲柄鱼钩）；锈锚重绘为巨型驼背铜钟潜水甲（圆顶铜钟盔 + 顶吊环 + 栅格圆目孔 + 带横杆双爪巨型船锚）；
  * **`青铜演武钟偶`**：修复图鉴卡片顶部裁入模式文字与血条的问题（新增 `_isPortrait` 隔离标记），并补绘木质十字演武底座与胸口同心圆靶纹。
- **9 种老怪深度技能升级（新增 `src/ai/biomeEnemiesAi.js` + 更新 `src/ai/enemiesAi.js` / `src/combat/playerCombat.js` / `src/world.js`）**：
  * **持矛哨兵**：新增 `spearGuard` 举矛防反架势（正面轻击弹刀接 `counterThrust`，重击/绕背/下劈破防 +26 势）；
  * **悬灯怨灵**：新增 `twinArc` 双灯交叉弧弹 + `blink` 近身惊惧瞬移拉距；
  * **敲钟祭司**：新增 `bellRipple` 落地金色共鸣波 + 队友带盾期间持续金线指引集火；
  * **连刃武者**：新增 `counterIai` 正面连吃 2 刀轻击弹刃反居合，形成打铁互弹；
  * **寒戟骸卫**：新增 `frostWave` 冰戟横扫寒霜地波控场；
  * **衔铃风隼**：新增 `featherVolley` 高空双风铃刃散射；
  * **孢蚀菌傀**：新增 `sporeInhale` 可打断吸气蓄力（重击/居合/引魂摇铃波命中直接净爆 +35% 伤与 +42 势）；
  * **溺钟潜行者**：破水伏击与近战升级为 `hookPull → hookCross` 钩拉回拽二段连斩；
  * **锈锚重锤兵**：砸地后若玩家贴身或绕背贪刀，立即派生 `anchorBackswing` 拉链前后大回扫。

---

# 灰钟残誓 (Ashen Bell Vow) — v45.0 (1.0 发行候选版)

## v45.0 核心升级（反站撸战斗重构 + 方案 B 终局数值收敛 + 发行前双语总检收口）
- **四大反「硬顶换血站撸」底层机制重构（`src/player.js` / `src/weapons.js` / `src/combat/playerCombat.js` / `src/combat/damageCombat.js` / `src/ai/bossesAi.js` / `src/ai/wardensAi.js`）**：
  * **堵死受击无敌偷喝药**：受击无敌帧由 `0.55s` 收紧至 **`0.38s`**；地面喝药前摇由 `0.28s` 延至 **`0.38s`**（总耗时 `0.62s`，空中 `0.50s`），且按下喝药即刻截断剩余受击无敌帧，必须抓住 Boss 硬直或拉距喝药；
  * **修正「镇渊钟锤 + 铁壁反震」无限霸体站撸**：移除锤子一段（`slash1`）霸体，仅保留二段重砸与蓄力/反击的战术霸体；霸体承伤倍率设置 **`0.45` 下限**（最高 55% 减伤）；「铁壁反震」冲击波增加 **`2.8s` 内部冷却**；
  * **Boss / 镇守正面直击回架势**：玩家未弹反也未格挡、被 Boss/镇守正面打中时，敌方立即恢复 **`12%`**（红光重击 **`16%`**）最大架势并立即开启架势衰减，杜绝换血磨架势循环；
  * **贴脸贪刀红光反制**：Boss 2/3/4 与三境镇守实时统计近身贪刀与硬换血压力（满 4 层且 `165–175px` 内触发，`5.0–5.4s` 冷却），强制派生红光不可弹反重击（并顺手修复 Boss 2 `antiAirRise` 对空判定框未进入 `strike` 分支的遗留 Bug）。
- **方案 B 中后期血核与 Boss/镇守强度曲线收敛（`data/rooms/*.json` / `src/entities.js` / `src/ai/bossesAi.js` / `src/ai/wardensAi.js`）**：
  * 收敛中后期 6 枚 `statCore` 血量加成（`+15 → +10 HP`）与 `pickup_zhu_crown`（`+25 → +15 HP`），将满探终局血量从 `295 HP` 收束至 **`250 HP`**（同步更新中英文拾取描述）；
  * 全面拉升三境镇守与 Boss 2/3/4 威胁度：**朔**（`500 HP / 160 势 / 22–32 伤`）、**枯**（`640 HP / 200 势 / 28–36 伤`，全范围红光荆棘震退）、**凛**（`740 HP / 225 势 / 30–38 伤`）、**Boss 2 寂**（`820 HP / 215 势 / 26–36 伤`）、**Boss 3 渊**（`1320 HP / 295 势 / 28–44 伤`）、**隐藏 Boss 4 铸**（`1600 HP / 335 势 / 30–48 伤`），弹幕伤害同比例联动。
- **发行前双语与经济口径收口（`src/locales/world.js` / `src/locales/uiZh.js` / `src/locales/uiEn.js` / `src/input.js` / `src/main.js` / `verify_project.py`）**：
  * 修正一周目拾取第 4 枚灯油残芯误弹「轮回重获 / NG+」的问题，改为通用溢流残响提示；
  * 补齐沉钟水牢（`cistern`）英文生态背景音译名、手柄喝药键英文 `D-Up` 与 F8 实时剖析器全双语化；清理废弃 `hud.aux*` 词条、精简英文强制横屏按钮文案，并校准 `verify_project.py` 真实全量消费统计（`Full Completion = 9,300`）。

---

## v44.8 修复离线包内联脚本引号语法错误（`index.html:694`）
- **彻底修复 `Uncaught SyntaxError: Unexpected identifier 'hidden'`（`tools/build_release.py`）**：将离线 `index.html` 的异常诊断浮层关闭按钮改为纯 DOM `createElement + addEventListener`，彻底消除嵌套引号转义错误；同时在构建脚本新增内联 `<script>` 词法与引号相邻校验，确保离线包 PC 与移动端控制台均为 0 报错。

---

## v44.7 移动端高清视网膜渲染、低延迟音画同步与 TapTap 胶囊避让根治
- **移动端画质全面追平 PC 清晰度（`src/main.js` / `src/renderTerrain.js` / `src/stampAtlas.js` / `src/render/backdropCache.js` / `src/render/glyphAtlas.js`）**：
  * **3 档移动端画质切换（默认「高清 2.4×」/「视网膜 3×」/「省电 1.5×」）**：解除 TapTap 嵌入式容器 `1.65×` 过低 DPR 限制，默认开放至 **`2.4×`（最高 2400px 宽，实机 `renderScale ≈ 2.0×` 对齐 PC）**，旗舰手机可切「视网膜 3×」实现 1:1 物理像素零拉伸；
  * **全链路 2× 高清离屏烘焙**：地形缓存块（`renderTerrain.js`）、世界装饰印章（`stampAtlas.js`）与静态哥特建筑背景（`backdropCache.js`）全面升级为按高分屏 `1.5× / 2×` 离屏烘焙并按逻辑尺寸贴图，彻底消除“1× 离屏图二次放大”导致的地面石纹与背景发虚；
  * **全端统一 3× 超采样字形图集（`glyphAtlas.js`）**：移除嵌入式容器降级逻辑，场景墙面铭文与交互提示与外层 DOM 血条同样锐利。
- **低延迟音频与音画时钟同步（`src/audio.js` / `src/input.js` / `src/render/titleIntro.js` / `src/world.js`）**：
  * `new AudioContext({ latencyHint: 'interactive' })` 强制申请 Android AAudio / 低延迟交互声道，并优先预烘焙挥刀、受击、打铁弹反、跳跃与铁砧核心音效（延迟由 160ms 缩至 45ms）；
  * 触屏「普攻 / 法术 / 跳跃」轻滑判定等待由 `48ms` 压缩至 **`18ms`**，大幅收紧出招与音效反馈同步感；
  * 7.8 秒开场动画改用 `performance.now()` 真实单调时钟推进防掉帧音画漂移；铁匠打铁声按 `audio.getOutputLatencySec()` 自动提前补偿（最多 `60ms`），落锤撞击与金属清响毫秒级咬合。
- **TapTap 右上角悬浮胶囊防遮挡双保险（`src/input.js` / `styles.css`）**：
  * 扩展 `isEmbeddedH5Container()` 识别（兼容离线包、UA、域名/Referrer、原生桥与独立全屏态），并同时通过 CSS 与 JS 内联样式隐藏冗余「全屏」按钮、将 `#hud .hud-right` 左移 `114px`、标题顶栏右留 `122px`，彻底避让 TapTap 悬浮 `••• | ◉` 胶囊。

---

## v44.6 修复 `auxBtn` 未定义报错 + TapTap WebView 启动降载与顶层异常诊断
- **修复 PC 与移动端启动控制台 `ReferenceError: auxBtn is not defined`（`src/main.js` / `styles.css` / `verify_project.py`）**：
  * 彻底清理 `refreshAllDynamicLocaleUI()` 中残留的已废弃 `auxBtn / auxWrap` 引用（该异常此前导致切换语言时跳过后续 `refreshTitleSaveUI()` 与 `syncHUD()` 刷新），并在 `verify_project.py` 中加入永久回归防线。
- **TapTap 嵌入式 WebView 防黑屏降载与非阻塞首帧启动（`src/main.js` / `src/render/glyphAtlas.js`）**：
  * 嵌入式 H5 容器（TapTap / Android WebView）画布 DPR 安全封顶为 `1.65×`（最大 GPU 宽 `1600px`）且字形超采样保持 `2×`，在维持远超 v44.0 的清晰度的同时把显存峰值降低 45%，规避 Android WebView 2D Canvas 丢上下文黑屏；
  * 将 `prewarmStampsForList`、`prewarmTerrainChunks`、`prewarmGlyphAtlas` 移出同步启动链改为首帧渲染后 `60ms / 220ms` 错峰预热，确保 TapTap 容器秒出首帧。
- **新增顶层可见异常诊断浮层（`#abv-fatal-banner`，`z-index: 99999`）**：
  * 正常游玩全程隐藏零干扰；一旦在 TapTap 真机出现任何未捕获异常、Promise 拒绝、首帧或切场错误，直接在屏幕最顶层打印精准错误行号与堆栈，彻底告别无声黑屏盲猜。

---

## v44.5 根治 TapTap H5 容器「点击进入后卡死/黑屏」与悬浮胶囊防遮挡
- **彻底禁用嵌入式 WebView 内的自动 `requestFullscreen()`（`src/input.js` / `src/main.js`）**：
  * 定位 TapTap H5 审核真机（一加 Ace 5 至尊版 / 荣耀 400 Pro）点击主菜单进入后黑屏卡死的元凶：TapTap H5 容器本身已是原生横屏全屏 WebView，旧版点击「继续残誓 / 踏入晦渊」时强制调用 `document.documentElement.requestFullscreen()` 会触发 Android `WebChromeClient.onShowCustomView` 导致 WebView 渲染面黑屏锁死；
  * 新增 `isEmbeddedH5Container()` 检测，在 TapTap H5 / 离线包 / 微信等嵌入式 WebView 中**永久禁止调用 `requestFullscreen()`**，点击开始/继续按钮不再触发任何全屏切换，仅保留普通手机浏览器下的手动「⛶ 全屏」按钮。
- **消除 TapTap WebView 三重次生阻塞点（`src/main.js` / `src/audio.js` / `src/render/titleIntro.js`）**：
  * 移动端「踏入晦渊」覆盖存档改用**按钮内联二次确认**（`⚠ 再次点击确认覆盖档案 N`），彻底移除在 Android WebView 里极易被拦截或卡线程的 `window.confirm()`；
  * `audio.init()` 全链路加异常保护，并将 `OfflineAudioContext` 音效预烘焙延迟 `160ms` 且在手机端限流为每批 2 个 + `18ms` 帧让出，避免进游戏瞬间堵死 Android WebView 音频线程；
  * `beginSceneFade()` 新增超时看门狗与回调异常保护，彻底杜绝黑幕过渡卡死在纯黑画面。
- **TapTap 右上角悬浮胶囊安全避让（`styles.css`）**：
  * 嵌入式 H5 容器模式下自动为标题顶栏与 HUD 右上角预留 `98–112px` 右边距并隐藏冗余「全屏」按钮，彻底避免 TapTap 悬浮 `••• / ◉` 胶囊压住「Lang: 中文 / EN」和顶部按钮。

---

## v44.4 开场动画「破刃断钟」专属电影级斩击音效重构
- **彻底剥离游戏内战斗音效，独立设计 4 幕电影级过场声场（`src/audioSfxBank.js` / `src/audio.js` / `src/render/titleIntro.js`）**：
  * **Act I · 晦渊悬钟低鸣（`playIntroOmen`，0.32s）**：深沉青铜殿堂低频共鸣 + 冷风幽息，替代原远钟音效；
  * **Act II · 断刃滑轨蓄势（`playIntroBladeDraw`，2.55s–3.49s）**：0.94 秒高 Q 值寒铁滑音上扫（`850Hz → 3650Hz`）+ 金线汇聚谐波爬升，并在 `3.49s`（斩击前 `60ms`）硬切入电影级**「吸气真空」**，大幅拉高爆发张力；
  * **Act III · 破刃一闪斜斩（`playIntroCleaveSlash`，3.55s）**：高速利刃破空急啸（`8400Hz → 1150Hz` 陡降）+ 干脆冷钢切入青铜瞬态 + 深沉次低音真空重击（`155Hz → 34Hz`），完美贴合 `0.16s` 闪白顿帧，不再混入游戏内打铁/普攻声；
  * **Act IV · 古钟断裂残鸣（`playIntroBellCleave`，3.71s）**：巨钟裂解低频冲击 + **上下半钟微偏音分裂残鸣**（两半青铜随裂口张开产生轻微失谐拍频与音高下滑，余韵 3.1 秒）+ 熔金切口灼响与 6 枚错落碎铜溅落清响；
  * **独立过场音频总线（`stopIntroCinematic`）**：点击跳过或重播开场时 `70ms` 平滑淡出旧过场音，绝不残留串音；采用零等待实时合成，首触解锁即刻响亮不依赖离线烘焙进度。

---

## v44.3 移动端真机实测专项修复（清晰度对齐 PC、标题防挤压、非全屏适配与铁匠音画同步）
- **手机端画质与文字清晰度全面对齐 PC（`src/main.js` / `src/i18n.js` / `src/render/glyphAtlas.js`）**：
  * 解除旧版移动端 `maxDpr = 1.25` 过低上限（原先在手机上 `renderScale` 仅 `0.87×`，低于 1 物理像素导致整体发糊），升级为 **2.4× 视网膜高分渲染（GPU 宽限 2048px）+ `targetH = 480` + `imageSmoothingQuality = 'high'`**，实机 `renderScale` 跃升至 `1.8–2.1×` 对齐 PC 清晰度；
  * 高分屏启用 `glyphAtlas` **3× 超采样字形烘焙**，移动端画布字族自动选用清晰无衬线系统字体（`PingFang SC / HarmonyOS Sans SC / MiSans / Noto Sans SC`），消除小号中文发糊。
- **修复标题页文字挤压错乱与「载入中...」残留（`index.html` / `styles.css` / `src/main.js`）**：
  * 将 `#game-root` 内所有移动端布局的 `vw / vh / dvh` 统一替换为容器相对 `%` 与动态 `--stage-w / --stage-h`，彻底解决 90° 兜底横屏下 `96vw` 误取竖屏宽度导致左栏被压成 100px 竖排折字的问题；
  * 移除 `#btn-continue` 与 `#btn-start` 上会被 `applyStaticI18n()` 重置的 `data-i18n="title.loading"` 属性，杜绝按钮退回「载入中... / 正在载入晦渊地图...」。
- **非全屏矮视口自适应 + 标题栏一键全屏（`src/render/titleIntro.js` / `index.html` / `src/main.js`）**：
  * 开场破刃斩钟动画新增 `fitScale` 动态缩放与字幕防越界钳位，即使忘记点全屏被浏览器上下白条压扁，巨钟、断刃与字幕也完整居中零截断；标题栏右上角新增醒目 **`⛶ 全屏`** 按钮，轻触开场画面也会顺手尝试拉起横屏全屏。
- **盲眼老铸钟匠·砺 打铁动画、火星与音效 100% 同帧同步（`src/audioSfxBank.js` / `src/audio.js` / `src/world.js` / `src/render/worldRenderer.js`）**：
  * 新增预烘焙青铜铁砧敲击音效 `anvil_tap`，以统一 `2.2s` 锻打周期（`0.62` 落锤时刻）同步驱动铁匠挥锤动作、砧面炙热闪光、金色溅射火星与随距离衰减的清脆「叮！」铁砧声。

---

## v44.2 PWA 离线全屏桌面图标、切后台音频自动保活与手机稳帧省电模式
- **PWA 一键“添加到主屏幕”原生全屏壳（`manifest.webmanifest` / `sw.js` / `icon.svg` / `icon-192.png` / `icon-512.png`）**：
  * 程序化绘制暗黑水墨裂钟双刃 App 图标（同时输出矢量 `icon.svg` 与 2× 超采样抗锯齿 `192px / 512px` PNG，原生适配 iOS Safari `apple-touch-icon` 与 Android PWA 安装器）；
  * `manifest.webmanifest` 配置 `display: fullscreen` + `orientation: landscape`，`sw.js` 采用同源 Stale-While-Revalidate 离线缓存，添加到手机主屏幕后**无地址栏真全屏运行、断网离线可玩**；主界面右上角在浏览器支持安装时自动浮现 **`⬇ 安装到桌面`** 按钮（`file://` 与 TapTap 纯离线包内自动静默跳过且保持 3 文件纯净无 404）。
- **移动端切后台 / 锁屏 / 来电音频自动保活（`src/audio.js` / `src/main.js`）**：
  * 新增 `audio.keepAliveResume()` 与 `AudioContext.onstatechange` 监听，同步覆盖 Android `'suspended'` 与 **iOS Safari 特有 `'interrupted'` 静音状态**，切回前台自动尝试唤醒并清空积压节拍防爆音；若浏览器要求手势解锁，在切回后首次触屏瞬间无感补发 1-sample 静音脉冲秒恢复全部配乐与打铁音效。
- **手机稳帧省电模式（`#btn-mob-eco-mode` · `src/vfx.js` / `src/render/vfxRenderer.js` / `src/main.js` / `styles.css`）**：
  * 移动端设置页新增一键开关并持久化存档：开启后将渲染 DPR 锁至 `1.0`（像素填充直降 36%）、高刷手机自动按 60Hz 整除稳帧防发热降频、粒子上限与前景雨尘自动轻量化减半，并关闭耗合成层的 `backdrop-filter` 模糊特效。

---

## v44.1 手机矮屏横屏（360–430px）紧凑双栏标题页与全弹窗重构
- **桌面零回归双栏结构（`index.html` / `src/ui/modalsUi.js` / `styles.css`）**：桌面端所有新增容器保持 `display: contents`，PC 排版像素级零变动；移动端横屏解除旧版 `560px` 宽度瓶颈，扩展至 `min(94vw, 820px)` 并全面升级为双栏分区：
  * **主标题页（`#title-screen`）**：左栏呈现裂钟双刃纹章 + 烫金标题 + 档案摘要条，右栏呈现魂系竖排菜单与可展开 3 槽抽屉，在 360px 矮屏横屏手机上**零滚动条一屏完整显示**。
  * **熄灯祭坛（`#altar-modal`）**：左栏兵刃与圣物星盘，右栏祭坛传送 + 钟誓 + 回响挑战，左右独立滚动。
  * **铁匠铺钟脉星图（`#smith-modal`）**：强制保持左星图 + 右实景动作预览与升级按钮双栏，压缩顶部肖像条，不再被窄屏断点折成竖排长页。
  * **4-Tab 设置手账（`#settings-modal`）**：系统设置页拆为左右双栏（左：语言/护道/音量/震动；右：移动端浮动摇杆/微辅/按键缩放与透明度）；兵刃画廊与 19 格怪物实景图鉴改为「左图库网格 + 右详情面板」双栏浏览，点选立看无需来回上下翻滚。
  * **晦渊舆图（`#map-modal`）**：左宽屏捏合缩放地图 + 右图钉工具栏与图例。
  * **NPC 对话（`#npc-modal`） & 暂停菜单（`#pause-modal`）**：NPC 改为左对话右服务列表；暂停菜单改为 2 列大按钮网格，全弹窗触控热区提升至 `36–42px+`。

---

# 灰钟残誓 (Ashen Bell Vow) — v44.0 移动端原生手感升级版

## v44.0 核心升级
- **左半屏动态浮动摇杆（`src/input.js` / `styles.css`）**：
  * 触屏模式下左半屏下部（`42vw × 62vh`）任意落指即刻吸附生成摇杆底座，松手柔和淡回基准角，彻底消灭拇指按空与起手反向抽搐；同时完整兼容原生横屏与微信/锁屏 90° 兜底横屏，可在设置中随时切换「浮动 / 固定底座」。
- **移动端专属战斗手感层（`src/player.js` / `src/state.js` / `src/input.js` / `src/ui/hudCore.js`）**：
  * **近战软索敌自动微转向**：未刻意拉动反方向摇杆时，普攻出手瞬间自动微调面向 160px 内最近威胁敌兵，告别搓玻璃挥空；
  * **触屏弹反宽容（`+25ms`）**：手机端默认给予 +25ms 精准弹反与格挡宽容帧（可在设置中关闭切回硬核原版）；
  * **普攻外圈实时蓄力环**：`#fan-attack` 外圈内置零分配 SVG 圆形蓄力进度条，长按蓄力居合 / 碎岳 / 三鸣时实时走青蓝进度条，蓄满瞬间化作耀金光环脉冲；
  * **Android 线性马达震动桥接**：`triggerHaptic()` 同步接入 `navigator.vibrate`，为轻斩、重击、弹反打铁、破盾、居合、处决与受击匹配不同短促震动波形（iOS 安全降级零报错）。
- **大地图原生触屏交互（`src/ui/mapUi.js`）**：
  * 完整实装**单指平滑拖动舆图**、**双指捏合以两指中心为锚点无极缩放**，并放宽移动端点击祭坛传送（`24px`）与落钉/删钉（`26px`）热区，同步兼容 90° 兜底横屏坐标。
- **移动端专属手感设置面板（`index.html` / `src/save.js` / `src/ui/modalsUi.js`）**：
  * 新增「左半屏动态浮动摇杆」「触屏战斗微辅」「触控按键尺寸（80–120%）」「触控按键透明度（45–100%）」四项持久化调校，实时生效。

---

## v43.7 一码多端离线构建管线（TapTap / 4399 纯离线直传包 + itch.io 根目录包）
- **新增零依赖多平台构建脚本（`tools/build_release.py` + `build_release.bat` / `build_release.sh`）**：
  * 自动先跑 `verify_project.py` 全量校验，再一键生成三套发行包至 `dist/`：
    1. **`ashen_bell_vow_v43_7_taptap_offline.zip`**（TapTap / 4399 / 本地 `file://` 双击秒开通用离线包）：`index.html` 直接位于 ZIP 根目录，仅含 `index.html`、`styles.css` 与 `game.bundle.js` 三个文件；通过词法级 ES Module 编译器将 63 个运行期模块与全部 26 份关卡 JSON 内联为经典单脚本（**零 `type="module"`、零 `fetch()`、零 CORS、零资源 `?v=` 查询串、完整保留 `config.js` 实时变量绑定**），彻底解决 Android WebView 离线容器「点击无反应」问题。
    2. **`ashen_bell_vow_v43_7_itch_web.zip`**（itch.io Web 扁平根目录直传包，剔除编辑器与开发脚本）。
    3. **`ashen_bell_vow_v43_7_modular.zip`**（完整开发与博客部署源码包）。
- **离线数据直通快路径（`src/levelLoader.js`）**：检测到 `window.__ABV_OFFLINE_WORLD__` 时跳过网络 `fetch()` 直接同步水合 25 房世界数据，开发模式与编辑器实时试玩完全不受影响。

---

## v43.6 移动端多源横屏检测修复与微信/锁屏强制横屏兜底
- **彻底修复手机横屏后卡在「请横握手机」引导界面的问题（`src/input.js` / `src/main.js` / `styles.css`）**：
  * **多源横屏判定 + 延迟复检**：同时结合 `visualViewport`、`innerWidth/innerHeight`、`screen.orientation.type`、`window.orientation` 与 `matchMedia('(orientation: landscape)')`，监听全部横竖屏与全屏事件并加入 `120ms / 320ms / 620ms` 阶梯复检与帧循环自动唤醒，同时加纯 CSS `@media (orientation: landscape)` 瞬时隐藏遮罩，彻底消除 WebView 尺寸延迟更新导致的卡死；
  * **微信内置浏览器 / 系统竖屏锁定自动兜底**：点击「进入横屏全屏」先尝试原生全屏横屏，若 `320ms` 内浏览器拒绝旋转（如微信未开横屏、iOS Safari 或手机开了竖屏锁定），自动无缝切入 90° 兜底横屏并放行游戏（同时提供一键「强制横屏进入」直达链接，且一旦系统真正横屏会自动切回原生横屏）；
  * **补齐 90° 兜底横屏下的轻滑手势坐标换算**，并在竖屏引导页期间自动暂停开场动画计时，横屏进入后从 0 秒完整带音效播放破刃斩钟开场。

---

## v43.5 移动端原生横屏体验重塑（四大核心痛点一次性闭环）
- **竖屏优雅「请横握手机」黑幕引导 + 横屏原生全屏进入（`index.html` / `styles.css` / `src/input.js`）**：
  * 移除旧版生硬的 CSS 90° 强制假旋转，竖屏打开时弹出带旋转手机水墨动效的 `#mobile-rotate-guard` 黑幕引导并附「尝试自动横屏全屏」按钮；横握手机后自动无缝切入原生横屏渲染。
- **状态驱动的纯净演出层 + 极简顶栏（`src/main.js` / `styles.css`）**：
  * 实时同步 `body[data-game-state]`（`intro` / `title` / `cinematic` / `modal` / `dead` / `victory` / `playing`），仅在正常游玩状态显示 HUD 与虚拟按键，开场动画、标题页、Boss 入场特写与所有弹窗期间 100% 干净隐身、零遮挡；
  * 精简移动端顶栏多余按键，释放视野（保留可点击小地图 + 全屏 / 设置 / 暂停）。
- **方案 1 · 右手常驻 6 键主弧 + 3 动态槽 + 上下轻滑出招（`index.html` / `src/input.js` / `src/ui/hudCore.js`）**：
  * **常驻 6 键**：**普攻**（长按居合 + 上滑上挑 / 空中下滑下劈 Pogo）、**跳跃**（下滑下穿平台）、**弹反**（常驻黄金位，不再藏辅键）、**闪避**（常驻，解锁幽影穿身后自动变紫带冷却反馈）、**法术**（上滑镇魂钟鸣 / 空中下滑镇岳下砸）、**灯油回血**（带剩余瓶数角标与低血脉冲）；
  * **动态 3 槽**：**钩锁**（击败晦解锁后才出现，有目标亮青光）、**切刃**（拥有 ≥2 把兵刃后出现，随按轮切并触发切刃技）、**墨印 / 奥义**（有印或挂符时浮现，满印亮金红脉冲）；
  * 同步修复移动端上下文「交互」按钮遗漏全境 8 处世界机关开关、迁移 NPC 与拾荒童灰芽的缺口。
- **全量触屏文案自适应替换（`src/i18n.js` / `src/render/vfxRenderer.js`）**：
  * `i18n` 底层新增 `adaptTouchText()`，触屏模式下自动剥离 `[M] / [B] / [F8] / [F9]` 桌面快捷键后缀，并将全境提示、残碑、图鉴对策、世界交互气泡、开场跳过提示与战斗心法弹窗全面切换为触屏原生指引（中英双语同步生效）。

---

## v43.4 去除入场动画与主界面人物，改为纯「破刃斩钟」器物意象版
- **彻底移除开场动画中的人物剪影（`src/render/titleIntro.js`）**：删除 `drawIntroPuppet()`，改为纯器物意象——精绘豁口**「灰钟断刃」**沿斜切轨滑入蓄势，剑身豁口处迸发金色星芒、6 道内聚金丝与细金斩线预览，随后破刃一闪斜劈而过，将巨型青铜古钟物理一分为二并留下熔金灼痕切口与碎铜火星。
- **主界面实景同步去除站立人物（`src/main.js` / `src/ui/progressionUi.js`）**：标题舞台右侧仅保留月夜下的熄灯祭坛、哥特石拱、摇曳悬灯与冷风墨雨，画面更克制高级。

---

## v43.3 7.8 秒四幕「破刃斩钟」电影级启动动画与一键重播
- **将入场动画升级为 7.8 秒四幕程序化水墨短片（`src/render/titleIntro.js`）**：
  * **第一幕（0.0–1.75s · 永夜悬钟）**：电影黑边推入，巨型青铜古钟随悬索垂落于月晕墨幕中央，银青灰烬飘散，序言「初钟未绝，晦渊永夜」渐显；
  * **第二幕（1.75–3.55s · 提灯居合）**：提灯偶残影自左下墨雾现身，手握豁口「灰钟断刃」沉腰蓄势居合一闪，剑锷迸发金色弹反星芒与内聚金丝，镜头缓推微震；
  * **第三幕（3.55–5.65s · 破刃断钟）**：`3.55s` 贯穿全屏的斜向白金一闪劈开巨钟 + `0.16s` 戏剧顿帧；`3.71s` 巨钟沿刀锋切面**真实物理一分为二**慢动作错位滑落，切口残留熔金灼痕，钟心青金魂火、14 枚碎铜片、58 枚定向火星与三重音波环全面爆发，悬索崩断回弹；
  * **第四幕（5.65–7.80s · 墨幕散尽）**：黑边退场、墨幕散开，无缝切入月夜熄灯祭坛动态实景并级联浮现标题与魂系菜单。
- **主界面右上角新增 `↺ 重播开场` 按钮**：点击可立刻带完整同步 Web Audio 居合/劈钟/碎盾音效重播 7.8 秒开场动画，任意按键/点击/手柄仍支持随时跳过。

---

## v43.2 电影级启动入场动画与全屏暗黑手绘主界面重构
- **新增程序化暗黑水墨入场动画（`src/render/titleIntro.js`）**：
  * 启动后在漆黑墨幕中浮现手绘裂纹青铜初钟与「初钟已裂，晦渊永夜」书法序言；`1.15s` 处金色刀芒一闪劈裂钟印并激荡双环波纹与火星；`2.35s` 起墨幕如月晕散开，无痕衔接到实景动态标题界面（任意按键/点击/手柄可随时跳过）。
  * 点击「继续残誓」或「踏入晦渊」时附带远钟余响与 `0.44s` 柔和墨幕转场进入游戏世界。
- **全屏实景暗黑手绘主界面重设计（`index.html` / `styles.css` / `src/main.js` / `src/ui/hudCore.js` / `src/ui/uiShared.js`）**：
  * 彻底移除旧版厚重弹窗框与 10 行大表格键位墙，改为透明全屏实景舞台——右侧黄金分割位实时呈现月光下的熄灯祭坛、摇曳悬灯、墨雨与守夜提灯偶（披风随风飘动、镜头缓慢呼吸运镜）；
  * 左侧悬浮手绘裂钟双刃纹章 + 烫金书法标题 **`灰 钟 残 誓`** + 经典魂系竖排极简菜单（继续残誓 / 踏入晦渊 / 选择档案 / 操作指南 / 系统设置），3 槽存档收纳为一键展开毛玻璃抽屉，操作指南与系统设置可直接于主界面打开并无损返回主界面。

---

## v43.1 模块拆分漏导入热修复与全局常量导入校验
- **修复启动报错 `WORLD_MIN_X is not defined`（`src/worldCamera.js`）**：补齐 v43.0 拆分 `src/world.js` 时漏导入的 `WORLD_MIN_X` / `WORLD_MIN_Y`。
- **同步排查并修复潜在崩溃 `WELL_BOTTOM_Y is not defined`（`src/render/worldBackdropRenderer.js`）**：补齐拆离铸钟殿背景渲染时漏导入的 `WELL_BOTTOM_Y`。
- **强化 `verify_project.py` 静态拦截**：扩展 `check_undefined_js_calls()`，全量扫描 64 个 JS 模块对 `config.js` 所有导出常量的引用，今后拆分模块漏导常量会在打包前直接报错拦截。

---

# 灰钟残誓 (Ashen Bell Vow) — v43.0 核心模块瘦身、全界面手柄导航与水牢镜渊乐章版

## v43.0 核心升级
- **4 大超行核心模块解耦瘦身（全部运行期 JS 模块 0 `[OVER]` 超行，0 循环依赖）**：
  * `src/locales/ui.js`（1,811 → **8 行门面**）：拆分为 `src/locales/uiZh.js` 与 `src/locales/uiEn.js`；
  * `src/audio.js`（1,663 → **921 行**）：将 30+ 套离线 Web Audio 音效合成配方独立为 `src/audioSfxBank.js`；
  * `src/render/worldRenderer.js`（1,674 → **1,269 行**）：将大区背景与水面涟漪抽离至 `src/render/worldBackdropRenderer.js`；
  * `src/world.js`（1,653 → **1,263 行**）：将镜头追踪、入场运镜、房间可见性遮罩与生态天气渐变抽离至 `src/worldCamera.js`。
- **全界面原生手柄一镜到底导航（`src/uiNav.js` / `src/input.js` / `index.html` / `styles.css`）**：
  * **肩键秒切分页（`LB / RB`）**：支持在 4-Tab 设置手账（系统/武器/怪物/残碑）、铁匠铺（钟脉星图/精粹）与舆图图钉栏间一键切换；
  * **新界面全焦段覆盖**：武器大图画廊、怪物 19 格实景立绘墙（含未解锁暗影剪影查阅）、18 节点钟脉技能树（聚焦即触发实时动作预览）与圣物羁绊星轨全部接入 2D 空间导航 + 按住连发；
  * **右摇杆 / 扳机平滑滚屏 & 实机切刃**：弹窗内右摇杆上下或 `LT/RT` 平滑滚动长页；战斗中轻推右摇杆左右直接轮切三系兵刃触发切刃技；手柄接入时底部自动浮现动态键位提示胶囊。
- **沉钟水牢与初铸镜渊独立配乐变奏（`src/audio.js`）**：
  * 为 **`cistern`（沉钟水牢）** 新增低八度沉潜钟鸣与深渊低音行进，为 **`heart`（初钟圣心 / 初铸镜渊）** 新增黑曜泛音五度共鸣。

---

# 灰钟残誓 (Ashen Bell Vow) — v42.0 沉钟水牢生态补完版

## v42.0 核心升级
- **2 种沉钟水牢专属敌兵（`src/entities.js` / `src/ai/enemiesAi.js` / `src/render/enemyRenderer.js` / `src/ui/codexGallery.js`）**：
  * **溺钟潜行者 (`drowned`)**：头戴裂纹青铜潜水钟、手持双钩的水牢潜行者，可潜入墨波瞬移至玩家身侧伏袭，攻击附带潮湿（导电）状态；精准弹反银芒勾爪或反借潮湿引爆导电钟鸣。
  * **锈锚重锤兵 (`anchorite`)**：拖曳巨型青铜钟锚的重甲刑卒，兼具延迟重拍拖链横扫（精准弹反巨额削势）与猩红高举砸锚（激起地面暗河冲击波）。
  * 全面接入怪物图鉴（**17 → 19 种**）、大图实景立绘烘焙、中英双语与关卡编辑器面板。
- **3 种水牢专属程序化水墨图章（`src/stampAtlas.js`，图章总数 17 → 20 种）**：
  * 新增 **`半沉巨钟 (sunken_bell_giant)`**、**`滴水铁囚笼 (iron_cage)`**、**`潮汐水蚀柱 (tide_pillar)`**，归入编辑器新分类 **`渊`**，实景布景至 `r21–r24` 全部四间水牢与源洞。
- **3 座水牢专属风化残碑（全境石碑 11 → 14 座）**：
  * 在 `r21_cistern_west`（《废钟溺铭》）、`r22_cistern_nave`（《泄洪旧录》）与 `r23_cistern_lock`（《断索水闸碑》）补齐沉钟水牢与全境暗河水文循环的暗黑世界观叙事及完整英译。
- **水牢专属圣物「退潮沉钟印 (`tidebell`)」+ 与「暗河泄洪」机制深度联动（圣物 11 → 12 枚，羁绊 8 → 9 组）**：
  * **获取**：开启钟井「暗河泄洪青铜闸」后，于 `r23_cistern_lock` 干涸河底拾得 `pickup_relic_tidebell`；
  * **机制联动**：法术与镇岳下砸范围 `+18%`、潮湿导电回魂 `+12`；**一旦暗河泄洪开启，自动觉醒常驻法伤 `+16%`、耗魂 `-4`**（精粹后提升至范围 `+26%`、法伤 `+24%`、耗魂 `-6`、回魂 `+18`）。
  * **新羁绊 #9「渊潮震鸣 (`tide_clapper` = 退潮沉钟印 + 回响钟舌)」**：镇魂钟鸣与镇岳下砸常驻触发潮湿导电增幅，并向两侧激荡双道破盾「渊潮震波」。

---

## v41.6 荆棘刺壁下劈弹跳（Pogo）与铁器火星反弹手感
- **《空洞骑士》式下劈尖刺弹跳（`src/combat/playerCombat.js` / `src/player.js` / `src/world.js`）**：
  * 空中对荆棘刺壁使用 **`S + 斩` 下劈（Pogo）**（三系兵刃均支持，含钟锤空中下劈自动识别刺壁不误触重砸），触发清脆高频金属叮鸣 `audio.playSpikeClang(true)`、钢白与金黄定向火星喷溅、`26ms` 顿帧与镜头微震，将玩家高高弹起（`vy = -530`）并轻推离刺面，同步刷新闪避冷却、二段跳与 `0.18s` 尖刺擦伤保护（`thornGraceTimer`）。
- **平砍 / 上挑 / 重斩火星反弹手感**：
  * 面向荆棘刺壁挥刀砍中铁刺时，爆发金属星芒闪烁（`sw.clangFlash`）与反向火花，赋予利落的水平反作用力推离墙面（轻击 `245 px/s` / 重击 `310 px/s`，空中附带微抬与 `0.14s` 保护帧并中断前冲），可借砍刺反推空中救命。

---

## v41.5 荆棘刺壁实装触碰伤害与实体石柱锚固
- **荆棘刺壁改造成真正的接触伤害陷阱（`src/world.js` / `src/locales/ui.js`）**：
  * 玩家跳到/触碰全境 10 处带尖刺的墙面时，不再只是“不能蹬墙”，而是立即触发 **16 点尖刺接触伤害 + 沿远离刺面方向弹开击退（`vx=300, vy=-245`）+ 猩红火星与「荆棘刺伤！」提示**，并正常享有受击无敌帧与护道减伤倍率（且无敌帧内依然禁止蹬墙防借伤逃课），外观与机制完全统一。
- **修复悬浮无依托尖刺墙 & 美术升级（`data/rooms/*.json` / `src/render/puzzleRenderer.js`）**：
  * 为 `r01_sanctuary`（`slick_r01_east`）与 `r22_cistern_nave`（`slick_r22_shaft`）补齐实体石柱支撑，将 `r21_cistern_west` 刺壁迁至实心石梁并使 `r04 / r18 / r19 / r20` 全部尖刺墙严密贴合实体墙面（避开宝箱台与地面边缘防误伤）；
  * 升级尖刺渲染为暗铁铆钉支架 + 猩红寒锋铁刺，并在 `verify_project.py` 新增实体背墙防悬浮校验。

---

## v41.4 跳台手感、孢伞力度与首领前祭坛跑图精修
- **全境压线跳台与出井孢伞精修**：
  * **`r03_chapel`（断钟礼拜堂）**：两侧破潮跃台由 `y=465` 降至 `y=486`（高差 `115→94px`，单跳容错由 `2.8px` 拓宽至 `23.8px`）。
  * **`r02_corridor`（枯骨长廊）**：低层过渡台 `platform[9]` 由 `y=430` 降至 `y=478`（`580→478=102px`、`478→380=98px`），T0 无钩索开荒也可顺畅攀登中层。
  * **`r04_bell_well`（沉渊钟井）**：竖井下段跃台微调至 `y=1230 / y=1125`，消除 `115px` 压线单跳。
  * **`r19_belfry_outer`（断索钟楼）**：中层台由 `y=330` 升至 `y=316`（两级高差均衡为 `104px / 101px`）。
  * **`r14_woods_cavern`（盘根溶洞）**：右侧回程柱补齐中层孢伞 `bp_wc_mid`（`x=390, y=430, boostVy=-880`），并将顶层 `bp_wc_up3` 提速至 `-920`（出井净余量 `70px`）。
  * **`r15_woods_heart`（古钟树窟）**：出井首阶 `bp_wh_exit` 提速至 `-1020`（余量 `54px`）、顶阶 `bp_wh_top` 提速至 `-970`（余量 `42px`），打完古林守誓出井一气呵成。
- **新增 2 座首领前祭坛（全境 7 大首领/守誓初见跑图全面压至 ≤ 6.5 秒）**：
  * **`altar_foundry_door`（钟井 · 炉前残坛 · `r04_bell_well` 铸钟殿门前 `x=1690, y=1380`）**：同步微调 `pickup_ink_wings` 与 `golem_3` 巡逻边界，打「寂」跑图从 11–14 秒暗河钟摆折磨压至 **~2.5 秒零阻碍**。
  * **`altar_wind_bridge`（绝风 · 千铃桥头坛 · `r12_wind_bridge` 东桥头 `x=1065, y=620`）**：将东端双刀客迁至中段桥面，打「朔」跑图从跨两房 12–16 秒压至 **~3.4 秒零阻碍**。

---

## v41.3 展开大地图空白热修复 + 全工程未定义函数静态拦截
- **修复大地图展开后画布一片空白且顶部探索度卡在 0% 的 Bug（`src/ui/mapUi.js`）**：v40.2 在 `detailed` 分支误写了 `computeRoomMapStats(rm)`（正确函数名为已导入的 `getRoomCollectibleStats(rm)`），导致小地图正常而展开大地图抛出 `ReferenceError` 中断绘制；现已修复。
- **强化 `verify_project.py` 全工程静态检查**：新增 `check_undefined_js_calls()`，扫描全部 59 个 JS 模块的裸函数调用，永久拦截未导入/拼错函数名的静默运行时崩溃。

---

## v41.1 关卡编辑器实时 5 阶拓扑体检与一键违规房间高亮
- **新增独立编辑器图论求解模块 `src/editorTopology.js`**：将 `verify_project.py` 的全部 5 阶有向可达图（`T0–T4`）、强连通防软锁、Boss-1/Boss-2 防绕后、横向暗墙拦截、竖井孢伞净空（`≥90px`）、负 Y 层钩点/悬灯 `topY` 及静态黑冲封顶校验实时接入 `editor.html`。
- **改图即检 + 顶部状态灯（`src/editor.js` / `editor.html` / `editor.css`）**：每次编辑画布、连线、属性或撤销重做后 `160ms` 自动防抖重算，顶部 `🩺 全境体检` 按钮与左侧房间列表同步显示实时绿勾 / 黄警 / 红错角标。
- **一键高亮违规房间（`🔦 高亮违规房` 或快捷键 `[V]`）与 5 阶透视层**：
  * 点击按钮一键切入全境总览并在画布上以醒目红/黄脉冲边框 + 角标 + 冲突区域虚线框标出所有违规房与具体冲突几何（点击问题条目直飞定位）；
  * 体检抽屉新增 `T0 / T1 / T2 / T3 / T4` 5 阶交互胶囊，点击即可在全境画布实时透视该能力阶段的可达范围、锁定区域与软锁/绕后违规房。

---

# 灰钟残誓 (Ashen Bell Vow) — v41.0 25房全境拓扑收口、单向机关闸门与自动图论防软锁校验版

## v41.0 核心升级（确立 5 条地图架构铁律并固化为自动化求解器）
- **彻底根治 3 大拓扑与竖井卡点**：
  1. **消灭全图所有横向 `secretWalls`（修复起始 0/3 ⇄ 断索钟楼 1/1 回不去软锁）**：将 `r19_belfry_outer` 与 `r10_ink_woods` 底部/顶部横向封板升级为数据驱动的 **单向青铜活板门 (`SWITCH_GATES`) + 顶/内侧拉杆 (`worldSwitches`)**，未启闸前从下方无法钩索穿顶，抵达内侧启闸后永久双通。
  2. **方案 ① 严格斩「寂」后圣阶侧单向拉闸（彻底杜绝绕到二关 Boss 红墙背面）**：在 `r07_ascent ⇄ r09_wind_spire`、`r04_bell_well ⇄ r09_wind_spire`、`r20_bell_galleries ⇄ r12_wind_bridge` 与 `r14_woods_cavern ⇄ r21_cistern_west` 全部部署 **单向青铜铁闸 + 后置侧拉杆**，斩落「寂」之前绝无任何绕后旁路；击破「寂」踏入圣阶与水牢后可依次从后置侧拉闸反开全境大环路捷径。
  3. **枯墨古林下井与水牢竖井「落/升双道分离」（修复下井卡台阶/被孢伞弹回）**：重排 `r14_woods_cavern`（左 145px 纯直落道 + 右侧弹跳孢伞列）、`r15_woods_heart`（右 140px 纯直落道直通古林 Boss + 左侧弹跳孢伞列）以及 `r10 / r21 / r22 / r23` 顶层跃台，下井不再卡边。
- **`verify_project.py` 实装「5 阶能力有向可达图 + 强连通防软锁 + Boss-2 防绕后 + 竖井净空」自动求解器**：每次校验自动按 T0–T4 五档能力模拟全境 25 房前进与回城路径，永久拦截软锁与绕后漏洞。
- **存档升级至 `v42`**：动态保存全部 `worldSwitches` 状态，并自动把旧档 `v8–v41` 已打通的旧暗墙迁移为对应单向机关已开启状态，100% 向下兼容。

---

## v40.2 高空房间钩点/悬灯消失与地图迷雾穿帮彻底修复
- **修复所有负 Y 坐标高空房（`r18 / r19 / r20 / r25`）钩点与悬灯完全消失的 Bug（`src/levelLoader.js` / `src/render/worldRenderer.js` / `data/rooms/*.json`）**：
  * 根因：`topY` 缺失时渲染层回退到 `0`，在 `y < 0` 房间传给 `isInView()` 负高度导致整批钩环与悬灯被裁剪不可见，且在底层水牢（`y = 1520`）向上拉出 1500px 幽灵铁链。
  * 修复：数据层补全全部 19 处钩环 `id/topY` 与 17 盏悬灯 `topY`，同时在 `levelLoader.js` 与 `worldRenderer.js` 双重兜底房间天顶坐标与 `Math.min/max` 安全视锥包围盒。
- **修复地图扩容后迷雾跨房穿帮、空白虚空发灰与旧档迷雾错位（`src/config.js` / `src/state.js` / `src/save.js` / `src/ui/mapUi.js`）**：
  * 舆图迷雾纵向精度翻倍（`MAP_ROWS: 16 → 32`），`markMapExplored()` 严格裁剪在当前所在房间边界内，彻底消除穿墙探图与礼拜堂上方空白虚空发灰；
  * 存档升级至 `v41`，读取 `v8–v40` 旧档时按各代历史世界坐标精确重投影并剔除虚空杂点；
  * 舆图未探索房间不再透底泄露 `0/N` 徽章，新增 `cistern` 生态底色与覆刺滑壁红线标注。
- **封顶加固全部 7 处新增静态黑冲结界（`r12 / r14 / r18 / r20 / r21 / r23 / r24`）**：全部补齐石顶/背墙形成密闭秘室，彻底杜绝跳过黑冲结界逃课，并写入 `verify_project.py` 永久防回归校验。

---

## v40.1 菜单图鉴视觉重构与分页穿透修复
- **彻底修复图鉴页向下滑动串出系统设置的 Bug（`styles.css` / `src/ui/modalsUi.js`）**：补齐全局 `.hidden { display: none !important; }` 并同步控制 `#settings-pane-system` / `#settings-pane-codex` 显隐与切页自动滚回顶部。
- **「大图为主，文字为辅助」图鉴画廊重构（新增 `src/ui/codexGallery.js`）**：
  * **⚔ 武器图鉴**：3 张大尺寸 16:10 暗黑水墨兵刃立绘卡（灰钟断刃 / 镇渊钟锤 / 引魂摇铃专属大图，未解锁显示暗影封印图）+ 底部极简招式速览条。
  * **👹 怪物图鉴**：顶部大图展台（实时调用游戏本体手绘渲染管线生成 `240×168` 高清实景立绘，未遇见怪物自动渲染深墨暗影剪影 + `?` 印记）+ 下方 4 列纯视觉立绘缩略画廊，点击即切展示破招心法与战绩统计。

---

# 灰钟残誓 (Ashen Bell Vow) — v40.0 四页设置手账、路线A能力渐进与刺壁黑冲重构版

## v40.0 核心升级
- **设置面板升级为 4-Tab 统一手账（`index.html` / `src/ui/modalsUi.js` / `styles.css`）**：
  * **Tab 1 · ⚙ 系统设置**：语言、护道辅助、音量、帧率分频、自定义改键、A/B 战斗压测。
  * **Tab 2 · ⚔ 武器图鉴（新增）**：收录 3 系兵刃纹章、获取线索、极简招式一览表（长按蓄力 / 切刃派生 / 空中特色 / 满印奥义）及 2 项专精解锁状态。
  * **Tab 3 · 👹 怪物图鉴（视野自动收录）**：每 `0.25s` 自动扫描屏幕视野内的存活敌兵与首领，**照面即自动收录**并在右下角弹出轻提示 **`✦ 图鉴收录 · XXX`**，同时展示击杀/弹反/处决统计、出没区域与破招心法。
  * **Tab 4 · 📜 残碑与成就**：整合 11 块石碑、双结局回放与 22 项成就；原 `[B]` 快捷键与暂停/舆图/祭坛入口无缝直达对应分页。
- **路线 A 类银河恶魔城能力锁重塑（4 阶清晰不重叠的探索梯度）**：
  1. **幽丝钩索 (`abilities.grappleHook`) 改为斩落首位首领「断钟骑士 · 晦」后解封**：`r03_chapel` 新增两侧悬灯跃台确保无钩索也能公平破潮，斩落「晦」后正中央解封 `pickup_grapple_hook`（旧档 `v8–v39` 只要已击败晦或已有二段跳将自动继承钩索，零卡关）；未解锁前全境青铜钩环呈暗金休眠态制造探索悬念，HUD 同步新增 `幽丝钩索` 徽章。
  2. **覆刺滑壁 (`slickWalls` · 全境 10 处) + 精简竖直冗余钩点 → 真正的「墨翼步」二段跳硬锁**：接触覆刺滑壁无法滑墙与蹬墙跳，彻底堵死高阶秘宝平台的无限蹬墙逃课，把起点苍穹阁、雨阶顶层、断索钟楼、沉钟水牢上层做成纯正的二段跳获得感验证点。
  3. **黑冲结界扩充至 13 处 + 新增 4 道「周期横扫暗蚀钟幕」**：在 `r07 / r11 / r22 / r23` 实装来回横扫的猩紫钟幕，步行或普通闪避触碰即受创，唯有 **「幽影穿身」** 可无伤穿梭引爆紫芒！
- **存档 v40、编辑器预览同步与全量静态自检**：存档升级至 `v40`（100% 向下兼容 `v8–v39` 旧档），编辑器同步支持 `grappleHook` 下拉与 `slickWalls` 画布渲染。

---

# 灰钟残誓 (Ashen Bell Vow) — v39.0 首领机制去同质化、视听仪式感与水墨立绘封板

## v39.0 核心升级
- **主线三大首领全场机制彻底去同质化（`src/ai/bossesAi.js` / `src/world.js` / `src/combat/worldCombat.js` / `src/render/cinematicRenderer.js`）**：
  * **断钟骑士 · 晦 (`boss_hui`)**：保留经典的击鸣双悬灯破猩红墨潮玩法。
  * **沉渊铸钟师 · 寂 (`boss_ji`)**：铸钟殿高空新增 **2 口悬吊熔坩埚 (`foundryCrucibles`)**——玩家可用钩索、灵刃或空中斩击断铁链使其轰然坠落，直接浇熄「寂」的护盾与铸炉共振、造成 `110 伤 + 95 削势` 并强制触发 `2.4s` 大破绽（14 秒后铸炉自动重新吊起新坩埚）。
  * **初钟圣骸 · 渊 (`boss_yuan`)**：彻底重构三阶段全场技为 **「初钟三连鸣 · 三拍连弹共振交响 (`yuanResonanceWave`)」**——圣骸释放 3 拍节奏分明的金色弧形共振波，精准弹反可将音波反震回圣骸（每拍 `58 伤 + 68 削势 + 1 墨印`），三拍全弹直接瞬崩圣骸架势引爆终极打铁高潮！
- **首领入场运镜仪式 & 击杀 0.85s 慢镜（`src/state.js` / `src/main.js` / `src/world.js` / `src/render/cinematicRenderer.js`）**：
  * 4 大首领（晦、寂、渊、铸）唤醒瞬间自动触发 `1.55–1.65s` **电影级入场仪式**：上下暗黑影院黑边平滑滑入、镜头缓推聚焦首领 `1.075×` 微距并伴随震环与标题横幅（压测模式自动跳过，确保 A/B 压测纯净）。
  * 斩落任意大首领瞬间触发 **`0.85s` 0.24× 电影慢镜** + 璀璨流金闪光与余韵钟鸣。
- **大区水墨书法标题横幅（`drawZoneCalligraphyBanner`）**：
  * 跨越任意大区边界时，屏幕上方优雅展开淡墨长卷与双菱印书法大区横幅（含 12 套生态专属中英诗意副标题）。
- **4 位 NPC 暗黑手绘水墨半身立绘（`src/npcPortraits.js` / `index.html` / `styles.css`）**：
  * 为盲眼老铸钟匠·砺、游方拾碑客·墨尘、旧誓守灯人·汐、盲眼拾荒童·灰芽全部实装零外部依赖的暗黑水墨半身立绘，内嵌至铁匠铺与 NPC 对话顶部。

---

# 灰钟残誓 (Ashen Bell Vow) — v38.0 25房中型体量扩容、沉钟水牢与实体初铸镜渊版

## v38.0 核心升级
- **6 小时+ 中型体量地图扩容（17 房 → 25 房 · 5 层立体环路 · `11,180 × 3,740` 零重叠）**：
  * **开荒高空缓冲环（`r18_rain_steps` 淋雨墓阶 + `r19_belfry_outer` 断索钟楼）**：从枯骨长廊向上攀跃可绕回熄灯祭坛高阁，补足前期打铁练习与捷径多巴胺。
  * **高空风廊捷径（`r20_bell_galleries` 悬索钟阁）**：串联沉渊钟井上层与绝风断桥，内置钟摆与换向风铃。
  * **全新中后期独立大区「沉钟水牢」（`cistern` 新生态主题，4 房连贯底层大环路）**：
    - `r21_cistern_west` 渗水囚廊 · `r22_cistern_nave` 淹钟巨厅（新增 **淹钟祭坛** 与退潮灯油残芯）· `r23_cistern_lock` 断索水闸 · `r24_frost_seep` 霜渊冰窖；
    - 与 `r04`、`r06`、`r07`、`r11` 形成 **4 处「镇岳下砸」破地竖井** 与 3 条可排干的地下暗河，彻底闭合东西地下超级环路！
- **实体化终极隐藏殿堂「初铸镜渊」（`r25_mirror_abyss`）**：
  * 集齐三境铭印并满足解锁条件后，`r13_wind_peak` 升起直贯天穹的金色风柱并开启镜渊石门，玩家可亲自踏上黑曜镜水迎战 **实体化首领「初铸残影 · 铸」**（不再局限于祭坛回响菜单），斩落后解封 **「初铸绝响 · 双面金冕」**！
- **第 4 位奇人 NPC「盲眼拾荒童 · 灰芽」与动态演化熄灯营地**：
  * 在淹钟巨厅结识灰芽后，可购买 **「全境秘墙与裂石古图（160 残响）」**（在羊皮纸舆图迷雾上方永久高亮所有未破暗墙与裂石地板）与 **「沉钟古铃匣（120 残响，永久 +15 血/魂）」**。
  * 随着任务推进，墨尘、汐、灰芽三位 NPC 将陆续迁徙至起点 `r01_sanctuary` 熄灯祭坛旁点燃灯火，让营地随流程越发温暖鲜活。
- **存档 v38、启动器修复与全量静态自检**：
  * 存档升级至 `v38`（100% 向下兼容 `v8–v37` 旧档）；修复 `start_game.bat` 完整性并通过 `verify_project.py` 全量 0 错误 0 警告校验。

---

# 灰钟残誓 (Ashen Bell Vow) — v37.0 镇岳下砸、暗河泄洪与三境环境解谜联动版

## v37.0 核心升级
- **第 3 项核心探索/战斗能力「镇岳下砸（荒芜俯冲）」(`abilities.bellDive`)**：
  * 击败 **沉渊铸钟师 · 寂 (`boss_ji`)** 后，铸钟殿中央（`r05_foundry`）战后解封能力神龛 `pickup_bell_dive`，HUD 同步点亮金边 **`镇岳下砸`** 徽章。
  * 空中按 **`S + 法术`** 触发 `0.52s` 无敌青铜巨钟影俯冲，硬砸首领危技反打、引爆 192px 破盾震荡，并垂直震碎全境 3 处发光裂石/脆冰地板（`r02→r06` 暗道、`r04` 上→中层捷径、`r11` 隐藏冰窟「凝霜魂核」）。
- **两套物理改变大地图结构的宏观跨房机关 (`worldSwitches`)**：
  1. **暗河泄洪青铜闸 (`switch_drain_river` · `r04_bell_well` 井底)**：按 `[E]` 或挥刃启闸后，全境 4 条地下腐蚀暗河物理退潮排干转为无害浅滩，河底显露 2 处沉没秘藏（`pickup_sunken_well` 与 `pickup_sunken_woods`）。
  2. **古炉泄压风阀 (`switch_foundry_valve` · `r05_foundry` 战后解封)**：收回铸钟殿天顶双开铁闸并喷涌强力热流风柱，直接打通 **`r05_foundry ⇄ r09_wind_spire`** 垂直高速通道。
- **三大秘境专属环境解谜机关**：
  * **绝风断塔 · 换向风铃 (`windVanes` · `r09` / `r12`)**：击鸣反转双风井侧向气流并同步偏转风带粒子。
  * **枯墨古林 · 休眠巨孢伞 (`dormant: true` · `r10` / `r14`)**：需以「镇魂钟鸣 / 镇岳下砸 / 引魂摇铃音环」唤醒永久盛开。
  * **霜骸圣脊 · 悬冰柱搭桥 (`icePillars` · `r11` / `r16`)**：击落天顶悬冰砸伤下方敌兵并永久冻成冰桥捷径。
- **存档 v37、编辑器预览与全量自检**：存档升级至 `v37`（100% 向下兼容 `v8–v36` 旧档），新增独立渲染模块 `src/render/puzzleRenderer.js`，1× 残响总收入为 **5,284 残响**。

---

# 灰钟残誓 (Ashen Bell Vow) — v36.0 打击感与清杂爽感重构版

## v36.0 核心升级
- **非对称顿帧 & 全 17 类敌兵/首领受击形变（`src/main.js` / `src/combat/damageCombat.js` / `src/render/enemyRenderer.js` / `src/render/bossRenderer.js`）**：
  * **非对称顿帧（Asymmetric Hitstop）**：常规轻击清零全局停顿，改为敌体局部冻结 + 高频微颤 `32–56ms`，同时刀光残影、溅射火星、镜头震动与玩家移动继续以 85%–100% 速率顺滑演进，彻底告别“一砍就卡屏”的迟滞感。
  * **受击挤压回弹（Squash & Recoil）**：为全部常规敌兵、三境守誓与四大首领实装受击瞬间的 `squashX / squashY` 挤压拉伸、定向后仰 `recoilLean` 与受击硬直打断，让每一刀的反馈沉重扎实。
- **击飞撞墙碎骨 & 保龄球连锁砸伤（`src/ai/enemiesAi.js` / `src/ai.js` / `src/audio.js`）**：
  * 使用钟锤重砸、居合一闪、三段重劈或幽丝瞬斩击飞常规敌兵时，进入纯物理击飞抛体态（不被巡逻 AI 覆盖）：
    - **撞墙碎骨（Wall-Slam）**：敌兵撞击实心墙柱时爆发碎石震环与专属沉重撞击音效 `playWallSlam()`，追加 **26% 最大生命撞击伤 + 34 削势**；
    - **连锁撞飞（Bowling Crash）**：飞行中的敌兵撞到身后其他敌兵会直接传递动量连锁撞飞，造成范围伤害与削势，打造《死亡细胞》级走廊清杂快感。
- **三系兵刃空中差异化 + 钩索派生「幽丝瞬斩」（`src/player.js` / `src/combat/playerCombat.js` / `src/weapons.js` / `src/render/playerRenderer.js`）**：
  * **全兵刃 · 钩索派生瞬斩**：幽丝钩索拉近敌兵瞬间（距离 ≤ 165px）按攻击，取消固定上弹直接斩出高速穿刺**「幽丝瞬斩 / 幽丝重砸 / 幽丝双鸣」**，同步刷新二段跳与闪避冷却；
  * **镇渊钟锤 · 空中「陨星坠」**：空中按 `S + 攻击`（下方无悬灯/钟摆时）或空中释放蓄力攻击，进入霸体滞空闪光后以 `1100+ px/s` 垂直重砸地面，落地引爆大范围金光裂震并向两侧击飞杂兵（途中擦过悬灯仍会自动无缝弹跳，零破坏跳跳乐）；
  * **引魂摇铃 · 凌空风筝体系**：空中普攻触发微滞空后撤（每次跳跃上限 3 次防无限飞）并发射斜下方穿透音环；空中蓄力触发后空翻无敌撤步 + 向下散射追踪铃矢。
- **常规杂兵血量与推进节奏校准（`src/entities.js`）**：
  * 适当压薄走廊常规杂兵（哨兵 `115→88`、怨灵 `72→58`、墨蛭 `68→52`、风隼 `84→66`、祭司 `86→72`、菌傀 `124→98`），一套三连或一次弹反处决即可干脆收割，把高血量压迫感集中留给重盾铁卫、守誓与首领战。

---

# 灰钟残誓 (Ashen Bell Vow) — v35.0 可视化钟脉技能树、极简去文字化与圣物羁绊星轨版

## v35.0 核心升级
- **可视化「三脉钟纹星图」技能树（`src/skillTree.js` / `src/ui/skillTreeUi.js` / `index.html` / `styles.css`）**：
  * 彻底重构老铸钟匠铁砧界面，以一口龟裂青铜巨钟为星图底盘，将铁匠数值淬炼、三系兵刃专精词条与全新动作质变技收拢为 **20 节点三脉星图**：
    - **左脉 · 断锋脉**：锻锋 I–IV + 绝锋终淬（切刃窗口延长至 `0.62s`），支脉直连「影闪双斩 / 震岳余波 / 回响连环」攻击系质变；
    - **中脉 · 钟魄脉**：钟势 I–II + 震钟终势，支脉直连「见切回印 / 铁壁反震 / 摄魂聚印」打铁/凝印系质变；
    - **右脉 · 提灯脉**：魂炉 I–II + 永明魂炉，新增两大高爽感动作质变节点——**「凌空饮灯 (`air_flask`)」**（空中可饮灯油并短暂悬停，对标丝之歌空战续航）与 **「掠影续势 (`exec_surge`)」**（处决/击杀立即刷新闪避与钩索冷却，并获 1.6s 移速 +20% 连杀惯性）。
  * **形状语义直观区分**：小菱形代表属性节点，大双环圆徽代表质变关键节点，可负担节点自带流金呼吸光环；完整兼容并自动映射旧档全部淬炼等级与词条。
  * **实时水墨小人动作演示窗（`#skill-preview-canvas`）**：悬停或选中任意节点时，右侧 208×116 独立 Canvas 立即循环演示该技能的实机动作与特效，无需阅读长文即可 0.5 秒看懂效果。
- **极简去文字化改造（`src/config.js` / `src/weapons.js` / `src/locales/*`）**：
  * 为全部 11 枚圣物、8 组羁绊、3 系兵刃与 20 项星图节点补齐 ≤12 字极简短词条（`shortEffect` / `shortRefined` / `shortDesc`），砍掉祭坛与铁匠铺中的冗长说明段落，改用清晰标签条与图标直读。
- **祭坛圣物刻盘 × 动态 SVG 羁绊星轨连线（`src/ui/relicBoardUi.js`）**：
  * 重构祭坛圣物面板，在圣物网格上方叠加动态定位的 **SVG 羁绊星轨层（`#relic-synergy-svg`）**：
    - **悬停/聚焦预览**：鼠标悬停或手柄聚焦任意已解锁圣物，能与之触发隐藏羁绊的搭档圣物立刻亮起青蓝边框，并弹出**流动虚线星轨 + 中点羁绊铭牌**；
    - **双印/三印激活**：同时装上羁绊圣物后，星轨转为**璀璨金色实线能量弧**，顶部单行芯片栏直出极简效果公式。
- **模块化瘦身 & 存档 v35（`src/ui/modalsUi.js` / `src/ui.js` / `src/save.js` / `verify_project.py`）**：
  * `src/ui/modalsUi.js` 拆出 `skillTreeUi.js` 与 `relicBoardUi.js` 后大幅瘦身至 **844 行**（全项目 0 循环依赖）。
  * 存档升级至 `v35`（持久化 `skillNodes` 并在 NG+ 轮回继承，100% 向下兼容 `v8–v34` 旧档），`verify_project.py` 同步新增 v35 星图、动作演示、羁绊星轨与存档自检项。

---

# 灰钟残誓 (Ashen Bell Vow) — v34.0 残响经济闭环、圣物精粹升阶与终局打铁平衡版

## v34.0 核心升级
- **残响经济闭环重校准（`src/config.js` / `data/rooms/*.json` / `src/ui/modalsUi.js`）**：
  * 全面收敛常规敌兵（51 只 1× 收入 `2,126 → 1,444`）、三境守誓（`800 → 540`）、四大首领（`1,460 → 1,100`）、10 处 `echoCache`（`2,135 → 1,050`）、3 处 `realmSeal` 附赠与秘宝附赠（`900 → 370`）及墨尘/汐支线酬谢（`1,120 → 580`），将单周目 1× 全清总收入精准压入 **~5,084 残响**（非回响纯探索 1× 为 `4,664`，1.5× 常规清怪为 `5,386`）。
  * 重构铁匠淬炼梯度（断刃 Lv1–5 `1,120` / 钟势 Lv1–3 `540` / 魂炉 Lv1–3 `520`，合计 `2,180`），配合圣物精粹升阶让中后期跑尸与构筑取舍重获魂味压迫感。
- **圣物精粹升阶系统（+1 淬印，450 残响 / 枚）（`src/config.js` / `src/state.js` / `src/ui/modalsUi.js` / `src/ui/hudCore.js` / `src/audio.js` / `styles.css`）**：
  * 覆盖全部 **11 枚圣物**的专属 `+1 淬印` 数值强化（如碎镜之眼窗口 `100ms → 112ms` + 反伤 `26`、噬痛荆棘吸血 `+105%`、幽丝断钟钩索 `0.20s` 等），铁匠铺铁砧与任意祭坛均可直接淬印升阶。
  * 已淬印圣物赋予专属金色流光边框、**`★ +1`** 星标徽章（铁匠铺 / 祭坛印槽 / HUD 同步展示）与独立离线预烘焙淬火钟音 `playRelicRefine()`；NG+ 轮回完整继承全部精粹状态。
- **终局伤害/削势与首领梯度对齐（`src/state.js` / `src/entities.js` / `src/combat/damageCombat.js`）**：
  * 淬炼断刃平滑调整为每级 `+10%`（满级 `+50%`）、重铸钟势每级 `+9%`（满级 `+27%`）、三境铭印阶梯调整为 `+4% / +8% / +12%`，并在 `addPostureToEnemy` 引入 `>2.20×` 软上限抑制极端叠乘融化。
  * 同步校准强敌数值：晦 `580/155`、寂 `790/210`、三境守誓 朔 `440/145` / 枯 `520/175` / 凛 `580/190`、初钟圣骸·渊 `1,260/285`、初铸残影·铸 `1,480/315`。
- **关卡编辑器升级至 v34.0（`src/editor.js` / `editor.html` / `editor.css`）**：
  * 补齐 **`realmSeal` 铭印神龛**、`requiresBoss` 战后解封锁链属性编辑与画布预览、**`skyBridgeGate` 天顶断桥石门**可视化编辑与渲染。
  * 全境体检抽屉新增生态机关越界/尺寸检验、三境铭印与 `requiresBoss` 引用完整性检查，以及实时 **1× 残响经济总量体检看板**。
- **存档 v34、完整中英双语与自动化全量自检（`src/save.js` / `src/locales/*` / `verify_project.py`）**：
  * 存档升级至 `v34`（持久化 `refinedRelics`，100% 向下兼容 `v8–v33` 旧档）。
  * `verify_project.py` 新增残响经济收支统计与区间校验、11 枚圣物精粹双语覆盖校验、`zh-CN / en-US` 全量词条键一致校验与编辑器 v34 特性校验。

---

# 灰钟残誓 (Ashen Bell Vow) — v33.0 首领对空 AI 进化、三境铭印神龛与终誓第三印槽版

## v33.0 核心升级
- **彻底根治“头顶跳劈永动机”——全 7 位首领与守誓实装立体对空反制 AI（`src/ai/wardensAi.js` / `src/ai/bossesAi.js` / `src/combat/playerCombat.js`）**：
  * 玩家对首领/守誓未落地连续下劈达第 3 次起触发「连劈失势」：衰减弹起高度、不再重置二段跳/闪避并降低削势，保留下劈踩灯与短期越位手感，同时终结无脑空中逃课。
  * 为全 7 位首领/守誓引入 `overheadPressure`（头顶滞空仇恨值），滞空或连踩头立刻触发带头顶判定框的专属**对空反制技**：
    - **断钟骑士 · 晦**：`逆月撩斩`（头顶 200° 金芒上撩，可空中打铁弹反）+ 新增地面变招 `假刺反撩`；
    - **沉渊铸钟师 · 寂**：`悬索急升震爆`（猩红危兆拉升震环）+ 新增 `双悬铃夹击` 交叉弹幕；
    - **初钟圣骸 · 渊**：`穹顶剑幕`（头顶扇形剑雨与法球）+ 二/三阶段新增 `残影错拍二连`；
    - **初铸残影 · 铸**：`三刃破空`（随断刃/钟锤/摇铃当前姿态动态切换对空反制）；
    - **截风巡塔使 · 朔**：`飓风升龙斩` + 新增 `逆风后撤空翻散射`（风刃受二阶段侧风偏移）；
    - **盘根古钟精 · 枯**：`树冠荆棘顶刺`（展开 3.2s 翡翠荆棘冠反刺踩头）+ `地底三连突刺根须` + 二阶段「吸孢凝铠」；
    - **断剑霜侯 · 凛**：`霜华冲天斩`（高空冰柱 + 斜射冰晶）+ 二阶段新增 `冰雾瞬步背刺居合`。
- **三境战后仪式化奖励、实体封印神龛与世界通路解锁（`data/rooms/r13, r15, r17` / `src/combat/damageCombat.js` / `src/combat/worldCombat.js` / `src/render/worldRenderer.js`）**：
  * 三境殿堂的魂核与新增**「三境铭印圣物神龛（绝风/枯林/霜脊铭印）」**开战前均以青铜封印锁链笼罩（`requiresBoss`）；斩落守誓后封印当场碎裂、光柱升腾，供玩家亲手按 `[E]` 领取！
  * `r13_wind_peak ↔ r17_frost_summit` 天顶断桥增设实体 **`skyBridgeGate`** 冰风石门，斩落「朔」或「凛」任意一位后正式升起贯通全境天顶环路。
- **三境铭印阶梯成长 & 终誓第三圣物槽（`src/state.js` / `src/ui/modalsUi.js` / `src/ui/hudCore.js` / `src/save.js`）**：
  * 收集 1 / 2 / 3 枚三境铭印永久赋予全兵刃伤害与削势 **+6% / +12% / +16%** 阶梯突破；
  * 集齐全部 3 枚铭印后，祭坛正式解封**「终誓第三圣物槽」**，支持同时铭刻 **3 枚圣物**并激活多重隐藏羁绊！存档升级至 `v33` 并 100% 向下兼容 `v30` 旧档。

---

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
