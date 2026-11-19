> **适用范围说明：** 本文只适用于仓库根目录的 Android 原生 PhotoGallery 应用（Kotlin / Jetpack Compose），不适用于 `docs/<project-id>/` 下的独立网页项目。
>
> 网页作品请改为阅读：
> - [Web 项目管理规范](./web-projects/PROJECT_MANAGEMENT_STANDARD.md)
> - [Web 项目 Agent 开发指南](./web-projects/AGENT_DEVELOPMENT_GUIDE.md)
> - [Web 项目登记表](./projects.json)
>
> 仓库同时承载 Android 应用和网页作品；修改其中一类时，不得默认另一类可以随意改动。
>
# PhotoGallery 开发与问题排查指南 (Agent 专用)

本指南旨在为后续参与本项目开发的 Agent 和开发者提供核心组件（尤其是绳子与照片交互系统）的设计思想、常见问题及排查指导。

## 核心设计原则：逻辑点与渲染点分离 (Separation of Logic and Rendering)

本项目中使用了大量的 `Canvas` 自定义绘制和手绘（Hand-drawn）风格特效。在开发此类功能时，**必须**严格区分“用于物理/逻辑计算的平滑数据”与“用于视觉渲染的带噪点数据”。

### 经典案例：照片拖动剧烈抖动问题 (Photo Dragging Jitter Issue)

#### 1. 现象描述
用户在拖动照片沿绳索滑动时，所有照片出现剧烈抖动，表现为：
- 照片上下跳动。
- 照片的旋转角度不停闪烁变化，仿佛位置和角度在被不断重置。

#### 2. 根本原因分析
原先的实现中，为了给绳索增加手绘随机感（Jitter），通过在绳索基准曲线上添加随机偏移，生成了一组锯齿状的渲染坐标集 `sampledPoints`。
当计算夹子和照片的悬挂点（`HangPoint`）时，代码直接在这组**带有随机噪点**的坐标集中进行 `X` 轴插值，以获取对应的 `Y` 坐标和切线角度（即照片旋转角度）。
```kotlin
// 错误示例：使用了带噪点的 sampledPoints 进行位置和角度插值
val hp = createHangPointAtX(sampledPoints, slotX, idx)
```
因为 `sampledPoints` 在 Y 轴上是剧烈波动的，随着 `slotX` 在 X 轴上平滑移动，插值计算出的 Y 坐标和切线角度就会剧烈跳变，从而导致视觉上严重的抖动。

#### 3. 解决方案
将绳索平滑的数学基准曲线（`basePoints`）和带有抖动的渲染曲线（`sampledPoints`）解耦分离：
1. **生成逻辑点 (Logic Points)**：使用纯数学模型（如重力下垂函数 `generateGravitySagPoints`）生成平滑的 `basePoints`。
2. **处理交互与布局**：夹子位置、照片悬挂点、切线角度计算**必须且只能**基于平滑的 `basePoints`，保证拖动时插值结果的连续性和平滑性。
3. **生成渲染点 (Rendering Points)**：在 `basePoints` 的基础上应用随机噪点（`applyJitter`）生成 `sampledPoints`，**仅用于**传递给 `RopeRenderer` 绘制绳索外观。

```kotlin
// 正确示例：逻辑点与渲染点分离
val basePoints = RopeGenerator.generateGravitySagPoints(ropeStart, ropeEnd, ropeStWithSag, ropeStWithSag.sampleCount)
val sampledPoints = RopeGenerator.applyJitter(basePoints, ropeStWithSag.jitterAmount, random)

// 渲染绳索使用带噪点的 sampledPoints
RopeRenderer.drawClothesline(this, sampledPoints, ropeStWithSag, config.ropeColor)

// 计算物理悬挂位置使用平滑的 basePoints
val hp = createHangPointAtX(basePoints, slotX, idx)
```

### 经典案例 2：夹点偏差与旋转中心点错误 (Clip Point Deviation & Pivot Error)

#### 1. 现象描述
- **照片偏离夹子**：照片看起来没有被固定在夹子的“嘴部”，而是松散地悬挂着。
- **摆动时位置全乱**：当开启风吹摆动动画时，照片仿佛在围绕着屏幕中心画大圆弧，脱离了夹子。

