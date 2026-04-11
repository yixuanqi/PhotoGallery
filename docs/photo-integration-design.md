# 方案设计：将真实照片集成到拍立得画框

> 评估后调整：首版目标收敛为“真实照片上墙”闭环，即照片来源、授权状态、窗口化缩略图加载、Canvas 内 CenterCrop 绘制。详情页、时间轴、多级缓存作为后续阶段，不放入首版必做范围。

## 零、版本范围

### 首版范围

1. 获取用户授权范围内的照片，不能承诺一定获取“所有照片”。
2. 读取照片 `uri` 与时间元数据，并使用统一时间规则排序。
3. 复用现有 `RopeWithClips` 的可见窗口和预加载窗口，只加载窗口附近的缩略图。
4. 在 `PhotoRenderer` 的画框内部绘制真实照片，加载失败时继续使用现有渐变手绘占位图。
5. 处理无权限、部分授权、空图库、缩略图加载失败等状态。

### 后续范围

1. 照片详情页、缩放、左右切换、边界滑动返回。
2. 时间轴选择器、月份快速定位、滑动时间指示器。
3. 磁盘缓存、弱/软引用缓存等复杂缓存。
4. 独立手势检测模块。

## 一、整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      UI Layer                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  RopeWithClips (Canvas 组件)                         │   │
│  │  - 接收 PhotoData 列表                               │   │
│  │  - 计算可见窗口 / 预加载窗口                         │   │
│  │  - 调用 PhotoRenderer 绘制                           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  State / Data Layer                         │
│  ┌─────────────────┐    ┌─────────────────────────────┐    │
│  │ PhotoRepository │───▶│ List<PhotoData>             │    │
│  │ - MediaStore     │    │ - uri: Uri                  │    │
│  │ - 加载缩略图     │    │ - takenAtMillis: Long?      │    │
│  └─────────────────┘    └─────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、核心模块设计

### 1. 数据模型

```kotlin
sealed class PhotoState {
    object Unloaded : PhotoState()       // 未加载，只有元数据
    object Loading : PhotoState()        // 加载中
    data class Loaded(val bitmap: ImageBitmap) : PhotoState()  // 已加载
    data class Failed(val reason: String? = null) : PhotoState() // 加载失败
}

// 仅包含不可变的元数据，避免状态变更导致整个列表重绘
data class PhotoData(
    val id: Long,                    // 图片ID
    val uri: Uri,                    // 图片URI
    val takenAtMillis: Long?,        // 拍摄时间戳，可能为空
    val addedAtMillis: Long?,        // 入库时间兜底
    val modifiedAtMillis: Long?      // 修改时间兜底
)
```

> 说明：文档统一使用 `PhotoState` 独立管理图片加载状态，不再同时维护 `thumbnail: ImageBitmap?` 和 `state` 两套模型，且与长列表数据解耦。

### 1.1 时间字段规则

排序和分组时使用统一有效时间：

1. 优先使用 `takenAtMillis`。
2. 拍摄时间为空或为 0 时，回退到 `addedAtMillis`。
3. 仍不可用时，回退到 `modifiedAtMillis`。
4. 全部不可用时放到列表末尾，并归入“未知时间”分组。

时间顺序需要统一。建议首版使用“新到旧”，即最近照片优先展示；如果产品想表达回忆时间线，也可以改成“旧到新”，但查询、分组、快速定位都必须保持同一方向。

### 2. 图片获取方案（两种选择）

| 方案 | 适用场景 | 优点 | 代价 |
|------|----------|------|------|
| **MediaStore API** | 自动浏览用户授权范围内的图库，构建时间轴 | 可查询元数据，可按时间排序，可做连续图库体验 | 需要处理运行时权限、Android 14+ 部分照片访问、拒绝授权等状态 |
| **Photo Picker** | 用户主动选择照片挂到绳子上 | 不需要存储权限，适配 Android 新版本权限变化 | 用户需要手动选择，不能自动读取完整时间轴 |

