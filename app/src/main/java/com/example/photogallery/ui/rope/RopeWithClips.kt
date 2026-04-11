package com.example.photogallery.ui.rope

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import com.example.photogallery.ui.photo.PhotoData
import com.example.photogallery.ui.photo.PhotoState
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.floor
import kotlin.math.ln
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sqrt
import kotlin.math.sin

data class RopeWithClipsConfig(
    val clipCount: Int = 5,
    val ropeStyle: RopeStyle = RopeStyle(),
    val clipStyle: ClipStyle = ClipStyle(),
    val photoStyle: PhotoStyle = PhotoStyle(),
    val ropeColor: Color = Color(0xFF8B9177),
    val verticalOffsetDp: Int = 100,
    val seed: Long = 42L,
    val enableAnimation: Boolean = true,
    val responsiveClipCount: Boolean = true,
    val portraitClipCount: Int = 3,
    val landscapeClipCount: Int = 5,
    val cacheEachSide: Int = 1
)

data class PendulumConfig(
    val amplitude: Float,
    val primaryFreq: Float,
    val secondaryFreq: Float,
    val phase: Float
)

data class PhotoViewportRequest(
    val visibleRange: IntRange,
    val preloadRange: IntRange,
    val targetWidthPx: Int,
    val targetHeightPx: Int,
    val centerIndex: Int
)

private data class PhotoHitBounds(
    val index: Int,
    val corners: List<Offset>
)

private class PhotoHitBoundsStore {
    var bounds: List<PhotoHitBounds> = emptyList()
}

