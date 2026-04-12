package com.example.photogallery.ui.timeline

import android.content.Context
import android.os.Build
import com.example.photogallery.R
import com.example.photogallery.ui.photo.PhotoData
import java.time.Instant
import java.time.Month
import java.time.ZoneId
import java.time.format.TextStyle
import java.util.Locale

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
                label = "${date.year}-${date.monthValue.toString().padStart(2, '0')}"
            )
        } ?: GroupKey(
            year = null,
            month = null,
            label = "unknown"
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

fun formatPhotoGroupLabel(group: PhotoGroup, context: Context): String {
    val year = group.year
    val month = group.month
    if (year == null || month == null) {
        return context.getString(R.string.timeline_group_unknown_time)
    }

    val locale = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        context.resources.configuration.locales[0]
    } else {
        @Suppress("DEPRECATION")
        context.resources.configuration.locale ?: Locale.getDefault()
    }
    val monthName = Month.of(month.coerceIn(1, 12)).getDisplayName(TextStyle.FULL, locale)
    return context.getString(R.string.timeline_group_month_year, monthName, year, month)
}