**建议**：
- 如果首版必须自动浏览图库，或需要为后续“时间轴选择器”和“月份快速定位”铺路，采用 MediaStore API。
- 如果首版只验证“真实照片上墙”体验，Photo Picker 仍是低权限备选方案，后续再切换到 MediaStore。
- 需向用户明确：我们只读取和展示“用户授权范围内的照片”，不承诺“所有照片”的绝对获取。

### 3. 图片加载流程

```
1. 查询 MediaStore.Images.Media
   └─▶ 获取 uri + DATE_TAKEN + DATE_ADDED + DATE_MODIFIED
   └─▶ 按统一有效时间排序（建议新到旧）

2. 异步加载缩略图
   └─▶ Android 10+ (API 29+) 使用 ContentResolver.loadThumbnail()
   └─▶ Android 8-9 (API 26-28) 使用 ContentResolver.openInputStream(uri) + 采样解码兜底
   └─▶ 基于画框内部尺寸和 density 动态计算目标 Size
   └─▶ 加载失败时进入 Failed 状态，UI 保留占位图

3. 缓存管理
   └─▶ 使用 LruCache 缓存 ImageBitmap
   └─▶ 首版只缓存可见窗口和少量预加载窗口附近的缩略图
```

---

## 三、UI 层改造

### 1. PhotoRenderer 修改

**现有逻辑**：
```kotlin
drawPhotoArea() {
    // 绘制渐变色背景
    // 绘制吉卜力风格山景
}
```

**改造后**：
```kotlin
drawPhotoArea() {
    val photoState = photoStates[photoData.id] ?: PhotoState.Unloaded
    if (photoState is PhotoState.Loaded) {
        // 绘制真实图片（裁剪/缩放适应画框）
        drawImage(photoState.bitmap, ...)
    } else {
        // 保留原有的渐变色作为占位符
        drawGradientPlaceholder()
    }
}
```

### 2. 图片适配策略

```
┌────────────────────────────────────┐
│          画框内部区域              │
│    ┌──────────────────────────┐   │
│    │                          │   │
│    │    真实图片              │   │
│    │    (CenterCrop 方式)     │   │
│    │                          │   │
│    └──────────────────────────┘   │
│                                   │
└────────────────────────────────────┘

策略：使用 CenterCrop
- 保持图片比例
- 填满整个画框内部
- 超出部分裁剪
```

---

## 四、状态管理

### ViewModel 职责

```kotlin
class PhotoGalleryViewModel : ViewModel() {
    // 照片列表（仅包含不可变的元数据，按时间排序）
    val photos: StateFlow<List<PhotoData>>

    // 独立管理的图片状态映射，避免频繁替换元数据列表，并便于按 uri 更新加载状态
    val photoStates: StateFlow<Map<String, PhotoState>>

    // 权限/授权范围状态
    val permissionState: StateFlow<PhotoPermissionState>

    // 加载状态
    val isLoading: StateFlow<Boolean>

    // 功能：
    // 1. loadPhotos() - 从 MediaStore 加载照片列表元数据
    // 2. onViewportChanged() - 根据可见窗口触发缩略图加载（需包含防抖机制）
    // 3. reloadPermissionLimitedPhotos() - Android 14+ 部分授权重新选择后刷新列表
    // 4. checkPermissionOnResume() - 每次回到前台时重新计算权限状态并刷新查询结果
}
```

### 加载策略

```
阶段1：快速显示
└─▶ 先加载照片元数据（uri, takenAtMillis, addedAtMillis, modifiedAtMillis）
└─▶ 立即渲染，显示占位符

阶段2：渐进加载
└─▶ 根据可见窗口和预加载窗口加载缩略图
└─▶ 加载完成后更新独立缓存状态
└─▶ 已加载或加载中的图片不重复启动任务
```

---

## 五、权限处理

### Android 版本适配

