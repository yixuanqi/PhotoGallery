package com.example.photogallery.ui.detail

import android.graphics.BitmapFactory
import android.os.Build
import android.util.Size
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.sizeIn
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.example.photogallery.ui.photo.PhotoData
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Composable
fun PhotoDetailScreen(
    photos: List<PhotoData>,
    currentIndex: Int,
    onIndexChange: (Int) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    if (photos.isEmpty()) return

    val index = currentIndex.coerceIn(0, photos.lastIndex)
    val photo = photos[index]
    val context = LocalContext.current
    var preview by remember(photo.cacheKey) { mutableStateOf<ImageBitmap?>(null) }
    var failed by remember(photo.cacheKey) { mutableStateOf(false) }
    var showToolbar by remember { mutableStateOf(true) }

    LaunchedEffect(photo.cacheKey) {
        failed = false
        preview = runCatching {
            withContext(Dispatchers.IO) {
                val resolver = context.contentResolver
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    resolver.loadThumbnail(photo.uri, Size(1440, 1440), null).asImageBitmap()
                } else {
                    val bitmap = resolver.openInputStream(photo.uri)?.use { input ->
                        BitmapFactory.decodeStream(input)
                    }
                    bitmap?.asImageBitmap() ?: error("Unable to decode preview")
                }
            }
        }.onFailure {
            failed = true
        }.getOrNull()
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xEE10140F))
            .clickable { showToolbar = !showToolbar }
            .padding(20.dp)
    ) {
        if (preview != null) {
            Image(
                bitmap = preview!!,
                contentDescription = null,
                modifier = Modifier
                    .align(Alignment.Center)
                    .sizeIn(maxWidth = 720.dp, maxHeight = 720.dp)
                    .fillMaxWidth(),
                contentScale = ContentScale.Fit
            )
        } else {
            Text(
                text = if (failed) "照片暂时无法打开" else "正在打开照片",
                color = Color(0xFFF7F5EA),
                modifier = Modifier.align(Alignment.Center)
            )
        }

        if (showToolbar) {
            Column(
                modifier = Modifier.align(Alignment.TopCenter),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "${index + 1} / ${photos.size}",
                    color = Color(0xFFF7F5EA)
                )
                TextButton(onClick = onDismiss) {
                    Text("返回")
                }
            }

            Row(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Button(
                    enabled = index > 0,
                    onClick = { onIndexChange(index - 1) }
                ) {
                    Text("上一张")
                }
                Button(
                    enabled = index < photos.lastIndex,
                    onClick = { onIndexChange(index + 1) }
                ) {
                    Text("下一张")
                }
            }
        }
    }
}
