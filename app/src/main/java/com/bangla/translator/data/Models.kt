package com.bangla.translator.data

import android.graphics.Rect

/**
 * Unique key for positioning and tracking an overlay on screen during a specific session generation.
 * Note: Session generation is tied to the active conversation.
 */
data class DisplayKey(
    val sessionGeneration: Long,
    val normalizedText: String,
    val screenX: Int,
    val screenY: Int
) {
    override fun toString(): String = "gen_${sessionGeneration}_${normalizedText.hashCode()}_${screenX}_${screenY}"
}

/**
 * Message detected from the WhatsApp accessibility tree with detected language code.
 */
data class ScannedMessage(
    val originalText: String,
    val normalizedText: String,
    val bounds: Rect,
    val displayKey: String,
    val languageCode: String = "bn"
)

/**
 * Result of an asynchronous translation task.
 */
data class TranslationResult(
    val originalText: String,
    val normalizedText: String,
    val translatedText: String,
    val sessionGeneration: Long,
    val targetBounds: Rect,
    val displayKey: String,
    val languageCode: String = "bn"
)

/**
 * Represents the status of the local ML Kit translation model.
 */
sealed class ModelDownloadState {
    object NotDownloaded : ModelDownloadState()
    object Downloading : ModelDownloadState()
    object Ready : ModelDownloadState()
    data class Error(val message: String) : ModelDownloadState()
}
