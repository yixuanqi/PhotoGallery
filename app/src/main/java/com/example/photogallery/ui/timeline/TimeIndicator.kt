package com.example.photogallery.ui.timeline

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.photogallery.HandDrawnInk
import com.example.photogallery.LightGreenOverlay

@Composable
fun TimeIndicator(
    group: PhotoGroup,
    modifier: Modifier = Modifier
) {
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
                text = group.label,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = "共 ${group.count} 张",
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}
