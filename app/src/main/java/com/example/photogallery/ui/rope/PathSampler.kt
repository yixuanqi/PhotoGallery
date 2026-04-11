package com.example.photogallery.ui.rope

import androidx.compose.ui.geometry.Offset
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin

data class HangPoint(
    val index: Int,
    val ropePosition: Offset,
    val tangentAngle: Float,
    val normalAngle: Float
) {
    val clipAnchor: Offset get() = ropePosition

    fun clipCloseEnd(style: ClipStyle): Offset {
        val rad = Math.toRadians(normalAngle.toDouble())
        return Offset(
            x = ropePosition.x + cos(rad).toFloat() * style.totalHeight,
            y = ropePosition.y + sin(rad).toFloat() * style.totalHeight
        )
    }
}

object HangPointGenerator {

    fun generateHangPoints(
        sampledPoints: List<Offset>,
        count: Int
    ): List<HangPoint> {
        if (sampledPoints.size < 2 || count <= 0) return emptyList()
        // Keep hang-point indices stable on the full rope arc length.
        // Filtering by visible range causes index remapping and visual jumps while dragging.
        val cumulativeDistances = computeCumulativeDistances(sampledPoints)
        val totalLength = cumulativeDistances.last()
        if (totalLength <= 0f) return emptyList()

        val margin = totalLength * 0.15f
        val effectiveStart = margin
        val effectiveEnd = totalLength - margin

        return (0 until count).map { i ->
            val t = if (count == 1) 0.5f else i.toFloat() / (count - 1)
            val targetDist = effectiveStart + t * (effectiveEnd - effectiveStart)

            val position = interpolatePosition(sampledPoints, cumulativeDistances, targetDist)
            val tangentAngle = computeTangentAngle(sampledPoints, cumulativeDistances, targetDist)
            val normalAngle = tangentAngle - 90f

            HangPoint(
                index = i,
                ropePosition = position,
                tangentAngle = tangentAngle,
                normalAngle = normalAngle
            )
        }
    }

    private fun computeCumulativeDistances(points: List<Offset>): FloatArray {
        val distances = FloatArray(points.size)
        distances[0] = 0f
        for (i in 1 until points.size) {
            val dx = points[i].x - points[i - 1].x
            val dy = points[i].y - points[i - 1].y
            distances[i] = distances[i - 1] + kotlin.math.sqrt(dx * dx + dy * dy)
        }
        return distances
    }

    private fun interpolatePosition(
        points: List<Offset>,
        distances: FloatArray,
        targetDist: Float
    ): Offset {
        if (targetDist <= 0f) return points.first()
        if (targetDist >= distances.last()) return points.last()

        var lo = 0
        var hi = distances.size - 1
        while (lo < hi - 1) {
            val mid = (lo + hi) / 2
            if (distances[mid] <= targetDist) lo = mid else hi = mid
        }

        val segLen = distances[hi] - distances[lo]
        val frac = if (segLen > 0f) (targetDist - distances[lo]) / segLen else 0f

        return Offset(
            x = points[lo].x + frac * (points[hi].x - points[lo].x),
            y = points[lo].y + frac * (points[hi].y - points[lo].y)
        )
    }

    private fun computeTangentAngle(
        points: List<Offset>,
        distances: FloatArray,
        targetDist: Float
    ): Float {
        val delta = 3f
        val dBefore = (targetDist - delta).coerceIn(0f, distances.last())
        val dAfter = (targetDist + delta).coerceIn(0f, distances.last())

        val pBefore = interpolatePosition(points, distances, dBefore)
        val pAfter = interpolatePosition(points, distances, dAfter)

        val dx = pAfter.x - pBefore.x
        val dy = pAfter.y - pBefore.y

        return Math.toDegrees(atan2(dy.toDouble(), dx.toDouble())).toFloat()
    }
}
