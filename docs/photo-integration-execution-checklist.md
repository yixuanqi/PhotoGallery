# 真实照片集成开发执行清单

> 本清单基于 `docs/photo-integration-design.md`，用于指导后续 agent 分阶段开发。默认当前项目为 Android Compose Canvas 应用，`minSdk = 26`，`targetSdk = 34`。执行时优先保持现有手绘绳子、夹子、拍立得边框和拖拽/缩放体验不回退。

## 0. 开发边界

### 首版目标

- [x] 将用户授权范围内的真实照片绘制到现有拍立得画框内部。
- [x] 支持照片元数据查询、统一时间排序、窗口化缩略图加载、LruCache 缓存。
- [x] 支持无权限、部分授权、空图库、缩略图失败时的占位兜底。
- [x] 不实现详情页、时间轴 UI、磁盘缓存、弱/软引用缓存、复杂手势模块。

### 关键取舍

- [x] 若首版必须自动浏览图库或为后续时间轴铺路，采用 MediaStore。
- [ ] 若首版只验证“真实照片上墙”体验，可改用 Photo Picker，但后续时间轴需要再切换到 MediaStore。
- [x] 无论采用哪种方案，文案和逻辑都只能承诺“用户授权范围内的照片”，不要承诺“所有照片”。

## 1. 预检

- [x] 阅读 `docs/photo-integration-design.md`。
- [x] 确认当前 `app/build.gradle.kts` 中 `minSdk = 26`、`targetSdk = 34`。
- [x] 确认当前 `AndroidManifest.xml` 尚未声明读取媒体权限。
- [x] 确认现有主要改动文件：
  - `app/src/main/java/com/example/photogallery/MainActivity.kt`
  - `app/src/main/java/com/example/photogallery/ui/rope/RopeWithClips.kt`
  - `app/src/main/java/com/example/photogallery/ui/rope/PhotoRenderer.kt`
- [x] 检查工作区是否已有用户未提交改动，不要回滚无关改动。

## 2. 权限与照片来源

### MediaStore 路线

- [x] 在 manifest 中新增读取媒体权限：

```xml
<uses-permission
    android:name="android.permission.READ_EXTERNAL_STORAGE"
    android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VISUAL_USER_SELECTED" />
```

- [x] Android 13 使用 `READ_MEDIA_IMAGES`。
- [x] Android 14+ 处理全量授权、部分授权、拒绝授权。
- [x] Android 10-12 使用 `READ_EXTERNAL_STORAGE`。
- [x] Android 8-9 使用 `READ_EXTERNAL_STORAGE`。
- [ ] 如首版不需要显式识别 Android 14+ 部分授权，重新确认是否仍要声明 `READ_MEDIA_VISUAL_USER_SELECTED`。
- [x] 在 `onStart` 或 `onResume` 重新计算权限状态并刷新查询结果。
- [x] URI 失效或授权范围变化时，对应照片回退为占位图或空状态。

### Photo Picker 路线

- [ ] 若选择 Photo Picker，不添加读取媒体权限。
- [ ] 保留 URI 列表、缩略图加载、Canvas 绘制、缓存逻辑。
- [ ] 标记后续时间轴需要改回 MediaStore 或补充可用元数据来源。

## 3. 数据模型

- [x] 新增 `ui/photo/PhotoData.kt`，或按项目结构选择等价位置。
- [x] 定义不可变元数据模型：

```kotlin
data class PhotoData(
    val id: Long,
    val uri: Uri,
    val takenAtMillis: Long?,
    val addedAtMillis: Long?,
    val modifiedAtMillis: Long?
)
```

- [x] 定义加载状态：

```kotlin
sealed class PhotoState {
    object Unloaded : PhotoState()
    object Loading : PhotoState()
    data class Loaded(val bitmap: ImageBitmap) : PhotoState()
    data class Failed(val reason: String? = null) : PhotoState()
}
```

- [x] 图片加载状态不要放回 `PhotoData` 内，避免频繁替换元数据列表。
- [x] `photoStates` 使用 `Map<String, PhotoState>`，key 使用 `uri.toString()`。
- [x] 缓存 key 同样使用 `uri.toString()`。

