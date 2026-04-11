package com.example.photogallery.ui.rope

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.withTransform

data class ClipStyle(
    val totalHeight: Float = 70f,
    val headWidth: Float = 14f,
    val gripWidth: Float = 10f,
    val bodyWidth: Float = 18f,
    val headLength: Float = 16f,
    val gripLength: Float = 12f,
    val bodyLength: Float = 42f,
    val springHeight: Float = 10f,
    val strokeWidth: Float = 1.5f,
    val woodLight: Color = Color(0xFFC4A35A),
    val woodMid: Color = Color(0xFFA07830),
    val woodDark: Color = Color(0xFF8B5E20),
    val woodShadow: Color = Color(0xFF6B4420),
    val springColor: Color = Color(0xFF78909C),
    val shadowColor: Color = Color(0x40000000),
    val handDrawnJitter: Float = 1.2f
) {
    fun scaleBy(factor: Float): ClipStyle = ClipStyle(
        totalHeight = totalHeight * factor, headWidth = headWidth * factor,
        gripWidth = gripWidth * factor, bodyWidth = bodyWidth * factor,
        headLength = headLength * factor, gripLength = gripLength * factor,
        bodyLength = bodyLength * factor, springHeight = springHeight * factor,
        strokeWidth = strokeWidth * factor,
        woodLight = woodLight, woodMid = woodMid, woodDark = woodDark,
        woodShadow = woodShadow, springColor = springColor, shadowColor = shadowColor,
        handDrawnJitter = handDrawnJitter * factor
    )
}

object ClipRenderer {

    fun drawClothespin(
        scope: DrawScope,
        hangPoint: HangPoint,
        style: ClipStyle,
        random: java.util.Random,
        rotationDeg: Float = hangPoint.tangentAngle
    ) {
        scope.translate(hangPoint.clipAnchor.x, hangPoint.clipAnchor.y) {
            rotate(rotationDeg) {
                drawFullPinBody(style, random)
            }
        }
    }

    private fun DrawScope.drawFullPinBody(st: ClipStyle, rng: java.util.Random) {
        val j = { (rng.nextFloat() - 0.5f) * st.handDrawnJitter }
        val hw = st.headWidth / 2f
        val gw = st.gripWidth / 2f
        val bw = st.bodyWidth / 2f
        val yHeadEnd = st.headLength
        val yGripEnd = yHeadEnd + st.gripLength
        val yBodyEnd = yGripEnd + st.bodyLength
        val ySpringTop = yGripEnd - st.springHeight / 2f
        val ySpringBot = yGripEnd + st.springHeight / 2f

        withTransform({ translate(3f + j() * 0.5f, 4f + j() * 0.5f) }) {
            drawPinSilhouette(st, hw, gw, bw, yHeadEnd, yGripEnd, yBodyEnd, ySpringTop, ySpringBot, j, st.shadowColor, rng)
        }

        drawLeftArm(st, hw, gw, bw, yHeadEnd, yGripEnd, yBodyEnd, ySpringTop, ySpringBot, j, rng)
        drawRightArm(st, hw, gw, bw, yHeadEnd, yGripEnd, yBodyEnd, ySpringTop, ySpringBot, j, rng)
        drawSpringCoils(st, gw, ySpringTop, ySpringBot, j, rng)
        drawWoodGrain(st, bw, yGripEnd, yBodyEnd, j, rng)
        drawHandDrawnEdges(st, hw, gw, bw, yHeadEnd, yGripEnd, yBodyEnd, j, rng)
    }

    private fun DrawScope.drawPinSilhouette(
        st: ClipStyle, hw: Float, gw: Float, bw: Float,
        yHE: Float, yGE: Float, yBE: Float, yST: Float, ySB: Float,
        j: () -> Float, col: Color, rng: java.util.Random
    ) {
        val path = Path().apply {
            moveTo(-hw + j(), j())
            lineTo(hw + j(), j())
            lineTo(gw + j(), yGE + j())
            lineTo(bw + j(), yBE + j())
            lineTo(-bw + j(), yBE + j())
            lineTo(-gw + j(), yGE + j())
            close()
        }
        drawPath(path, color = col)
    }

    private fun DrawScope.drawLeftArm(
        st: ClipStyle, hw: Float, gw: Float, bw: Float,
        yHE: Float, yGE: Float, yBE: Float, yST: Float, ySB: Float,
        j: () -> Float, rng: java.util.Random
    ) {
        val ajL = (rng.nextFloat() - 0.5f) * 3f
        val path = Path().apply {
            moveTo(-hw + j(), -1f + j())
            cubicTo(
                -hw - 2f + ajL + j(), yHE * 0.4f + j(),
                -gw - 1f + j(), yHE + j(),
                -gw + j(), yGE * 0.6f + j()
            )
            lineTo(-bw + ajL * 0.5f + j(), yBE + j())
            lineTo(-bw + 3f + ajL * 0.3f + j(), yBE + j())
            lineTo(-gw + 1.5f + j(), yGE * 0.65f + j())
            cubicTo(
                -gw + 1f + j(), yHE + 2f + j(),
                -hw + 2f + ajL * 0.5f + j(), yHE * 0.45f + j(),
                -hw + 2f + j(), 1f + j()
            )
            close()
        }
        drawPath(path, color = st.woodMid)
        drawPath(
            path = path,
            color = st.woodDark.copy(alpha = 0.25f),
            style = androidx.compose.ui.graphics.drawscope.Stroke(width = st.strokeWidth * 0.6f + rng.nextFloat() * 0.3f)
        )
    }

