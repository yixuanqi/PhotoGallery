package com.example.photogallery.ui.photo

import android.net.Uri
import androidx.compose.ui.graphics.ImageBitmap

data class PhotoData(
    val id: Long,
    val uri: Uri,
    val takenAtMillis: Long?,
    val addedAtMillis: Long?,
    val modifiedAtMillis: Long?
) {
    val cacheKey: String = uri.toString()

    val effectiveTimeMillis: Long?
        get() = listOf(takenAtMillis, addedAtMillis, modifiedAtMillis)
            .firstOrNull { it != null && it > 0L }
}

sealed class PhotoState {
    data object Unloaded : PhotoState()
    data object Loading : PhotoState()
    data class Loaded(val bitmap: ImageBitmap) : PhotoState()
    data class Failed(val reason: String? = null) : PhotoState()
}

sealed class PhotoPermissionState {
    data object Unknown : PhotoPermissionState()
    data object GrantedFull : PhotoPermissionState()
    data object GrantedLimited : PhotoPermissionState()
    data object Denied : PhotoPermissionState()
}