## 4. Repository

- [x] 新增 `ui/photo/PhotoRepository.kt`。
- [x] MediaStore 查询字段至少包含：
  - `_ID`
  - `DATE_TAKEN`
  - `DATE_ADDED`
  - `DATE_MODIFIED`
- [x] 使用 `_ID` 构造图片 URI。
- [x] 排序使用统一有效时间：
  - 优先 `takenAtMillis`
  - 其次 `addedAtMillis`
  - 再次 `modifiedAtMillis`
  - 全部不可用时放到列表末尾
- [x] 首版默认排序方向按文档待确认项决定；未确认时建议“新到旧”。
- [x] 不要在首版实现复杂增量同步。
- [x] 如果照片很多，先加入数量上限或简单分页策略，而不是完整同步系统。

## 5. 缩略图加载

- [x] Android 10+ 使用 `ContentResolver.loadThumbnail(uri, targetSize, null)`。
- [x] Android 8-9 使用 `ContentResolver.openInputStream(uri)` + 采样解码兜底。
- [x] 缩略图目标尺寸根据画框内部区域和 density 动态计算，不写死 `224x264 px`。
- [x] 建议公式：

```text
targetWidthPx = frameInnerWidthDp * density * qualityFactor
targetHeightPx = frameInnerHeightDp * density * qualityFactor
```

- [x] 首版 `qualityFactor` 可取 `1.0f` 到 `1.5f`。
- [x] 所有缩略图加载在 `Dispatchers.IO` 执行。
- [x] 捕获加载异常，失败时设置 `PhotoState.Failed` 并保持占位图。
- [x] 已加载或加载中的 URI 不重复启动加载任务。

## 6. 缓存

- [x] 新增 `ui/photo/ThumbnailCache.kt`，或在 ViewModel 内先实现简单封装。
- [x] 使用 `LruCache<String, ImageBitmap>`。
- [x] 首版缓存 30-60 张缩略图即可。
- [x] 暂不实现磁盘缓存、弱/软引用缓存、Bitmap 复用。
- [x] 离开预加载范围后不强制 unload，由 LruCache 自然淘汰。
- [ ] 后续若发现内存压力，再改成按字节限制。

## 7. ViewModel

- [x] 新增 `ui/photo/PhotoGalleryViewModel.kt`。
- [x] 暴露状态：

```kotlin
val photos: StateFlow<List<PhotoData>>
val photoStates: StateFlow<Map<String, PhotoState>>
val permissionState: StateFlow<PhotoPermissionState>
val isLoading: StateFlow<Boolean>
```

- [x] 实现 `loadPhotos()`：查询元数据并更新 `photos`。
- [x] 实现 `onViewportChanged(visibleRange, preloadRange)`：根据窗口触发缩略图加载。
- [x] 为 `onViewportChanged` 加防抖：快速 fling 时暂停或合并请求，约 100ms 无新请求后加载最终窗口。
- [x] 实现 `reloadPermissionLimitedPhotos()`：Android 14+ 部分授权重新选择后刷新列表。
- [x] 实现 `checkPermissionOnResume()` 或等价生命周期入口：回到前台后重新检查权限和查询结果。

## 8. RopeWithClips 改造

- [x] 修改 `RopeWithClips` 支持接收 `photos: List<PhotoData>`。
- [x] 将总照片数从 `config.clipCount` 切换为 `photos.size` 或明确两者关系。
- [x] 当前绘制索引 `idx` 对应 `photos[idx]`。
- [x] 暴露窗口变化回调，例如 `onViewportChanged(visibleRange, preloadRange)`。
- [x] 复用当前窗口计算：

```text
renderSlotCount = visibleClipSlots + cacheEachSide * 2
windowStart until windowEndExclusive
```

- [x] 当照片数量少于可见槽位时，根据产品决定：
  - 只显示已有照片
  - 或用占位画框补齐
- [x] 保持现有拖拽、fling、双指缩放、摆动动画不回退。