@Composable
fun RopeWithClips(
    modifier: Modifier = Modifier,
    config: RopeWithClipsConfig = RopeWithClipsConfig(),
    photos: List<PhotoData> = emptyList(),
    photoStates: Map<String, PhotoState> = emptyMap(),
    scrollToIndex: Int? = null,
    onViewportChanged: (PhotoViewportRequest) -> Unit = {},
    onPhotoDoubleTap: (Int) -> Unit = {},
    onScrollToIndexConsumed: () -> Unit = {}
) {
    val density = LocalDensity.current
    val configuration = LocalConfiguration.current
    val verticalOffsetPx = with(density) { config.verticalOffsetDp.dp.toPx() }
    val isLandscape = configuration.screenWidthDp > configuration.screenHeightDp
    val visibleClipSlots = if (config.responsiveClipCount) {
        if (isLandscape) config.landscapeClipCount else config.portraitClipCount
    } else {
        config.clipCount
    }.coerceAtLeast(1)
    val totalClipCount = (photos.takeIf { it.isNotEmpty() }?.size ?: config.clipCount).coerceAtLeast(1)
    val cacheEachSide = config.cacheEachSide.coerceAtLeast(0)
    val renderSlotCount = visibleClipSlots + cacheEachSide * 2
    val halfVisible = (visibleClipSlots - 1) / 2f
    val minCenterIndex = halfVisible.coerceAtMost((totalClipCount - 1).toFloat())
    val maxCenterIndex = ((totalClipCount - 1).toFloat() - halfVisible).coerceAtLeast(minCenterIndex)
    val edgeOverscroll = 0.45f
    val minDragCenterIndex = minCenterIndex - edgeOverscroll
    val maxDragCenterIndex = maxCenterIndex + edgeOverscroll

    var targetCenterIndex by remember(totalClipCount, visibleClipSlots, config.seed) {
        mutableFloatStateOf(((totalClipCount - 1) / 2f).coerceIn(minCenterIndex, maxCenterIndex))
    }
    var dragSlotSpacingPx by remember { mutableFloatStateOf(120f) }
    if (targetCenterIndex < minDragCenterIndex || targetCenterIndex > maxDragCenterIndex) {
        targetCenterIndex = targetCenterIndex.coerceIn(minDragCenterIndex, maxDragCenterIndex)
    }

    LaunchedEffect(scrollToIndex, totalClipCount, visibleClipSlots) {
        scrollToIndex?.let { requestedIndex ->
            targetCenterIndex = requestedIndex
                .toFloat()
                .coerceIn(minCenterIndex, maxCenterIndex)
            onScrollToIndexConsumed()
        }
    }

    var windPhase by remember { mutableFloatStateOf(0f) }
    val minContentScale = 1f
    val maxContentScale = 4f / 3f
    val minContentScaleOvershoot = 0.80f
    val maxContentScaleOvershoot = 1.70f
    var settledContentScale by remember { mutableFloatStateOf(1f) }
    var displayContentScale by remember { mutableFloatStateOf(1f) }
    val coroutineScope = rememberCoroutineScope()
    var flingJob: Job? by remember { mutableStateOf(null) }
    var scaleReboundJob: Job? by remember { mutableStateOf(null) }
    var dragVelocityIndexPerSecond by remember { mutableFloatStateOf(0f) }
    var lastDragTimeMillis by remember { mutableLongStateOf(0L) }
    var isDragging by remember { mutableStateOf(false) }
    LaunchedEffect(config.enableAnimation) {
        if (!config.enableAnimation) {
            windPhase = 0f
            return@LaunchedEffect
        }

        val startNanos = withFrameNanos { it }
        while (true) {
            withFrameNanos { now ->
                val seconds = (now - startNanos) / 1_000_000_000f
                windPhase = seconds * (2f * PI.toFloat() / 7.2f)
            }
        }
    }

    val centerIndexFloat by animateFloatAsState(
        targetValue = targetCenterIndex,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioNoBouncy,
            stiffness = Spring.StiffnessMediumLow
        ),
        label = "center_index"
    )

    val random = remember { java.util.Random() } // Fix: Remove seed dependency so it doesn't reset on every recomposition
    val photoHitBoundsStore = remember { PhotoHitBoundsStore() }
    var canvasSize by remember { mutableStateOf(IntSize.Zero) }
    val viewportWidth = canvasSize.width.toFloat()
    val viewportHeight = canvasSize.height.toFloat()
    val viewportPhotoScale = computePhotoScale(
        width = viewportWidth,
        height = viewportHeight,
        visibleClipSlots = visibleClipSlots,
        isLandscape = isLandscape,
        basePhotoWidth = config.photoStyle.photoWidth
    )
    val viewportRenderCenterIndex = if (isDragging) targetCenterIndex else centerIndexFloat
    val viewportRequest = if (photos.isNotEmpty() && viewportWidth > 0f && viewportHeight > 0f) {
        val desiredStart = floor(viewportRenderCenterIndex - visibleClipSlots / 2f - cacheEachSide).toInt()
        val maxWindowStart = max(0, totalClipCount - renderSlotCount)
        val windowStart = desiredStart.coerceIn(0, maxWindowStart)
        val windowEndExclusive = min(totalClipCount, windowStart + renderSlotCount)
        val visibleStart = floor(viewportRenderCenterIndex - visibleClipSlots / 2f).toInt().coerceIn(0, totalClipCount - 1)
        val visibleEnd = (visibleStart + visibleClipSlots - 1).coerceIn(0, totalClipCount - 1)
        val targetWidth = ((config.photoStyle.photoWidth * viewportPhotoScale - config.photoStyle.borderSize * viewportPhotoScale * 2f) * 1.25f)
            .toInt()
            .coerceAtLeast(1)
        val targetHeight = ((config.photoStyle.photoHeight * viewportPhotoScale - config.photoStyle.borderSize * viewportPhotoScale * 2.5f) * 1.25f)
            .toInt()
            .coerceAtLeast(1)
        PhotoViewportRequest(
            visibleRange = visibleStart..visibleEnd,
            preloadRange = windowStart..(windowEndExclusive - 1),
            targetWidthPx = targetWidth,
            targetHeightPx = targetHeight,
            centerIndex = viewportRenderCenterIndex.roundToInt().coerceIn(0, totalClipCount - 1)
        )
    } else {
        null
    }

    LaunchedEffect(viewportRequest) {
        viewportRequest?.let(onViewportChanged)
    }

    Canvas(
        modifier = modifier
            .fillMaxSize()
            .onSizeChanged { canvasSize = it }
            .pointerInput(
                photos.size,
                photoHitBoundsStore
            ) {
                detectTapGestures(
                    onDoubleTap = { tapPosition ->
                        if (photos.isEmpty()) return@detectTapGestures
                        findPhotoIndexAtTap(tapPosition, photoHitBoundsStore.bounds)?.let(onPhotoDoubleTap)
                    }
                )
            }
            .pointerInput(Unit) {
                awaitEachGesture {
                    var previousDistance = 0f
                    var lastScaleTimeMillis = 0L
                    var scaleVelocityLogPerSecond = 0f
                    var hasPinched = false
                    scaleReboundJob?.cancel()
                    while (true) {
                        val event = awaitPointerEvent()
                        val pressed = event.changes.filter { it.pressed }
                        if (pressed.size < 2) {
                            previousDistance = 0f
                            lastScaleTimeMillis = 0L
                            if (hasPinched || pressed.isEmpty()) break
                            continue
                        }

                        hasPinched = true
                        val currentDistance = distanceBetween(pressed[0].position, pressed[1].position)
                        val now = pressed.first().uptimeMillis
                        if (previousDistance > 0f && currentDistance > 0f) {
                            val zoom = currentDistance / previousDistance
                            if (abs(zoom - 1f) > 0.001f) {
                                flingJob?.cancel()
                                val previousDisplayScale = displayContentScale
                                val rawGestureScale = previousDisplayScale * zoom
                                val nextDisplayScale = applyRubberBandScale(
                                    rawScale = rawGestureScale,
                                    minScale = minContentScale,
                                    maxScale = maxContentScale,
                                    minOvershootScale = minContentScaleOvershoot,
                                    maxOvershootScale = maxContentScaleOvershoot
                                )
                                displayContentScale = nextDisplayScale
                                settledContentScale = nextDisplayScale.coerceIn(minContentScale, maxContentScale)
                                if (lastScaleTimeMillis > 0L) {
                                    val dtSeconds = ((now - lastScaleTimeMillis).coerceAtLeast(1L)) / 1000f
                                    scaleVelocityLogPerSecond = (ln(rawGestureScale / previousDisplayScale) / dtSeconds)
                                        .coerceIn(-4.5f, 4.5f)
                                }
                            }
                        }
                        lastScaleTimeMillis = now
                        previousDistance = currentDistance
                        pressed.forEach { it.consume() }
                    }
                    if (!hasPinched) return@awaitEachGesture
                    if (abs(scaleVelocityLogPerSecond) > 0.025f) {
                        scaleReboundJob?.cancel()
                        scaleReboundJob = coroutineScope.launch {
                            runScaleInertia(
                                start = displayContentScale,
                                velocityLogPerSecond = scaleVelocityLogPerSecond,
                                minScale = minContentScale,
                                maxScale = maxContentScale,
                                minOvershootScale = minContentScaleOvershoot,
                                maxOvershootScale = maxContentScaleOvershoot
                            ) { nextDisplayScale ->
                                displayContentScale = nextDisplayScale
                                settledContentScale = nextDisplayScale.coerceIn(minContentScale, maxContentScale)
                            }
                        }
                    } else if (settledContentScale != displayContentScale) {
                        scaleReboundJob?.cancel()
                        scaleReboundJob = coroutineScope.launch {
                            val targetScale = settledContentScale
                            runScaleRebound(start = displayContentScale, target = targetScale) { nextDisplayScale ->
                                displayContentScale = nextDisplayScale
                                settledContentScale = targetScale
                            }
                        }
                    }
                }
            }
            .pointerInput(totalClipCount, minCenterIndex, maxCenterIndex, settledContentScale) {
                detectDragGestures(
                    onDragStart = {
                        flingJob?.cancel()
                        dragVelocityIndexPerSecond = 0f
                        lastDragTimeMillis = 0L
                        isDragging = true
                    },
                    onDragEnd = {
                        isDragging = false
                        val startVelocity = dragVelocityIndexPerSecond
                        if (abs(startVelocity) > 0.15f) {
                            flingJob?.cancel()
                            flingJob = coroutineScope.launch {
                                runCenterIndexFling(
                                    start = targetCenterIndex,
                                    velocityIndexPerSecond = startVelocity,
                                    minCenterIndex = minCenterIndex,
                                    maxCenterIndex = maxCenterIndex,
                                    overscroll = edgeOverscroll
                                ) { targetCenterIndex = it }
                            }
                        } else if (targetCenterIndex < minCenterIndex || targetCenterIndex > maxCenterIndex) {
                            flingJob?.cancel()
                            flingJob = coroutineScope.launch {
                                runCenterIndexFling(
                                    start = targetCenterIndex,
                                    velocityIndexPerSecond = 0f,
                                    minCenterIndex = minCenterIndex,
                                    maxCenterIndex = maxCenterIndex,
                                    overscroll = edgeOverscroll
                                ) { targetCenterIndex = it }
                            }
                        }
                    },
                    onDragCancel = {
                        isDragging = false
                        flingJob?.cancel()
                        flingJob = coroutineScope.launch {
                            runCenterIndexFling(
                                start = targetCenterIndex,
                                velocityIndexPerSecond = 0f,
                                minCenterIndex = minCenterIndex,
                                maxCenterIndex = maxCenterIndex,
                                overscroll = edgeOverscroll
                            ) { targetCenterIndex = it }
                        }
                    }
                ) { change, amount ->
                    val now = change.uptimeMillis
                    val effectiveSlotSpacing = dragSlotSpacingPx * settledContentScale
                    val dragResistance = computeGalleryDragResistance(
                        centerIndex = targetCenterIndex,
                        minCenterIndex = minCenterIndex,
                        maxCenterIndex = maxCenterIndex,
                        contentScale = settledContentScale
                    )
                    val deltaIndex = amount.x / effectiveSlotSpacing * dragResistance
                    val nextCenter = (targetCenterIndex - deltaIndex).coerceIn(minDragCenterIndex, maxDragCenterIndex)
                    if (lastDragTimeMillis > 0L) {
                        val dtSeconds = ((now - lastDragTimeMillis).coerceAtLeast(1L)) / 1000f
                        dragVelocityIndexPerSecond = (((nextCenter - targetCenterIndex) / dtSeconds) * dragResistance).coerceIn(-8f, 8f)
                    }
                    lastDragTimeMillis = now
                    targetCenterIndex = nextCenter
                }
            }
    ) {
        val w = size.width
        val h = size.height
        val safeY = if (isLandscape) {
            h * 0.24f
        } else {
            min(verticalOffsetPx, h * 0.42f)
        }

        val scale = computePhotoScale(w, h, visibleClipSlots, isLandscape, config.photoStyle.photoWidth)

        val ropeSt = config.ropeStyle.copy(
            sagAmount = config.ropeStyle.sagAmount * scale,
            jitterAmount = config.ropeStyle.jitterAmount * scale,
            baseStrokeWidth = config.ropeStyle.baseStrokeWidth * scale,
            twistCount = config.ropeStyle.twistCount,
            shadowOffset = config.ropeStyle.shadowOffset * scale,
            handDrawnJitter = config.ropeStyle.handDrawnJitter * scale
        )
        
        val clipSt = config.clipStyle.scaleBy(scale)
        
        val photoSt = PhotoStyle(
            photoWidth = config.photoStyle.photoWidth * scale,
            photoHeight = config.photoStyle.photoHeight * scale,
            borderSize = config.photoStyle.borderSize * scale,
            cornerRadius = config.photoStyle.cornerRadius * scale,
            rotationRange = config.photoStyle.rotationRange,
            shadowOffsetX = config.photoStyle.shadowOffsetX * scale,
            shadowOffsetY = config.photoStyle.shadowOffsetY * scale,
            curlAmount = config.photoStyle.curlAmount * scale,
            edgeIrregularity = config.photoStyle.edgeIrregularity * scale,
            borderColor = config.photoStyle.borderColor,
            photoAreaColor = config.photoStyle.photoAreaColor,
            photoGradientTop = config.photoStyle.photoGradientTop,
            photoGradientBot = config.photoStyle.photoGradientBot,
            curlChance = config.photoStyle.curlChance,
            shadowAlpha = config.photoStyle.shadowAlpha,
            shadowBlur = config.photoStyle.shadowBlur,
            highlightAlpha = config.photoStyle.highlightAlpha,
            handDrawnJitter = config.photoStyle.handDrawnJitter * scale
        )

        val slotSpacing = photoSt.photoWidth * if (isLandscape) 1.15f else 1.05f
        dragSlotSpacingPx = slotSpacing
        val offscreenExtend = max(w * 0.2f, slotSpacing * cacheEachSide * 1.2f)

        val sagFloor = h * if (isLandscape) 0.13f else 0.17f
        val ropeSag = max(ropeSt.sagAmount, sagFloor)
        val ropeStWithSag = ropeSt.copy(sagAmount = ropeSag)

        val waveOffset = if (config.enableAnimation) sin(windPhase * 0.6f).toFloat() * 2f else 0f
        val ropeStart = Offset(-offscreenExtend, safeY + waveOffset)
        val ropeEnd = Offset(w + offscreenExtend, safeY - waveOffset)

        withTransform({
            scale(displayContentScale, displayContentScale, pivot = Offset(w * 0.5f, safeY))
        }) {
            val framePhotoBounds = mutableListOf<PhotoHitBounds>()
            // Fix: Use a consistent seed per render pass so jitter doesn't dance, but don't tie it to config.seed directly
            val renderSeed = config.seed
            random.setSeed(renderSeed)
            val basePoints = RopeGenerator.generateGravitySagPoints(ropeStart, ropeEnd, ropeStWithSag, ropeStWithSag.sampleCount)
            val sampledPoints = RopeGenerator.applyJitter(basePoints, ropeStWithSag.jitterAmount, random)

            RopeRenderer.drawClothesline(this, sampledPoints, ropeStWithSag, config.ropeColor)

            val renderCenterIndex = if (isDragging) targetCenterIndex else centerIndexFloat
            val desiredStart = floor(renderCenterIndex - visibleClipSlots / 2f - cacheEachSide).toInt()
            val maxWindowStart = max(0, totalClipCount - renderSlotCount)
            val windowStart = desiredStart.coerceIn(0, maxWindowStart)
            val windowEndExclusive = min(totalClipCount, windowStart + renderSlotCount)
            val viewportCenterX = w * 0.5f

            for (idx in windowStart until windowEndExclusive) {
                val pendulumAngle = if (config.enableAnimation) {
                    val pc = createPendulumConfig(config.seed, idx)
                    sin(windPhase * pc.primaryFreq + pc.phase) * pc.amplitude +
                        sin(windPhase * pc.secondaryFreq + pc.phase * 1.4f) * (pc.amplitude * 0.35f)
                } else {
                    0f
                }

                val slotX = viewportCenterX + (idx - renderCenterIndex) * slotSpacing
                val hp = createHangPointAtX(basePoints, slotX, idx)

                // Hard-constraint: clip top is locked to rope tangent, photo top is locked to clip mouth.
                val clipRotation = hp.tangentAngle + pendulumAngle * 1.5f
                val photoRotation = clipRotation // Fix: Remove independent swing so photo stays firmly attached to clip
                val anchor = computePhotoAnchor(hp.ropePosition, clipRotation, clipSt)
                framePhotoBounds += createPhotoHitBounds(
                    index = idx,
                    anchor = anchor,
                    rotationDegrees = photoRotation,
                    photoStyle = photoSt,
                    contentScale = displayContentScale,
                    contentScalePivot = Offset(w * 0.5f, safeY)
                )
                PhotoRenderer.drawPolaroid(
                    this,
                    anchor,
                    PhotoConfig(
                        index = idx,
                        style = photoSt,
                        seed = config.seed + idx * 777L,
                        additionalRotation = photoRotation,
                        realPhoto = (photos.getOrNull(idx)?.let { photo ->
                            photoStates[photo.cacheKey] as? PhotoState.Loaded
                        })?.bitmap
                    )
                )
                val clipRandom = java.util.Random(config.seed + idx * 500L)
                ClipRenderer.drawClothespin(this, hp, clipSt, clipRandom, clipRotation)
            }
            photoHitBoundsStore.bounds = framePhotoBounds
        }
    }
}

