package com.bangla.translator.data

import android.content.Context
import android.content.SharedPreferences

/**
 * Configuration item for an active language pair (Source Language → Target Language).
 */
data class LanguagePairPreference(
    val sourceCode: String,
    val targetCode: String = "en"
)

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

    fun getLanguagePairs(): List<LanguagePairPreference> {
        val raw = prefs.getString(KEY_PAIRS_CONFIG, null)
        if (raw.isNullOrBlank()) {
            return activeSourceLanguages.map { LanguagePairPreference(it, targetLanguageCode) }
        }
        return raw.split(";").filter { it.isNotBlank() }.map {
            val parts = it.split(":")
            LanguagePairPreference(parts[0], if (parts.size > 1) parts[1] else "en")
        }
    }

    fun saveLanguagePairs(pairs: List<LanguagePairPreference>) {
        val limited = pairs.take(MAX_ACTIVE_LANGUAGES)
        val raw = limited.joinToString(";") { "${it.sourceCode}:${it.targetCode}" }
        prefs.edit().putString(KEY_PAIRS_CONFIG, raw).apply()
        activeSourceLanguages = limited.map { it.sourceCode }.toSet()
        if (limited.isNotEmpty()) {
            sourceLanguageCode = limited[0].sourceCode
            targetLanguageCode = limited[0].targetCode
        }
    }

    fun addLanguagePair(sourceCode: String, targetCode: String = "en"): Boolean {
        val pairs = getLanguagePairs().toMutableList()
        if (pairs.any { it.sourceCode == sourceCode }) return true
        if (pairs.size >= MAX_ACTIVE_LANGUAGES) return false
        pairs.add(LanguagePairPreference(sourceCode, targetCode))
        saveLanguagePairs(pairs)
        return true
    }

    fun removeLanguagePair(sourceCode: String): Boolean {
        val pairs = getLanguagePairs().toMutableList()
        if (pairs.size <= 1) return false
        val removed = pairs.removeAll { it.sourceCode == sourceCode }
        if (removed) {
            saveLanguagePairs(pairs)
        }
        return removed
    }

    fun replaceLanguagePair(oldSourceCode: String, newSourceCode: String, targetCode: String = "en"): Boolean {
        val pairs = getLanguagePairs().toMutableList()
        val index = pairs.indexOfFirst { it.sourceCode == oldSourceCode }
        if (index != -1) {
            pairs[index] = LanguagePairPreference(newSourceCode, targetCode)
        } else {
            if (pairs.size >= MAX_ACTIVE_LANGUAGES) {
                pairs[pairs.size - 1] = LanguagePairPreference(newSourceCode, targetCode)
            } else {
                pairs.add(LanguagePairPreference(newSourceCode, targetCode))
            }
        }
        saveLanguagePairs(pairs)
        return true
    }

    fun addActiveSourceLanguage(code: String): Boolean {
        return addLanguagePair(code, targetLanguageCode)
    }

    fun removeActiveSourceLanguage(code: String): Boolean {
        return removeLanguagePair(code)
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
        const val KEY_PAIRS_CONFIG = "key_pairs_config"
        const val KEY_AUTO_DETECT_PROMPT = "key_auto_detect_prompt"
        const val MAX_ACTIVE_LANGUAGES = 3
    }
}