## 9. PhotoRenderer 改造

- [x] 修改 `PhotoRenderer.drawPolaroid` 或相关配置，使其能接收当前照片状态。
- [x] 画框边框、卷角、高光、阴影、手绘边缘继续保留。
- [x] 只替换画框内部 `drawPhotoArea` 的内容。
- [x] `PhotoState.Loaded` 时以 CenterCrop 绘制真实图片。
- [x] `Unloaded`、`Loading`、`Failed` 时使用现有渐变 + 手绘风景占位图。
- [x] CenterCrop 要求：
  - 保持原图比例
  - 填满画框内部区域
  - 超出部分裁剪
  - 不覆盖拍立得边框、卷角和高光

## 10. MainActivity 接入

- [x] 在 `MainActivity` 或上层 Composable 中接入 ViewModel。
- [x] 根据权限状态触发权限请求或照片加载。
- [x] 将 `photos` 和 `photoStates` 传给 `RopeWithClips` 或其上层适配器。
- [x] 无权限、部分授权、空图库、加载失败时保留现有视觉，不出现空白屏。
- [ ] 若使用 MediaStore，在用户拒绝权限时可提供 Photo Picker 备选入口。

## 11. 测试与验收

### 功能验收

- [x] 首次进入应用能正确请求/处理权限。
- [x] Android 14+ 部分授权时只展示授权范围内照片。
- [x] 用户在系统设置中改变权限后，回到应用能刷新状态。
- [x] 空图库或拒绝权限时不崩溃、不黑屏。
- [x] 缩略图加载失败时对应拍立得显示占位图。
- [x] 有照片时真实图片显示在拍立得内部，边框和夹子仍可见。
- [x] 滑动窗口变化时新照片逐步加载，已加载照片不重复解码。

### 性能验收

- [x] 快速横向滑动不会启动大量无效缩略图加载任务。
- [x] 缓存数量受控，不无限增长。
- [x] Canvas 动画和拖拽没有明显卡顿。
- [x] 旋转屏幕或前后台切换后状态可恢复或合理重新加载。

### 构建验收

- [x] `./gradlew.bat :app:compileDebugKotlin` 通过。
- [x] 如新增权限或依赖，确认 manifest 和 Gradle 配置正确。
- [x] 如引入新依赖，说明理由；首版不建议引入图片加载库，除非明确替代手写 API 26-28 解码。

## 12. 暂不实现

- [x] 首版不实现照片详情页。
- [x] 首版不实现时间轴 UI 和月份快速定位。
- [x] 首版不实现磁盘缓存、弱/软引用缓存。
- [x] 首版不实现共享元素返回动画。
- [x] 首版不新增独立 `gesture/` 目录，除非现有 Compose 手势 API 无法满足需求。

## 13. 交付要求

- [ ] 每个阶段完成后更新本清单勾选状态或在提交说明中列出完成项。
- [ ] 若偏离 `docs/photo-integration-design.md`，在 PR/总结中说明原因。
- [ ] 任何权限、照片来源、缓存策略变更都要同步更新设计文档和本清单。

## 14. 后续阶段规划

> 本节覆盖 `docs/photo-integration-design.md` 第十一章实现步骤 11-17。后续 agent 应按阶段推进，不要一次性把详情页、时间轴和复杂手势全部塞进同一轮改动。

### 阶段 2：照片分组基础（对应步骤 14）

- [x] 新增 `ui/timeline/PhotoGroup.kt`。
- [x] 定义 `PhotoGroup`：

```kotlin
data class PhotoGroup(
    val year: Int?,
    val month: Int?,
    val label: String,
    val startIndex: Int,
    val endIndex: Int,
    val count: Int
)
```

- [x] 基于 `PhotoData.effectiveTimeMillis` 按年月分组。
- [x] `effectiveTimeMillis == null` 的照片进入 `label = "未知时间"` 分组。
- [x] 分组顺序必须与 Gallery 展示顺序一致；当前首版为“新到旧”。
- [x] 预先遍历生成索引，不使用重复 `indexOf`。
- [x] 增加纯 Kotlin 单元测试或最小验证用例，覆盖：
  - 同月多张照片
  - 跨月照片
  - 未知时间照片
  - 空列表

