package com.example.photogallery.ui.rope

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke as DrawStroke
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.atan2

data class RopeStyle(
    val sagAmount: Float = 35f,
    val jitterAmount: Float = 4f,
    val sampleCount: Int = 120,
    val baseStrokeWidth: Float = 5f,
    val twistCount: Int = 3,
    val fiberAlpha: Float = 0.3f,
    val shadowOffset: Float = 4f,
    val shadowAlpha: Float = 0.12f,
    val highlightAlpha: Float = 0.25f,
    val handDrawnJitter: Float = 1.5f,
    val fiberCount: Int = 25,
    val strandWaveFreq: Float = 14f
)

object RopeGenerator {

    fun generateSampledPoints(start: Offset, end: Offset, style: RopeStyle, random: java.util.Random): List<Offset> {
        val basePoints = generateCubicBezierPoints(start, end, style, style.sampleCount)
        return applyJitter(basePoints, style.jitterAmount, random)
    }

    private fun generateCubicBezierPoints(start: Offset, end: Offset, style: RopeStyle, sampleCount: Int): List<Offset> {
        val midX = (start.x + end.x) / 2f; val midY = (start.y + end.y) / 2f
        val cp1 = Offset(x = start.x + (end.x - start.x) * 0.25f, y = midY + style.sagAmount * 0.6f)
        val cp2 = Offset(x = start.x + (end.x - start.x) * 0.75f, y = midY + style.sagAmount * 0.95f)
        return (0..sampleCount).map { i ->
            val t = i.toFloat() / sampleCount; val u = 1f - t; val uu = u * u; val uuu = uu * u
            val tt = t * t; val ttt = tt * t
            Offset(
                x = uuu * start.x + 3f * uu * t * cp1.x + 3f * u * tt * cp2.x + ttt * end.x,
                y = uuu * start.y + 3f * uu * t * cp1.y + 3f * u * tt * cp2.y + ttt * end.y
            )
        }
    }

    private fun applyJitter(points: List<Offset>, amount: Float, random: java.util.Random): List<Offset> =
        points.mapIndexed { idx, point ->
            if (idx == 0 || idx == points.size - 1) point
            else Offset(
                x = point.x, // Fix: Remove X jitter to maintain monotonic X for stable hang point calculation during drag
                y = point.y + (random.nextFloat() - 0.5f) * 2f * amount * 0.7f
            )
        }

    fun buildPath(points: List<Offset>): Path {
        if (points.size < 2) return Path()
        val path = Path(); path.moveTo(points.first().x, points.first().y)
        for (i in 1 until points.size) path.lineTo(points[i].x, points[i].y)
        return path
    }
    
    fun buildHandDrawnPath(points: List<Offset>, rng: java.util.Random, jitter: Float): Path {
        if (points.size < 2) return Path()
        val path = Path()
        val j = { (rng.nextFloat() - 0.5f) * jitter }
        
        path.moveTo(points.first().x + j(), points.first().y + j())
        for (i in 1 until points.size) {
            path.lineTo(points[i].x + j(), points[i].y + j())
        }
        return path
    }
}

object RopeRenderer {

    fun drawClothesline(drawScope: DrawScope, points: List<Offset>, style: RopeStyle, color: Color) {
        if (points.size < 2) return
        val rng = java.util.Random(42L)
        drawShadowLayer(drawScope, points, style, rng)
        drawMainRopeBody(drawScope, points, style, color, rng)
        drawHighlightLayer(drawScope, points, style, color, rng)
        drawTwistStrands(drawScope, points, style, color, rng)
        drawFiberTexture(drawScope, points, style, color, rng)
        drawHandDrawnOutline(drawScope, points, style, rng)
    }

    private fun drawShadowLayer(scope: DrawScope, pts: List<Offset>, st: RopeStyle, rng: java.util.Random) {
        val j = { (rng.nextFloat() - 0.5f) * st.handDrawnJitter * 0.3f }
        for (i in 0..1) {
            val offset = st.shadowOffset * (1f + i * 0.5f)
            val alpha = st.shadowAlpha * (1f - i * 0.3f)
            val shadowPts = pts.map { Offset(it.x + offset + j(), it.y + offset * 0.5f + j()) }
            scope.drawPath(
                RopeGenerator.buildHandDrawnPath(shadowPts, rng, st.handDrawnJitter * 0.2f),
                Color.Black.copy(alpha = alpha),
                style = DrawStroke(
                    width = st.baseStrokeWidth * (1.6f + i * 0.3f) + rng.nextFloat() * 0.5f,
                    cap = StrokeCap.Round,
                    join = StrokeJoin.Round
                )
            )
        }
    }

    private fun drawMainRopeBody(scope: DrawScope, pts: List<Offset>, st: RopeStyle, color: Color, rng: java.util.Random) {
        val n = pts.size
        for (i in 0 until n - 1) {
            val t = i.toFloat() / (n - 1)
            val taper = 0.75f + 0.5f * sin(t * PI.toFloat())
            val w = st.baseStrokeWidth * taper + (rng.nextFloat() - 0.5f) * st.handDrawnJitter * 0.2f
            val segPath = Path().apply { 
                moveTo(pts[i].x, pts[i].y)
                lineTo(pts[i + 1].x, pts[i + 1].y)
            }
            scope.drawPath(segPath, color, style = DrawStroke(width = w, cap = StrokeCap.Round))
        }
    }

