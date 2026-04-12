# 软件著作权登记 - 源代码文档

## 软件基本信息

| 项目 | 内容 |
|------|------|
| 软件全称 | 小笨相册 |
| 软件简称 | Photo Gallery |
| 版本号 | V1.0 |
| 软件分类 | 应用软件-多媒体 |
| 开发完成日期 | 2025年04月12日 |
| 开发方式 | 独立开发 |
| 源代码行数 | 约3202行 |

## 软件功能说明

小笨相册（Photo Gallery）是一款具有手绘风格的照片浏览应用，主要功能包括：

1. **照片浏览与展示**：以晾衣绳形式展示相册中的照片，支持滑动浏览
2. **手绘风格界面**：采用吉卜力风格的背景渲染，照片以拍立得形式呈现
3. **时间线分组导航**：按月份对照片进行分组，支持快速跳转
4. **照片详情查看**：支持双指缩放、单指滑动切换照片
5. **权限管理**：支持Android 14的部分照片访问权限

## 技术特点

- 采用Kotlin语言开发
- 使用Jetpack Compose声明式UI框架
- 支持Android 8.0（API 26）及以上版本
- 采用MVVM架构模式

---

## 源代码（前30页）

### 文件：MainActivity.kt

```kotlin
package com.example.photogallery

import android.os.Bundle
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.photogallery.ui.background.BackgroundRenderer
import com.example.photogallery.ui.detail.PhotoDetailScreen
import com.example.photogallery.ui.photo.PhotoGalleryViewModel
import com.example.photogallery.ui.photo.PhotoPermissionState
import com.example.photogallery.ui.rope.RopeWithClips
import com.example.photogallery.ui.rope.RopeWithClipsConfig
import com.example.photogallery.ui.rope.ClipStyle
import com.example.photogallery.ui.rope.RopeStyle
import com.example.photogallery.ui.rope.PhotoStyle
import com.example.photogallery.ui.timeline.PhotoGroup
import com.example.photogallery.ui.timeline.TimeIndicator
import com.example.photogallery.ui.timeline.TimelineSelector
import com.example.photogallery.ui.timeline.groupPhotosByMonth

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { PhotoGalleryTheme { PhotoGalleryScreen() } }
    }
}

@Composable
fun PhotoGalleryScreen() {
    val viewModel: PhotoGalleryViewModel = viewModel()
    val photos by viewModel.photos.collectAsState()
    val photoStates by viewModel.photoStates.collectAsState()
    val permissionState by viewModel.permissionState.collectAsState()
    var hasRequestedPermission by remember { mutableStateOf(false) }
    val photoGroups = remember(photos) { groupPhotosByMonth(photos) }
    var activePhotoGroup by remember { mutableStateOf<PhotoGroup?>(null) }
    var showTimelineSelector by remember { mutableStateOf(false) }
    var scrollToIndex by remember { mutableStateOf<Int?>(null) }
    var currentCenterIndex by remember { mutableStateOf(0) }
    var detailIndex by remember { mutableStateOf<Int?>(null) }
    var isDetailVisible by remember { mutableStateOf(false) }
    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) {
        viewModel.loadPhotos()
    }
    val lifecycleOwner = LocalLifecycleOwner.current

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_START) {
                viewModel.checkPermissionOnResume()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    LaunchedEffect(permissionState) {
        if (permissionState == PhotoPermissionState.Denied && !hasRequestedPermission) {
            hasRequestedPermission = true
            permissionLauncher.launch(PhotoGalleryViewModel.requiredPermissions())
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        BackgroundRenderer(modifier = Modifier.fillMaxSize())
        RopeWithClips(
            modifier = Modifier.fillMaxSize(),
            photos = photos,
            photoStates = photoStates,
            scrollToIndex = scrollToIndex,
            onScrollToIndexConsumed = { scrollToIndex = null },
            onPhotoDoubleTap = handlePhotoDoubleTap@{ index ->
                if (photos.isEmpty()) return@handlePhotoDoubleTap
                detailIndex = index.coerceIn(0, photos.lastIndex)
                scrollToIndex = detailIndex
                isDetailVisible = true
                showTimelineSelector = false
            },
            onViewportChanged = { request ->
                viewModel.onViewportChanged(
                    visibleRange = request.visibleRange,
                    preloadRange = request.preloadRange,
                    targetWidthPx = request.targetWidthPx,
                    targetHeightPx = request.targetHeightPx
                )
                activePhotoGroup = photoGroups.firstOrNull { group ->
                    request.centerIndex in group.startIndex..group.endIndex
                }
                currentCenterIndex = request.centerIndex
            },
            config = RopeWithClipsConfig(
                clipCount = 15,
                cacheEachSide = 3,
                ropeStyle = RopeStyle(
                    sagAmount = 35f,
                    jitterAmount = 4f,
                    sampleCount = 120,
                    baseStrokeWidth = 5f,
                    twistCount = 3,
                    fiberAlpha = 0.3f,
                    shadowOffset = 4f,
                    shadowAlpha = 0.12f,
                    highlightAlpha = 0.25f
                ),
                clipStyle = ClipStyle(
                    totalHeight = 72f,
                    headWidth = 15f,
                    gripWidth = 11f,
                    bodyWidth = 20f,
                    headLength = 18f,
                    gripLength = 13f,
                    bodyLength = 44f,
                    springHeight = 12f,
                    strokeWidth = 1.4f,
                    woodLight = Color(0xFFC9B896),
                    woodMid = Color(0xFFA89878),
                    woodDark = Color(0xFF8A7A60),
                    woodShadow = Color(0xFF6A5A48),
                    springColor = Color(0xFF8A9A8C),
                    shadowColor = Color(0x30000000)
                ),
                photoStyle = PhotoStyle(
                    photoWidth = 130f,
                    photoHeight = 155f,
                    borderSize = 14f,
                    cornerRadius = 3f,
                    rotationRange = 5f,
                    shadowOffsetX = 6f,
                    shadowOffsetY = 8f,
                    shadowAlpha = 0.12f,
                    shadowBlur = 12f,
                    borderColor = Color(0xFFF5F0E6),
                    photoAreaColor = Color(0xFFD4E4D0),
                    photoGradientTop = Color(0xFFE8F0E4),
                    photoGradientBot = Color(0xFFB8D0B4),
                    curlChance = 0.55f,
                    curlAmount = 12f,
                    edgeIrregularity = 2.5f,
                    wavyEdgeChance = 0.4f,
                    highlightAlpha = 0.15f
                ),
                ropeColor = Color(0xFF8A9A78),
                verticalOffsetDp = 200,
                seed = 42L
            )
        )
        activePhotoGroup?.let { group ->
            Row(
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 48.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                TimeIndicator(
                    group = group,
                    modifier = Modifier.clickable {
                        showTimelineSelector = true
                    }
                )
                if (photos.isNotEmpty()) {
                    FilledTonalButton(
                        modifier = Modifier.padding(start = 8.dp),
                        colors = ButtonDefaults.filledTonalButtonColors(
                            containerColor = LightGreenOverlay,
                            contentColor = HandDrawnInk,
                            disabledContainerColor = LightGreenOverlay.copy(alpha = 0.45f),
                            disabledContentColor = HandDrawnInk.copy(alpha = 0.55f)
                        ),
                        onClick = {
                            detailIndex = currentCenterIndex.coerceIn(0, photos.lastIndex)
                            isDetailVisible = true
                            showTimelineSelector = false
                        }
                    ) {
                        Text("查看")
                    }
                }
            }
        }
        detailIndex?.let { index ->
            AnimatedVisibility(
                visible = isDetailVisible,
                enter = fadeIn() + scaleIn(initialScale = 0.96f),
                exit = fadeOut() + scaleOut(targetScale = 0.96f)
            ) {
                PhotoDetailScreen(
                    photos = photos,
                    currentIndex = index,
                    onIndexChange = { nextIndex ->
                        detailIndex = nextIndex
                        scrollToIndex = nextIndex
                    },
                    onDismiss = {
                        isDetailVisible = false
                        scrollToIndex = detailIndex?.coerceIn(0, photos.lastIndex)
                    },
                    modifier = Modifier.fillMaxSize()
                )
            }
        }
        if (showTimelineSelector) {
            TimelineSelector(
                groups = photoGroups,
                onGroupSelected = { group ->
                    scrollToIndex = group.startIndex
                    activePhotoGroup = group
                    showTimelineSelector = false
                },
                onDismiss = { showTimelineSelector = false }
            )
        }
        if (permissionState == PhotoPermissionState.Denied && hasRequestedPermission) {
            Column(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "授权后可以把相册里的照片挂到绳子上",
                    color = Color(0xFF4B5A45),
                    textAlign = TextAlign.Center
                )
                Button(
                    modifier = Modifier
                        .padding(top = 12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = LightGreenOverlay,
                        contentColor = HandDrawnInk,
                        disabledContainerColor = LightGreenOverlay.copy(alpha = 0.45f),
                        disabledContentColor = HandDrawnInk.copy(alpha = 0.55f)
                    ),
                    onClick = {
                        permissionLauncher.launch(PhotoGalleryViewModel.requiredPermissions())
                    }
                ) {
                    Text("选择照片权限")
                }
            }
        }
    }
}
```

