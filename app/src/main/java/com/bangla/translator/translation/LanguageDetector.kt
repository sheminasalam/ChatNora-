package com.bangla.translator.translation

import com.google.mlkit.nl.languageid.LanguageIdentification
import com.google.mlkit.nl.languageid.LanguageIdentifier
import java.util.regex.Pattern

/**
 * Universal language detector supporting 19+ languages on WhatsApp.
 * Combines ultra-fast (sub-millisecond) zero-CPU Unicode script filters
 * with Google ML Kit Language Identification for Romance/Latin languages.
 * Features intelligent segment decomposition for multi-language single messages
 * (forwarded headers, paragraphs, and sentence boundaries).
 */
object LanguageDetector {

    data class TextSegment(
        val rawSegment: String,
        val prefix: String,
        val body: String,
        val detectedLanguage: String?
    )

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

    // Forwarded message timestamp & author prefix regex:
    // Matches e.g. "[10/3, 12:25 PM] Shemin A Salam: " or "10/3/24, 12:25 - Shemin A Salam: "
    private val FORWARDED_HEADER_SPLIT_REGEX = Regex(
        "(?=(?:\\[?\\d{1,2}[/.-]\\d{1,2}(?:[/.-]\\d{2,4})?,?\\s+\\d{1,2}:\\d{2}(?::\\d{2})?(?:\\s*[AaPp][Mm])?\\]?\\s*(?:-\\s*)?[^:\\n]+:\\s*))"
    )

    private val FORWARDED_PREFIX_REGEX = Regex(
        "^(\\[?\\d{1,2}[/.-]\\d{1,2}(?:[/.-]\\d{2,4})?,?\\s+\\d{1,2}:\\d{2}(?::\\d{2})?(?:\\s*[AaPp][Mm])?\\]?\\s*(?:-\\s*)?[^:\\n]+:\\s*)"
    )

    private val SPANISH_WORDS = setOf(
        "hola", "gracias", "amigo", "amiga", "buenos", "buenas", "dias", "días",
        "tarde", "tardes", "noche", "noches", "casa", "hacer", "vamos", "favor",
        "tiempo", "ahora", "siempre", "nunca", "trabajo", "hermano", "estoy",
        "donde", "dónde", "cuando", "cuándo", "cómo", "nada", "quiero", "mucho",
        "usted", "ustedes", "pedido", "documentos", "reunión", "me", "llamo",
        "cada", "mañana", "despierto", "siete", "levanto", "lavo", "cara",
        "preparo", "café", "leche", "ocho", "salgo", "ciudad", "regreso",
        "cocino", "cena", "unacena", "ligera", "leo", "libro", "dormir", "vida",
        "antes", "mateo", "para", "por", "las", "los", "del", "con", "una"
    )

    private val FRENCH_WORDS = setOf(
        "bonjour", "salut", "merci", "comment", "allez", "vous", "avec", "pour",
        "bien", "dans", "nous", "cette", "cet", "aussi", "faire", "plus", "bonsoir",
        "aujourd'hui", "aujourdhui", "tres", "très", "rapport", "reunion", "réunion", "bureau",
        "apres", "après", "pret", "prêt", "retrouve", "suis", "etes", "êtes", "sommes",
        "votre", "notre", "est-ce", "demain", "midi", "soir", "oui", "non", "beaucoup",
        "mon", "ami", "amie", "quand", "tout", "tous", "toute", "va", "vas", "pourquoi",
        "touristique", "charmante", "place", "cathédrale", "maisons", "anciennes", "restos",
        "hôtels", "boutiques", "rez-de-chaussée", "maison", "restaurant", "construit",
        "étages", "supérieurs", "rajoutés", "siècle", "colombages", "sculptés", "est",
        "une", "méli-mélo", "strasbourg", "kammerzell", "sont"
    )

