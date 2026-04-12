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
