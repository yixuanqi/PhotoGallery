package com.example.photogallery.ui.background

import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import kotlin.math.min
import kotlin.math.sin
import kotlin.random.Random

private val SkyTop = Color(0xFFE8F4E5)
private val SkyMid = Color(0xFFF5F8DC)
private val SkyBottom = Color(0xFFFCFAE1)
private val SunGlow = Color(0xFFFFF9C4)

private val HillFar1 = Color(0xFFE8EFD8)
private val HillFar2 = Color(0xFFDDE9C8)
private val HillMid1 = Color(0xFFC8D9B8)
private val HillMid2 = Color(0xFFB5C9A5)
private val HillNear1 = Color(0xFF9AB88A)
private val HillNear2 = Color(0xFF7DA06D)

@Composable
fun BackgroundRenderer(modifier: Modifier = Modifier) {
    Canvas(modifier = modifier) {
        drawSkyGradient()
        drawSunGlow()
        drawDistantHills()
        drawMidHills()
        drawNearHills()
        drawForegroundGrass()
    }
}

private fun DrawScope.drawSkyGradient() {
    drawRect(
        brush = Brush.verticalGradient(
            colors = listOf(SkyTop, SkyMid, SkyBottom),
            startY = 0f,
            endY = size.height * 0.6f
        )
    )
}

private fun DrawScope.drawSunGlow() {
    val landscapeFactor = landscapeFactor()
    val sunX = size.width * 0.15f
    val sunY = size.height * mix(0.08f, 0.12f, landscapeFactor)
    val glowRadius = min(size.width, size.height) * mix(0.35f, 0.42f, landscapeFactor)
    
    drawCircle(
        brush = Brush.radialGradient(
            colors = listOf(
                SunGlow.copy(alpha = 0.3f),
                SunGlow.copy(alpha = 0.15f),
                SunGlow.copy(alpha = 0.05f),
                Color.Transparent
            ),
            center = Offset(sunX, sunY),
            radius = glowRadius
        ),
        radius = glowRadius,
        center = Offset(sunX, sunY)
    )
    
    drawCircle(
        color = SunGlow.copy(alpha = 0.5f),
        radius = size.width * 0.03f,
        center = Offset(sunX, sunY)
    )
}

private fun DrawScope.drawDistantHills() {
    val factor = landscapeFactor()
    val baseY = size.height * mix(0.28f, 0.24f, factor)
    
    val hill1Path = createGhibliHillPath(
        baseY = baseY,
        amplitude = size.height * mix(0.12f, 0.1f, factor),
        frequency = 0.8f,
        seed = 100L
    )
    drawPath(
        path = hill1Path,
        brush = Brush.verticalGradient(
            colors = listOf(HillFar1, HillFar1.copy(alpha = 0.95f)),
            startY = baseY - size.height * mix(0.12f, 0.1f, factor),
            endY = baseY + size.height * mix(0.12f, 0.1f, factor)
        )
    )
    
    val hill2Path = createGhibliHillPath(
        baseY = baseY + size.height * mix(0.08f, 0.07f, factor),
        amplitude = size.height * mix(0.1f, 0.09f, factor),
        frequency = 1.2f,
        seed = 200L,
        offsetX = size.width * 0.3f
    )
    drawPath(
        path = hill2Path,
        brush = Brush.verticalGradient(
            colors = listOf(HillFar2, HillFar2.copy(alpha = 0.9f)),
            startY = baseY,
            endY = baseY + size.height * 0.2f
        )
    )
}

private fun DrawScope.drawMidHills() {
    val factor = landscapeFactor()
    val baseY = size.height * mix(0.45f, 0.4f, factor)
    
    val hill1Path = createGhibliHillPath(
        baseY = baseY,
        amplitude = size.height * mix(0.15f, 0.12f, factor),
        frequency = 1.0f,
        seed = 300L
    )
    drawPath(
        path = hill1Path,
        brush = Brush.verticalGradient(
            colors = listOf(HillMid1, HillMid1.copy(alpha = 0.95f)),
            startY = baseY - size.height * mix(0.15f, 0.12f, factor),
            endY = baseY + size.height * mix(0.15f, 0.12f, factor)
        )
    )
    
    val hill2Path = createGhibliHillPath(
        baseY = baseY + size.height * mix(0.1f, 0.09f, factor),
        amplitude = size.height * mix(0.12f, 0.1f, factor),
        frequency = 1.5f,
        seed = 400L,
        offsetX = -size.width * 0.2f
    )
    drawPath(
        path = hill2Path,
        brush = Brush.verticalGradient(
            colors = listOf(HillMid2, HillMid2.copy(alpha = 0.9f)),
            startY = baseY,
            endY = baseY + size.height * 0.25f
        )
    )
}

