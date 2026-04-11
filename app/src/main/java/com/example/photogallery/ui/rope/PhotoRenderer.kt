package com.example.photogallery.ui.rope

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import kotlin.math.max
import kotlin.math.sin
import kotlin.math.cos

data class PhotoStyle(
    val photoWidth: Float = 140f,
    val photoHeight: Float = 160f,
    val borderSize: Float = 14f,
    val cornerRadius: Float = 3f,
    val rotationRange: Float = 5f,
    val shadowOffsetX: Float = 6f,
    val shadowOffsetY: Float = 8f,
    val shadowAlpha: Float = 0.12f,
    val shadowBlur: Float = 12f,
    val borderColor: Color = Color(0xFFF5F0E6),
    val photoAreaColor: Color = Color(0xFFD4E4D0),
    val photoGradientTop: Color = Color(0xFFE8F0E4),
    val photoGradientBot: Color = Color(0xFFB8D0B4),
    val curlChance: Float = 0.55f,
    val curlAmount: Float = 12f,
    val edgeIrregularity: Float = 2.5f,
    val wavyEdgeChance: Float = 0.4f,
    val highlightAlpha: Float = 0.15f,
    val handDrawnJitter: Float = 1.8f
)

data class PhotoConfig(
    val index: Int,
    val style: PhotoStyle,
    val seed: Long,
    val photoColors: List<Color> = listOf(
        Color(0xFFD4E4D0), Color(0xFFE8DCC8), Color(0xFFD0DCE8),
        Color(0xFFE8E0D0), Color(0xFFD8E4D0)
    ),
    val additionalRotation: Float = 0f,
    val realPhoto: ImageBitmap? = null
)

object PhotoRenderer {

    fun drawPolaroid(scope: DrawScope, anchor: Offset, config: PhotoConfig) {
        val rng = java.util.Random(config.seed)
        // Fix: Remove the random rotation applied per-photo to ensure the photo aligns perfectly with the clip
        val rotDeg = config.additionalRotation
        val hasCurlRight = rng.nextFloat() < config.style.curlChance
        val hasCurlLeft = !hasCurlRight && rng.nextFloat() < 0.35f
        val hasWavyEdges = rng.nextFloat() < config.style.wavyEdgeChance
        val photoTint = config.photoColors.getOrElse(config.index % config.photoColors.size) { config.style.photoAreaColor }

        scope.withTransform({
            translate(anchor.x, anchor.y)
            // Fix: Explicitly set pivot to Offset.Zero to rotate exactly around the anchor point
            rotate(rotDeg.toFloat(), pivot = Offset.Zero)
            // Keep photo top-center fixed at anchor.
            translate(0f, config.style.photoHeight / 2f)
        }) {
            drawPhotoBorder(config.style, hasWavyEdges, rng)
            drawPhotoArea(config.style, photoTint, rng, config.realPhoto)
            drawPhotoHighlight(config.style, rng)
            if (hasCurlRight) drawCurledCorner(config.style, isRight = true, rng)
            if (hasCurlLeft) drawCurledCorner(config.style, isRight = false, rng)
            drawPhotoEdgeDetails(config.style, rng)
        }
    }

    private fun DrawScope.drawHandDrawnShadow(st: PhotoStyle, rng: java.util.Random) {
        val jx = { (rng.nextFloat() - 0.5f) * st.edgeIrregularity }
        val jy = { (rng.nextFloat() - 0.5f) * st.edgeIrregularity }
        
        for (i in 0..2) {
            val blurOffset = i * st.shadowBlur * 0.4f
            val alpha = st.shadowAlpha * (1f - i * 0.3f)
            val path = createHandDrawnRoundedRect(
                Offset(
                    -st.photoWidth / 2f + st.shadowOffsetX + jx() + blurOffset * 0.5f,
                    -st.photoHeight / 2f + st.shadowOffsetY + jy() + blurOffset * 0.3f
                ),
                Size(st.photoWidth, st.photoHeight),
                st.cornerRadius + i * 2f,
                rng,
                st.handDrawnJitter * 0.5f
            )
            drawPath(path, color = Color.Black.copy(alpha = alpha))
        }
    }

