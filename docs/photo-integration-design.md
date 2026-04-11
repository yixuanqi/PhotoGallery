# 方案设计：将真实照片集成到拍立得画框

## 一、整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      UI Layer                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  RopeWithClips (Canvas 组件)                         │   │
│  │  - 接收 PhotoData 列表                               │   │
│  │  - 调用 PhotoRenderer 绘制                           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                               │
│  ┌─────────────────┐    ┌─────────────────────────────┐    │
│  │ PhotoRepository │───▶│ List<PhotoData>             │    │
│  │ - 查询媒体库     │    │ - uri: Uri                  │    │
│  │ - 按时间排序     │    │ - dateTaken: Long           │    │
│  │ - 加载缩略图     │    │ - thumbnail: ImageBitmap?   │    │
│  └─────────────────┘    └─────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、核心模块设计

### 1. 数据模型

```kotlin
data class PhotoData(
    val id: Long,                    // 图片ID
    val uri: Uri,                    // 图片URI
    val dateTaken: Long,             // 拍摄时间戳
    val thumbnail: ImageBitmap? = null  // 缩略图（异步加载后填充）
)
```

### 2. 图片获取方案（两种选择）

| 方案 | 优点 | 缺点 |
|------|------|------|
| **MediaStore API** | 完全控制，可获取所有元数据 | 需要 READ_MEDIA_IMAGES 权限 |
| **Photo Picker** | 无需权限，系统UI选择 | 需要用户手动选择照片 |

**推荐方案**：使用 MediaStore API，按拍摄时间排序获取所有照片

### 3. 图片加载流程

```
1. 查询 MediaStore.Images.Media
   └─▶ 获取 uri + dateTaken
   └─▶ ORDER BY date_taken ASC

2. 异步加载缩略图
   └─▶ 使用 ContentResolver.loadThumbnail()
   └─▶ 或自定义解码（采样率压缩）

3. 缓存管理
   └─▶ 使用 LruCache 缓存 ImageBitmap
   └─▶ 控制内存占用（如最多缓存 50 张缩略图）
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
    if (photoData.thumbnail != null) {
        // 绘制真实图片（裁剪/缩放适应画框）
        drawImage(photoData.thumbnail, ...)
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
    // 照片列表（按拍摄时间排序）
    val photos: StateFlow<List<PhotoData>>
    
    // 加载状态
    val isLoading: StateFlow<Boolean>
    
    // 功能：
    // 1. loadPhotos() - 从媒体库加载照片列表
    // 2. loadThumbnail(photoId) - 加载单张缩略图
    // 3. 监听加载进度，更新 photos 状态
}
```

### 加载策略

```
阶段1：快速显示
└─▶ 先加载照片元数据（uri, dateTaken）
└─▶ 立即渲染，显示占位符

阶段2：渐进加载
└─▶ 后台逐张加载缩略图
└─▶ 加载完成后更新 UI
```

---

## 五、权限处理

### Android 版本适配

| Android 版本 | 权限要求 |
|-------------|---------|
| Android 13+ (API 33+) | `READ_MEDIA_IMAGES` |
| Android 10-12 (API 29-32) | `READ_EXTERNAL_STORAGE` |
| Android 9- (API 28-) | `READ_EXTERNAL_STORAGE` |

### 权限请求流程

```
1. 检查权限状态
2. 若无权限 → 显示说明 → 请求权限
3. 用户拒绝 → 显示空状态或引导去设置
4. 用户授权 → 加载照片
```

---

## 六、性能优化

### 1. 缩略图尺寸

```
画框内部尺寸：约 112x132 dp (140-14*2 x 160-14*2)
建议缩略图尺寸：224x264 px (2x 屏幕密度)
```

### 2. 内存管理

```
- 使用 LruCache 限制缓存大小
- 只加载可见区域的照片缩略图
- 滚动时复用 Bitmap 内存
```

### 3. 异步加载

```
- 使用 Coroutine + Dispatchers.IO
- 批量加载时使用 Flow 逐个发射
- 避免阻塞主线程
```

---

## 七、文件结构建议

```
ui/
├── rope/
│   ├── PhotoRenderer.kt      # 修改：支持绘制真实图片
│   ├── RopeWithClips.kt      # 修改：接收 PhotoData 列表
│   └── ...
├── photo/
│   ├── PhotoData.kt          # 新增：数据模型
│   ├── PhotoRepository.kt    # 新增：媒体库查询
│   └── PhotoGalleryViewModel.kt  # 新增：状态管理
```

---

## 八、实现步骤建议

| 步骤 | 内容 | 复杂度 |
|------|------|--------|
| 1 | 创建 PhotoData 数据模型 | 低 |
| 2 | 实现 PhotoRepository 查询媒体库 | 中 |
| 3 | 添加权限请求逻辑 | 低 |
| 4 | 修改 PhotoRenderer 支持绘制 ImageBitmap | 中 |
| 5 | 修改 RopeWithClips 接收真实数据 | 低 |
| 6 | 实现 ViewModel 状态管理 | 中 |
| 7 | 添加缩略图缓存 | 中 |
| 8 | 测试和优化 | - |