    private fun drawHighlightLayer(scope: DrawScope, pts: List<Offset>, st: RopeStyle, baseColor: Color, rng: java.util.Random) {
        val n = pts.size
        val j = { (rng.nextFloat() - 0.5f) * st.handDrawnJitter * 0.15f }
        
        val highlightPts = pts.mapIndexed { idx, pt ->
            val t = idx.toFloat() / n
            val dy = if (idx < n - 1) pts[idx + 1].y - pt.y else pt.y - pts[idx - 1].y
            val dx = if (idx < n - 1) pts[idx + 1].x - pt.x else pt.x - pts[idx - 1].x
            val perpAngle = atan2(dy.toDouble(), dx.toDouble()) + PI / 2.0
            val highlightOffset = st.baseStrokeWidth * 0.25f
            Offset(
                pt.x + cos(perpAngle).toFloat() * highlightOffset + j(),
                pt.y + sin(perpAngle).toFloat() * highlightOffset + j()
            )
        }
        
        for (i in 0 until n - 1) {
            val t = i.toFloat() / (n - 1)
            val taper = 0.75f + 0.5f * sin(t * PI.toFloat())
            val w = st.baseStrokeWidth * taper * 0.5f + (rng.nextFloat() - 0.5f) * 0.3f
            val segPath = Path().apply {
                moveTo(highlightPts[i].x, highlightPts[i].y)
                lineTo(highlightPts[i + 1].x, highlightPts[i + 1].y)
            }
            scope.drawPath(
                segPath,
                Color.White.copy(alpha = st.highlightAlpha),
                style = DrawStroke(width = w, cap = StrokeCap.Round)
            )
        }
    }

    private fun drawTwistStrands(scope: DrawScope, pts: List<Offset>, st: RopeStyle, baseColor: Color, rng: java.util.Random) {
        repeat(st.twistCount) { strandIdx ->
            val offsetPhase = strandIdx * 0.37f
            val strandColor = baseColor.copy(
                alpha = st.fiberAlpha,
                red = (baseColor.red + (strandIdx - 1) * 0.04f).coerceIn(0f, 1f),
                green = (baseColor.green + (strandIdx - 1) * 0.03f).coerceIn(0f, 1f),
                blue = (baseColor.blue + (strandIdx - 1) * 0.02f).coerceIn(0f, 1f)
            )
            val n = pts.size
            val j = { (rng.nextFloat() - 0.5f) * st.handDrawnJitter * 0.1f }
            
            val strandPts = pts.mapIndexed { idx, pt ->
                val t = idx.toFloat() / n
                val dy = if (idx < n - 1) pts[idx + 1].y - pt.y else pt.y - pts[idx - 1].y
                val dx = if (idx < n - 1) pts[idx + 1].x - pt.x else pt.x - pts[idx - 1].x
                val perpAngle = atan2(dy.toDouble(), dx.toDouble()) + PI / 2.0
                val wave = sin(t * PI.toFloat() * st.strandWaveFreq + offsetPhase * PI.toFloat() * 2f) * (st.baseStrokeWidth * 0.3f)
                Offset(pt.x + cos(perpAngle).toFloat() * wave + j(), pt.y + sin(perpAngle).toFloat() * wave + j())
            }
            scope.drawPath(
                RopeGenerator.buildHandDrawnPath(strandPts, rng, st.handDrawnJitter * 0.1f),
                strandColor,
                style = DrawStroke(
                    width = st.baseStrokeWidth * 0.3f + (rng.nextFloat() - 0.5f) * 0.2f,
                    cap = StrokeCap.Round
                )
            )
        }
    }

    private fun drawFiberTexture(scope: DrawScope, pts: List<Offset>, st: RopeStyle, baseColor: Color, rng: java.util.Random) {
        var i = 3
        while (i < pts.size - 3) {
            val pt = pts[i]
            val len = (1.2f + rng.nextFloat() * 2.5f) * (st.baseStrokeWidth / 4f)
            val angleRad = rng.nextFloat() * 2 * PI
            val jitterX = (rng.nextFloat() - 0.5f) * st.handDrawnJitter * 0.5f
            val jitterY = (rng.nextFloat() - 0.5f) * st.handDrawnJitter * 0.5f
            
            scope.drawLine(
                color = baseColor.copy(alpha = 0.1f + rng.nextFloat() * 0.06f),
                start = Offset(pt.x + jitterX, pt.y + jitterY),
                end = Offset(
                    pt.x + cos(angleRad).toFloat() * len + jitterX,
                    pt.y + sin(angleRad).toFloat() * len + jitterY
                ),
                strokeWidth = 0.35f + rng.nextFloat() * 0.7f,
                cap = StrokeCap.Round
            )
            i += 4
        }
    }
    
    private fun drawHandDrawnOutline(scope: DrawScope, pts: List<Offset>, st: RopeStyle, rng: java.util.Random) {
        val n = pts.size
        val outlinePts = pts.mapIndexed { idx, pt ->
            val j = { (rng.nextFloat() - 0.5f) * st.handDrawnJitter * 0.2f }
            val dy = if (idx < n - 1) pts[idx + 1].y - pt.y else pt.y - pts[idx - 1].y
            val dx = if (idx < n - 1) pts[idx + 1].x - pt.x else pt.x - pts[idx - 1].x
            val perpAngle = atan2(dy.toDouble(), dx.toDouble()) + PI / 2.0
            val offset = st.baseStrokeWidth * 0.48f
            Offset(
                pt.x + cos(perpAngle).toFloat() * offset + j(),
                pt.y + sin(perpAngle).toFloat() * offset + j()
            )
        }
        
        scope.drawPath(
            RopeGenerator.buildHandDrawnPath(outlinePts, rng, st.handDrawnJitter * 0.15f),
            Color.Black.copy(alpha = 0.05f),
            style = DrawStroke(
                width = 0.4f + rng.nextFloat() * 0.2f,
                cap = StrokeCap.Round
            )
        )
    }
}
