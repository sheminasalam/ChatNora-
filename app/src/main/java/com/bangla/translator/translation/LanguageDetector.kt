package com.bangla.translator.translation

import java.util.regex.Pattern

/**
 * Universal language detector supporting 19+ languages on WhatsApp.
 * Correctly distinguishes foreign language text from English-only text,
 * URLs, timestamps, numbers, and emojis.
 */
object LanguageDetector {

    private val URL_PATTERN = Pattern.compile(
        "^https?://[\\w.-]+(?:\\.[\\w\\.-]+)+[/#?]?.*$",
        Pattern.CASE_INSENSITIVE
    )
    private val TIMESTAMP_PATTERN = Pattern.compile(
        "^\\d{1,2}:\\d{2}(?:\\s?[APap][Mm])?$"
    )
    private val AUDIO_DURATION_PATTERN = Pattern.compile(
        "^\\d{1,2}:\\d{2}$"
    )

    // Spanish signature words for Latin-script detection
    private val SPANISH_WORDS = setOf(
        "hola", "que", "por", "para", "como", "pero", "amigo", "bien", "gracias",
        "esta", "estoy", "donde", "cuando", "todo", "nada", "quiero", "mucho",
        "noche", "buenas", "buenos", "dias", "tarde", "casa", "hacer", "vamos",
        "favor", "tiempo", "ahora", "siempre", "nunca", "trabajo", "hermano"
    )

    // French signature words
    private val FRENCH_WORDS = setOf(
        "bonjour", "salut", "merci", "comment", "allez", "vous", "avec", "pour",
        "bien", "dans", "nous", "cette", "aussi", "faire", "plus", "bonsoir"
    )

    // German signature words
    private val GERMAN_WORDS = setOf(
        "hallo", "danke", "bitte", "nicht", "guten", "morgen", "abend", "alles",
        "wie", "gehts", "oder", "auch", "noch", "nach", "zeit", "freund"
    )

    // Portuguese signature words
    private val PORTUGUESE_WORDS = setOf(
        "ola", "obrigado", "obrigada", "voce", "para", "como", "esta", "estou",
        "tudo", "bom", "boa", "noite", "amigo", "muito", "fazer", "vamos"
    )

    fun isTargetLanguageMessage(
        text: CharSequence?,
        sourceLangCode: String = "bn",
        threshold: Float = 0.20f
    ): Boolean {
        if (text.isNullOrBlank()) return false
        val trimmed = text.toString().trim()
        if (trimmed.length < 2) return false

        // Fast exclusion for URLs, timestamps, audio tags
        if (URL_PATTERN.matcher(trimmed).matches()) return false
        if (TIMESTAMP_PATTERN.matcher(trimmed).matches()) return false
        if (AUDIO_DURATION_PATTERN.matcher(trimmed).matches()) return false

        return when (sourceLangCode.lowercase()) {
            "bn" -> checkUnicodeBlock(trimmed, 0x0980..0x09FF, threshold)
            "hi", "mr" -> checkUnicodeBlock(trimmed, 0x0900..0x097F, threshold)
            "ar", "ur" -> checkUnicodeBlock(trimmed, 0x0600..0x06FF, threshold)
            "ru" -> checkUnicodeBlock(trimmed, 0x0400..0x04FF, threshold)
            "zh" -> checkUnicodeBlock(trimmed, 0x4E00..0x9FFF, threshold)
            "ja" -> checkJapanese(trimmed, threshold)
            "ko" -> checkUnicodeBlock(trimmed, 0xAC00..0xD7AF, threshold)
            "ta" -> checkUnicodeBlock(trimmed, 0x0B80..0x0BFF, threshold)
            "te" -> checkUnicodeBlock(trimmed, 0x0C00..0x0C7F, threshold)
            "es" -> checkSpanish(trimmed)
            "fr" -> checkFrench(trimmed)
            "de" -> checkGerman(trimmed)
            "pt" -> checkPortuguese(trimmed)
            else -> {
                // Generic foreign check: if contains any non-Latin or accented character
                hasAnyForeignCharacter(trimmed)
            }
        }
    }

    private fun checkUnicodeBlock(text: String, range: IntRange, threshold: Float): Boolean {
        var matchCount = 0
        var totalLetters = 0
        for (ch in text) {
            val code = ch.code
            if (code in range) {
                matchCount++
                totalLetters++
            } else if (ch.isLetter()) {
                totalLetters++
            }
        }
        if (totalLetters == 0) return false
        return (matchCount.toFloat() / totalLetters) >= threshold
    }

    private fun checkJapanese(text: String, threshold: Float): Boolean {
        var matchCount = 0
        var totalLetters = 0
        for (ch in text) {
            val code = ch.code
            // Hiragana (0x3040..0x309F), Katakana (0x30A0..0x30FF), or Kanji (0x4E00..0x9FFF)
            if (code in 0x3040..0x30FF || code in 0x4E00..0x9FFF) {
                matchCount++
                totalLetters++
            } else if (ch.isLetter()) {
                totalLetters++
            }
        }
        if (totalLetters == 0) return false
        return (matchCount.toFloat() / totalLetters) >= threshold
    }

    private fun checkSpanish(text: String): Boolean {
        val lower = text.lowercase()
        // Check for Spanish diacritics: ñ, á, é, í, ó, ú, ¿, ¡, ü
        if (lower.any { it in "ñáéíóú¿¡ü" }) return true

        // Check for Spanish signature words
        val words = lower.split(Regex("[^\\p{L}]+"))
        var spanishHits = 0
        for (w in words) {
            if (w in SPANISH_WORDS) spanishHits++
        }
        return spanishHits >= 1 && words.size >= 1
    }

    private fun checkFrench(text: String): Boolean {
        val lower = text.lowercase()
        if (lower.any { it in "éàèêëîïôöùûüçœæ" }) return true
        val words = lower.split(Regex("[^\\p{L}]+"))
        return words.any { it in FRENCH_WORDS }
    }

    private fun checkGerman(text: String): Boolean {
        val lower = text.lowercase()
        if (lower.any { it in "äöüß" }) return true
        val words = lower.split(Regex("[^\\p{L}]+"))
        return words.any { it in GERMAN_WORDS }
    }

    private fun checkPortuguese(text: String): Boolean {
        val lower = text.lowercase()
        if (lower.any { it in "ãõçáéíóúâêô" }) return true
        val words = lower.split(Regex("[^\\p{L}]+"))
        return words.any { it in PORTUGUESE_WORDS }
    }

    private fun hasAnyForeignCharacter(text: String): Boolean {
        for (ch in text) {
            val code = ch.code
            // Non-ASCII letter or Latin accented
            if (code > 0x007F && ch.isLetter()) return true
        }
        return false
    }
}
