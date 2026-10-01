package com.bangla.translator.data

import com.google.mlkit.nl.translate.TranslateLanguage

data class LanguageItem(
    val code: String,
    val name: String,
    val nativeName: String,
    val mlKitCode: String
) {
    override fun toString(): String = "$name ($nativeName)"
}

object SupportedLanguages {
    val ALL = listOf(
        LanguageItem("bn", "Bengali", "বাংলা", TranslateLanguage.BENGALI),
        LanguageItem("es", "Spanish", "Español", TranslateLanguage.SPANISH),
        LanguageItem("hi", "Hindi", "हिंदी", TranslateLanguage.HINDI),
        LanguageItem("ar", "Arabic", "العربية", TranslateLanguage.ARABIC),
        LanguageItem("fr", "French", "Français", TranslateLanguage.FRENCH),
        LanguageItem("de", "German", "Deutsch", TranslateLanguage.GERMAN),
        LanguageItem("pt", "Portuguese", "Português", TranslateLanguage.PORTUGUESE),
        LanguageItem("ru", "Russian", "Русский", TranslateLanguage.RUSSIAN),
        LanguageItem("zh", "Chinese", "中文", TranslateLanguage.CHINESE),
        LanguageItem("ja", "Japanese", "日本語", TranslateLanguage.JAPANESE),
        LanguageItem("it", "Italian", "Italiano", TranslateLanguage.ITALIAN),
        LanguageItem("tr", "Turkish", "Türkçe", TranslateLanguage.TURKISH),
        LanguageItem("ur", "Urdu", "اردو", TranslateLanguage.URDU),
        LanguageItem("id", "Indonesian", "Bahasa Indonesia", TranslateLanguage.INDONESIAN),
        LanguageItem("ko", "Korean", "한국어", TranslateLanguage.KOREAN),
        LanguageItem("vi", "Vietnamese", "Tiếng Việt", TranslateLanguage.VIETNAMESE),
        LanguageItem("ta", "Tamil", "தமிழ்", TranslateLanguage.TAMIL),
        LanguageItem("te", "Telugu", "తెలుగు", TranslateLanguage.TELUGU),
        LanguageItem("mr", "Marathi", "मराठी", TranslateLanguage.MARATHI)
    )

    val TARGET_LANGUAGES = listOf(
        LanguageItem("en", "English", "English", TranslateLanguage.ENGLISH),
        LanguageItem("es", "Spanish", "Español", TranslateLanguage.SPANISH),
        LanguageItem("fr", "French", "Français", TranslateLanguage.FRENCH),
        LanguageItem("de", "German", "Deutsch", TranslateLanguage.GERMAN),
        LanguageItem("bn", "Bengali", "বাংলা", TranslateLanguage.BENGALI),
        LanguageItem("hi", "Hindi", "हिंदी", TranslateLanguage.HINDI),
        LanguageItem("ar", "Arabic", "العربية", TranslateLanguage.ARABIC)
    )

    fun findByCode(code: String): LanguageItem {
        return ALL.find { it.code.equals(code, ignoreCase = true) }
            ?: TARGET_LANGUAGES.find { it.code.equals(code, ignoreCase = true) }
            ?: ALL[0]
    }
}
