# Android 手绘风格界面绘制指南（Compose）

本文总结了本项目里已经验证可用的“手绘风格”实现方式，可直接复用于其他 Android 项目（Jetpack Compose）。

## 1. 手绘风格的核心原则

- 形状不追求几何完美，但要保持结构正确
- 随机感要“可控且稳定”，不能每帧变化
- 层次要克制，避免阴影/双描边造成脏边
- 字体必须落到本地资源，避免在线字体失效导致风格丢失

## 2. 字体：优先使用本地手写字体资源

本项目使用 Caveat 字体，放在 `res/font` 下，并在 Compose 中通过 `FontFamily` 引用本地字体：

```kotlin
val caveatFontFamily = FontFamily(
    Font(R.font.caveat_regular, FontWeight.Normal),
    Font(R.font.caveat_bold, FontWeight.Bold)
)
```

使用位置可参考：
- [MainActivity.kt](file:///c:/Users/0qyx/dev/0Android/Rotation/app/src/main/java/com/example/roughdial/MainActivity.kt)
- [caveat_regular.ttf](file:///c:/Users/0qyx/dev/0Android/Rotation/app/src/main/res/font/caveat_regular.ttf)
- [caveat_bold.ttf](file:///c:/Users/0qyx/dev/0Android/Rotation/app/src/main/res/font/caveat_bold.ttf)

## 3. 轮廓线：单主描边 + 轻微抖动

圆形边框通过 Path 分段绘制，并对每个分段半径做轻微扰动，形成“手画边缘”。

关键点：
- 使用固定分段数（例如 100 段）
- 首尾段 jitter 置 0，确保闭合干净
- 保留单层主描边，避免外层半透明偏移描边导致灰边

参考实现：
- [DialRenderer.kt](file:///c:/Users/0qyx/dev/0Android/Rotation/app/src/main/java/com/example/roughdial/ui/DialRenderer.kt#L65-L95)

## 4. 刻度：角度精确，风格只体现在微扰

刻度的基础角度必须严格来自数学分度（`360 / totalTicks`），手绘感只放在小幅微扰上：

- 角度微扰：很小（例如约 ±0.45°）
- 长度微扰：小范围浮动
- 半径微扰：小范围浮动

本项目中，刻度参数在初始化时一次性生成并复用，避免重绘时“抖动跳变”：

参考实现：
- [DialRenderer.kt](file:///c:/Users/0qyx/dev/0Android/Rotation/app/src/main/java/com/example/roughdial/ui/DialRenderer.kt#L29-L54)
- [DialRenderer.kt](file:///c:/Users/0qyx/dev/0Android/Rotation/app/src/main/java/com/example/roughdial/ui/DialRenderer.kt#L97-L141)

## 5. 随机策略：稳定随机，不要帧随机

正确做法：
- 在组件初始化时，用可复现 seed 生成随机参数（如 `TickSpec`）
- 绘制阶段只读这些参数

错误做法：
- 在 `draw` 或循环绘制中每次调用随机，导致 UI 每帧变化、视觉噪声过大

## 6. 配色建议（可直接复用）

当前项目的手绘盘推荐配色：
- 背景：`#2C3E50`
- 主线（外圈/中心）：`#ECF0F1`
- 次刻度：`#BDC3C7`
- 主刻度强调：`#E74C3C`
- 信息文字强调：`#3498DB`

对应代码可参考：
- [MainActivity.kt](file:///c:/Users/0qyx/dev/0Android/Rotation/app/src/main/java/com/example/roughdial/MainActivity.kt#L44-L112)

## 7. 可复用参数模板

可以把风格参数抽成数据类，统一调节：

```kotlin
data class DialStyle(
    val circleColor: Color,
    val tickColor: Color,
    val majorTickColor: Color,
    val strokeWidth: Float = 6f,
    val tickWidth: Float = 5.25f,
    val majorTickWidth: Float = 7.5f,
    val jitterAmount: Float = 6.75f
)
```

参考定义：
- [DialRenderer.kt](file:///c:/Users/0qyx/dev/0Android/Rotation/app/src/main/java/com/example/roughdial/ui/DialRenderer.kt#L13-L22)

## 8. 迁移到其他项目的检查清单

- 已引入本地手写字体（Regular/Bold）
- 文字样式统一使用同一 `FontFamily`
- 主形状采用“分段 + 小幅 jitter”而非滤镜特效
- 所有随机参数在初始化阶段生成，不在每帧重新随机
- 角度计算严格基于几何公式，风格化仅做微扰
- 不叠加会制造脏边的外描边/阴影层

---

如果要扩展为“轻微 / 标准 / 粗犷”三档风格，建议仅开放以下参数：
- `jitterAmount`
- 刻度角度微扰上限
- 刻度长度微扰上限
- 线宽（主线/刻度/主刻度）