### 阶段 3：时间指示器（对应步骤 16）

- [x] 新增 `ui/timeline/TimeIndicator.kt`。
- [x] 在 Gallery 滑动时根据当前中心索引显示年月和照片数量。
- [x] 滑动停止约 1.5s 后自动隐藏。
- [x] 指示器不得遮挡拍立得主要内容，横竖屏都要检查。
- [x] 不引入时间轴选择弹层；本阶段只做轻量浮动指示器。
- [x] 验收：
  - 快速滑动时年月能随中心索引变化。
  - 停止滑动后能自动隐藏。
  - 空图库、未知时间分组不会崩溃。

### 阶段 4：时间轴选择器与快速定位（对应步骤 15、17）

- [x] 新增 `ui/timeline/TimelineSelector.kt`。
- [x] 设计入口：点击顶部/浮动时间指示器打开，不使用“双指下滑”作为首选入口，避免与现有双指缩放冲突。
- [x] 按年月分组展示可跳转项。
- [x] 点击月份后获取该组 `startIndex`。
- [x] 在 `RopeWithClips` 暴露受控跳转 API 或状态，例如 `targetCenterIndex` / `scrollToIndex`。
- [x] 跳转后触发目标位置附近缩略图加载。
- [x] 验收：
  - 点击月份能跳到该月第一张照片。
  - 跳转动画不破坏现有拖拽和 fling。
  - Android 14+ 部分授权导致分组变化时，时间轴能刷新。

### 阶段 5：详情页基础（对应步骤 11）

- [ ] 新增 `ui/detail/PhotoDetailScreen.kt`。
- [ ] 决定是否引入 Navigation Compose；如果只做局部 overlay，可先不引入 Navigation。
- [ ] 详情页接收当前照片 URI 和索引。
- [ ] 详情页加载比 Gallery 缩略图更大的预览图，不能直接复用小缩略图。
- [ ] 支持左右切换上一张/下一张。
- [ ] 支持单击显示/隐藏轻量工具栏。
- [ ] 验收：
  - 从 Gallery 进入详情页后显示清晰照片。
  - 左右切换不越界。
  - 返回 Gallery 后保留或合理恢复原中心索引。

### 阶段 6：双击展开与返回动画（对应步骤 12）

- [ ] 在 Gallery 中增加双击照片进入详情页。
- [ ] 优先使用 Compose 现有 pointer input / gesture API，不先新增独立 `gesture/` 目录。
- [ ] `RopeWithClips` 需要暴露照片绘制位置或点击命中信息。
- [ ] 展开动画首版可先做淡入/缩放；共享元素精确回位作为后续增强。
- [ ] 验收：
  - 双击照片能进入详情页。
  - 双击不会误触发拖拽或双指缩放。
  - 动画期间不会出现照片与夹子错位闪烁。

### 阶段 7：边界滑动返回（对应步骤 13）

- [ ] 在详情页检测第一张/最后一张边界。
- [ ] 第一张继续向左滑或最后一张继续向右滑时返回 Gallery。
- [ ] 返回时目标 Gallery 索引应与详情页当前索引一致。
- [ ] 若共享元素位置尚未实现，先使用稳定淡出/缩放返回。
- [ ] 验收：
  - 非边界滑动正常切换照片。
  - 边界滑动能返回 Gallery。
  - 返回后窗口缩略图加载正常，中心索引不跳错。

### 后续阶段通用约束

- [ ] 每个阶段都要保持 `./gradlew.bat :app:compileDebugKotlin` 通过。
- [ ] 每个阶段完成后更新本清单勾选状态。
- [ ] 若新增依赖，例如 Navigation Compose，需在总结中说明必要性。
- [ ] 不要在时间轴或详情页阶段顺手引入磁盘缓存；缓存策略另开阶段。
- [ ] 不要回滚首版照片集成、权限处理、窗口化加载和手绘视觉效果。