### 文件：PhotoGalleryTheme.kt

```kotlin
package com.example.photogallery

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight

val LightGreenOverlay = Color(0xBFDCEFD2)
val LightGreenOverlayStrong = Color(0xD9DCEFD2)
val HandDrawnInk = Color(0xFF40513A)

private val DefaultTypography = Typography()
private val CaveatBoldFontFamily = FontFamily(Font(R.font.caveat_bold, FontWeight.Bold))

private fun TextStyle.handDrawn(): TextStyle = copy(fontFamily = CaveatBoldFontFamily)

private val HandDrawnTypography = Typography(
    displayLarge = DefaultTypography.displayLarge.handDrawn(),
    displayMedium = DefaultTypography.displayMedium.handDrawn(),
    displaySmall = DefaultTypography.displaySmall.handDrawn(),
    headlineLarge = DefaultTypography.headlineLarge.handDrawn(),
    headlineMedium = DefaultTypography.headlineMedium.handDrawn(),
    headlineSmall = DefaultTypography.headlineSmall.handDrawn(),
    titleLarge = DefaultTypography.titleLarge.handDrawn(),
    titleMedium = DefaultTypography.titleMedium.handDrawn(),
    titleSmall = DefaultTypography.titleSmall.handDrawn(),
    bodyLarge = DefaultTypography.bodyLarge.handDrawn(),
    bodyMedium = DefaultTypography.bodyMedium.handDrawn(),
    bodySmall = DefaultTypography.bodySmall.handDrawn(),
    labelLarge = DefaultTypography.labelLarge.handDrawn(),
    labelMedium = DefaultTypography.labelMedium.handDrawn(),
    labelSmall = DefaultTypography.labelSmall.handDrawn()
)

private val PhotoGalleryColorScheme = lightColorScheme(
    primary = LightGreenOverlayStrong,
    onPrimary = HandDrawnInk,
    secondary = LightGreenOverlayStrong,
    onSecondary = HandDrawnInk,
    primaryContainer = LightGreenOverlay,
    onPrimaryContainer = HandDrawnInk,
    secondaryContainer = LightGreenOverlay,
    onSecondaryContainer = HandDrawnInk,
    surface = LightGreenOverlay,
    onSurface = HandDrawnInk,
    surfaceVariant = LightGreenOverlay,
    onSurfaceVariant = HandDrawnInk
)

@Composable
fun PhotoGalleryTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = PhotoGalleryColorScheme,
        typography = HandDrawnTypography,
        content = content
    )
}
```