private suspend fun runCenterIndexFling(
    start: Float,
    velocityIndexPerSecond: Float,
    minCenterIndex: Float,
    maxCenterIndex: Float,
    overscroll: Float,
    onUpdate: (Float) -> Unit
) {
    var position = start
    var velocity = velocityIndexPerSecond.coerceIn(-8f, 8f)
    val minOver = minCenterIndex - overscroll
    val maxOver = maxCenterIndex + overscroll
    var lastFrameNanos = withFrameNanos { it }

    while (abs(velocity) > 0.02f || position < minCenterIndex || position > maxCenterIndex) {
        val now = withFrameNanos { it }
        val dt = ((now - lastFrameNanos) / 1_000_000_000f).coerceIn(0.001f, 0.032f)
        lastFrameNanos = now

        position = (position + velocity * dt).coerceIn(minOver, maxOver)
        val beyond = when {
            position < minCenterIndex -> position - minCenterIndex
            position > maxCenterIndex -> position - maxCenterIndex
            else -> 0f
        }
        if (beyond != 0f) {
            velocity += -beyond * 36f * dt
            if ((position <= minOver && velocity < 0f) || (position >= maxOver && velocity > 0f)) {
                velocity *= -0.35f
            }
        }

        velocity *= exp(-4.2f * dt)
        onUpdate(position)
    }

    onUpdate(position.coerceIn(minCenterIndex, maxCenterIndex))
}