| Android 版本 | 权限要求 |
|-------------|---------|
| Android 14+ (API 34+) | `READ_MEDIA_IMAGES`，并处理系统“部分照片访问”；如需显式识别部分授权，还要处理 `READ_MEDIA_VISUAL_USER_SELECTED` |
| Android 13 (API 33) | `READ_MEDIA_IMAGES` |
| Android 10-12 (API 29-32) | `READ_EXTERNAL_STORAGE` |
| Android 9- (API 28-) | `READ_EXTERNAL_STORAGE` |

当前项目 `targetSdk = 34`，所以 Android 14+ 的部分照片访问必须纳入首版需求。文档中所有“所有照片”都应理解为“用户授权范围内的照片”。

### Manifest 声明建议

当前项目尚未声明读取媒体权限。MediaStore 方案需要在 manifest 中补充：

```xml
<uses-permission
    android:name="android.permission.READ_EXTERNAL_STORAGE"
    android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VISUAL_USER_SELECTED" />
```

`READ_MEDIA_VISUAL_USER_SELECTED` 只在需要显式识别和管理 Android 14+ 部分授权状态时使用；如果首版改用 Photo Picker，则不需要这些读取媒体权限。

### 权限请求流程

```
1. 检查权限状态
2. 未授权 → 显示说明 → 请求权限
3. 用户授权全量访问 → 加载授权可见的全部图片
4. 用户授权部分访问 → 只加载用户选择允许访问的图片，并提供“重新选择照片”入口
5. 用户拒绝 → 显示空状态或引导去设置，也可提供 Photo Picker 入口
6. 查询结果为空 → 显示空状态或继续展示当前手绘占位图
7. 生命周期检查 → 每次回到前台（onResume/onStart）重新计算权限状态并刷新 MediaStore 查询结果；若 URI 失效或授权范围变化，对应照片回退为占位图或空状态
```

---

## 六、性能优化

### 1. 缩略图尺寸

```
画框内部尺寸：约 112x132 dp (140-14*2 x 160-14*2)
建议缩略图尺寸：不要写死为 224x264 px，而是根据实际画框内部尺寸和设备 density 动态计算

targetWidthPx = frameInnerWidthDp * density * qualityFactor
targetHeightPx = frameInnerHeightDp * density * qualityFactor
```

首版 `qualityFactor` 可取 `1.0f` 到 `1.5f`。如果后续详情页需要高清图，详情页应单独加载更大尺寸，不复用 Gallery 缩略图。

### 2. 内存管理

```
- 使用 LruCache 限制缓存大小
- 只加载可见区域的照片缩略图
- 首版不做磁盘缓存、弱/软引用缓存、手动复用 Bitmap 内存
```

### 3. 异步加载

```
- 使用 Coroutine + Dispatchers.IO
- 批量加载时使用 Flow 逐个发射
- 避免阻塞主线程
```

---

## 七、缓存与生命周期管理

### 1. 可见区域检测

```
┌─────────────────────────────────────────────────────────────┐
│                      屏幕可见区域                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │   [预加载区]    [可见区域]    [预加载区]             │   │
│  │      ↓            ↓             ↓                   │   │
│  │   cache+1      cache+2       cache+1               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

策略：
- 可见区域：当前屏幕显示的照片
- 预加载区：左右各额外加载 1-2 张
- 预加载区外：首版不要求主动 unload，由 LruCache 自然淘汰
- 加载防抖 (Debounce)：在用户快速滑动（Fling）时暂停加载，等滑动停止或速度降到阈值以下（例如 100ms 无新请求）再集中加载最终停留在可见区域的照片，避免产生大量无效的 IO 协程。
```

### 2. 加载状态生命周期

```kotlin
Unloaded → Loading → Loaded
                  ↘ Failed
```

`PhotoData` 模型以第二章为准。首版不再定义额外的 Load/Unload 数据结构，也不引入弱引用缓存迁移流程。

### 3. 缓存策略（首版调整）