    private fun DrawScope.drawPhotoBorder(st: PhotoStyle, wavyEdges: Boolean, rng: java.util.Random) {
        val hw = st.photoWidth / 2f
        val hh = st.photoHeight / 2f
        val cr = st.cornerRadius
        
        val path = if (wavyEdges) {
            createWavyRectPath(hw, hh, cr, rng, st.handDrawnJitter)
        } else {
            createHandDrawnRectPath(hw, hh, cr, rng, st.handDrawnJitter)
        }
        
        drawPath(
            path = path,
            brush = Brush.verticalGradient(
                colors = listOf(
                    st.borderColor,
                    st.borderColor.copy(alpha = 0.95f),
                    st.borderColor.copy(alpha = 0.9f)
                ),
                startY = -hh,
                endY = hh
            )
        )
    }

    private fun createHandDrawnRectPath(hw: Float, hh: Float, cr: Float, rng: java.util.Random, jitter: Float): Path {
        val path = Path()
        val segments = 16
        val j = { (rng.nextFloat() - 0.5f) * jitter }
        
        path.moveTo(-hw + cr + j(), -hh + j())
        
        for (i in 0 until segments) {
            val t = i.toFloat() / segments
            val x = -hw + cr + t * (hw * 2 - cr * 2)
            val y = -hh + j() + (rng.nextFloat() - 0.5f) * jitter * 1.2f
            path.lineTo(x + j() * 0.3f, y)
        }
        
        path.lineTo(hw - cr + j(), -hh + j())
        
        for (i in 0 until segments / 2) {
            val t = i.toFloat() / (segments / 2)
            val x = hw + j() + (rng.nextFloat() - 0.5f) * jitter * 1.2f
            val y = -hh + cr + t * (hh * 2 - cr * 2)
            path.lineTo(x, y + j() * 0.3f)
        }
        
        path.lineTo(hw + j(), hh - cr + j())
        
        for (i in 0 until segments) {
            val t = i.toFloat() / segments
            val x = hw - cr - t * (hw * 2 - cr * 2)
            val y = hh + j() + (rng.nextFloat() - 0.5f) * jitter * 1.2f
            path.lineTo(x + j() * 0.3f, y)
        }
        
        path.lineTo(-hw + cr + j(), hh + j())
        
        for (i in 0 until segments / 2) {
            val t = i.toFloat() / (segments / 2)
            val x = -hw + j() + (rng.nextFloat() - 0.5f) * jitter * 1.2f
            val y = hh - cr - t * (hh * 2 - cr * 2)
            path.lineTo(x, y + j() * 0.3f)
        }
        
        path.lineTo(-hw + j(), -hh + cr + j())
        path.close()
        
        return path
    }

    private fun createWavyRectPath(hw: Float, hh: Float, cr: Float, rng: java.util.Random, jitter: Float): Path {
        val path = Path()
        val waveAmplitude = 2.5f + rng.nextFloat() * 1.5f
        val waveFrequency = 12
        val j = { (rng.nextFloat() - 0.5f) * jitter }
        
        path.moveTo(-hw + cr + j(), -hh + j())
        
        for (i in 0 until waveFrequency) {
            val t = i.toFloat() / waveFrequency
            val x = -hw + cr + t * (hw * 2 - cr * 2)
            val wave = sin(t * Math.PI * 2.5 + rng.nextFloat() * 0.8).toFloat() * waveAmplitude
            val y = -hh + wave + j()
            path.lineTo(x + j() * 0.2f, y)
        }
        
        path.lineTo(hw - cr + j(), -hh + j())
        path.lineTo(hw + j(), -hh + cr + j())
        
        for (i in 0 until waveFrequency) {
            val t = i.toFloat() / waveFrequency
            val wave = sin(t * Math.PI * 2.5 + rng.nextFloat() * 0.8).toFloat() * waveAmplitude
            val x = hw + wave + j()
            val y = -hh + cr + t * (hh * 2 - cr * 2)
            path.lineTo(x, y + j() * 0.2f)
        }
        
        path.lineTo(hw + j(), hh - cr + j())
        path.lineTo(hw - cr + j(), hh + j())
        
        for (i in 0 until waveFrequency) {
            val t = i.toFloat() / waveFrequency
            val x = hw - cr - t * (hw * 2 - cr * 2)
            val wave = sin(t * Math.PI * 2.5 + rng.nextFloat() * 0.8).toFloat() * waveAmplitude
            val y = hh + wave + j()
            path.lineTo(x + j() * 0.2f, y)
        }
        
        path.lineTo(-hw + cr + j(), hh + j())
        path.lineTo(-hw + j(), hh - cr + j())
        
        for (i in 0 until waveFrequency) {
            val t = i.toFloat() / waveFrequency
            val wave = sin(t * Math.PI * 2.5 + rng.nextFloat() * 0.8).toFloat() * waveAmplitude
            val x = -hw + wave + j()
            val y = hh - cr - t * (hh * 2 - cr * 2)
            path.lineTo(x, y + j() * 0.2f)
        }
        
        path.lineTo(-hw + j(), -hh + cr + j())
        path.close()
        
        return path
    }

