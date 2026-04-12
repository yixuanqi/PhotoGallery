package com.example.photogallery.ui.timeline

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDateTime
import java.time.ZoneId

class PhotoGroupTest {
    private val zone = ZoneId.of("UTC")

    @Test
    fun groupsMultiplePhotosInSameMonth() {
        val times = listOf(
            time("2026-04-10T12:00:00"),
            time("2026-04-01T12:00:00")
        )

        val groups = groupPhotoTimesByMonth(times, zone)

        assertEquals(1, groups.size)
        assertEquals(PhotoGroup(2026, 4, "2026-04", 0, 1, 2), groups.first())
    }

    @Test
    fun groupsPhotosAcrossMonthsInInputOrder() {
        val times = listOf(
            time("2026-04-10T12:00:00"),
            time("2026-03-30T12:00:00"),
            time("2026-03-01T12:00:00")
        )

        val groups = groupPhotoTimesByMonth(times, zone)

        assertEquals(
            listOf(
                PhotoGroup(2026, 4, "2026-04", 0, 0, 1),
                PhotoGroup(2026, 3, "2026-03", 1, 2, 2)
            ),
            groups
        )
    }

    @Test
    fun groupsUnknownTimePhotos() {
        val times = listOf<Long?>(null, null)

        val groups = groupPhotoTimesByMonth(times, zone)

        assertEquals(1, groups.size)
        assertEquals(PhotoGroup(null, null, "unknown", 0, 1, 2), groups.first())
    }

    @Test
    fun returnsEmptyGroupListForEmptyPhotos() {
        assertTrue(groupPhotoTimesByMonth(emptyList(), zone).isEmpty())
    }

    private fun time(isoDateTime: String): Long {
        return LocalDateTime.parse(isoDateTime).atZone(zone).toInstant().toEpochMilli()
    }
}