原始三级缓存设计可行，但不建议放入首版。当前 `RopeWithClips` 已按 `visibleClipSlots + cacheEachSide * 2` 形成小窗口渲染，首版只需要：

1. 独立的缓存状态映射：记录当前列表项加载状态。
2. `LruCache<String, ImageBitmap>`：缓存 30-60 张缩略图，key 使用 `uri.toString()`，后续再按实际内存压力改成按字节限制。
3. 离开预加载范围后不必立刻 unload，只要交给 LruCache 淘汰即可。

不建议首版实现弱引用缓存、磁盘缓存、手动 Bitmap 复用和复杂 Load/Unload 生命周期。

### 3.1 复杂缓存方案（后续阶段）

```
┌─────────────────────────────────────────────────────────────┐
│                     三级缓存架构                             │
│                                                             │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐       │
│  │  强引用缓存  │   │  弱引用缓存  │   │   磁盘缓存   │       │
│  │  (LruCache) │   │ (Reference) │   │  (DiskLru)  │       │
│  │   ~10张     │   │   ~20张     │   │   无限制     │       │
│  └─────────────┘   └─────────────┘   └─────────────┘       │
│         ↑                 ↑                 ↑              │
│      可见区            预加载区           历史记录          │
└─────────────────────────────────────────────────────────────┘

操作流程：
1. LOAD 请求 → 检查强引用 → 检查弱引用 → 检查磁盘 → 解码原图
2. UNLOAD 请求 → 从强引用移到弱引用 → 弱引用满时丢弃
3. 内存紧张时 → 保留强引用，清空弱引用
```

> 注意：以上三级缓存只作为后续扩展参考，不作为首版验收要求。

### 4. 滚动时的缓存调度（后续参考）

```kotlin
class ThumbnailCacheManager(
    private val strongCache: LruCache<String, ImageBitmap>,
    private val weakCache: MutableMap<Long, SoftReference<ImageBitmap>>
) {
    fun onViewportChanged(
        visibleIndices: IntRange,
        preloadRange: IntRange
    ) {
        // 1. 计算需要加载的照片
        val toLoad = (visibleIndices + preloadRange) - currentLoaded

        // 2. 计算需要卸载的照片
        val toUnload = currentLoaded - (visibleIndices + preloadRange)

        // 3. 执行加载
        toLoad.forEach { loadThumbnail(it) }

        // 4. 执行卸载（移到弱引用）
        toUnload.forEach { unloadThumbnail(it) }
    }
}
```

> 注意：上面的 `ThumbnailCacheManager` 是复杂缓存阶段的参考伪代码。首版应改为简单的窗口加载调度，不包含 `SoftReference` 和主动 unload。

---

## 八、照片详情页与交互

> 阶段调整：详情页功能可行，但不建议放入首版。当前项目是单屏 Canvas 组件，尚未引入 Navigation 结构；详情页还需要高清图加载、共享位置映射、手势分层，会明显扩大实现风险。

### 1. 双击展开详情

```
Gallery 视图                    详情页视图
┌─────────────┐              ┌─────────────────┐
│  ╭───╮      │              │                 │
│  │ 📷 │      │   双击      │    ┌───────┐    │
│  ╰───╯      │  ────────▶  │    │       │    │
│      ╭───╮  │              │    │  📷   │    │
│      │ 📷 │  │              │    │       │    │
│      ╰───╯  │              │    └───────┘    │
└─────────────┘              │                 │
                             │  < 滑动返回 >   │
                             └─────────────────┘

交互：
- 双击照片 → 展开全屏详情页（带动画）
- 详情页支持：缩放、滑动切换上/下一张
```

### 2. 边界滑动回退

```
详情页边界检测：

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   ←←← 左边界滑动                    右边界滑动 →→→          │
│                                                             │
│   ┌─────────┐                     ┌─────────┐              │
│   │         │                     │         │              │
│   │  当前   │   第一张照片        │  当前   │  最后一张    │
│   │  照片   │   ← 滑动返回        │  照片   │  → 滑动返回  │
│   │         │   Gallery          │         │  Gallery     │
│   └─────────┘                     └─────────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘

实现：
- 检测是否为第一张/最后一张
- 在边界继续滑动 → 触发返回 Gallery
- 返回动画：照片缩小回到绳子上对应位置
```