    private fun createHandDrawnRoundedRect(offset: Offset, size: Size, radius: Float, rng: java.util.Random, jitter: Float): Path {
        val path = Path()
        val j = { (rng.nextFloat() - 0.5f) * jitter }
        val l = offset.x; val t = offset.y
        val r = offset.x + size.width; val b = offset.y + size.height
        
        path.moveTo(l + radius + j(), t + j())
        path.lineTo(r - radius + j(), t + j())
        path.lineTo(r + j(), t + radius + j())
        path.lineTo(r + j(), b - radius + j())
        path.lineTo(r - radius + j(), b + j())
        path.lineTo(l + radius + j(), b + j())
        path.lineTo(l + j(), b - radius + j())
        path.lineTo(l + j(), t + radius + j())
        path.close()
        
        return path
    }

    private fun DrawScope.drawPhotoArea(st: PhotoStyle, tint: Color, rng: java.util.Random, realPhoto: ImageBitmap?) {
        val innerW = st.photoWidth - st.borderSize * 2f
        val innerH = st.photoHeight - st.borderSize * 2f - st.borderSize * 0.5f
        val topY = -st.photoHeight / 2f + st.borderSize
        val j = { (rng.nextFloat() - 0.5f) * st.handDrawnJitter * 0.5f }
        val path = createPhotoAreaPath(st, innerW, innerH, topY, j)

        if (realPhoto != null) {
            clipPath(path) {
                drawCenterCropPhoto(realPhoto, innerW, innerH, topY)
            }
            return
        }
        
        drawPath(
            path = path,
            brush = Brush.verticalGradient(
                colors = listOf(
                    st.photoGradientTop.copy(alpha = 0.85f),
                    tint.copy(alpha = 0.8f),
                    st.photoGradientBot.copy(alpha = 0.85f)
                ),
                startY = topY,
                endY = topY + innerH
            )
        )
        
        drawGhibliLandscapeDetails(innerW, innerH, topY, rng)
    }

    private fun createPhotoAreaPath(
        st: PhotoStyle,
        innerW: Float,
        innerH: Float,
        topY: Float,
        jitter: () -> Float
    ): Path {
        val halfW = innerW / 2f
        return Path().apply {
            val cr = st.cornerRadius * 0.7f
            moveTo(-halfW + cr + jitter(), topY + jitter())
            lineTo(halfW - cr + jitter(), topY + jitter())
            lineTo(halfW + jitter(), topY + cr + jitter())
            lineTo(halfW + jitter(), topY + innerH - cr + jitter())
            lineTo(halfW - cr + jitter(), topY + innerH + jitter())
            lineTo(-halfW + cr + jitter(), topY + innerH + jitter())
            lineTo(-halfW + jitter(), topY + innerH - cr + jitter())
            lineTo(-halfW + jitter(), topY + cr + jitter())
            close()
        }
    }

