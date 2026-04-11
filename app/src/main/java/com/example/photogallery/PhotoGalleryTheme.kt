package com.example.photogallery

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight

val LightGreenOverlay = Color(0xBFDCEFD2)
val LightGreenOverlayStrong = Color(0xD9DCEFD2)
val HandDrawnInk = Color(0xFF40513A)

private val DefaultTypography = Typography()
private val CaveatBoldFontFamily = FontFamily(Font(R.font.caveat_bold, FontWeight.Bold))

private fun TextStyle.handDrawn(): TextStyle = copy(fontFamily = CaveatBoldFontFamily)

private val HandDrawnTypography = Typography(
    displayLarge = DefaultTypography.displayLarge.handDrawn(),
    displayMedium = DefaultTypography.displayMedium.handDrawn(),
    displaySmall = DefaultTypography.displaySmall.handDrawn(),
    headlineLarge = DefaultTypography.headlineLarge.handDrawn(),
    headlineMedium = DefaultTypography.headlineMedium.handDrawn(),
    headlineSmall = DefaultTypography.headlineSmall.handDrawn(),
    titleLarge = DefaultTypography.titleLarge.handDrawn(),
    titleMedium = DefaultTypography.titleMedium.handDrawn(),
    titleSmall = DefaultTypography.titleSmall.handDrawn(),
    bodyLarge = DefaultTypography.bodyLarge.handDrawn(),
    bodyMedium = DefaultTypography.bodyMedium.handDrawn(),
    bodySmall = DefaultTypography.bodySmall.handDrawn(),
    labelLarge = DefaultTypography.labelLarge.handDrawn(),
    labelMedium = DefaultTypography.labelMedium.handDrawn(),
    labelSmall = DefaultTypography.labelSmall.handDrawn()
)

private val PhotoGalleryColorScheme = lightColorScheme(
    primary = LightGreenOverlayStrong,
    onPrimary = HandDrawnInk,
    secondary = LightGreenOverlayStrong,
    onSecondary = HandDrawnInk,
    primaryContainer = LightGreenOverlay,
    onPrimaryContainer = HandDrawnInk,
    secondaryContainer = LightGreenOverlay,
    onSecondaryContainer = HandDrawnInk,
    surface = LightGreenOverlay,
    onSurface = HandDrawnInk,
    surfaceVariant = LightGreenOverlay,
    onSurfaceVariant = HandDrawnInk
)

@Composable
fun PhotoGalleryTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = PhotoGalleryColorScheme,
        typography = HandDrawnTypography,
        content = content
    )
}