private fun DrawScope.drawNearHills() {
    val factor = landscapeFactor()
    val baseY = size.height * mix(0.62f, 0.58f, factor)
    
    val hill1Path = createGhibliHillPath(
        baseY = baseY,
        amplitude = size.height * mix(0.18f, 0.14f, factor),
        frequency = 1.3f,
        seed = 500L
    )
    drawPath(
        path = hill1Path,
        brush = Brush.verticalGradient(
            colors = listOf(HillNear1, HillNear1.copy(alpha = 0.95f)),
            startY = baseY - size.height * mix(0.18f, 0.14f, factor),
            endY = baseY + size.height * mix(0.18f, 0.14f, factor)
        )
    )
    
    val hill2Path = createGhibliHillPath(
        baseY = baseY + size.height * mix(0.12f, 0.1f, factor),
        amplitude = size.height * mix(0.14f, 0.11f, factor),
        frequency = 1.8f,
        seed = 600L,
        offsetX = size.width * 0.25f
    )
    drawPath(
        path = hill2Path,
        brush = Brush.verticalGradient(
            colors = listOf(HillNear2, HillNear2.copy(alpha = 0.9f)),
            startY = baseY,
            endY = baseY + size.height * 0.3f
        )
    )
}

private fun DrawScope.createGhibliHillPath(
    baseY: Float,
    amplitude: Float,
    frequency: Float,
    seed: Long,
    offsetX: Float = 0f
): Path {
    val r = Random(seed)
    val path = Path()
    
    path.moveTo(-size.width * 0.1f, size.height)
    
    val points = mutableListOf<Offset>()
    val steps = 80
    for (i in 0..steps) {
        val x = (i.toFloat() / steps) * size.width * 1.2f - size.width * 0.1f + offsetX
        val normalizedX = (x - offsetX) / size.width
        
        val mainWave = sin(normalizedX * Math.PI * frequency) * amplitude * 0.6
        val secondaryWave = sin(normalizedX * Math.PI * frequency * 2.3f + seed * 0.01f) * amplitude * 0.25
        val tertiaryWave = sin(normalizedX * Math.PI * frequency * 0.5f + seed * 0.02f) * amplitude * 0.15
        val jitter = (r.nextFloat() - 0.5f) * amplitude * 0.08f
        
        val y = baseY - mainWave.toFloat() - secondaryWave.toFloat() - tertiaryWave.toFloat() + jitter
        points.add(Offset(x, y))
    }
    
    if (points.isNotEmpty()) {
        path.moveTo(points[0].x, points[0].y)
        for (i in 1 until points.size) {
            val prev = points[i - 1]
            val curr = points[i]
            val midX = (prev.x + curr.x) / 2f
            val midY = (prev.y + curr.y) / 2f
            path.quadraticBezierTo(prev.x, prev.y, midX, midY)
        }
        path.lineTo(points.last().x, points.last().y)
    }
    
    path.lineTo(size.width * 1.1f, size.height)
    path.lineTo(-size.width * 0.1f, size.height)
    path.close()
    
    return path
}

private fun DrawScope.drawForegroundGrass() {
    val grassBaseY = size.height * mix(0.85f, 0.82f, landscapeFactor())
    val r = Random(700L)
    val grassPath = Path().apply {
        moveTo(0f, grassBaseY)
        
        val steps = 100
        for (i in 0..steps) {
            val x = (i.toFloat() / steps) * size.width
            val normalizedX = x / size.width
            val wave = sin(normalizedX * Math.PI * 3f) * 8f + sin(normalizedX * Math.PI * 7f) * 3f
            val jitter = (r.nextFloat() - 0.5f) * 2f
            lineTo(x, grassBaseY + wave.toFloat() + jitter)
        }
        
        lineTo(size.width, size.height)
        lineTo(0f, size.height)
        close()
    }
    
    drawPath(
        path = grassPath,
        brush = Brush.verticalGradient(
            colors = listOf(HillNear2, HillNear2.copy(alpha = 0.85f)),
            startY = grassBaseY,
            endY = size.height
        )
    )
}

private fun DrawScope.landscapeFactor(): Float {
    val ratio = size.width / size.height
    return ((ratio - 1f) / 1.2f).coerceIn(0f, 1f)
}

private fun mix(portrait: Float, landscape: Float, factor: Float): Float {
    return portrait + (landscape - portrait) * factor
}