private suspend fun runScaleRebound(
    start: Float,
    target: Float,
    onUpdate: (Float) -> Unit
) {
    var scale = start
    var lastFrameNanos = withFrameNanos { it }

    while (abs(scale - target) > 0.001f) {
        val now = withFrameNanos { it }
        val dt = ((now - lastFrameNanos) / 1_000_000_000f).coerceIn(0.001f, 0.032f)
        lastFrameNanos = now

        val approach = 1f - exp(-18f * dt)
        val nextScale = scale + (target - scale) * approach
        scale = if ((target - scale) * (target - nextScale) <= 0f) target else nextScale
        onUpdate(scale)
    }

    onUpdate(target)
}

private suspend fun runScaleInertia(
    start: Float,
    velocityLogPerSecond: Float,
    minScale: Float,
    maxScale: Float,
    minOvershootScale: Float,
    maxOvershootScale: Float,
    onUpdate: (Float) -> Unit
) {
    var scale = start
    var velocity = velocityLogPerSecond.coerceIn(-4.5f, 4.5f)
    var lastFrameNanos = withFrameNanos { it }

    while (abs(velocity) > 0.008f) {
        val now = withFrameNanos { it }
        val dt = ((now - lastFrameNanos) / 1_000_000_000f).coerceIn(0.001f, 0.032f)
        lastFrameNanos = now

        val rawTarget = scale * exp(velocity * dt)
        scale = applyRubberBandScale(
            rawScale = rawTarget,
            minScale = minScale,
            maxScale = maxScale,
            minOvershootScale = minOvershootScale,
            maxOvershootScale = maxOvershootScale
        )
        val beyond = when {
            scale < minScale -> scale - minScale
            scale > maxScale -> scale - maxScale
            else -> 0f
        }
        if (beyond != 0f) {
            if (beyond * velocity > 0f) {
                velocity *= exp(-9f * dt)
            } else {
                velocity += -beyond * 48f * dt
            }
            velocity *= exp(-4.2f * dt)
            if (abs(velocity) < 0.08f) break
        } else {
            velocity *= exp(-1.8f * dt)
        }
        onUpdate(scale)
    }

    val settledScale = scale.coerceIn(minScale, maxScale)
    if (settledScale != scale) {
        runScaleRebound(start = scale, target = settledScale, onUpdate = onUpdate)
    } else {
        onUpdate(settledScale)
    }
}