### 文件：PhotoData.kt

```kotlin
package com.example.photogallery.ui.photo

import android.net.Uri
import androidx.compose.ui.graphics.ImageBitmap

data class PhotoData(
    val id: Long,
    val uri: Uri,
    val takenAtMillis: Long?,
    val addedAtMillis: Long?,
    val modifiedAtMillis: Long?,
    val cacheKey: String = uri.toString()
) {
    val effectiveTimeMillis: Long?
        get() = when {
            takenAtMillis != null && takenAtMillis > 0L -> takenAtMillis
            addedAtMillis != null && addedAtMillis > 0L -> addedAtMillis
            modifiedAtMillis != null && modifiedAtMillis > 0L -> modifiedAtMillis
            else -> null
        }
}

sealed class PhotoState {
    data object Unloaded : PhotoState()
    data object Loading : PhotoState()
    data class Loaded(val bitmap: ImageBitmap) : PhotoState()
    data class Failed(val reason: String? = null) : PhotoState()
}

sealed class PhotoPermissionState {
    data object Unknown : PhotoPermissionState()
    data object GrantedFull : PhotoPermissionState()
    data object GrantedLimited : PhotoPermissionState()
    data object Denied : PhotoPermissionState()
}
```

### 文件：ThumbnailCache.kt