    private val GERMAN_WORDS = setOf(
        "hallo", "danke", "bitte", "nicht", "guten", "morgen", "abend", "alles",
        "wie", "gehts", "oder", "auch", "noch", "nach", "zeit", "freund", "treffen"
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

    /**
     * Determines whether the given text contains content written in the specified source language.
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

        // Check if any segment matches this language
        val segments = splitMultilingualSegments(trimmed)
        for (seg in segments) {
            val body = seg.body.trim()
            if (body.isEmpty()) continue
            val matches = when (sourceLangCode.lowercase()) {
                "bn" -> checkUnicodeBlock(body, 0x0980..0x09FF, threshold)
                "hi" -> checkUnicodeBlock(body, 0x0900..0x097F, threshold)
                "mr" -> checkUnicodeBlock(body, 0x0900..0x097F, threshold)
                "ar", "ur" -> checkUnicodeBlock(body, 0x0600..0x06FF, threshold)
                "ru" -> checkUnicodeBlock(body, 0x0400..0x04FF, threshold)
                "zh" -> checkUnicodeBlock(body, 0x4E00..0x9FFF, threshold)
                "ja" -> checkJapanese(body, threshold)
                "ko" -> checkUnicodeBlock(body, 0xAC00..0xD7AF, threshold)
                "ta" -> checkUnicodeBlock(body, 0x0B80..0x0BFF, threshold)
                "te" -> checkUnicodeBlock(body, 0x0C00..0x0C7F, threshold)
                "es" -> checkSpanish(body)
                "fr" -> checkFrench(body)
                "de" -> checkGerman(body)
                "pt" -> checkPortuguese(body)
                "it" -> checkItalian(body)
                else -> hasAnyForeignCharacter(body)
            }
            if (matches) return true
        }

        return false
    }

    /**
     * Splits a potentially multilingual message into cohesive segments:
     * 1. Forwarded headers with timestamps and names.
     * 2. Paragraphs / newlines.
     * 3. Sentence boundaries (when multiple languages exist in an unformatted block).
     */
    fun splitMultilingualSegments(text: String): List<TextSegment> {
        val trimmed = text.trim()
        if (trimmed.isEmpty()) return emptyList()

        // 1. Try splitting by forwarded message headers
        val forwardedChunks = trimmed.split(FORWARDED_HEADER_SPLIT_REGEX).filter { it.isNotBlank() }
        if (forwardedChunks.size > 1) {
            val segments = forwardedChunks.map { chunk ->
                val prefixMatch = FORWARDED_PREFIX_REGEX.find(chunk)
                val prefix = prefixMatch?.value ?: ""
                val body = chunk.substring(prefix.length)
                TextSegment(
                    rawSegment = chunk,
                    prefix = prefix,
                    body = body,
                    detectedLanguage = detectSingleSegmentLanguage(body)
                )
            }
            val distinctLangs = segments.mapNotNull { it.detectedLanguage }.distinct()
            if (distinctLangs.size > 1) {
                return segments
            }
        }

        // 2. Try splitting by paragraph newlines if text has newlines
        val paragraphs = trimmed.split(Regex("\\n+")).filter { it.isNotBlank() }
        if (paragraphs.size > 1) {
            val segments = paragraphs.map { p ->
                val prefixMatch = FORWARDED_PREFIX_REGEX.find(p)
                val prefix = prefixMatch?.value ?: ""
                val body = p.substring(prefix.length)
                TextSegment(
                    rawSegment = p,
                    prefix = prefix,
                    body = body,
                    detectedLanguage = detectSingleSegmentLanguage(body)
                )
            }
            val distinctLangs = segments.mapNotNull { it.detectedLanguage }.distinct()
            if (distinctLangs.size > 1) {
                return segments
            }
        }

        // 3. Try splitting by sentence boundaries if multiple languages exist in one block
        val sentences = trimmed.split(Regex("(?<=[.!?])\\s+")).filter { it.isNotBlank() }
        if (sentences.size > 1) {
            val sentenceSegments = mutableListOf<TextSegment>()
            var currentPrefix = ""
            var currentLang: String? = null
            var currentBuffer = StringBuilder()

            for (s in sentences) {
                val prefixMatch = FORWARDED_PREFIX_REGEX.find(s)
                val prefix = prefixMatch?.value ?: ""
                val body = s.substring(prefix.length)
                val sLang = detectSingleSegmentLanguage(body)

                if (currentLang == null) {
                    currentPrefix = prefix
                    currentLang = sLang
                    currentBuffer.append(body)
                } else if (sLang != null && sLang != currentLang) {
                    sentenceSegments.add(
                        TextSegment(
                            rawSegment = "$currentPrefix$currentBuffer",
                            prefix = currentPrefix,
                            body = currentBuffer.toString(),
                            detectedLanguage = currentLang
                        )
                    )
                    currentPrefix = prefix
                    currentLang = sLang
                    currentBuffer = StringBuilder(body)
                } else {
                    currentBuffer.append(" ").append(body)
                }
            }

            if (currentBuffer.isNotEmpty()) {
                sentenceSegments.add(
                    TextSegment(
                        rawSegment = "$currentPrefix$currentBuffer",
                        prefix = currentPrefix,
                        body = currentBuffer.toString(),
                        detectedLanguage = currentLang
                    )
                )
            }

            val distinctSentenceLangs = sentenceSegments.mapNotNull { it.detectedLanguage }.distinct()
            if (distinctSentenceLangs.size > 1) {
                return sentenceSegments
            }
        }

        // 4. Fallback: single segment
        val prefixMatch = FORWARDED_PREFIX_REGEX.find(trimmed)
        val prefix = prefixMatch?.value ?: ""
        val body = trimmed.substring(prefix.length)
        return listOf(
            TextSegment(
                rawSegment = trimmed,
                prefix = prefix,
                body = body,
                detectedLanguage = detectSingleSegmentLanguage(body)
            )
        )
    }

    /**
     * Returns all distinct foreign languages detected inside the text (e.g. ["fr", "es"]).
     */
    fun detectAllLanguages(text: CharSequence?): List<String> {
        if (text.isNullOrBlank()) return emptyList()
        val segments = splitMultilingualSegments(text.toString())
        val langs = segments.mapNotNull { it.detectedLanguage }.distinct()
        if (langs.isNotEmpty()) return langs
        val single = detectSingleSegmentLanguage(text.toString())
        return if (single != null) listOf(single) else emptyList()
    }

    /**
     * Detects what foreign language the message is written in.
     */
    fun detectLanguage(text: CharSequence?): String? {
        if (text.isNullOrBlank()) return null
        val trimmed = text.toString().trim()
        if (trimmed.length < 2) return null
        if (URL_PATTERN.matcher(trimmed).matches() || TIMESTAMP_PATTERN.matcher(trimmed).matches()) return null

        val langs = detectAllLanguages(trimmed)
        return langs.firstOrNull()
    }

    /**
     * Evaluates a single isolated text block/body for language identification.
     */
    private fun detectSingleSegmentLanguage(body: String): String? {
        val trimmed = body.trim()
        if (trimmed.length < 2) return null
        if (URL_PATTERN.matcher(trimmed).matches() || TIMESTAMP_PATTERN.matcher(trimmed).matches()) return null

        // 1. Instant Unicode Script Check
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

        // 3. Google ML Kit On-Device Language Identification fallback for Latin/multilingual texts
        try {
            val identifier = mlKitLanguageIdentifier
            if (identifier != null && trimmed.length >= 6) {
                val task = identifier.identifyLanguage(trimmed)
                val lang = com.google.android.gms.tasks.Tasks.await(task, 400, java.util.concurrent.TimeUnit.MILLISECONDS)
                if (!lang.isNullOrBlank() && lang != "und" && lang.length == 2) {
                    return lang.lowercase()
                }
            }
        } catch (e: Exception) {}

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
        val lower = text.lowercase()
        if (lower.contains('ñ') || lower.contains('¿') || lower.contains('¡')) return true
        val words = lower.split(Regex("[^\\p{L}]+")).filter { it.isNotBlank() }
        val matchCount = words.count { it in SPANISH_WORDS }
        return matchCount >= 2 || (words.size <= 3 && matchCount >= 1)
    }

    private fun checkFrench(text: String): Boolean {
        val lower = text.lowercase()
        if (lower.contains('œ') || lower.contains('æ') || lower.contains("c'est") || lower.contains("j'ai") || lower.contains("d'un")) return true
        val words = lower.split(Regex("[^\\p{L}]+")).filter { it.isNotBlank() }
        val matchCount = words.count { it in FRENCH_WORDS }
        return matchCount >= 2 || (words.size <= 3 && matchCount >= 1)
    }

    private fun checkGerman(text: String): Boolean {
        val lower = text.lowercase()
        if (lower.contains('ß') || lower.contains('ä') || lower.contains('ö') || lower.contains('ü')) return true
        val words = lower.split(Regex("[^\\p{L}]+")).filter { it.isNotBlank() }
        val matchCount = words.count { it in GERMAN_WORDS }
        return matchCount >= 2 || (words.size <= 3 && matchCount >= 1)
    }

    private fun checkPortuguese(text: String): Boolean {
        val lower = text.lowercase()
        if (lower.contains('ã') || lower.contains('õ')) return true
        val words = lower.split(Regex("[^\\p{L}]+")).filter { it.isNotBlank() }
        val matchCount = words.count { it in PORTUGUESE_WORDS }
        return matchCount >= 2 || (words.size <= 3 && matchCount >= 1)
    }

    private fun checkItalian(text: String): Boolean {
        val lower = text.lowercase()
        val words = lower.split(Regex("[^\\p{L}]+")).filter { it.isNotBlank() }
        val matchCount = words.count { it in ITALIAN_WORDS }
        return matchCount >= 2 || (words.size <= 3 && matchCount >= 1)
    }

    private fun hasAnyForeignCharacter(text: String): Boolean {
        return text.any { it.code > 0x007F && it.isLetter() }
    }
}