private fun distanceBetween(a: Offset, b: Offset): Float {
    val dx = a.x - b.x
    val dy = a.y - b.y
    return sqrt(dx * dx + dy * dy)
}

private fun applyRubberBandScale(
    rawScale: Float,
    minScale: Float,
    maxScale: Float,
    minOvershootScale: Float,
    maxOvershootScale: Float
): Float {
    return when {
        rawScale < minScale -> {
            val overshoot = minScale - rawScale
            (minScale - overshoot / (1f + overshoot * 4.2f)).coerceAtLeast(minOvershootScale)
        }
        rawScale > maxScale -> {
            val overshoot = rawScale - maxScale
            (maxScale + overshoot / (1f + overshoot * 4.2f)).coerceAtMost(maxOvershootScale)
        }
        else -> rawScale
    }
}

private fun computeGalleryDragResistance(
    centerIndex: Float,
    minCenterIndex: Float,
    maxCenterIndex: Float,
    contentScale: Float
): Float {
    val beyondEdge = when {
        centerIndex < minCenterIndex -> minCenterIndex - centerIndex
        centerIndex > maxCenterIndex -> centerIndex - maxCenterIndex
        else -> 0f
    }
    val edgeResistance = 1f / (1f + beyondEdge * 2.4f)
    val zoomResistance = 1f / (1f + (contentScale - 1f).coerceAtLeast(0f) * 1.8f)
    return (edgeResistance * zoomResistance).coerceIn(0.32f, 1f)
}