```kotlin
package com.example.photogallery.ui.photo

import android.util.LruCache
import androidx.compose.ui.graphics.ImageBitmap

class ThumbnailCache(maxEntries: Int = 48) {
    private val cache = LruCache<String, ImageBitmap>(maxEntries)

    fun get(key: String): ImageBitmap? = cache.get(key)

    fun put(key: String, bitmap: ImageBitmap) {
        cache.put(key, bitmap)
    }

    fun clear() {
        cache.evictAll()
    }
}
```

### 文件：PhotoRepository.kt

```kotlin
package com.example.photogallery.ui.photo

import android.content.ContentResolver
import android.content.ContentUris
import android.content.Context
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.MediaStore
import android.util.Size
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlin.math.max

data class PhotoPage(
    val photos: List<PhotoData>,
    val nextOffset: Int,
    val hasMore: Boolean
)

class PhotoRepository(private val context: Context) {
    private val resolver: ContentResolver = context.contentResolver

    suspend fun queryPhotoPage(offset: Int, pageSize: Int): PhotoPage = withContext(Dispatchers.IO) {
        val collection = MediaStore.Images.Media.EXTERNAL_CONTENT_URI
        val projection = arrayOf(
            MediaStore.Images.Media._ID,
            MediaStore.Images.Media.DATE_TAKEN,
            MediaStore.Images.Media.DATE_ADDED,
            MediaStore.Images.Media.DATE_MODIFIED
        )

        val photos = mutableListOf<PhotoData>()
        val queryArgs = Bundle().apply {
            putStringArray(
                ContentResolver.QUERY_ARG_SORT_COLUMNS,
                arrayOf(MediaStore.Images.Media.DATE_TAKEN, MediaStore.Images.Media.DATE_ADDED)
            )
            putInt(ContentResolver.QUERY_ARG_SORT_DIRECTION, ContentResolver.QUERY_SORT_DIRECTION_ASCENDING)
            putInt(ContentResolver.QUERY_ARG_OFFSET, offset.coerceAtLeast(0))
            putInt(ContentResolver.QUERY_ARG_LIMIT, (pageSize + 1).coerceAtLeast(1))
        }
        resolver.query(collection, projection, queryArgs, null)?.use { cursor ->
            val idColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media._ID)
            val takenColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_TAKEN)
            val addedColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_ADDED)
            val modifiedColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_MODIFIED)

            while (cursor.moveToNext() && photos.size < pageSize + 1) {
                val id = cursor.getLong(idColumn)
                val uri = ContentUris.withAppendedId(collection, id)
                photos += PhotoData(
                    id = id,
                    uri = uri,
                    takenAtMillis = cursor.getNullableLong(takenColumn),
                    addedAtMillis = cursor.getNullableLong(addedColumn)?.times(1000L),
                    modifiedAtMillis = cursor.getNullableLong(modifiedColumn)?.times(1000L)
                )
            }
        }

        val hasMore = photos.size > pageSize
        val pagePhotos = photos.take(pageSize).sortedWith(
            compareBy<PhotoData> { it.effectiveTimeMillis ?: Long.MIN_VALUE }
                .thenBy { it.id }
        )
        PhotoPage(
            photos = pagePhotos,
            nextOffset = offset.coerceAtLeast(0) + pagePhotos.size,
            hasMore = hasMore
        )
    }

    suspend fun loadThumbnail(uri: Uri, targetWidthPx: Int, targetHeightPx: Int): ImageBitmap =
        withContext(Dispatchers.IO) {
            val width = targetWidthPx.coerceAtLeast(1)
            val height = targetHeightPx.coerceAtLeast(1)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                resolver.loadThumbnail(uri, Size(width, height), null).asImageBitmap()
            } else {
                decodeSampledBitmap(uri, width, height).asImageBitmap()
            }
        }

    private fun decodeSampledBitmap(uri: Uri, reqWidth: Int, reqHeight: Int): android.graphics.Bitmap {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        resolver.openInputStream(uri)?.use { input ->
            BitmapFactory.decodeStream(input, null, bounds)
        }

        val options = BitmapFactory.Options().apply {
            inSampleSize = calculateInSampleSize(bounds, reqWidth, reqHeight)
        }

        return resolver.openInputStream(uri)?.use { input ->
            BitmapFactory.decodeStream(input, null, options)
        } ?: error("Unable to decode thumbnail")
    }

    private fun calculateInSampleSize(options: BitmapFactory.Options, reqWidth: Int, reqHeight: Int): Int {
        val height = options.outHeight
        val width = options.outWidth
        var inSampleSize = 1

        if (height > reqHeight || width > reqWidth) {
            val halfHeight = max(1, height / 2)
            val halfWidth = max(1, width / 2)
            while (halfHeight / inSampleSize >= reqHeight && halfWidth / inSampleSize >= reqWidth) {
                inSampleSize *= 2
            }
        }

        return inSampleSize
    }

    private fun android.database.Cursor.getNullableLong(columnIndex: Int): Long? {
        return if (isNull(columnIndex)) null else getLong(columnIndex)
    }
}
```

