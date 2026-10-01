package com.bangla.translator.translation

/**
 * Backwards-compatible facade delegating to Universal LanguageDetector.
 */
object BengaliDetector {
    fun isBengaliChar(ch: Char): Boolean = ch.code in 0x0980..0x09FF

    fun isBengaliCodePoint(codePoint: Int): Boolean = codePoint in 0x0980..0x09FF

    fun isBengali(text: CharSequence?, threshold: Float = 0.20f): Boolean {
        return LanguageDetector.isTargetLanguageMessage(text, "bn", threshold)
    }
}
