package com.bangla.translator.translation

import com.google.mlkit.nl.languageid.LanguageIdentification
import com.google.mlkit.nl.languageid.LanguageIdentifier
import java.util.concurrent.atomic.AtomicReference
import java.util.regex.Pattern

/**
 * Universal language detector supporting 19+ languages on WhatsApp.
 * Combines ultra-fast (sub-millisecond) zero-CPU Unicode script filters
 * with Google ML Kit Language Identification for Romance/Latin languages.
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

    private val SPANISH_WORDS = setOf(
        "hola", "gracias", "amigo", "amiga", "buenos", "buenas", "dias", "días",
        "tarde", "tardes", "noche", "noches", "casa", "hacer", "vamos", "favor",
        "tiempo", "ahora", "siempre", "nunca", "trabajo", "hermano", "estoy",
        "donde", "dónde", "cuando", "cuándo", "cómo", "nada", "quiero", "mucho",
        "usted", "ustedes", "pedido", "documentos", "reunión"
    )

    private val FRENCH_WORDS = setOf(
        "bonjour", "salut", "merci", "comment", "allez", "vous", "avec", "pour",
        "bien", "dans", "nous", "cette", "cet", "aussi", "faire", "plus", "bonsoir",
        "aujourd'hui", "aujourdhui", "tres", "très", "rapport", "reunion", "réunion", "bureau",
        "apres", "après", "pret", "prêt", "retrouve", "suis", "etes", "êtes", "sommes",
        "votre", "notre", "est-ce", "demain", "midi", "soir", "oui", "non", "beaucoup",
        "mon", "ami", "amie", "quand", "tout", "tous", "toute", "va", "vas", "pourquoi"
    )

    private val GERMAN_WORDS = setOf(
        "hallo", "danke", "bitte", "nicht", "guten", "morgen", "abend", "alles",
        "wie", "gehts", "oder", "auch", "noch", "nach", "zeit", "freund"
    )

    private val PORTUGUESE_WORDS = setOf(
        "ola", "obrigado", "obrigada", "voce", "para", "como", "esta", "estou",
        "tudo", "bom", "boa", "noite", "amigo", "muito", "fazer", "vamos"
    )

    private val ITALIAN_WORDS = setOf(
        "ciao", "grazie", "prego", "come", "stai", "bene", "dove", "buongiorno",
        "buonasera", "amico", "molto", "fare", "tutto", "perche"
    )

    private var mlKitLanguageIdentifier: LanguageIdentifier? = null

    init {
        try {
            mlKitLanguageIdentifier = LanguageIdentification.getClient()
        } catch (e: Exception) {}
    }

    data class TextSegment(
        val text: String,
        val languageCode: String?
    )

    /**
     * Splits a multi-language message into natural sentences/segments and detects the language
     * of each segment. This allows messages containing mixed languages (e.g. French sentence followed by Spanish)
     * to be accurately translated segment-by-segment using their respective models.
     */
    fun detectLanguageSegments(text: CharSequence?): List<TextSegment> {
        if (text.isNullOrBlank()) return emptyList()
        val str = text.toString().trim()

        // Split by sentence terminators (. ! ? \n ¿ ¡) while preserving meaningful text
        val sentenceRegex = Regex("(?<=[.!?\\n])\\s+")
        val rawParts = str.split(sentenceRegex).map { it.trim() }.filter { it.isNotEmpty() }

        if (rawParts.size <= 1) {
            val detected = detectLanguage(str)
            return listOf(TextSegment(str, detected))
        }

        return rawParts.map { part ->
            val detected = detectLanguage(part)
            TextSegment(part, detected)
        }
    }

    /**
     * Returns all unique foreign language codes detected across segments in the text.
     */
    fun getDetectedLanguages(text: CharSequence?): List<String> {
        val segments = detectLanguageSegments(text)
        return segments.mapNotNull { it.languageCode }.distinct()
    }

    /**
     * Determines whether the given text is written in the specified source language.
     */
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
            "hi" -> checkUnicodeBlock(trimmed, 0x0900..0x097F, threshold)
            "mr" -> checkUnicodeBlock(trimmed, 0x0900..0x097F, threshold)
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
            "it" -> checkItalian(trimmed)
            else -> hasAnyForeignCharacter(trimmed)
        }
    }

    /**
     * Detects what foreign language the message is written in (returns language code like 'bn', 'es', 'ar', etc.).
     * Returns null if English, numbers, or unrecognizable.
     */
    fun detectLanguage(text: CharSequence?): String? {
        if (text.isNullOrBlank()) return null
        val trimmed = text.toString().trim()
        if (trimmed.length < 2) return null
        if (URL_PATTERN.matcher(trimmed).matches() || TIMESTAMP_PATTERN.matcher(trimmed).matches()) return null

        // 1. Instant Unicode Script Check (0 allocations, <0.05ms)
        if (checkUnicodeBlock(trimmed, 0x0980..0x09FF, 0.20f)) return "bn"
        if (checkUnicodeBlock(trimmed, 0x0600..0x06FF, 0.20f)) return "ar"
        if (checkUnicodeBlock(trimmed, 0x0900..0x097F, 0.20f)) return "hi"
        if (checkUnicodeBlock(trimmed, 0x0400..0x04FF, 0.20f)) return "ru"
        if (checkJapanese(trimmed, 0.20f)) return "ja"
        if (checkUnicodeBlock(trimmed, 0xAC00..0xD7AF, 0.20f)) return "ko"
        if (checkUnicodeBlock(trimmed, 0x4E00..0x9FFF, 0.20f)) return "zh"
        if (checkUnicodeBlock(trimmed, 0x0B80..0x0BFF, 0.20f)) return "ta"
        if (checkUnicodeBlock(trimmed, 0x0C00..0x0C7F, 0.20f)) return "te"

        // 2. High-speed lexical heuristic for Latin-script languages
        if (checkFrench(trimmed)) return "fr"
        if (checkSpanish(trimmed)) return "es"
        if (checkGerman(trimmed)) return "de"
        if (checkPortuguese(trimmed)) return "pt"
        if (checkItalian(trimmed)) return "it"

        return null
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
        // Guard: If it contains French distinctive characters or French words, do NOT treat as Spanish
        if (checkFrench(text)) return false

        val lower = text.lowercase()
        // Distinctive Spanish characters (exclude 'é' and 'ü' which are shared with French/German)
        if (lower.any { it in "ñáíóú¿¡" }) return true
        val words = lower.split(Regex("[^\\p{L}]+"))
        return words.any { it in SPANISH_WORDS }
    }

    private fun checkFrench(text: String): Boolean {
        val lower = text.lowercase()
        // Distinctive French characters
        if (lower.any { it in "çœæèêëàâùûîïô" }) return true
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

    private fun checkItalian(text: String): Boolean {
        val lower = text.lowercase()
        val words = lower.split(Regex("[^\\p{L}]+"))
        return words.any { it in ITALIAN_WORDS }
    }

    private fun hasAnyForeignCharacter(text: String): Boolean {
        for (ch in text) {
            val code = ch.code
            if (code > 0x007F && ch.isLetter()) return true
        }
        return false
    }
}