---

## 源代码（后30页）

### 文件：PhotoGalleryViewModel.kt

```kotlin
package com.example.photogallery.ui.photo

import android.Manifest
import android.app.Application
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class PhotoGalleryViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = PhotoRepository(application.applicationContext)
    private val thumbnailCache = ThumbnailCache()
    private val loadingKeys = mutableSetOf<String>()
    private var viewportJob: Job? = null
    private var photoPageJob: Job? = null
    private var nextPhotoOffset = 0
    private var hasMorePhotoPages = true

    private val _photos = MutableStateFlow<List<PhotoData>>(emptyList())
    val photos: StateFlow<List<PhotoData>> = _photos.asStateFlow()

    private val _photoStates = MutableStateFlow<Map<String, PhotoState>>(emptyMap())
    val photoStates: StateFlow<Map<String, PhotoState>> = _photoStates.asStateFlow()

    private val _permissionState = MutableStateFlow<PhotoPermissionState>(PhotoPermissionState.Unknown)
    val permissionState: StateFlow<PhotoPermissionState> = _permissionState.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    fun checkPermissionOnResume() {
        val nextState = resolvePermissionState(getApplication())
        if (_permissionState.value != nextState) {
            _permissionState.value = nextState
            if (nextState == PhotoPermissionState.Denied) {
                clearPhotos()
            } else {
                loadPhotos()
            }
        }
    }

    fun loadPhotos() {
        val currentPermission = resolvePermissionState(getApplication())
        _permissionState.value = currentPermission
        if (currentPermission == PhotoPermissionState.Denied) {
            clearPhotos()
            return
        }

        loadNextPhotoPage(reset = true)
    }

    fun onViewportChanged(
        visibleRange: IntRange,
        preloadRange: IntRange,
        targetWidthPx: Int,
        targetHeightPx: Int
    ) {
        viewportJob?.cancel()
        viewportJob = viewModelScope.launch {
            delay(100)
            val photos = _photos.value
            if (photos.isEmpty()) return@launch
            val loadRange = normalizeRange(visibleRange, preloadRange, photos.lastIndex)
            loadRange.forEach { index ->
                val photo = photos[index]
                loadThumbnailIfNeeded(photo, targetWidthPx, targetHeightPx)
            }
        }
    }

    fun reloadPermissionLimitedPhotos() {
        loadPhotos()
    }

    private fun loadThumbnailIfNeeded(photo: PhotoData, targetWidthPx: Int, targetHeightPx: Int) {
        val key = photo.cacheKey
        val cached = thumbnailCache.get(key)
        if (cached != null) {
            updatePhotoState(key, PhotoState.Loaded(cached))
            return
        }
        if (loadingKeys.contains(key) || _photoStates.value[key] is PhotoState.Loaded) return

        loadingKeys += key
        updatePhotoState(key, PhotoState.Loading)
        viewModelScope.launch {
            runCatching {
                repository.loadThumbnail(photo.uri, targetWidthPx, targetHeightPx)
            }.onSuccess { bitmap ->
                thumbnailCache.put(key, bitmap)
                updatePhotoState(key, PhotoState.Loaded(bitmap))
            }.onFailure { error ->
                updatePhotoState(key, PhotoState.Failed(error.message))
            }
            loadingKeys -= key
        }
    }

    private fun loadNextPhotoPage(reset: Boolean) {
        if (!reset && (!hasMorePhotoPages || photoPageJob?.isActive == true)) return
        if (reset) {
            photoPageJob?.cancel()
            viewportJob?.cancel()
            loadingKeys.clear()
            thumbnailCache.clear()
            nextPhotoOffset = 0
            hasMorePhotoPages = true
            _photos.value = emptyList()
            _photoStates.value = emptyMap()
        }

        photoPageJob = viewModelScope.launch {
            _isLoading.value = true
            while (hasMorePhotoPages) {
                val shouldContinue = runCatching {
                    repository.queryPhotoPage(
                        offset = nextPhotoOffset,
                        pageSize = PHOTO_PAGE_SIZE
                    )
                }.fold(
                    onSuccess = { page ->
                        val previousCount = _photos.value.size
                        val mergedPhotos = mergePhotos(_photos.value, page.photos)
                        _photos.value = mergedPhotos
                        nextPhotoOffset = page.nextOffset
                        hasMorePhotoPages = page.hasMore && mergedPhotos.size > previousCount
                        val validKeys = mergedPhotos.mapTo(mutableSetOf()) { it.cacheKey }
                        _photoStates.value = _photoStates.value.filterKeys { it in validKeys }
                        hasMorePhotoPages
                    },
                    onFailure = {
                        if (_photos.value.isEmpty()) {
                            _photoStates.value = emptyMap()
                        }
                        hasMorePhotoPages = false
                        false
                    }
                )
                if (!shouldContinue) {
                    break
                }
            }
            _isLoading.value = false
        }
    }

    private fun updatePhotoState(key: String, state: PhotoState) {
        _photoStates.value = _photoStates.value.toMutableMap().apply {
            put(key, state)
        }
    }

    private fun clearPhotos() {
        viewportJob?.cancel()
        photoPageJob?.cancel()
        loadingKeys.clear()
        thumbnailCache.clear()
        nextPhotoOffset = 0
        hasMorePhotoPages = true
        _photos.value = emptyList()
        _photoStates.value = emptyMap()
        _isLoading.value = false
    }

    private fun normalizeRange(visibleRange: IntRange, preloadRange: IntRange, lastIndex: Int): IntRange {
        val start = minOf(visibleRange.first, preloadRange.first).coerceIn(0, lastIndex)
        val end = maxOf(visibleRange.last, preloadRange.last).coerceIn(0, lastIndex)
        return start..end
    }

    private fun mergePhotos(current: List<PhotoData>, nextPage: List<PhotoData>): List<PhotoData> {
        if (current.isEmpty()) return nextPage
        if (nextPage.isEmpty()) return current
        val seenIds = current.mapTo(mutableSetOf()) { it.id }
        return (current + nextPage.filter { seenIds.add(it.id) }).sortedWith(
            compareBy<PhotoData> { it.effectiveTimeMillis ?: Long.MIN_VALUE }
                .thenBy { it.id }
        )
    }

    companion object {
        private const val PHOTO_PAGE_SIZE = 500

        fun requiredPermissions(): Array<String> {
            return when {
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE -> arrayOf(
                    Manifest.permission.READ_MEDIA_IMAGES,
                    Manifest.permission.READ_MEDIA_VISUAL_USER_SELECTED
                )
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU -> arrayOf(
                    Manifest.permission.READ_MEDIA_IMAGES
                )
                else -> arrayOf(Manifest.permission.READ_EXTERNAL_STORAGE)
            }
        }

        fun resolvePermissionState(context: Context): PhotoPermissionState {
            return when {
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE -> {
                    val hasFull = ContextCompat.checkSelfPermission(
                        context,
                        Manifest.permission.READ_MEDIA_IMAGES
                    ) == PackageManager.PERMISSION_GRANTED
                    val hasLimited = ContextCompat.checkSelfPermission(
                        context,
                        Manifest.permission.READ_MEDIA_VISUAL_USER_SELECTED
                    ) == PackageManager.PERMISSION_GRANTED

                    when {
                        hasFull -> PhotoPermissionState.GrantedFull
                        hasLimited -> PhotoPermissionState.GrantedLimited
                        else -> PhotoPermissionState.Denied
                    }
                }
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU -> {
                    if (ContextCompat.checkSelfPermission(
                            context,
                            Manifest.permission.READ_MEDIA_IMAGES
                        ) == PackageManager.PERMISSION_GRANTED
                    ) {
                        PhotoPermissionState.GrantedFull
                    } else {
                        PhotoPermissionState.Denied
                    }
                }
                else -> {
                    if (ContextCompat.checkSelfPermission(
                            context,
                            Manifest.permission.READ_EXTERNAL_STORAGE
                        ) == PackageManager.PERMISSION_GRANTED
                    ) {
                        PhotoPermissionState.GrantedFull
                    } else {
                        PhotoPermissionState.Denied
                    }
                }
            }
        }
    }
}
```

