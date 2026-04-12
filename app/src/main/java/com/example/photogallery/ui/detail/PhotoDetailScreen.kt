package com.example.photogallery.ui.detail

import android.graphics.BitmapFactory
import android.net.Uri
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.sizeIn
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.positionChange
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.photogallery.HandDrawnInk
import com.example.photogallery.LightGreenOverlay
import com.example.photogallery.R
import com.example.photogallery.ui.photo.PhotoData
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.sqrt

@Composable
fun PhotoDetailScreen(
    photos: List<PhotoData>,
    currentIndex: Int,
    onIndexChange: (Int) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    if (photos.isEmpty()) return

    val index = currentIndex.coerceIn(0, photos.lastIndex)
    val photo = photos[index]
    val context = LocalContext.current
    val density = LocalDensity.current
    val swipeThresholdPx = with(density) { 96.dp.toPx() }
    val defaultImageScale = 1.25f
    var preview by remember(photo.cacheKey) { mutableStateOf<ImageBitmap?>(null) }
    var failed by remember(photo.cacheKey) { mutableStateOf(false) }
    var showToolbar by remember { mutableStateOf(true) }
    var zoomScale by remember(photo.cacheKey) { mutableFloatStateOf(1f) }
    var imageOffsetX by remember(photo.cacheKey) { mutableFloatStateOf(0f) }
    var imageOffsetY by remember(photo.cacheKey) { mutableFloatStateOf(0f) }
    val isImageDraggable = zoomScale > 1.01f
    val isImageDraggableState by rememberUpdatedState(isImageDraggable)

    LaunchedEffect(photo.cacheKey) {
        failed = false
        preview = runCatching {
            withContext(Dispatchers.IO) {
                decodeDetailBitmap(
                    uri = photo.uri,
                    context = context,
                    maxDimensionPx = 4096
                ).asImageBitmap()
            }
        }.onFailure {
            failed = true
        }.getOrNull()
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xEE10140F))
            .pointerInput(index, photos.size, swipeThresholdPx) {
                awaitEachGesture {
                    var horizontalDragPx = 0f
                    var verticalDragPx = 0f
                    var previousPinchDistance = 0f
                    var previousCentroid: androidx.compose.ui.geometry.Offset? = null
                    var transformed = false

                    while (true) {
                        val event = awaitPointerEvent()
                        val pressed = event.changes.filter { it.pressed }
                        if (pressed.isEmpty()) break

                        if (pressed.size >= 2) {
                            transformed = true
                            val first = pressed[0].position
                            val second = pressed[1].position
                            val centroid = (first + second) / 2f
                            val distance = distanceBetween(first, second)
                            val previous = previousCentroid

                            if (previousPinchDistance > 0f && distance > 0f) {
                                zoomScale = (zoomScale * (distance / previousPinchDistance)).coerceIn(1f, 4f)
                                if (zoomScale <= 1.01f) {
                                    imageOffsetX = 0f
                                    imageOffsetY = 0f
                                }
                            }
                            if (previous != null && isImageDraggableState) {
                                val pan = centroid - previous
                                imageOffsetX += pan.x
                                imageOffsetY += pan.y
                            }

                            previousPinchDistance = distance
                            previousCentroid = centroid
                            pressed.forEach { it.consume() }
                            continue
                        }

                        previousPinchDistance = 0f
                        previousCentroid = null
                        val delta = pressed.first().positionChange()
                        if (isImageDraggableState) {
                            transformed = true
                            imageOffsetX += delta.x
                            imageOffsetY += delta.y
                            pressed.first().consume()
                        } else if (!transformed) {
                            horizontalDragPx += delta.x
                            verticalDragPx += delta.y
                            if (abs(horizontalDragPx) > abs(verticalDragPx)) {
                                pressed.first().consume()
                            }
                        }
                    }

                    if (!transformed) {
                        handleDetailSwipe(
                            horizontalDragPx = horizontalDragPx,
                            verticalDragPx = verticalDragPx,
                            thresholdPx = swipeThresholdPx,
                            index = index,
                            lastIndex = photos.lastIndex,
                            onIndexChange = onIndexChange,
                            onDismiss = onDismiss
                        )
                    }
                }
            }
            .clickable { showToolbar = !showToolbar }
            .padding(20.dp)
    ) {
        if (preview != null) {
            Image(
                bitmap = preview!!,
                contentDescription = null,
                modifier = Modifier
                    .align(Alignment.Center)
                    .sizeIn(maxWidth = 720.dp, maxHeight = 720.dp)
                    .fillMaxWidth()
                    .graphicsLayer {
                        scaleX = defaultImageScale * zoomScale
                        scaleY = defaultImageScale * zoomScale
                        translationX = imageOffsetX
                        translationY = imageOffsetY
                    },
                contentScale = ContentScale.Fit
            )
        } else {
            Text(
                text = if (failed) {
                    stringResource(R.string.detail_photo_open_failed)
                } else {
                    stringResource(R.string.detail_loading_photo)
                },
                color = Color(0xFFF7F5EA),
                modifier = Modifier.align(Alignment.Center)
            )
        }

        if (showToolbar) {
            Column(
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 36.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "${index + 1} / ${photos.size}",
                    color = Color(0xFFF7F5EA),
                    fontSize = 28.sp
                )
            }

            Button(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(
                    containerColor = LightGreenOverlay,
                    contentColor = HandDrawnInk
                ),
                onClick = onDismiss
            ) {
                Text(stringResource(R.string.action_back))
            }
        }
    }
}

private fun decodeDetailBitmap(
    uri: Uri,
    context: android.content.Context,
    maxDimensionPx: Int
): android.graphics.Bitmap {
    val resolver = context.contentResolver
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    resolver.openInputStream(uri)?.use { input ->
        BitmapFactory.decodeStream(input, null, bounds)
    }

    val sampleSize = calculateDetailSampleSize(bounds, maxDimensionPx)
    val options = BitmapFactory.Options().apply {
        inSampleSize = sampleSize
    }
    return resolver.openInputStream(uri)?.use { input ->
        BitmapFactory.decodeStream(input, null, options)
    } ?: error("Unable to decode detail bitmap")
}

private fun calculateDetailSampleSize(options: BitmapFactory.Options, maxDimensionPx: Int): Int {
    val sourceMaxDimension = max(options.outWidth, options.outHeight)
    var sampleSize = 1
    while (sourceMaxDimension / (sampleSize * 2) >= maxDimensionPx) {
        sampleSize *= 2
    }
    return sampleSize
}

private fun distanceBetween(
    first: androidx.compose.ui.geometry.Offset,
    second: androidx.compose.ui.geometry.Offset
): Float {
    val dx = first.x - second.x
    val dy = first.y - second.y
    return sqrt(dx * dx + dy * dy)
}

private fun handleDetailSwipe(
    horizontalDragPx: Float,
    verticalDragPx: Float,
    thresholdPx: Float,
    index: Int,
    lastIndex: Int,
    onIndexChange: (Int) -> Unit,
    onDismiss: () -> Unit
) {
    if (abs(horizontalDragPx) < thresholdPx || abs(horizontalDragPx) < abs(verticalDragPx) * 1.35f) {
        return
    }

    if (horizontalDragPx < 0f) {
        if (index == 0) {
            onDismiss()
        } else {
            onIndexChange(index - 1)
        }
        return
    }

    if (index == lastIndex) {
        onDismiss()
    } else {
        onIndexChange(index + 1)
    }
}