    private fun DrawScope.drawCenterCropPhoto(image: ImageBitmap, innerW: Float, innerH: Float, topY: Float) {
        val srcWidth = image.width
        val srcHeight = image.height
        if (srcWidth <= 0 || srcHeight <= 0) return

        val dstWidth = innerW.toInt().coerceAtLeast(1)
        val dstHeight = innerH.toInt().coerceAtLeast(1)
        val scale = max(dstWidth.toFloat() / srcWidth, dstHeight.toFloat() / srcHeight)
        val cropWidth = (dstWidth / scale).toInt().coerceIn(1, srcWidth)
        val cropHeight = (dstHeight / scale).toInt().coerceIn(1, srcHeight)
        val cropLeft = ((srcWidth - cropWidth) / 2).coerceAtLeast(0)
        val cropTop = ((srcHeight - cropHeight) / 2).coerceAtLeast(0)

        drawImage(
            image = image,
            srcOffset = IntOffset(cropLeft, cropTop),
            srcSize = IntSize(cropWidth, cropHeight),
            dstOffset = IntOffset((-innerW / 2f).toInt(), topY.toInt()),
            dstSize = IntSize(dstWidth, dstHeight)
        )
    }

    private fun DrawScope.drawGhibliLandscapeDetails(innerW: Float, innerH: Float, topY: Float, rng: java.util.Random) {
        val halfW = innerW / 2f
        val j = { (rng.nextFloat() - 0.5f) * 1.5f }
        
        val hillY = topY + innerH * 0.5f
        val hillPath = Path().apply {
            moveTo(-halfW + j(), hillY + innerH * 0.3f)
            quadraticBezierTo(
                -halfW * 0.3f + j(), hillY - innerH * 0.15f + j(),
                halfW * 0.2f + j(), hillY + innerH * 0.1f + j()
            )
            quadraticBezierTo(
                halfW * 0.7f + j(), hillY + innerH * 0.25f + j(),
                halfW + j(), hillY + innerH * 0.35f + j()
            )
            lineTo(halfW + j(), topY + innerH + j())
            lineTo(-halfW + j(), topY + innerH + j())
            close()
        }
        drawPath(
            path = hillPath,
            brush = Brush.verticalGradient(
                colors = listOf(
                    Color(0xFFB8D0B4).copy(alpha = 0.3f),
                    Color(0xFF98B894).copy(alpha = 0.25f)
                ),
                startY = hillY,
                endY = topY + innerH
            )
        )
        
        repeat(3) { _ ->
            val lx = (-halfW + rng.nextFloat() * innerW)
            val ly = topY + rng.nextFloat() * innerH * 0.7f
            val lh = innerH * (0.1f + rng.nextFloat() * 0.2f)
            drawLine(
                color = Color.White.copy(alpha = 0.06f + rng.nextFloat() * 0.04f),
                start = Offset(lx, ly),
                end = Offset(lx + (rng.nextFloat() - 0.5f) * 15f, ly + lh),
                strokeWidth = 1f + rng.nextFloat() * 2f,
                cap = StrokeCap.Round
            )
        }
    }

    private fun DrawScope.drawPhotoHighlight(st: PhotoStyle, rng: java.util.Random) {
        val hw = st.photoWidth / 2f
        val hh = st.photoHeight / 2f
        val j = { (rng.nextFloat() - 0.5f) * st.handDrawnJitter * 0.3f }
        
        val highlightPath = Path().apply {
            moveTo(-hw * 0.9f + j(), -hh * 0.9f + j())
            lineTo(-hw * 0.3f + j(), -hh * 0.9f + j())
            lineTo(-hw * 0.2f + j(), -hh * 0.4f + j())
            lineTo(-hw * 0.8f + j(), -hh * 0.4f + j())
            close()
        }
        
        drawPath(
            path = highlightPath,
            brush = Brush.linearGradient(
                colors = listOf(
                    Color.White.copy(alpha = st.highlightAlpha),
                    Color.White.copy(alpha = st.highlightAlpha * 0.5f),
                    Color.Transparent
                ),
                start = Offset(-hw * 0.9f, -hh * 0.9f),
                end = Offset(-hw * 0.2f, -hh * 0.4f)
            )
        )
    }