#### 2. 根本原因分析
这个问题由三个维度的逻辑漏洞叠加导致：
1. **夹点硬编码偏移量未缩放**：
   计算照片挂点时，使用了 `val localY = clipSt.totalHeight - 6f`。这里的 `totalHeight` 随着屏幕尺寸和可见数量进行了 `scale` 缩放，但减去的 `6f` 却是一个硬编码的绝对像素值。这导致在不同缩放比例下，挂点无法精准对应夹子的实际嘴部。
2. **摆动模型双重叠加**：
   在计算旋转角度时，夹子使用了 `clipRotation = hp.tangentAngle + pendulumAngle * 1.5f`，而照片又额外加上了一个独立的摆动角度 `photoRotation = clipRotation + pendulumAngle * 0.4f`。不仅如此，`PhotoRenderer` 内部还给每张照片加了一个随机初始角度。这使得照片和夹子无法成为一个“刚体”统一旋转。
3. **致命的 Canvas 旋转锚点 (Pivot) 错误**：
   在 `PhotoRenderer` 的 `withTransform` 中调用 `rotate(rotDeg.toFloat())` 时，没有显式指定 `pivot` 参数。在 Compose Canvas 中，如果不指定 `pivot`，默认会以**整个画布的中心 (Canvas Center)** 作为旋转锚点，而不是当前坐标系的原点！这就是为什么照片一摆动就会飞出十万八千里的根本原因。

#### 3. 解决方案
1. **使用实际组件长度并缩放偏移量**：
   抛弃单纯依赖 `totalHeight`，改用实际拼装夹子的三段长度之和，并根据基准比例动态缩放偏移量：
   ```kotlin
   val yBodyEnd = clipSt.headLength + clipSt.gripLength + clipSt.bodyLength
   val scaleRatio = clipSt.totalHeight / 70f
   val localY = yBodyEnd - 6f * scaleRatio
   ```
2. **统一刚体旋转模型**：
   移除所有附加在照片上的独立摆动角度和随机初始角度，强制 `photoRotation = clipRotation`，确保照片和夹子严格保持一致的旋转姿态。
3. **显式指定旋转锚点**：
   在调用 `rotate` 时，必须明确指定 `pivot = Offset.Zero`，确保照片是围绕着刚刚 `translate` 过去的挂点（即夹子嘴部）进行旋转：
   ```kotlin
   rotate(rotDeg.toFloat(), pivot = Offset.Zero)
   ```

## Agent 后续开发排查 CheckList

1. **手绘风格与随机数 (Hand-Drawn Style & Randomness)**
   - 在 Compose `Canvas` 绘制循环中，如果使用了随机数（`java.util.Random`）生成手绘边框或抖动效果，**必须**确保在每一次重组（Recomposition）或重绘时，为随机数生成器提供固定的 `seed`（种子）。
   - 如果不固定 Seed，会导致每一帧生成的随机效果不同，造成整个画面剧烈闪烁（Dancing）。

2. **交互动画平滑度 (Interaction Animation Smoothness)**
   - 当遇到拖动、滑动等手势引发视觉卡顿或抖动时，首要检查插值算法所依赖的“数据源”。
   - 检查数据源是否包含了不应该用于物理计算的“视觉修饰参数”（例如：阴影偏移、高光偏移、随机 Jitter）。

3. **依赖传递与重组优化 (Recomposition Optimization)**
   - 绳索与照片的配置（`RopeWithClipsConfig` 等）尽量使用不可变（Immutable）数据结构。
   - `Canvas` 的底层绘制代码（如 `PhotoRenderer`, `ClipRenderer`）应当尽量保持纯函数特性，仅根据传入的参数进行绘制，避免在绘制作用域内部产生副作用。

## 总结
任何时候为 UI 添加“视觉干扰”（如手绘风、噪点、波浪线）时，都要牢记：**视觉干扰不能干扰物理和交互逻辑**。始终维护一套干净、平滑的逻辑数据模型，在此基础上通过派生或代理的方式生成最终的渲染视图。