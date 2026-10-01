package com.bangla.translator.data

import android.content.Context
import android.content.SharedPreferences

/**
 * Manages user preferences for overlays, notifications, multi-language active pairs (max 3),
 * and intelligent on-device language pack detection.
 */
class AppPreferences(context: Context) {
    private val prefs: SharedPreferences = context.applicationContext.getSharedPreferences(
        PREFS_NAME,
        Context.MODE_PRIVATE
    )

    var isOverlayEnabled: Boolean
        get() = prefs.getBoolean(KEY_OVERLAY_ENABLED, true)
        set(value) = prefs.edit().putBoolean(KEY_OVERLAY_ENABLED, value).apply()

    var isNotificationTranslationEnabled: Boolean
        get() = prefs.getBoolean(KEY_NOTIFICATION_ENABLED, false)
        set(value) = prefs.edit().putBoolean(KEY_NOTIFICATION_ENABLED, value).apply()

    var bengaliRatioThreshold: Float
        get() = prefs.getFloat(KEY_BENGALI_RATIO, 0.20f)
        set(value) = prefs.edit().putFloat(KEY_BENGALI_RATIO, value).apply()

    var sourceLanguageCode: String
        get() = prefs.getString(KEY_SOURCE_LANG, "bn") ?: "bn"
        set(value) {
            prefs.edit().putString(KEY_SOURCE_LANG, value).apply()
            addActiveSourceLanguage(value)
        }

    var targetLanguageCode: String
        get() = prefs.getString(KEY_TARGET_LANG, "en") ?: "en"
        set(value) = prefs.edit().putString(KEY_TARGET_LANG, value).apply()

    var isAutoDetectPromptEnabled: Boolean
        get() = prefs.getBoolean(KEY_AUTO_DETECT_PROMPT, true)
        set(value) = prefs.edit().putBoolean(KEY_AUTO_DETECT_PROMPT, value).apply()

    /**
     * Active source language codes (up to 3 simultaneous pairs to protect phone RAM & storage).
     * Example: ["bn", "es", "ar"]
     */
    var activeSourceLanguages: Set<String>
        get() {
            val raw = prefs.getString(KEY_ACTIVE_SOURCE_LANGS, null)
            return if (raw.isNullOrBlank()) {
                setOf(sourceLanguageCode)
            } else {
                raw.split(",").filter { it.isNotBlank() }.toSet().ifEmpty { setOf("bn") }
            }
        }
        set(value) {
            val limited = value.take(MAX_ACTIVE_LANGUAGES).toSet()
            prefs.edit().putString(KEY_ACTIVE_SOURCE_LANGS, limited.joinToString(",")).apply()
        }

    fun addActiveSourceLanguage(code: String): Boolean {
        val current = activeSourceLanguages.toMutableSet()
        if (current.contains(code)) return true
        if (current.size >= MAX_ACTIVE_LANGUAGES) {
            return false // Limit of 3 reached
        }
        current.add(code)
        activeSourceLanguages = current
        return true
    }

    fun removeActiveSourceLanguage(code: String): Boolean {
        val current = activeSourceLanguages.toMutableSet()
        if (current.size <= 1 && current.contains(code)) {
            return false // Keep at least one primary language active
        }
        val removed = current.remove(code)
        if (removed) {
            activeSourceLanguages = current
            if (sourceLanguageCode == code) {
                sourceLanguageCode = current.firstOrNull() ?: "bn"
            }
        }
        return removed
    }

    fun isLanguageActive(code: String): Boolean {
        return activeSourceLanguages.contains(code.lowercase())
    }

    val languagePairLabel: String
        get() {
            val src = SupportedLanguages.findByCode(sourceLanguageCode)
            val trg = SupportedLanguages.findByCode(targetLanguageCode)
            return "${src.nativeName} → ${trg.name}"
        }

    val badgeLabel: String
        get() = targetLanguageCode.uppercase()

    fun registerListener(listener: SharedPreferences.OnSharedPreferenceChangeListener) {
        prefs.registerOnSharedPreferenceChangeListener(listener)
    }

    fun unregisterListener(listener: SharedPreferences.OnSharedPreferenceChangeListener) {
        prefs.unregisterOnSharedPreferenceChangeListener(listener)
    }

    companion object {
        private const val PREFS_NAME = "universal_translator_prefs"
        const val KEY_OVERLAY_ENABLED = "key_overlay_enabled"
        const val KEY_NOTIFICATION_ENABLED = "key_notification_enabled"
        const val KEY_BENGALI_RATIO = "key_bengali_ratio"
        const val KEY_SOURCE_LANG = "key_source_lang"
        const val KEY_TARGET_LANG = "key_target_lang"
        const val KEY_ACTIVE_SOURCE_LANGS = "key_active_source_langs"
        const val KEY_AUTO_DETECT_PROMPT = "key_auto_detect_prompt"
        const val MAX_ACTIVE_LANGUAGES = 3
    }
}
