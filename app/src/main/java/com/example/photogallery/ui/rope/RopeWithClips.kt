package com.example.photogallery.ui.rope

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.dp
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
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

@Composable
fun RopeWithClips(modifier: Modifier = Modifier, config: RopeWithClipsConfig = RopeWithClipsConfig()) {
    val density = LocalDensity.current
    val configuration = LocalConfiguration.current
    val verticalOffsetPx = with(density) { config.verticalOffsetDp.dp.toPx() }
    val isLandscape = configuration.screenWidthDp > configuration.screenHeightDp
    val visibleClipSlots = if (config.responsiveClipCount) {
        if (isLandscape) config.landscapeClipCount else config.portraitClipCount
    } else {
        config.clipCount
    }.coerceAtLeast(1)
    val totalClipCount = config.clipCount.coerceAtLeast(1)
    val cacheEachSide = config.cacheEachSide.coerceAtLeast(0)
    val renderSlotCount = visibleClipSlots + cacheEachSide * 2
    val halfVisible = (visibleClipSlots - 1) / 2f
    val minCenterIndex = halfVisible.coerceAtMost((totalClipCount - 1).toFloat())
    val maxCenterIndex = ((totalClipCount - 1).toFloat() - halfVisible).coerceAtLeast(minCenterIndex)

    var centerIndexFloat by remember(totalClipCount, visibleClipSlots, config.seed) {
        mutableFloatStateOf(((totalClipCount - 1) / 2f).coerceIn(minCenterIndex, maxCenterIndex))
    }
    var dragSlotSpacingPx by remember { mutableFloatStateOf(120f) }
    if (centerIndexFloat < minCenterIndex || centerIndexFloat > maxCenterIndex) {
        centerIndexFloat = centerIndexFloat.coerceIn(minCenterIndex, maxCenterIndex)
    }

    val infiniteTransition = rememberInfiniteTransition(label = "pendulum")

    val windPhase by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = (PI.toFloat() * 2f),
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 7200, easing = LinearEasing)
        ),
        label = "wind_phase"
    )

    val random = remember(config.seed) { java.util.Random(config.seed) }

    Canvas(
        modifier = modifier.fillMaxSize().pointerInput(totalClipCount, minCenterIndex, maxCenterIndex) {
            detectDragGestures(onDragStart = {}, onDragEnd = {}, onDragCancel = {}) { _, amount ->
                val deltaIndex = amount.x / dragSlotSpacingPx
                centerIndexFloat = (centerIndexFloat - deltaIndex).coerceIn(minCenterIndex, maxCenterIndex)
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

        val widthDrivenPhoto = (w * if (isLandscape) 0.95f else 0.9f) /
            (visibleClipSlots * if (isLandscape) 1.15f else 1.05f)
        val widthScale = widthDrivenPhoto.coerceIn(95f, 170f) / config.photoStyle.photoWidth
        val heightScale = (h / if (isLandscape) 560f else 720f).coerceIn(0.55f, 2.2f)
        val scale = min(widthScale, heightScale)

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

        val sagFloor = h * if (isLandscape) 0.055f else 0.07f
        val ropeSag = max(ropeSt.sagAmount, sagFloor)
        val ropeStWithSag = ropeSt.copy(sagAmount = ropeSag)

        val waveOffset = if (config.enableAnimation) sin(windPhase * 0.6f).toFloat() * 2f else 0f
        val ropeStart = Offset(-offscreenExtend, safeY + waveOffset)
        val ropeEnd = Offset(w + offscreenExtend, safeY - waveOffset)

        random.setSeed(config.seed)
        val sampledPoints = RopeGenerator.generateSampledPoints(ropeStart, ropeEnd, ropeStWithSag, random)

        RopeRenderer.drawClothesline(this, sampledPoints, ropeStWithSag, config.ropeColor)

        val desiredStart = floor(centerIndexFloat - visibleClipSlots / 2f - cacheEachSide).toInt()
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

            val slotX = viewportCenterX + (idx - centerIndexFloat) * slotSpacing
            val hp = createHangPointAtX(sampledPoints, slotX, idx)

            // Hard-constraint: clip top is locked to rope tangent, photo top is locked to clip mouth.
            val clipRotation = hp.tangentAngle + pendulumAngle * 1.5f
            val photoRotation = clipRotation // Fix: Remove independent swing so photo stays firmly attached to clip
            val anchor = computePhotoAnchor(hp.ropePosition, clipRotation, clipSt)
            PhotoRenderer.drawPolaroid(
                this,
                anchor,
                PhotoConfig(
                    index = idx,
                    style = photoSt,
                    seed = config.seed + idx * 777L,
                    additionalRotation = photoRotation
                )
            )
            val clipRandom = java.util.Random(config.seed + idx * 500L)
            ClipRenderer.drawClothespin(this, hp, clipSt, clipRandom, clipRotation)
        }
    }
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
    for (i in 0 until sampledPoints.size - 1) {
        val p0 = sampledPoints[i]
        val p1 = sampledPoints[i + 1]
        if ((x >= p0.x && x <= p1.x) || (x <= p0.x && x >= p1.x)) {
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
    val tangentAngle = Math.toDegrees(
        kotlin.math.atan2((p1.y - p0.y).toDouble(), (p1.x - p0.x).toDouble())
    ).toFloat()
    
    return HangPoint(index, position, tangentAngle, tangentAngle - 90f)
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