### 3. 手势交互汇总

| 手势 | Gallery 视图 | 详情页视图 |
|------|-------------|-----------|
| 单击 | 无反应 / 高亮 | 显示/隐藏工具栏 |
| 双击 | 进入详情页 | 放大/缩小照片 |
| 左右滑动 | 切换照片 | 切换上/下一张 |
| 边界滑动 | 弹性效果 | 返回 Gallery |
| 双指缩放 | 缩放整体视图 | 缩放当前照片 |
| 长按 | 显示照片信息 | 显示照片信息 |

---

## 九、时间轴与快速定位

> 阶段调整：时间轴功能可行，但依赖稳定的排序、分组和目标索引跳转。建议在真实照片接入稳定后再实现，不作为首版验收要求。

### 1. 时间轴选择器

```
┌─────────────────────────────────────────────────────────────┐
│                      时间轴 UI                               │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │  2024  │  2023  │  2022  │  2021  │  2020  │       │  │
│   └─────────────────────────────────────────────────────┘  │
│          ↓                                                  │
│   ┌─────────────────────────────────────────────────────┐  │
│   │  12月 │ 11月 │ 10月 │ 9月 │ 8月 │ ... │            │  │
│   └─────────────────────────────────────────────────────┘  │
│                                                             │
│   点击月份 → 快速跳转到该月第一张照片                        │
└─────────────────────────────────────────────────────────────┘

触发方式：
- 点击屏幕顶部时间指示器
- 双指下滑手势
```

### 2. 滑动时的时间段指示器

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    ┌───────────────┐                       │
│                    │  2024年3月    │  ← 浮动时间指示器      │
│                    │  共 47 张     │                       │
│                    └───────────────┘                       │
│                                                             │
│   ╭───╮  ╭───╮  ╭───╮  ╭───╮  ╭───╮  ╭───╮              │
│   │   │  │   │  │   │  │   │  │   │  │   │              │
│   ╰───╯  ╰───╯  ╰───╯  ╰───╯  ╰───╯  ╰───╯              │
│                                                             │
│   ←───────────────────────────────────────────────→        │
│                      滑动中                                 │
└─────────────────────────────────────────────────────────────┘

行为：
- 开始滑动 → 显示时间指示器
- 滑动停止 1.5s 后 → 自动隐藏
- 跨月份滑动 → 指示器内容平滑过渡
```

### 3. 照片分组策略

```kotlin
data class PhotoGroup(
    val year: Int?,
    val month: Int?,
    val label: String,
    val photos: List<PhotoData>,
    val startIndex: Int,    // 在总列表中的起始索引
    val endIndex: Int       // 在总列表中的结束索引
)

// 分组逻辑
fun groupPhotosByMonth(photos: List<PhotoData>): List<PhotoGroup> {
    // 使用统一有效时间，不直接假设 dateTaken 一定存在
    // 建议预先遍历生成索引表，避免每次 indexOf 线性搜索
    // 时间为空的照片使用 year = null、month = null，并归入 label = "未知时间" 分组
}
```

### 4. 快速定位实现

```
┌─────────────────────────────────────────────────────────────┐
│                    快速定位流程                              │
│                                                             │
│  用户选择 "2024年3月"                                       │
│         │                                                   │
│         ▼                                                   │
│  查找 PhotoGroup(year=2024, month=3)                       │
│         │                                                   │
│         ▼                                                   │
│  获取 startIndex = 156                                     │
│         │                                                   │
│         ▼                                                   │
│  targetCenterIndex = 156                                   │
│         │                                                   │
│         ▼                                                   │
│  触发动画滚动到目标位置                                     │
│         │                                                   │
│         ▼                                                   │
│  加载目标位置附近的缩略图                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 十、文件结构建议