private fun computePhotoScale(
    width: Float,
    height: Float,
    visibleClipSlots: Int,
    isLandscape: Boolean,
    basePhotoWidth: Float
): Float {
    if (width <= 0f || height <= 0f) return 1f
    val widthDrivenPhoto = (width * if (isLandscape) 0.95f else 0.9f) /
        (visibleClipSlots * if (isLandscape) 1.15f else 1.05f)
    val widthScale = widthDrivenPhoto.coerceIn(95f, 170f) / basePhotoWidth
    val heightScale = (height / if (isLandscape) 560f else 720f).coerceIn(0.55f, 2.2f)
    return min(widthScale, heightScale)
}

private fun createPhotoHitBounds(
    index: Int,
    anchor: Offset,
    rotationDegrees: Float,
    photoStyle: PhotoStyle,
    contentScale: Float,
    contentScalePivot: Offset
): PhotoHitBounds {
    val halfWidth = photoStyle.photoWidth / 2f
    val photoHeight = photoStyle.photoHeight
    val unscaledCorners = listOf(
        Offset(-halfWidth, 0f),
        Offset(halfWidth, 0f),
        Offset(halfWidth, photoHeight),
        Offset(-halfWidth, photoHeight)
    ).map { localPoint ->
        rotatePoint(localPoint, rotationDegrees) + anchor
    }

    return PhotoHitBounds(
        index = index,
        corners = unscaledCorners.map { point ->
            contentScalePivot + (point - contentScalePivot) * contentScale
        }
    )
}

