package com.bangla.translator.scanner

import android.graphics.Rect
import android.os.Build
import android.view.accessibility.AccessibilityNodeInfo
import com.bangla.translator.data.ScannedMessage
import com.bangla.translator.translation.LanguageDetector
import java.util.ArrayDeque
import java.util.regex.Pattern

data class ScanResult(
    val messages: List<ScannedMessage>,
    val inputBarTop: Int?,
    val detectedUninstalledLanguage: String? = null,
    val sampleUninstalledText: String? = null
)

/**
 * High-performance WhatsApp message scanner supporting multiple simultaneous active language packs (up to 3)
 * with on-the-fly detection of new foreign languages in chats.
 */
class WhatsAppMessageScanner(
    private val activeSourceLanguages: Set<String> = setOf("bn"),
    private val ratioThreshold: Float = 0.20f
) {

    // Secondary constructor for single language backwards compatibility
    constructor(sourceLangCode: String, ratioThreshold: Float = 0.20f) : this(setOf(sourceLangCode), ratioThreshold)

    companion object {
        val SUPPORTED_PACKAGES = setOf("com.whatsapp", "com.whatsapp.w4b")

        private val PHONE_NUMBER_PATTERN = Pattern.compile("^[+]?[0-9\\s-]{7,16}$")
        private val SYSTEM_NOTICE_PATTERNS = listOf(
            "end-to-end encrypted",
            "messages and calls are end-to-end",
            "waiting for this message",
            "security code changed",
            "tap to learn more"
        )
        private val STATUS_INDICATORS = setOf(
            "online", "typing...", "recording audio...", "last seen", "swipe to reply"
        )
        private val ACTION_BUTTONS = setOf(
            "call", "pay", "search", "attach", "send", "voice message", "back", "more options"
        )
    }

    /**
     * Traverses the active accessibility node hierarchy to discover visible messages in any of the
     * active languages, and detects if an uninstalled language is present.
     */
    fun scanVisibleMessages(
        root: AccessibilityNodeInfo?,
        screenBounds: Rect,
        sessionGeneration: Long
    ): ScanResult {
        if (root == null) {
            return ScanResult(emptyList(), null, null)
        }

        val pkgName = root.packageName?.toString() ?: ""
        if (pkgName !in SUPPORTED_PACKAGES) {
            return ScanResult(emptyList(), null, null)
        }

        val results = mutableListOf<ScannedMessage>()
        var detectedInputBarTop: Int? = null
        var uninstalledLanguageDetected: String? = null
        var sampleUninstalledText: String? = null

        val queue = ArrayDeque<AccessibilityNodeInfo>()
        queue.add(AccessibilityNodeInfo.obtain(root))

        val tempBounds = Rect()
        val pBounds = Rect()
        var visitedNodesCount = 0
        val maxNodesToTraverse = 600

        try {
            while (!queue.isEmpty() && visitedNodesCount < maxNodesToTraverse && results.size < 50) {
                val node = queue.poll() ?: continue
                visitedNodesCount++

                try {
                    // Check for WhatsApp typing/input bar to delimit scrollable chat bounds
                    val isEditText = node.className?.toString()?.contains("EditText") == true ||
                            (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && node.isFocused && node.isEditable)

                    if (isEditText && node.isVisibleToUser) {
                        node.getBoundsInScreen(tempBounds)
                        if (tempBounds.top > screenBounds.height() * 0.40f) {
                            if (detectedInputBarTop == null || tempBounds.top < detectedInputBarTop) {
                                detectedInputBarTop = tempBounds.top
                            }
                        }
                    }

                    val isLeafOrText = node.childCount == 0 ||
                            node.className?.toString()?.contains("TextView") == true ||
                            node.className?.toString()?.contains("TextEmojiLabel") == true

                    if (node.isVisibleToUser && isLeafOrText) {
                        node.getBoundsInScreen(tempBounds)

                        if (tempBounds.width() > 15 && tempBounds.height() > 15 &&
                            tempBounds.intersects(0, 0, screenBounds.width(), screenBounds.height())
                        ) {
                            val candidateText = (node.text ?: node.contentDescription)?.toString()

                            if (!candidateText.isNullOrBlank() && !node.isEditable && !isNonMessageText(node, candidateText)) {
                                if (!isInsideQuotedMessage(node)) {
                                    val normalized = candidateText.trim().replace(Regex("\\s+"), " ")

                                    // 1. Check if candidate belongs to any of the active languages
                                    val detectedLangs = LanguageDetector.detectAllLanguages(candidateText)
                                    val matchedActiveLangs = detectedLangs.filter { it in activeSourceLanguages }

                                    var matchedLang: String? = if (matchedActiveLangs.isNotEmpty()) {
                                        matchedActiveLangs.joinToString(",")
                                    } else {
                                        // Fallback legacy heuristic check
                                        var found: String? = null
                                        val orderedLangs = activeSourceLanguages.sortedWith { a, b ->
                                            when {
                                                a == "fr" && b == "es" -> -1
                                                a == "es" && b == "fr" -> 1
                                                else -> 0
                                            }
                                        }
                                        for (lang in orderedLangs) {
                                            if (LanguageDetector.isTargetLanguageMessage(candidateText, lang, ratioThreshold)) {
                                                found = lang
                                                break
                                            }
                                        }
                                        found
                                    }

                                    if (matchedLang != null) {
                                        val bubbleBounds = Rect(tempBounds)

                                        var currentParent: AccessibilityNodeInfo? = node.parent
                                        var depth = 0
                                        try {
                                            while (currentParent != null && depth < 3) {
                                                currentParent.getBoundsInScreen(pBounds)
                                                if (pBounds.width() in (tempBounds.width() + 4)..screenBounds.width() &&
                                                    pBounds.height() >= tempBounds.height() &&
                                                    pBounds.height() <= (screenBounds.height() * 0.75f).toInt()
                                                ) {
                                                    bubbleBounds.set(pBounds)
                                                }
                                                val nextParent = currentParent.parent
                                                if (currentParent != node) currentParent.recycle()
                                                currentParent = nextParent
                                                depth++
                                            }
                                        } catch (e: Exception) {
                                        } finally {
                                            currentParent?.recycle()
                                        }

                                        val isOutgoing = bubbleBounds.right > screenBounds.width() * 0.78f || bubbleBounds.left > screenBounds.width() * 0.40f
                                        val isIncoming = !isOutgoing
                                        val yBucket = bubbleBounds.top / 80
                                        val displayKey = "msg_${sessionGeneration}_${normalized.hashCode()}_${if (isIncoming) "in" else "out"}_b$yBucket"

                                        val isDuplicate = results.any { existing ->
                                            existing.normalizedText == normalized &&
                                                    Math.abs(existing.bounds.top - bubbleBounds.top) < 40 &&
                                                    Math.abs(existing.bounds.left - bubbleBounds.left) < 60
                                        }

                                        if (!isDuplicate) {
                                            results.add(
                                                ScannedMessage(
                                                    originalText = candidateText,
                                                    normalizedText = normalized,
                                                    bounds = Rect(bubbleBounds),
                                                    displayKey = displayKey,
                                                    languageCode = matchedLang
                                                )
                                            )
                                        }
                                    } else {
                                        // 2. Check if candidate text is in an uninstalled language (smart auto-detect)
                                        if (uninstalledLanguageDetected == null) {
                                            val detectedCode = LanguageDetector.detectLanguage(candidateText)
                                            if (detectedCode != null && !activeSourceLanguages.contains(detectedCode) && detectedCode != "en") {
                                                uninstalledLanguageDetected = detectedCode
                                                sampleUninstalledText = candidateText
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Enqueue children
                    val childCount = node.childCount
                    for (i in 0 until childCount) {
                        val child = node.getChild(i)
                        if (child != null) {
                            queue.add(child)
                        }
                    }
                } finally {
                    node.recycle()
                }
            }
        } finally {
            while (!queue.isEmpty()) {
                queue.poll()?.recycle()
            }
        }

        return ScanResult(results, detectedInputBarTop, uninstalledLanguageDetected, sampleUninstalledText)
    }

    private fun isInsideQuotedMessage(node: AccessibilityNodeInfo): Boolean {
        val directId = node.viewIdResourceName?.lowercase() ?: ""
        if (directId.contains("quoted") || directId.contains("quote") || directId.contains("reply")) {
            return true
        }

        var current: AccessibilityNodeInfo? = node
        try {
            for (depth in 0..3) {
                val parent = current?.parent ?: break
                val parentId = parent.viewIdResourceName?.lowercase() ?: ""
                if (parentId.contains("quoted") || parentId.contains("quote") || parentId.contains("reply_container")) {
                    parent.recycle()
                    return true
                }
                if (current != node) {
                    current?.recycle()
                }
                current = parent
            }
        } finally {
            if (current != null && current != node) {
                current.recycle()
            }
        }
        return false
    }

    private fun isNonMessageText(node: AccessibilityNodeInfo, text: String): Boolean {
        val lower = text.trim().lowercase()

        if (PHONE_NUMBER_PATTERN.matcher(lower).matches()) return true
        if (lower in STATUS_INDICATORS) return true
        if (lower in ACTION_BUTTONS) return true
        if (SYSTEM_NOTICE_PATTERNS.any { lower.contains(it) }) return true

        val resId = node.viewIdResourceName?.lowercase() ?: ""
        if (resId.contains("conversation_contact_name") ||
            resId.contains("conversation_title") ||
            resId.contains("toolbar") ||
            resId.contains("action_bar") ||
            resId.contains("tab_title")
        ) {
            return true
        }

        return false
    }
}
