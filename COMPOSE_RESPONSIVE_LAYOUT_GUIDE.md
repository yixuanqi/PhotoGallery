# Jetpack Compose 响应式布局与适配问题解决指南

这份文档记录了在 Android Compose 开发中常见的跨设备分辨率适配问题（如文本换行、底部元素截断等），总结了标准的分析思路和解决方案，可用于指导后续 Agent 在处理同类 UI 布局问题时快速定位并修复。

## 问题一：大字体文本在小屏设备上被迫换行

**现象描述**：
使用硬编码的超大字体（例如 `100.sp`）时，如果在宽度较小的设备（或某些长宽比异常的真机）上显示，文本无法在一行内容纳，导致被迫折断成多行，破坏整体 UI。

**原因分析**：
缺乏针对屏幕宽度的动态约束。

### 标准解决方案：
1. **动态计算安全字体大小**：基于当前屏幕的 `maxWidth` 按比例缩小字体，确保最大不超过某个阈值。
2. **强制单行显示**：显式声明 `maxLines = 1` 防止意外折叠。

```kotlin
val density = LocalDensity.current
// 获取安全字体大小：最大不超过 100f，且不超过屏幕宽度的 25%
val titleFontSize = with(density) { minOf(100f, (maxWidth * 0.25f).toSp().value).sp }

Text(
    text = "Compass",
    fontSize = titleFontSize,
    maxLines = 1, // 关键：限制单行
    fontWeight = FontWeight.Bold
)
```

> **⚠️ 避坑指南（TextUnit 运算编译报错）**：
> 在 Kotlin 中，`TextUnit` (如 `100.sp`) 并没有实现 `Comparable` 接口，也不支持直接使用 `+` 进行加法运算。
> - **错误写法**：`minOf(100.sp, 20.sp)` 或 `100.sp + 20.sp` （这会导致 `Receiver type mismatch` 编译报错）
> - **正确写法**：必须先提取其 `.value` (Float 类型) 参与运算，然后再转回 `.sp`。
>   - 取小值：`minOf(100f, 20f).sp`
>   - 相加：`(100f + 20f).sp`

---

## 问题二：底部/边缘元素被挤出屏幕（截断）

**现象描述**：
由于使用了 `Arrangement.SpaceEvenly` 分配空间，或者通过手动计算“屏幕总高度减去文本高度”来决定中间图形（如表盘）的大小，在不同长宽比的真机上，由于高度不足，导致底部的文本或元素被直接推到屏幕视口之外，完全不可见或被截断一半。

**原因分析**：
1. **手动计算高度的局限性**：文本除了字号（sp），还有其内置的行高（Line Height）和内边距（Font Padding）。简单地将字号转成 dp 进行高度相减往往偏小，不能代表文本的真实占用高度。
2. **`SpaceEvenly` 的副作用**：当总高度不足时，`SpaceEvenly` 仍会在元素周围强行分配空隙，这会直接把边缘元素挤出屏幕。

### 标准解决方案：
放弃手动测量高度，采用 **Flex 弹性布局思想**（利用 `weight(1f)`），让系统自动处理剩余可用空间。

1. **顶层容器改用 `Arrangement.SpaceBetween`**：使顶部和底部元素贴紧上下边缘，并加上适当的 Padding 作为安全距离。
2. **中间内容容器使用 `weight(1f)`**：中间自适应部分自动“吸收”掉上下两处文本之后**所有的剩余可用空间**。
3. **嵌套 `BoxWithConstraints`**：在 `weight(1f)` 的内部容器中重新获取该区域实际的 `maxHeight` 和 `maxWidth`，用此边界去约束内部图形（如自定义表盘）的尺寸。

```kotlin
Column(
    modifier = Modifier.fillMaxSize(),
    verticalArrangement = Arrangement.SpaceBetween // 1. 首尾贴边
) {
    // --- 顶部元素 ---
    Text(
        text = "Top Title", 
        modifier = Modifier.padding(top = 16.dp) // 安全边距
    )

    // --- 中间自适应区域 ---
    Box(
        modifier = Modifier
            .weight(1f) // 2. 占据所有剩余空间
            .fillMaxWidth(),
        contentAlignment = Alignment.Center
    ) {
        BoxWithConstraints(contentAlignment = Alignment.Center) {
            // 3. 在真实剩余空间内获取 maxHeight，安全地计算图形大小
            val contentSize = minOf(maxWidth * 0.9f, maxHeight * 0.9f)
            MyCustomGraphic(modifier = Modifier.size(contentSize))
        }
    }

    // --- 底部元素 ---
    Text(
        text = "Bottom Text", 
        modifier = Modifier.padding(bottom = 16.dp) // 安全边距
    )
}
```

## 核心开发原则（Agent 记忆指引）
1. **绝不手动相减计算布局高度**：凡是遇到需要根据屏幕高度适配中间内容大小的场景，直接使用 `Modifier.weight(1f)` 配合嵌套的 `BoxWithConstraints` 解决。
2. **文本必设 maxLines**：在包含大字号文本的响应式布局中，永远不要忘记为 `Text` 加上 `maxLines = 1` 防止意外折行破坏高度。
3. **TextUnit 运算需拆包**：遇到 `TextUnit` 相关报错，立即检查是否直接使用了数学运算，必须拆出 `.value` 运算后再转回。