private fun findPhotoIndexAtTap(
    tapPosition: Offset,
    bounds: List<PhotoHitBounds>
): Int? {
    return bounds
        .asReversed()
        .firstOrNull { tapPosition.isInsideConvexPolygon(it.corners) }
        ?.index
}

private fun rotatePoint(point: Offset, degrees: Float): Offset {
    val radians = Math.toRadians(degrees.toDouble())
    val cosValue = cos(radians).toFloat()
    val sinValue = sin(radians).toFloat()
    return Offset(
        x = point.x * cosValue - point.y * sinValue,
        y = point.x * sinValue + point.y * cosValue
    )
}

private fun Offset.isInsideConvexPolygon(corners: List<Offset>): Boolean {
    if (corners.size < 3) return false
    var sign = 0f
    for (index in corners.indices) {
        val start = corners[index]
        val end = corners[(index + 1) % corners.size]
        val cross = (end.x - start.x) * (y - start.y) - (end.y - start.y) * (x - start.x)
        if (abs(cross) < 0.001f) continue
        if (sign == 0f) {
            sign = cross
        } else if (sign * cross < 0f) {
            return false
        }
    }
    return true
}

private fun createPendulumConfig(seed: Long, index: Int): PendulumConfig {
    val rng = java.util.Random(seed + index * 123L)
    return PendulumConfig(
        amplitude = 1.6f + rng.nextFloat() * 2.2f,
        primaryFreq = 0.85f + rng.nextFloat() * 0.5f,
        secondaryFreq = 1.7f + rng.nextFloat() * 0.6f,
        phase = rng.nextFloat() * (PI.toFloat() * 2f)
    )
}

