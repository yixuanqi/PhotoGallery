package com.example.photogallery.ui.photo

import android.content.ContentResolver
import android.content.ContentUris
import android.content.Context
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.MediaStore
import android.util.Size
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlin.math.max

data class PhotoPage(
    val photos: List<PhotoData>,
    val nextOffset: Int,
    val hasMore: Boolean
)

class PhotoRepository(private val context: Context) {
    private val resolver: ContentResolver = context.contentResolver

    suspend fun queryPhotoPage(offset: Int, pageSize: Int): PhotoPage = withContext(Dispatchers.IO) {
        val collection = MediaStore.Images.Media.EXTERNAL_CONTENT_URI
        val projection = arrayOf(
            MediaStore.Images.Media._ID,
            MediaStore.Images.Media.DATE_TAKEN,
            MediaStore.Images.Media.DATE_ADDED,
            MediaStore.Images.Media.DATE_MODIFIED
        )

        val photos = mutableListOf<PhotoData>()
        val queryArgs = Bundle().apply {
            putStringArray(
                ContentResolver.QUERY_ARG_SORT_COLUMNS,
                arrayOf(MediaStore.Images.Media.DATE_TAKEN, MediaStore.Images.Media.DATE_ADDED)
            )
            putInt(ContentResolver.QUERY_ARG_SORT_DIRECTION, ContentResolver.QUERY_SORT_DIRECTION_ASCENDING)
            putInt(ContentResolver.QUERY_ARG_OFFSET, offset.coerceAtLeast(0))
            putInt(ContentResolver.QUERY_ARG_LIMIT, (pageSize + 1).coerceAtLeast(1))
        }
        resolver.query(collection, projection, queryArgs, null)?.use { cursor ->
            val idColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media._ID)
            val takenColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_TAKEN)
            val addedColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_ADDED)
            val modifiedColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_MODIFIED)

            while (cursor.moveToNext() && photos.size < pageSize + 1) {
                val id = cursor.getLong(idColumn)
                val uri = ContentUris.withAppendedId(collection, id)
                photos += PhotoData(
                    id = id,
                    uri = uri,
                    takenAtMillis = cursor.getNullableLong(takenColumn),
                    addedAtMillis = cursor.getNullableLong(addedColumn)?.times(1000L),
                    modifiedAtMillis = cursor.getNullableLong(modifiedColumn)?.times(1000L)
                )
            }
        }

        val hasMore = photos.size > pageSize
        val pagePhotos = photos.take(pageSize).sortedWith(
            compareBy<PhotoData> { it.effectiveTimeMillis ?: Long.MIN_VALUE }
                .thenBy { it.id }
        )
        PhotoPage(
            photos = pagePhotos,
            nextOffset = offset.coerceAtLeast(0) + pagePhotos.size,
            hasMore = hasMore
        )
    }

    suspend fun loadThumbnail(uri: Uri, targetWidthPx: Int, targetHeightPx: Int): ImageBitmap =
        withContext(Dispatchers.IO) {
            val width = targetWidthPx.coerceAtLeast(1)
            val height = targetHeightPx.coerceAtLeast(1)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                resolver.loadThumbnail(uri, Size(width, height), null).asImageBitmap()
            } else {
                decodeSampledBitmap(uri, width, height).asImageBitmap()
            }
        }

    private fun decodeSampledBitmap(uri: Uri, reqWidth: Int, reqHeight: Int): android.graphics.Bitmap {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        resolver.openInputStream(uri)?.use { input ->
            BitmapFactory.decodeStream(input, null, bounds)
        }

        val options = BitmapFactory.Options().apply {
            inSampleSize = calculateInSampleSize(bounds, reqWidth, reqHeight)
        }

        return resolver.openInputStream(uri)?.use { input ->
            BitmapFactory.decodeStream(input, null, options)
        } ?: error("Unable to decode thumbnail")
    }

    private fun calculateInSampleSize(options: BitmapFactory.Options, reqWidth: Int, reqHeight: Int): Int {
        val height = options.outHeight
        val width = options.outWidth
        var inSampleSize = 1

        if (height > reqHeight || width > reqWidth) {
            val halfHeight = max(1, height / 2)
            val halfWidth = max(1, width / 2)
            while (halfHeight / inSampleSize >= reqHeight && halfWidth / inSampleSize >= reqWidth) {
                inSampleSize *= 2
            }
        }

        return inSampleSize
    }

    private fun android.database.Cursor.getNullableLong(columnIndex: Int): Long? {
        return if (isNull(columnIndex)) null else getLong(columnIndex)
    }
}