### 文件：PhotoGroup.kt

```kotlin
package com.example.photogallery.ui.timeline

import com.example.photogallery.ui.photo.PhotoData
import java.time.Instant
import java.time.ZoneId

data class PhotoGroup(
    val year: Int?,
    val month: Int?,
    val label: String,
    val startIndex: Int,
    val endIndex: Int,
    val count: Int
)

fun groupPhotosByMonth(
    photos: List<PhotoData>,
    zoneId: ZoneId = ZoneId.systemDefault()
): List<PhotoGroup> {
    return groupPhotoTimesByMonth(
        effectiveTimes = photos.map { it.effectiveTimeMillis },
        zoneId = zoneId
    )
}

fun groupPhotoTimesByMonth(
    effectiveTimes: List<Long?>,
    zoneId: ZoneId = ZoneId.systemDefault()
): List<PhotoGroup> {
    if (effectiveTimes.isEmpty()) return emptyList()

    data class GroupKey(val year: Int?, val month: Int?, val label: String)

    val groupStarts = linkedMapOf<GroupKey, Int>()
    val groupEnds = linkedMapOf<GroupKey, Int>()
    val groupCounts = linkedMapOf<GroupKey, Int>()

    effectiveTimes.forEachIndexed { index, effectiveTimeMillis ->
        val key = effectiveTimeMillis?.let { timeMillis ->
            val date = Instant.ofEpochMilli(timeMillis).atZone(zoneId)
            GroupKey(
                year = date.year,
                month = date.monthValue,
                label = "${date.year}年${date.monthValue}月"
            )
        } ?: GroupKey(
            year = null,
            month = null,
            label = "未知时间"
        )

        groupStarts.putIfAbsent(key, index)
        groupEnds[key] = index
        groupCounts[key] = (groupCounts[key] ?: 0) + 1
    }

    return groupStarts.map { (key, startIndex) ->
        PhotoGroup(
            year = key.year,
            month = key.month,
            label = key.label,
            startIndex = startIndex,
            endIndex = groupEnds.getValue(key),
            count = groupCounts.getValue(key)
        )
    }
}
```