    private fun DrawScope.drawRightArm(
        st: ClipStyle, hw: Float, gw: Float, bw: Float,
        yHE: Float, yGE: Float, yBE: Float, yST: Float, ySB: Float,
        j: () -> Float, rng: java.util.Random
    ) {
        val ajR = (rng.nextFloat() - 0.5f) * 3f
        val path = Path().apply {
            moveTo(hw + j(), -1f + j())
            cubicTo(
                hw + 2f + ajR + j(), yHE * 0.4f + j(),
                gw + 1f + j(), yHE + j(),
                gw + j(), yGE * 0.6f + j()
            )
            lineTo(bw + ajR * 0.5f + j(), yBE + j())
            lineTo(bw - 3f + ajR * 0.3f + j(), yBE + j())
            lineTo(gw - 1.5f + j(), yGE * 0.65f + j())
            cubicTo(
                gw - 1f + j(), yHE + 2f + j(),
                hw - 2f + ajR * 0.5f + j(), yHE * 0.45f + j(),
                hw - 2f + j(), 1f + j()
            )
            close()
        }
        drawPath(path, color = st.woodLight)
        drawPath(
            path = path,
            color = st.woodShadow.copy(alpha = 0.2f),
            style = androidx.compose.ui.graphics.drawscope.Stroke(width = st.strokeWidth * 0.5f + rng.nextFloat() * 0.3f)
        )
    }

    private fun DrawScope.drawSpringCoils(
        st: ClipStyle, gw: Float, yST: Float, ySB: Float, j: () -> Float, rng: java.util.Random
    ) {
        val coils = 5
        val coilH = (ySB - yST) / coils
        for (i in 0 until coils) {
            val cy0 = yST + i * coilH
            val cy1 = cy0 + coilH * 0.5f
            val cy2 = cy0 + coilH
            val cxVar = (rng.nextFloat() - 0.5f) * 1.5f
            val sw = gw * 0.75f
            
            val coilPath = Path().apply {
                moveTo(-sw + cxVar + j(), cy0 + j())
                quadraticBezierTo(
                    0f + cxVar + j(), cy0 + coilH * 0.25f + j(),
                    sw + cxVar + j(), cy1 + j()
                )
                quadraticBezierTo(
                    0f + cxVar + j(), cy1 + coilH * 0.25f + j(),
                    -sw + cxVar + j(), cy2 + j()
                )
            }
            drawPath(
                path = coilPath,
                color = st.springColor,
                style = androidx.compose.ui.graphics.drawscope.Stroke(
                    width = st.strokeWidth * 0.7f + (rng.nextFloat() - 0.5f) * 0.2f,
                    cap = StrokeCap.Round
                )
            )
        }
    }

    private fun DrawScope.drawWoodGrain(
        st: ClipStyle, bw: Float, yGE: Float, yBE: Float, j: () -> Float, rng: java.util.Random
    ) {
        repeat(5) { idx ->
            val gx = (rng.nextFloat() - 0.5f) * bw * 1.4f
            val gyStart = yGE + rng.nextFloat() * (yBE - yGE) * 0.3f
            val gyLen = (yBE - yGE) * (0.25f + rng.nextFloat() * 0.5f)
            val grainPath = Path().apply {
                moveTo(gx + j(), gyStart + j())
                var x = gx
                var y = gyStart
                val segs = 6
                repeat(segs) {
                    x += (rng.nextFloat() - 0.5f) * 3f
                    y += gyLen / segs
                    lineTo(x + j(), y + j())
                }
            }
            drawPath(
                grainPath,
                color = st.woodShadow.copy(alpha = 0.12f + rng.nextFloat() * 0.08f),
                style = androidx.compose.ui.graphics.drawscope.Stroke(
                    width = st.strokeWidth * 0.4f + rng.nextFloat() * 0.3f,
                    cap = StrokeCap.Round
                )
            )
        }
    }

    private fun DrawScope.drawHandDrawnEdges(
        st: ClipStyle, hw: Float, gw: Float, bw: Float,
        yHE: Float, yGE: Float, yBE: Float,
        j: () -> Float, rng: java.util.Random
    ) {
        val edgePath = Path().apply {
            moveTo(-hw + j(), j())
            lineTo(hw + j(), j())
            lineTo(gw + j(), yGE + j())
            lineTo(bw + j(), yBE + j())
            lineTo(-bw + j(), yBE + j())
            lineTo(-gw + j(), yGE + j())
            close()
        }
        drawPath(
            edgePath,
            color = Color.Black.copy(alpha = 0.06f + rng.nextFloat() * 0.04f),
            style = androidx.compose.ui.graphics.drawscope.Stroke(
                width = st.strokeWidth * 0.3f + rng.nextFloat() * 0.2f,
                cap = StrokeCap.Round
            )
        )
        
        repeat(3) { _ ->
            val startX = (rng.nextFloat() - 0.5f) * bw * 2f
            val startY = yGE + rng.nextFloat() * (yBE - yGE)
            val len = 2f + rng.nextFloat() * 4f
            val angle = rng.nextFloat() * 360f
            val rad = Math.toRadians(angle.toDouble())
            drawLine(
                color = st.woodShadow.copy(alpha = 0.08f + rng.nextFloat() * 0.05f),
                start = Offset(startX, startY),
                end = Offset(startX + kotlin.math.cos(rad).toFloat() * len, startY + kotlin.math.sin(rad).toFloat() * len),
                strokeWidth = 0.3f + rng.nextFloat() * 0.4f,
                cap = StrokeCap.Round
            )
        }
    }
}