private fun createHangPointAtX(sampledPoints: List<Offset>, x: Float, index: Int): HangPoint {
    if (sampledPoints.isEmpty()) {
        return HangPoint(index, Offset(x, 0f), 0f, -90f)
    }
    if (sampledPoints.size == 1) {
        return HangPoint(index, sampledPoints.first(), 0f, -90f)
    }

    var targetIndex = -1
    // Fix: Search from left to right and explicitly handle the monotonic X requirement.
    // If we find the interval that contains X, we break immediately.
    for (i in 0 until sampledPoints.size - 1) {
        val p0 = sampledPoints[i]
        val p1 = sampledPoints[i + 1]
        val minX = min(p0.x, p1.x)
        val maxX = max(p0.x, p1.x)
        if (x in minX..maxX) {
            targetIndex = i
            break
        }
    }

    if (targetIndex == -1) {
        targetIndex = if (x < sampledPoints.first().x) 0 else sampledPoints.size - 2
    }

    val p0 = sampledPoints[targetIndex]
    val p1 = sampledPoints[targetIndex + 1]
    
    val frac = if (p1.x != p0.x) {
        ((x - p0.x) / (p1.x - p0.x)).coerceIn(0f, 1f)
    } else {
        0.5f
    }

    val position = Offset(
        x = p0.x + (p1.x - p0.x) * frac,
        y = p0.y + (p1.y - p0.y) * frac
    )
    val tangentAngle = computeSmoothedTangent(sampledPoints, targetIndex)
    
    return HangPoint(index, position, tangentAngle, tangentAngle - 90f)
}

private fun computeSmoothedTangent(points: List<Offset>, index: Int): Float {
    val from = (index - 2).coerceAtLeast(0)
    val to = (index + 3).coerceAtMost(points.lastIndex)
    val p0 = points[from]
    val p1 = points[to]
    return Math.toDegrees(
        kotlin.math.atan2((p1.y - p0.y).toDouble(), (p1.x - p0.x).toDouble())
    ).toFloat()
}

private fun computePhotoAnchor(
    clipAnchor: Offset,
    clipRotation: Float,
    clipSt: ClipStyle
): Offset {
    val rad = Math.toRadians(clipRotation.toDouble())
    // Pin photo upper edge directly under the clothespin mouth.
    // Fix: Use actual sum of clip parts and scale the offset to prevent deviation
    val yBodyEnd = clipSt.headLength + clipSt.gripLength + clipSt.bodyLength
    val scaleRatio = clipSt.totalHeight / 70f
    val localY = yBodyEnd - 6f * scaleRatio
    return Offset(
        x = clipAnchor.x - sin(rad).toFloat() * localY,
        y = clipAnchor.y + cos(rad).toFloat() * localY
    )
}
