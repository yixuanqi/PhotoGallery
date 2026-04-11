package com.example.photogallery.ui.photo

import android.Manifest
import android.app.Application
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class PhotoGalleryViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = PhotoRepository(application.applicationContext)
    private val thumbnailCache = ThumbnailCache()
    private val loadingKeys = mutableSetOf<String>()
    private var viewportJob: Job? = null

    private val _photos = MutableStateFlow<List<PhotoData>>(emptyList())
    val photos: StateFlow<List<PhotoData>> = _photos.asStateFlow()

    private val _photoStates = MutableStateFlow<Map<String, PhotoState>>(emptyMap())
    val photoStates: StateFlow<Map<String, PhotoState>> = _photoStates.asStateFlow()

    private val _permissionState = MutableStateFlow<PhotoPermissionState>(PhotoPermissionState.Unknown)
    val permissionState: StateFlow<PhotoPermissionState> = _permissionState.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    fun checkPermissionOnResume() {
        val nextState = resolvePermissionState(getApplication())
        if (_permissionState.value != nextState) {
            _permissionState.value = nextState
            if (nextState == PhotoPermissionState.Denied) {
                clearPhotos()
            } else {
                loadPhotos()
            }
        }
    }

    fun loadPhotos() {
        val currentPermission = resolvePermissionState(getApplication())
        _permissionState.value = currentPermission
        if (currentPermission == PhotoPermissionState.Denied) {
            clearPhotos()
            return
        }

        viewModelScope.launch {
            _isLoading.value = true
            runCatching { repository.queryPhotos() }
                .onSuccess { photos ->
                    _photos.value = photos
                    val validKeys = photos.mapTo(mutableSetOf()) { it.cacheKey }
                    _photoStates.value = _photoStates.value.filterKeys { it in validKeys }
                }
                .onFailure {
                    _photos.value = emptyList()
                    _photoStates.value = emptyMap()
                }
            _isLoading.value = false
        }
    }

    fun onViewportChanged(
        visibleRange: IntRange,
        preloadRange: IntRange,
        targetWidthPx: Int,
        targetHeightPx: Int
    ) {
        viewportJob?.cancel()
        viewportJob = viewModelScope.launch {
            delay(100)
            val photos = _photos.value
            if (photos.isEmpty()) return@launch
            val loadRange = normalizeRange(visibleRange, preloadRange, photos.lastIndex)
            loadRange.forEach { index ->
                val photo = photos[index]
                loadThumbnailIfNeeded(photo, targetWidthPx, targetHeightPx)
            }
        }
    }

    fun reloadPermissionLimitedPhotos() {
        loadPhotos()
    }

    private fun loadThumbnailIfNeeded(photo: PhotoData, targetWidthPx: Int, targetHeightPx: Int) {
        val key = photo.cacheKey
        val cached = thumbnailCache.get(key)
        if (cached != null) {
            updatePhotoState(key, PhotoState.Loaded(cached))
            return
        }
        if (loadingKeys.contains(key) || _photoStates.value[key] is PhotoState.Loaded) return

        loadingKeys += key
        updatePhotoState(key, PhotoState.Loading)
        viewModelScope.launch {
            runCatching {
                repository.loadThumbnail(photo.uri, targetWidthPx, targetHeightPx)
            }.onSuccess { bitmap ->
                thumbnailCache.put(key, bitmap)
                updatePhotoState(key, PhotoState.Loaded(bitmap))
            }.onFailure { error ->
                updatePhotoState(key, PhotoState.Failed(error.message))
            }
            loadingKeys -= key
        }
    }

    private fun updatePhotoState(key: String, state: PhotoState) {
        _photoStates.value = _photoStates.value.toMutableMap().apply {
            put(key, state)
        }
    }

    private fun clearPhotos() {
        viewportJob?.cancel()
        loadingKeys.clear()
        thumbnailCache.clear()
        _photos.value = emptyList()
        _photoStates.value = emptyMap()
        _isLoading.value = false
    }

    private fun normalizeRange(visibleRange: IntRange, preloadRange: IntRange, lastIndex: Int): IntRange {
        val start = minOf(visibleRange.first, preloadRange.first).coerceIn(0, lastIndex)
        val end = maxOf(visibleRange.last, preloadRange.last).coerceIn(0, lastIndex)
        return start..end
    }

    companion object {
        fun requiredPermissions(): Array<String> {
            return when {
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE -> arrayOf(
                    Manifest.permission.READ_MEDIA_IMAGES,
                    Manifest.permission.READ_MEDIA_VISUAL_USER_SELECTED
                )
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU -> arrayOf(
                    Manifest.permission.READ_MEDIA_IMAGES
                )
                else -> arrayOf(Manifest.permission.READ_EXTERNAL_STORAGE)
            }
        }

        fun resolvePermissionState(context: Context): PhotoPermissionState {
            return when {
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE -> {
                    val hasFull = ContextCompat.checkSelfPermission(
                        context,
                        Manifest.permission.READ_MEDIA_IMAGES
                    ) == PackageManager.PERMISSION_GRANTED
                    val hasLimited = ContextCompat.checkSelfPermission(
                        context,
                        Manifest.permission.READ_MEDIA_VISUAL_USER_SELECTED
                    ) == PackageManager.PERMISSION_GRANTED

                    when {
                        hasFull -> PhotoPermissionState.GrantedFull
                        hasLimited -> PhotoPermissionState.GrantedLimited
                        else -> PhotoPermissionState.Denied
                    }
                }
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU -> {
                    if (ContextCompat.checkSelfPermission(
                            context,
                            Manifest.permission.READ_MEDIA_IMAGES
                        ) == PackageManager.PERMISSION_GRANTED
                    ) {
                        PhotoPermissionState.GrantedFull
                    } else {
                        PhotoPermissionState.Denied
                    }
                }
                else -> {
                    if (ContextCompat.checkSelfPermission(
                            context,
                            Manifest.permission.READ_EXTERNAL_STORAGE
                        ) == PackageManager.PERMISSION_GRANTED
                    ) {
                        PhotoPermissionState.GrantedFull
                    } else {
                        PhotoPermissionState.Denied
                    }
                }
            }
        }
    }
}