### 文件：TimeIndicator.kt

```kotlin
package com.example.photogallery.ui.timeline

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.photogallery.HandDrawnInk
import com.example.photogallery.LightGreenOverlay

@Composable
fun TimeIndicator(
    group: PhotoGroup,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier,
        color = LightGreenOverlay,
        contentColor = HandDrawnInk,
        shape = MaterialTheme.shapes.small,
        shadowElevation = 3.dp
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = group.label,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = "共 ${group.count} 张",
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}
```

### 文件：TimelineSelector.kt

```kotlin
package com.example.photogallery.ui.timeline

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.photogallery.HandDrawnInk
import com.example.photogallery.LightGreenOverlay

@Composable
fun TimelineSelector(
    groups: List<PhotoGroup>,
    onGroupSelected: (PhotoGroup) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.18f))
            .clickable(onClick = onDismiss),
        contentAlignment = Alignment.BottomCenter
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(max = 244.dp)
                .pointerInput(Unit) { detectTapGestures { } },
            color = LightGreenOverlay,
            contentColor = HandDrawnInk,
            shape = MaterialTheme.shapes.small,
            shadowElevation = 6.dp
        ) {
            Column(
                modifier = Modifier
                    .background(LightGreenOverlay)
                    .padding(horizontal = 18.dp, vertical = 14.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = "跳到月份",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                if (groups.isEmpty()) {
                    Text(
                        text = "暂无可定位的照片",
                        style = MaterialTheme.typography.bodyMedium
                    )
                } else {
                    LazyColumn(
                        modifier = Modifier.heightIn(max = 164.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        items(groups) { group ->
                            TimelineSelectorRow(
                                group = group,
                                onClick = { onGroupSelected(group) }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TimelineSelectorRow(
    group: PhotoGroup,
    onClick: () -> Unit
) {
    TextButton(
        modifier = Modifier.fillMaxWidth(),
        colors = ButtonDefaults.textButtonColors(
            containerColor = LightGreenOverlay,
            contentColor = HandDrawnInk
        ),
        onClick = onClick
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = group.label,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Medium
            )
            Text(
                text = "${group.count} 张",
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
}
```