    private fun DrawScope.drawCurledCorner(st: PhotoStyle, isRight: Boolean, rng: java.util.Random) {
        val sign = if (isRight) 1f else -1f
        val hw = st.photoWidth / 2f * sign
        val hh = st.photoHeight / 2f
        val curlR = st.curlAmount + rng.nextFloat() * st.curlAmount * 0.5f
        val j = { (rng.nextFloat() - 0.5f) * st.handDrawnJitter * 0.4f }
        
        val path = Path().apply {
            moveTo(hw - curlR * 0.3f + j(), hh - curlR + j())
            cubicTo(
                hw + curlR * 0.4f + j(), hh - curlR * 0.5f + j(),
                hw + curlR * 0.3f + j(), hh - curlR * 0.15f + j(),
                hw - curlR * 0.15f + j(), hh - curlR * 0.05f + j()
            )
            lineTo(hw - curlR * 0.25f + j(), hh + j())
            cubicTo(
                hw - curlR * 0.5f + j(), hh - curlR * 0.3f + j(),
                hw - curlR * 0.8f + j(), hh - curlR * 0.6f + j(),
                hw - curlR * 0.3f + j(), hh - curlR + j()
            )
            close()
        }
        
        drawPath(
            path = path,
            brush = Brush.verticalGradient(
                colors = listOf(
                    st.borderColor.copy(alpha = 0.95f),
                    st.borderColor.copy(alpha = 0.85f)
                ),
                startY = hh - curlR,
                endY = hh
            )
        )
        
        val shadowPath = Path().apply {
            moveTo(hw - curlR * 0.2f + j(), hh - curlR + 1f + j())
            cubicTo(
                hw + curlR * 0.5f + j(), hh - curlR * 0.4f + j(),
                hw + curlR * 0.4f + j(), hh + j(),
                hw - curlR * 0.1f + j(), hh + 1f + j()
            )
            lineTo(hw - curlR * 0.2f + j(), hh + 1f + j())
            close()
        }
        drawPath(shadowPath, color = Color.Black.copy(alpha = 0.1f))
    }

    private fun DrawScope.drawPhotoEdgeDetails(st: PhotoStyle, rng: java.util.Random) {
        repeat(5) { _ ->
            val angle = rng.nextFloat() * 360f
            val rad = Math.toRadians(angle.toDouble())
            val len = 1.5f + rng.nextFloat() * 3f
            val cx = (rng.nextFloat() - 0.5f) * st.photoWidth * 0.85f
            val cy = (rng.nextFloat() - 0.5f) * st.photoHeight * 0.85f
            drawLine(
                color = Color.Black.copy(alpha = 0.03f + rng.nextFloat() * 0.02f),
                start = Offset(cx, cy),
                end = Offset(cx + cos(rad).toFloat() * len, cy + sin(rad).toFloat() * len),
                strokeWidth = 0.4f + rng.nextFloat() * 0.8f,
                cap = StrokeCap.Round
            )
        }
    }

    private fun DrawScope.drawHandDrawnOutline(st: PhotoStyle, rng: java.util.Random) {
        val hw = st.photoWidth / 2f
        val hh = st.photoHeight / 2f
        val j = { (rng.nextFloat() - 0.5f) * st.handDrawnJitter * 0.8f }
        
        val outlinePath = Path().apply {
            moveTo(-hw + j(), -hh + j())
            lineTo(hw + j(), -hh + j())
            lineTo(hw + j(), hh + j())
            lineTo(-hw + j(), hh + j())
            close()
        }
        
        drawPath(
            path = outlinePath,
            color = Color.Black.copy(alpha = 0.08f),
            style = androidx.compose.ui.graphics.drawscope.Stroke(
                width = 0.6f + rng.nextFloat() * 0.4f,
                cap = StrokeCap.Round
            )
        )
    }
}
