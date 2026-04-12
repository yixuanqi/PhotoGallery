package com.example.photogallery.ui.timeline

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.photogallery.HandDrawnInk
import com.example.photogallery.LightGreenOverlay
import com.example.photogallery.R

@Composable
fun TimeIndicator(
    group: PhotoGroup,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    Surface(
        modifier = modifier,
        color = LightGreenOverlay,
        contentColor = HandDrawnInk,
        shape = MaterialTheme.shapes.small,
        shadowElevation = 3.dp
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = formatPhotoGroupLabel(group, context),
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = stringResource(R.string.timeline_count_total, group.count),
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}