首版建议最小化新增文件：

```
ui/
├── rope/
│   ├── PhotoRenderer.kt          # 修改：支持绘制真实图片
│   ├── RopeWithClips.kt          # 修改：接收 PhotoData 列表 + 窗口变化回调
│   └── ...
├── photo/
│   ├── PhotoData.kt              # 新增：数据模型 + PhotoState
│   ├── PhotoRepository.kt        # 新增：MediaStore 元数据查询与解析
│   ├── PhotoGalleryViewModel.kt  # 新增：状态管理
│   └── ThumbnailCache.kt         # 新增：简单 LruCache 封装（可选）
```

后续阶段再新增：

```
ui/
├── detail/
│   ├── PhotoDetailScreen.kt      # 新增：照片详情页
│   └── PhotoDetailViewModel.kt   # 新增：详情页状态
├── timeline/
│   ├── TimelineSelector.kt       # 新增：时间轴选择器
│   ├── TimeIndicator.kt          # 新增：滑动时间指示器
│   ├── TimelineViewModel.kt      # 新增：时间轴状态
│   └── PhotoGroup.kt             # 新增：照片分组模型
```

不建议首版新增独立 `gesture/` 目录，除非现有 Compose 手势 API 已无法表达需求。

---

## 十一、实现步骤建议

| 阶段 | 步骤 | 内容 | 复杂度 |
|------|------|------|--------|
| **决策** | 1 | 确定首版采用 MediaStore 还是 Photo Picker；若需要自动图库时间轴则采用 MediaStore | 低 |
| **基础** | 2 | 创建 PhotoData + 独立的 PhotoState 状态管理 | 中 |
| | 3 | 实现 PhotoRepository：MediaStore 元数据查询与解析；如照片很多，再加入分页或数量上限策略 | 中 |
| | 4 | MediaStore 方案处理权限、部分授权、拒绝、空图库状态 | 中 |
| | 5 | 修改 PhotoRenderer 支持绘制 ImageBitmap + CenterCrop | 中 |
| | 6 | 修改 RopeWithClips 接收真实数据，并暴露窗口变化回调 | 中 |
| **加载** | 7 | 基于可见窗口触发缩略图加载 | 中 |
| | 8 | 实现简单 LruCache，而不是三级缓存 | 中 |
| | 9 | 实现 ViewModel 状态管理 | 中 |
| **验证** | 10 | 验证 Android 13、Android 14+ 权限行为和缩略图失败兜底 | 中 |
| **后续** | 11 | 创建 PhotoDetailScreen 详情页 | 中 |
| | 12 | 实现双击手势检测 + 展开动画 | 中 |
| | 13 | 实现边界滑动检测 + 返回动画 | 中 |
| | 14 | 实现 PhotoGroup 分组逻辑 | 低 |
| | 15 | 创建 TimelineSelector 时间轴选择器 | 中 |
| | 16 | 创建 TimeIndicator 滑动指示器 | 低 |
| | 17 | 实现快速定位跳转功能 | 中 |
| **优化** | 18 | 性能测试 + 内存优化 | - |
| | 19 | 动画流畅度优化 | - |

---

## 十二、待澄清问题

1. Gallery 的时间顺序是最近优先，还是从旧到新？
2. Android 14+ 部分授权时，是否需要提供“重新选择照片”入口？
3. 无权限或无照片时，是继续展示当前手绘占位图，还是显示单独空状态文案？
4. 照片数量少于可见槽位时，是只显示已有照片，还是用占位画框补齐？

---

## 十三、结论

真实照片集成方案可行，但首版需求应收敛为“照片来源 + 权限/授权状态 + 窗口化缩略图加载 + Canvas CenterCrop 绘制”。详情页、时间轴和多级缓存都可以做，但建议在照片接入稳定后分阶段推进，避免一次性引入过多权限、手势、缓存和导航复杂度。