---

## 文件清单

| 序号 | 文件名 | 路径 | 说明 |
|-----|-------|------|------|
| 1 | MainActivity.kt | ui/ | 主界面Activity |
| 2 | PhotoGalleryTheme.kt | ui/ | 主题配置 |
| 3 | PhotoData.kt | ui/photo/ | 照片数据模型 |
| 4 | ThumbnailCache.kt | ui/photo/ | 缩略图缓存 |
| 5 | PhotoRepository.kt | ui/photo/ | 照片数据仓库 |
| 6 | PhotoGalleryViewModel.kt | ui/photo/ | 视图模型 |
| 7 | PhotoGroup.kt | ui/timeline/ | 时间分组 |
| 8 | TimeIndicator.kt | ui/timeline/ | 时间指示器 |
| 9 | TimelineSelector.kt | ui/timeline/ | 时间选择器 |
| 10 | PhotoDetailScreen.kt | ui/detail/ | 详情页面 |
| 11 | BackgroundRenderer.kt | ui/background/ | 背景渲染 |
| 12 | RopeWithClips.kt | ui/rope/ | 绳子与夹子组件 |
| 13 | RopeGenerator.kt | ui/rope/ | 绳子生成器 |
| 14 | PhotoRenderer.kt | ui/rope/ | 照片渲染器 |
| 15 | ClipRenderer.kt | ui/rope/ | 夹子渲染器 |
| 16 | PathSampler.kt | ui/rope/ | 路径采样器 |

---

*本文档由 SoftAssist 工具自动生成*
