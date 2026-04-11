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
