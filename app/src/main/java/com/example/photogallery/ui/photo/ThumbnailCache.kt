package com.example.photogallery.ui.photo

import android.util.LruCache
import androidx.compose.ui.graphics.ImageBitmap

class ThumbnailCache(maxEntries: Int = 48) {
    private val cache = LruCache<String, ImageBitmap>(maxEntries)

    fun get(key: String): ImageBitmap? = cache.get(key)

    fun put(key: String, bitmap: ImageBitmap) {
        cache.put(key, bitmap)
    }

    fun clear() {
        cache.evictAll()
    }
}
