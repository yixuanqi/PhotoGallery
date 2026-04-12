package com.example.photogallery.ui.timeline

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.photogallery.HandDrawnInk
import com.example.photogallery.LightGreenOverlay

@Composable
fun TimelineSelector(
    groups: List<PhotoGroup>,
    onGroupSelected: (PhotoGroup) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.18f))
            .clickable(onClick = onDismiss),
        contentAlignment = Alignment.BottomCenter
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(max = 244.dp)
                .pointerInput(Unit) { detectTapGestures { } },
            color = LightGreenOverlay,
            contentColor = HandDrawnInk,
            shape = MaterialTheme.shapes.small,
            shadowElevation = 6.dp
        ) {
            Column(
                modifier = Modifier
                    .background(LightGreenOverlay)
                    .padding(horizontal = 18.dp, vertical = 14.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = "跳到月份",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                if (groups.isEmpty()) {
                    Text(
                        text = "暂无可定位的照片",
                        style = MaterialTheme.typography.bodyMedium
                    )
                } else {
                    LazyColumn(
                        modifier = Modifier.heightIn(max = 164.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        items(groups) { group ->
                            TimelineSelectorRow(
                                group = group,
                                onClick = { onGroupSelected(group) }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TimelineSelectorRow(
    group: PhotoGroup,
    onClick: () -> Unit
) {
    TextButton(
        modifier = Modifier.fillMaxWidth(),
        colors = ButtonDefaults.textButtonColors(
            containerColor = LightGreenOverlay,
            contentColor = HandDrawnInk
        ),
        onClick = onClick
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = group.label,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Medium
            )
            Text(
                text = "${group.count} 张",
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
}
