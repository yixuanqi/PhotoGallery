package com.example.photogallery

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import com.example.photogallery.ui.background.BackgroundRenderer
import com.example.photogallery.ui.rope.RopeWithClips
import com.example.photogallery.ui.rope.RopeWithClipsConfig
import com.example.photogallery.ui.rope.ClipStyle
import com.example.photogallery.ui.rope.RopeStyle
import com.example.photogallery.ui.rope.PhotoStyle

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { MaterialTheme { PhotoGalleryScreen() } }
    }
}

@Composable
fun PhotoGalleryScreen() {
    Box(modifier = Modifier.fillMaxSize()) {
        BackgroundRenderer(modifier = Modifier.fillMaxSize())
        RopeWithClips(
            modifier = Modifier.fillMaxSize(),
            config = RopeWithClipsConfig(
                clipCount = 15,
                cacheEachSide = 3,
                ropeStyle = RopeStyle(
                    sagAmount = 35f,
                    jitterAmount = 4f,
                    sampleCount = 120,
                    baseStrokeWidth = 5f,
                    twistCount = 3,
                    fiberAlpha = 0.3f,
                    shadowOffset = 4f,
                    shadowAlpha = 0.12f,
                    highlightAlpha = 0.25f
                ),
                clipStyle = ClipStyle(
                    totalHeight = 72f,
                    headWidth = 15f,
                    gripWidth = 11f,
                    bodyWidth = 20f,
                    headLength = 18f,
                    gripLength = 13f,
                    bodyLength = 44f,
                    springHeight = 12f,
                    strokeWidth = 1.4f,
                    woodLight = Color(0xFFC9B896),
                    woodMid = Color(0xFFA89878),
                    woodDark = Color(0xFF8A7A60),
                    woodShadow = Color(0xFF6A5A48),
                    springColor = Color(0xFF8A9A8C),
                    shadowColor = Color(0x30000000)
                ),
                photoStyle = PhotoStyle(
                    photoWidth = 130f,
                    photoHeight = 155f,
                    borderSize = 14f,
                    cornerRadius = 3f,
                    rotationRange = 5f,
                    shadowOffsetX = 6f,
                    shadowOffsetY = 8f,
                    shadowAlpha = 0.12f,
                    shadowBlur = 12f,
                    borderColor = Color(0xFFF5F0E6),
                    photoAreaColor = Color(0xFFD4E4D0),
                    photoGradientTop = Color(0xFFE8F0E4),
                    photoGradientBot = Color(0xFFB8D0B4),
                    curlChance = 0.55f,
                    curlAmount = 12f,
                    edgeIrregularity = 2.5f,
                    wavyEdgeChance = 0.4f,
                    highlightAlpha = 0.15f
                ),
                ropeColor = Color(0xFF8A9A78),
                verticalOffsetDp = 200,
                seed = 42L
            )
        )
    }
}
