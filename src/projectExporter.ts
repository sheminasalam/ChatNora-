import JSZip from 'jszip';

export const ALL_PROJECT_FILES: Record<string, string> = {
  'settings.gradle.kts': `pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\\\.android.*")
                includeGroupByRegex("com\\\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "BanglaWhatsAppTranslator"
include(":app")
`,

  'build.gradle.kts': `// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
    id("com.android.application") version "8.5.2" apply false
    id("org.jetbrains.kotlin.android") version "1.9.24" apply false
}
`,

  'gradle.properties': `# Project-wide Gradle settings.
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.nonTransitiveRClass=true
kotlin.code.style=official
`,

  '.github/workflows/build.yml': `name: Build Bangla WhatsApp Translator APK

on:
  push:
    branches: [ "main", "master" ]
  pull_request:
    branches: [ "main", "master" ]
  workflow_dispatch:

jobs:
  build:
    name: Build Debug APK
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Source Code
        uses: actions/checkout@v4

      - name: Set up Java JDK 17
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
          cache: 'gradle'

      - name: Setup Android SDK & Licenses
        run: |
          yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses || true

      - name: Install & Setup Gradle 8.7
        uses: gradle/actions/setup-gradle@v3
        with:
          gradle-version: '8.7'

      - name: Run Unit Tests
        run: gradle test --stacktrace

      - name: Build Debug APK
        run: gradle assembleDebug --stacktrace

      - name: Rename APK for clarity
        run: |
          mkdir -p build-output
          cp app/build/outputs/apk/debug/app-debug.apk build-output/BanglaWhatsAppTranslator-debug.apk

      - name: Upload Debug APK Artifact
        uses: actions/upload-artifact@v4
        with:
          name: BanglaWhatsAppTranslator-debug
          path: build-output/BanglaWhatsAppTranslator-debug.apk
          retention-days: 14
`,

  'app/build.gradle.kts': `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.bangla.translator"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.bangla.translator"
        minSdk = 24
        targetSdk = 34
        versionCode = 10
        versionName = "2.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            isMinifyEnabled = false
            applicationIdSuffix = ".debug"
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        viewBinding = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.2")

    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.8.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")

    implementation("com.google.mlkit:translate:17.0.3")

    testImplementation("junit:junit:4.13.2")
    testImplementation("androidx.test:core:1.5.0")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.1")
}
`,

  'app/proguard-rules.pro': `# ProGuard rules for Bangla WhatsApp Translator
-keep class com.google.mlkit.nl.translate.** { *; }
-keep class com.google.android.gms.internal.mlkit_translate.** { *; }
-keepclassmembers class * {
    @androidx.annotation.Keep <fields>;
    @androidx.annotation.Keep <methods>;
}
-keepclassmembers class * implements android.os.Parcelable {
    static ** CREATOR;
}
`,

  'app/src/main/AndroidManifest.xml': `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:allowBackup="false"
        android:icon="@drawable/ic_app_launcher"
        android:label="@string/app_name"
        android:roundIcon="@drawable/ic_app_launcher"
        android:supportsRtl="true"
        android:theme="@style/Theme.BanglaWhatsAppTranslator">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="portrait">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <service
            android:name=".service.BanglaAccessibilityService"
            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
            android:exported="true">
            <intent-filter>
                <action android:name="android.accessibilityservice.AccessibilityService" />
            </intent-filter>
            <meta-data
                android:name="android.accessibilityservice"
                android:resource="@xml/accessibility_service_config" />
        </service>

        <service
            android:name=".service.NotificationTranslationService"
            android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE"
            android:exported="true">
            <intent-filter>
                <action android:name="android.service.notification.NotificationListenerService" />
            </intent-filter>
        </service>

    </application>

</manifest>
`,

  'app/src/main/res/xml/accessibility_service_config.xml': `<?xml version="1.0" encoding="utf-8"?>
<accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"
    android:description="@string/accessibility_service_description"
    android:accessibilityEventTypes="typeWindowStateChanged|typeWindowContentChanged|typeViewScrolled|typeWindowsChanged"
    android:accessibilityFlags="flagReportViewIds|flagRetrieveInteractiveWindows"
    android:accessibilityFeedbackType="feedbackGeneric"
    android:notificationTimeout="100"
    android:canRetrieveWindowContent="true"
    android:settingsActivity="com.bangla.translator.MainActivity" />
`,

  'app/src/main/res/values/strings.xml': `<resources>
    <string name="app_name">ChatNora</string>
    <string name="accessibility_service_label">ChatNora Accessibility Service</string>
    <string name="accessibility_service_description">ChatNora detects foreign language messages inside WhatsApp and WhatsApp Business conversations to display instant on-device translations. 100% private, messages never leave your phone.</string>
    <string name="title_status">Service Status</string>
    <string name="accessibility_status_enabled">ChatNora Service is Active</string>
    <string name="accessibility_status_disabled">ChatNora Service is Disabled</string>
    <string name="btn_enable_accessibility">Configure Accessibility</string>
    <string name="title_model">Translation Engine (On-Device ML Kit)</string>
    <string name="model_status_ready">On-Device Model Ready (~30MB)</string>
    <string name="model_status_needed">Model Download Required (~30MB)</string>
    <string name="model_status_downloading">Downloading Translation Model…</string>
    <string name="btn_download_model">Download Language Model</string>
    <string name="title_overlay_settings">In-App Chat Overlay</string>
    <string name="desc_overlay_settings">Display translated text directly alongside WhatsApp chat messages.</string>
    <string name="title_notification_settings">WhatsApp Notification Translation</string>
    <string name="desc_notification_settings">Automatically detect and translate incoming WhatsApp notifications.</string>
    <string name="btn_enable_notification_access">Enable Notification Access</string>
    <string name="title_privacy">Privacy &amp; Security Assurance</string>
    <string name="privacy_body">All translations run 100% locally on your device via Google ML Kit. No message content is ever transmitted over the network or logged to remote servers.</string>
</resources>
`,

  'app/src/main/res/values/colors.xml': `<resources>
    <color name="primary">#0F5132</color>
    <color name="primary_dark">#0A3622</color>
    <color name="accent">#198754</color>
    <color name="whatsapp_green">#25D366</color>
    <color name="background_light">#F8F9FA</color>
    <color name="surface_card">#FFFFFF</color>
    <color name="text_primary">#212529</color>
    <color name="text_secondary">#6C757D</color>
    <color name="status_active">#198754</color>
    <color name="status_inactive">#DC3545</color>
    
    <!-- Polished WhatsApp Inset Overlay Colors (IMAGE 2) -->
    <color name="overlay_incoming_bg">#1F2C34</color>
    <color name="overlay_incoming_stroke">#2A3942</color>
    <color name="overlay_incoming_label">#8696A0</color>

    <color name="overlay_outgoing_bg">#0B2B20</color>
    <color name="overlay_outgoing_stroke">#144635</color>
    <color name="overlay_outgoing_label">#25D366</color>

    <color name="overlay_text">#E9EDEF</color>
</resources>
`,

  'app/src/main/res/drawable/ic_app_launcher.xml': `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="512"
    android:viewportHeight="512">

    <!-- Outer White Halo / Bubble Border -->
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M256,40 C136.7,40 40,136.7 40,256 C40,296.8 51.5,334.9 71.3,367.4 L46,458.8 L141.1,434 C173.3,452.1 210.6,462.4 250.4,462.5 C252.3,462.5 254.1,462.5 256,462.5 C375.3,462.5 472,365.8 472,246.5 C472,127.2 375.3,40 256,40 Z" />

    <!-- Vibrant Green Speech Bubble -->
    <path
        android:fillColor="#25D366"
        android:pathData="M256,58 C146.6,58 58,146.6 58,256 C58,293.4 68.6,328.3 86.7,358.1 L64.8,436.8 L146.5,415.5 C176.1,432 210.2,441.5 246.6,441.6 C248.4,441.6 250,441.6 251.8,441.6 C361.2,441.6 449.8,353 449.8,243.6 C449.8,134.2 361.2,58 256,58 Z" />

    <!-- Inner Green Gradient Accent / Depth Layer -->
    <path
        android:fillColor="#1DA851"
        android:pathData="M256,58 C146.6,58 58,146.6 58,256 C58,266.2 58.8,276.1 60.3,285.8 C68.2,387.8 152.8,441.6 251.8,441.6 C361.2,441.6 449.8,353 449.8,243.6 C449.8,220.1 445.6,197.6 438,176.8 C411.4,107.6 340.2,58 256,58 Z" />

    <!-- Top Curved Exchange Arrow (pointing towards A) -->
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M260,145 C305,145 348,168 375,202 L350,212 L405,232 L405,172 L385,188 C354,148 308,124 258,124 C235,124 212,129 192,138 L203,158 C220,150 240,145 260,145 Z" />

    <!-- Bottom Curved Exchange Arrow (pointing towards 文) -->
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M252,367 C207,367 164,344 137,310 L162,300 L107,280 L107,340 L127,324 C158,364 204,388 254,388 C277,388 300,383 320,374 L309,354 C292,362 272,367 252,367 Z" />

    <!-- Universal Translation Character '文' (Wen) -->
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M182,160 L204,160 C206,175 204,192 196,204 L178,198 C182,188 184,175 182,160 Z" />
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M124,204 L258,204 L258,225 L124,225 Z" />
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M198,225 C190,265 168,305 125,335 L110,318 C148,292 170,258 178,225 Z" />
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M165,248 L184,235 C202,265 228,298 266,326 L250,342 C210,310 182,275 165,248 Z" />

    <!-- Bold White English Letter 'A' -->
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M344,182 L320,335 L342,335 L350,285 L392,285 L400,335 L422,335 L398,182 L376,182 Z M354,266 L371,212 L388,266 L354,266 Z" />
</vector>
`,

  'app/src/main/res/drawable/bg_overlay_incoming.xml': `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="@color/overlay_incoming_bg" />
    <stroke
        android:width="0.8dp"
        android:color="@color/overlay_incoming_stroke" />
    <corners android:radius="14dp" />
</shape>
`,

  'app/src/main/res/drawable/bg_overlay_outgoing.xml': `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="@color/overlay_outgoing_bg" />
    <stroke
        android:width="0.8dp"
        android:color="@color/overlay_outgoing_stroke" />
    <corners android:radius="14dp" />
</shape>
`,

  'app/src/main/res/values/themes.xml': `<resources>
    <style name="Theme.BanglaWhatsAppTranslator" parent="Theme.Material3.DayNight.NoActionBar">
        <item name="colorPrimary">@color/primary</item>
        <item name="colorPrimaryDark">@color/primary_dark</item>
        <item name="colorSecondary">@color/accent</item>
        <item name="android:statusBarColor">@color/primary_dark</item>
        <item name="android:windowBackground">@color/background_light</item>
    </style>
</resources>
`,

  'app/src/main/res/layout/activity_main.xml': `<?xml version="1.0" encoding="utf-8"?>
<ScrollView xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:fillViewport="true"
    android:background="@color/background_light">
    <!-- Clean Material 3 Settings Dashboard -->
</ScrollView>
`,

  'app/src/main/res/layout/layout_translation_overlay.xml': `<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:id="@+id/flOverlayContainer"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content">

    <!-- Collapsed State: Compact Translate Icon Badge (Default) -->
    <LinearLayout
        android:id="@+id/llCollapsedBadge"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center_vertical"
        android:background="@drawable/bg_overlay_incoming"
        android:paddingStart="7dp"
        android:paddingTop="3.5dp"
        android:paddingEnd="8dp"
        android:paddingBottom="3.5dp"
        android:clickable="true"
        android:focusable="true">

        <ImageView
            android:id="@+id/ivBadgeIcon"
            android:layout_width="12dp"
            android:layout_height="12dp"
            android:src="@drawable/ic_translate"
            android:contentDescription="Translate"
            app:tint="@color/overlay_incoming_label" />

        <TextView
            android:id="@+id/tvBadgeText"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginStart="3.5dp"
            android:text="EN"
            android:textSize="9.5sp"
            android:textStyle="bold"
            android:textColor="@color/overlay_incoming_label"
            android:includeFontPadding="false" />
    </LinearLayout>

    <!-- Expanded State: Full Attached Translation Inset (Shown on Click) -->
    <LinearLayout
        android:id="@+id/llExpandedCard"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:orientation="vertical"
        android:visibility="gone"
        android:background="@drawable/bg_overlay_incoming"
        android:paddingStart="10dp"
        android:paddingTop="5dp"
        android:paddingEnd="10dp"
        android:paddingBottom="6dp"
        android:clickable="true"
        android:focusable="true">

        <TextView
            android:id="@+id/tvLanguageLabel"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="বাংলা → English"
            android:textSize="10.5sp"
            android:textColor="@color/overlay_incoming_label"
            android:includeFontPadding="false"
            android:letterSpacing="0.02" />

        <TextView
            android:id="@+id/tvTranslatedText"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="2.5dp"
            android:textColor="@color/overlay_text"
            android:textSize="13.5sp"
            android:textStyle="normal"
            android:lineSpacingExtra="1.5dp"
            android:includeFontPadding="false"
            android:maxLines="8"
            android:ellipsize="end"
            android:textIsSelectable="false" />
    </LinearLayout>

</FrameLayout>
`,

  'app/src/main/java/com/bangla/translator/data/Models.kt': `package com.bangla.translator.data

import android.graphics.Rect

data class DisplayKey(
    val sessionGeneration: Long,
    val normalizedText: String,
    val screenX: Int,
    val screenY: Int
)

data class ScannedMessage(
    val originalText: String,
    val normalizedText: String,
    val bounds: Rect,
    val displayKey: String
)

sealed class ModelDownloadState {
    object NotDownloaded : ModelDownloadState()
    object Downloading : ModelDownloadState()
    object Ready : ModelDownloadState()
    data class Error(val message: String) : ModelDownloadState()
}
`,

  'app/src/main/java/com/bangla/translator/data/SupportedLanguages.kt': `package com.bangla.translator.data

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
`,

  'app/src/main/java/com/bangla/translator/data/AppPreferences.kt': `package com.bangla.translator.data

import android.content.Context
import android.content.SharedPreferences

class AppPreferences(context: Context) {
    private val prefs: SharedPreferences = context.applicationContext.getSharedPreferences(
        "universal_translator_prefs",
        Context.MODE_PRIVATE
    )

    var isOverlayEnabled: Boolean
        get() = prefs.getBoolean("key_overlay_enabled", true)
        set(value) = prefs.edit().putBoolean("key_overlay_enabled", value).apply()

    var isNotificationTranslationEnabled: Boolean
        get() = prefs.getBoolean("key_notification_enabled", false)
        set(value) = prefs.edit().putBoolean("key_notification_enabled", value).apply()

    var bengaliRatioThreshold: Float
        get() = prefs.getFloat("key_bengali_ratio", 0.20f)
        set(value) = prefs.edit().putFloat("key_bengali_ratio", value).apply()

    var sourceLanguageCode: String
        get() = prefs.getString("key_source_lang", "bn") ?: "bn"
        set(value) = prefs.edit().putString("key_source_lang", value).apply()

    var targetLanguageCode: String
        get() = prefs.getString("key_target_lang", "en") ?: "en"
        set(value) = prefs.edit().putString("key_target_lang", value).apply()

    val languagePairLabel: String
        get() {
            val src = SupportedLanguages.findByCode(sourceLanguageCode)
            val trg = SupportedLanguages.findByCode(targetLanguageCode)
            return "\${src.nativeName} → \${trg.name}"
        }

    val badgeLabel: String
        get() = targetLanguageCode.uppercase()

    fun registerListener(listener: SharedPreferences.OnSharedPreferenceChangeListener) {
        prefs.registerOnSharedPreferenceChangeListener(listener)
    }

    fun unregisterListener(listener: SharedPreferences.OnSharedPreferenceChangeListener) {
        prefs.unregisterOnSharedPreferenceChangeListener(listener)
    }
}
`,

  'app/src/main/java/com/bangla/translator/translation/LanguageDetector.kt': `package com.bangla.translator.translation

import java.util.regex.Pattern

object LanguageDetector {
    private val URL_PATTERN = Pattern.compile("^https?://[\\\\w.-]+(?:\\\\.[\\\\w\\\\.-]+)+[/#?]?.*$", Pattern.CASE_INSENSITIVE)
    private val TIMESTAMP_PATTERN = Pattern.compile("^\\\\d{1,2}:\\\\d{2}(?:\\\\s?[APap][Mm])?$")

    fun isTargetLanguageMessage(text: CharSequence?, sourceLangCode: String = "bn", threshold: Float = 0.20f): Boolean {
        if (text.isNullOrBlank()) return false
        val trimmed = text.toString().trim()
        if (trimmed.length < 2) return false
        if (URL_PATTERN.matcher(trimmed).matches() || TIMESTAMP_PATTERN.matcher(trimmed).matches()) return false

        return when (sourceLangCode.lowercase()) {
            "bn" -> checkUnicodeBlock(trimmed, 0x0980..0x09FF, threshold)
            "hi", "mr" -> checkUnicodeBlock(trimmed, 0x0900..0x097F, threshold)
            "ar", "ur" -> checkUnicodeBlock(trimmed, 0x0600..0x06FF, threshold)
            "ru" -> checkUnicodeBlock(trimmed, 0x0400..0x04FF, threshold)
            "zh" -> checkUnicodeBlock(trimmed, 0x4E00..0x9FFF, threshold)
            "ko" -> checkUnicodeBlock(trimmed, 0xAC00..0xD7AF, threshold)
            "ja" -> checkJapanese(trimmed, threshold)
            "ta" -> checkUnicodeBlock(trimmed, 0x0B80..0x0BFF, threshold)
            "te" -> checkUnicodeBlock(trimmed, 0x0C00..0x0C7F, threshold)
            else -> {
                val lower = trimmed.lowercase()
                lower.any { it in "ñáéíóú¿¡üçàèêôœãõßäö" } || trimmed.any { it.code > 0x007F && it.isLetter() }
            }
        }
    }

    private fun checkUnicodeBlock(text: String, range: IntRange, threshold: Float): Boolean {
        var matchCount = 0
        var totalLetters = 0
        for (ch in text) {
            if (ch.code in range) { matchCount++; totalLetters++ }
            else if (ch.isLetter()) totalLetters++
        }
        return totalLetters > 0 && (matchCount.toFloat() / totalLetters) >= threshold
    }

    private fun checkJapanese(text: String, threshold: Float): Boolean {
        var matchCount = 0
        var totalLetters = 0
        for (ch in text) {
            if (ch.code in 0x3040..0x30FF || ch.code in 0x4E00..0x9FFF) { matchCount++; totalLetters++ }
            else if (ch.isLetter()) totalLetters++
        }
        return totalLetters > 0 && (matchCount.toFloat() / totalLetters) >= threshold
    }
}
`,

  'app/src/main/java/com/bangla/translator/translation/BengaliDetector.kt': `package com.bangla.translator.translation

import java.util.regex.Pattern

object BengaliDetector {
    private const val BENGALI_START = 0x0980
    private const val BENGALI_END = 0x09FF
    private val URL_PATTERN = Pattern.compile("^https?://[\\\\w.-]+(?:\\\\.[\\\\w\\\\.-]+)+[/#?]?.*$", Pattern.CASE_INSENSITIVE)
    private val TIMESTAMP_PATTERN = Pattern.compile("^\\\\d{1,2}:\\\\d{2}(?:\\\\s?[APap][Mm])?$")

    fun isBengali(text: CharSequence?, threshold: Float = 0.20f): Boolean {
        if (text.isNullOrBlank()) return false
        val trimmed = text.toString().trim()
        if (URL_PATTERN.matcher(trimmed).matches() || TIMESTAMP_PATTERN.matcher(trimmed).matches()) return false

        var bengaliCharCount = 0
        var totalAlphabeticCount = 0
        var i = 0
        while (i < trimmed.length) {
            val codePoint = Character.codePointAt(trimmed, i)
            if (codePoint in BENGALI_START..BENGALI_END) {
                bengaliCharCount++
                totalAlphabeticCount++
            } else if (Character.isLetter(codePoint)) {
                totalAlphabeticCount++
            }
            i += Character.charCount(codePoint)
        }
        if (totalAlphabeticCount == 0) return false
        return (bengaliCharCount.toFloat() / totalAlphabeticCount.toFloat()) >= threshold
    }
}
`,

  'app/src/main/java/com/bangla/translator/translation/TranslationCache.kt': `package com.bangla.translator.translation

import androidx.collection.LruCache
import java.util.regex.Pattern

class TranslationCache(maxEntries: Int = 500) {
    private val cache = object : LruCache<String, String>(maxEntries) {}
    private val whitespaceRegex = Pattern.compile("\\\\s+")

    fun normalize(text: String): String {
        return whitespaceRegex.matcher(text.trim()).replaceAll(" ")
    }

    fun get(text: String): String? = synchronized(cache) { cache.get(normalize(text)) }
    fun put(originalText: String, translatedText: String) = synchronized(cache) { cache.put(normalize(originalText), translatedText) }
}
`,

  'app/src/main/java/com/bangla/translator/translation/TranslationEngine.kt': `package com.bangla.translator.translation

import com.bangla.translator.data.ModelDownloadState
import com.bangla.translator.data.SupportedLanguages
import com.google.android.gms.tasks.Task
import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.common.model.RemoteModelManager
import com.google.mlkit.nl.translate.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.util.concurrent.Executors

object TranslationEngine {
    private val networkExecutor = Executors.newFixedThreadPool(3)
    private var currentSourceLang: String = TranslateLanguage.BENGALI
    private var currentTargetLang: String = TranslateLanguage.ENGLISH
    var sharedTranslator: Translator? = null
    val cache = TranslationCache(500)
    private val _modelState = MutableStateFlow<ModelDownloadState>(ModelDownloadState.NotDownloaded)
    val modelState = _modelState.asStateFlow()

    @Synchronized
    fun setLanguagePair(sourceCode: String, targetCode: String) {
        val srcMl = SupportedLanguages.findByCode(sourceCode).mlKitCode
        val trgMl = SupportedLanguages.findByCode(targetCode).mlKitCode
        if (srcMl != currentSourceLang || trgMl != currentTargetLang) {
            currentSourceLang = srcMl
            currentTargetLang = trgMl
            sharedTranslator?.close()
            sharedTranslator = null
            cache.clear()
            checkModelAvailability(srcMl)
        }
    }

    fun checkModelAvailability(sourceLangCode: String = currentSourceLang) {
        val modelManager = RemoteModelManager.getInstance()
        val remoteModel = TranslateRemoteModel.Builder(sourceLangCode).build()
        modelManager.isModelDownloaded(remoteModel)
            .addOnSuccessListener { isDownloaded ->
                _modelState.value = if (isDownloaded) ModelDownloadState.Ready else ModelDownloadState.NotDownloaded
            }
            .addOnFailureListener {
                _modelState.value = ModelDownloadState.Error(it.localizedMessage ?: "Unknown model error")
            }
    }

    @Synchronized
    private fun getOrCreateTranslator(): Translator {
        val existing = sharedTranslator
        if (existing != null) return existing
        val options = TranslatorOptions.Builder()
            .setSourceLanguage(currentSourceLang)
            .setTargetLanguage(currentTargetLang)
            .build()
        val translator = Translation.getClient(options)
        sharedTranslator = translator
        return translator
    }

    @Synchronized
    fun prepareModelIfNeeded(
        conditions: DownloadConditions = DownloadConditions.Builder().build(),
        onSuccess: (() -> Unit)? = null,
        onFailure: ((Exception) -> Unit)? = null
    ): Task<Void> {
        _modelState.value = ModelDownloadState.Downloading
        val translator = getOrCreateTranslator()
        val downloadTask = translator.downloadModelIfNeeded(conditions)
        downloadTask.addOnSuccessListener {
            _modelState.value = ModelDownloadState.Ready
            onSuccess?.invoke()
        }.addOnFailureListener { error ->
            _modelState.value = ModelDownloadState.Error(error.localizedMessage ?: "Model download failed")
            onFailure?.invoke(error)
        }
        return downloadTask
    }

    fun deleteModel(sourceLangCode: String = currentSourceLang, onComplete: () -> Unit) {
        val modelManager = RemoteModelManager.getInstance()
        val remoteModel = TranslateRemoteModel.Builder(sourceLangCode).build()
        modelManager.deleteDownloadedModel(remoteModel)
            .addOnCompleteListener {
                sharedTranslator?.close()
                sharedTranslator = null
                checkModelAvailability(sourceLangCode)
                onComplete()
            }
    }

    fun close() {
        sharedTranslator?.close()
        sharedTranslator = null
    }

    fun translate(
        text: String,
        sourceCode: String = currentSourceLang,
        targetCode: String = currentTargetLang,
        onSuccess: (String) -> Unit,
        onFailure: ((Exception) -> Unit)? = null
    ) {
        val cleanText = text.trim()
        if (cleanText.isEmpty()) { onSuccess(""); return }
        val cached = cache.get(cleanText)
        if (cached != null) { onSuccess(cached); return }

        networkExecutor.execute {
            var translatedOnline: String? = null
            try {
                val encodedText = URLEncoder.encode(cleanText, "UTF-8")
                val urlStr = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=\$sourceCode&tl=\$targetCode&dt=t&q=\$encodedText"
                val conn = URL(urlStr).openConnection() as HttpURLConnection
                conn.connectTimeout = 3000
                conn.readTimeout = 3000
                if (conn.responseCode == 200) {
                    val resp = conn.inputStream.bufferedReader().use { it.readText() }
                    val ja = org.json.JSONArray(resp)
                    val sArr = ja.getJSONArray(0)
                    val sb = StringBuilder()
                    for (i in 0 until sArr.length()) sb.append(sArr.getJSONArray(i).getString(0))
                    val r = sb.toString().trim()
                    if (r.isNotEmpty()) translatedOnline = r
                }
            } catch (_: Exception) {}

            if (!translatedOnline.isNullOrBlank() && translatedOnline != cleanText) {
                cache.put(cleanText, translatedOnline)
                onSuccess(translatedOnline)
                return@execute
            }

            try {
                val translator = getOrCreateTranslator()
                translator.translate(cleanText)
                    .addOnSuccessListener { res ->
                        cache.put(cleanText, res)
                        onSuccess(res)
                    }
                    .addOnFailureListener { err -> onFailure?.invoke(err) ?: onSuccess(cleanText) }
            } catch (e: Exception) {
                onFailure?.invoke(e) ?: onSuccess(cleanText)
            }
        }
    }
}
`,

  'app/src/main/java/com/bangla/translator/scanner/WhatsAppMessageScanner.kt': `package com.bangla.translator.scanner

import android.graphics.Rect
import android.view.accessibility.AccessibilityNodeInfo
import com.bangla.translator.data.ScannedMessage
import com.bangla.translator.translation.BengaliDetector
import com.bangla.translator.translation.LanguageDetector
import java.util.ArrayDeque

class WhatsAppMessageScanner(
    private val sourceLangCode: String = "bn",
    private val ratioThreshold: Float = 0.20f
) {
    companion object {
        val SUPPORTED_PACKAGES = setOf("com.whatsapp", "com.whatsapp.w4b")
    }

    fun scanVisibleMessages(root: AccessibilityNodeInfo?, screenBounds: Rect, sessionGeneration: Long): List<ScannedMessage> {
        if (root == null || root.packageName?.toString() !in SUPPORTED_PACKAGES) return emptyList()

        val results = mutableListOf<ScannedMessage>()
        val queue = ArrayDeque<AccessibilityNodeInfo>()
        queue.add(AccessibilityNodeInfo.obtain(root))
        val tempBounds = Rect()

        try {
            while (!queue.isEmpty() && results.size < 50) {
                val node = queue.poll() ?: continue
                try {
                    val isLeafOrText = node.childCount == 0 ||
                            node.className?.toString()?.contains("TextView") == true ||
                            node.className?.toString()?.contains("TextEmojiLabel") == true

                    if (node.isVisibleToUser && isLeafOrText) {
                        node.getBoundsInScreen(tempBounds)
                        if (tempBounds.width() > 15 && tempBounds.height() > 15) {
                            if (!isInsideQuotedMessage(node)) {
                                val text = node.text?.toString()
                                if (!text.isNullOrBlank() && !node.isEditable && LanguageDetector.isTargetLanguageMessage(text, sourceLangCode, ratioThreshold)) {
                                    val norm = text.trim().replace(Regex("\\\\s+"), " ")
                                    val isDup = results.any {
                                        it.normalizedText == norm &&
                                        Math.abs(it.bounds.top - tempBounds.top) < 40 &&
                                        Math.abs(it.bounds.left - tempBounds.left) < 60
                                    }
                                    if (!isDup) {
                                        val key = "gen_\${sessionGeneration}_\${norm.hashCode()}_\${tempBounds.left}_\${tempBounds.top}"
                                        results.add(ScannedMessage(text, norm, Rect(tempBounds), key))
                                    }
                                }
                            }
                        }
                    }
                    for (i in 0 until node.childCount) {
                        node.getChild(i)?.let { queue.add(it) }
                    }
                } finally {
                    node.recycle()
                }
            }
        } finally {
            while (!queue.isEmpty()) queue.poll()?.recycle()
        }
        return results
    }

    private fun isInsideQuotedMessage(node: AccessibilityNodeInfo): Boolean {
        var current: AccessibilityNodeInfo? = node
        try {
            for (d in 0..3) {
                val id = current?.viewIdResourceName?.lowercase() ?: ""
                if (id.contains("quoted") || id.contains("quote") || id.contains("reply")) return true
                val parent = current?.parent ?: break
                if (current != node) current?.recycle()
                current = parent
            }
        } finally {
            if (current != null && current != node) current.recycle()
        }
        return false
    }
}
`,

  'app/src/main/java/com/bangla/translator/overlay/OverlayController.kt': `package com.bangla.translator.overlay

import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Rect
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.content.ContextCompat
import com.bangla.translator.R
import java.util.concurrent.ConcurrentHashMap

class OverlayController(private val context: Context, private val windowManager: WindowManager) {
    data class ActiveOverlay(
        val view: View,
        val displayKey: String,
        val sessionGeneration: Long,
        var currentBounds: Rect,
        var lastScreenBounds: Rect,
        var lastInputBarTop: Int?,
        var overlayScreenRect: Rect = Rect()
    )

    private val activeOverlays = ConcurrentHashMap<String, ActiveOverlay>()
    private var expandedDisplayKey: String? = null
    private var dismissBackdropView: View? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private val density = context.resources.displayMetrics.density
    private val marginPx = (6 * density).toInt()
    private val gapPx = (2 * density).toInt()
    private val badgeGapPx = (4 * density).toInt()
    private val minExpandedWidthPx = (140 * density).toInt()

    fun showOverlay(displayKey: String, translatedText: String, targetBounds: Rect, sessionGeneration: Long, screenBounds: Rect, inputBarTop: Int? = null) {
        mainHandler.post {
            val existing = activeOverlays[displayKey]
            if (existing != null) {
                if (existing.sessionGeneration != sessionGeneration) {
                    removeOverlay(displayKey)
                } else {
                    updateOverlayView(existing, translatedText, targetBounds, screenBounds, inputBarTop)
                    return@post
                }
            }

            val inflater = LayoutInflater.from(context)
            val overlayView = inflater.inflate(R.layout.layout_translation_overlay, null)
            val llCollapsed = overlayView.findViewById<LinearLayout>(R.id.llCollapsedBadge)
            val llExpanded = overlayView.findViewById<LinearLayout>(R.id.llExpandedCard)
            val ivBadge = overlayView.findViewById<ImageView>(R.id.ivBadgeIcon)
            val tvBadge = overlayView.findViewById<TextView>(R.id.tvBadgeText)
            val tvLabel = overlayView.findViewById<TextView>(R.id.tvLanguageLabel)
            val tvTranslated = overlayView.findViewById<TextView>(R.id.tvTranslatedText)
            tvTranslated.text = translatedText

            val screenW = screenBounds.width()
            val screenH = screenBounds.height()
            val isOutgoing = targetBounds.right > screenW * 0.78f || targetBounds.left > screenW * 0.40f
            val bgRes = if (isOutgoing) R.drawable.bg_overlay_outgoing else R.drawable.bg_overlay_incoming
            val labelColor = if (isOutgoing) ContextCompat.getColor(context, R.color.overlay_outgoing_label) else ContextCompat.getColor(context, R.color.overlay_incoming_label)

            llCollapsed.setBackgroundResource(bgRes)
            llExpanded.setBackgroundResource(bgRes)
            ivBadge.setColorFilter(labelColor)
            tvBadge.setTextColor(labelColor)
            tvLabel.setTextColor(labelColor)

            llCollapsed.setOnClickListener { expandOverlay(displayKey) }
            llExpanded.setOnClickListener { collapseOverlay(displayKey) }

            val isExpanded = (displayKey == expandedDisplayKey)
            val isOtherExpanded = (expandedDisplayKey != null && !isExpanded)
            llCollapsed.visibility = if (isExpanded || isOtherExpanded) View.GONE else View.VISIBLE
            llExpanded.visibility = if (isExpanded) View.VISIBLE else View.GONE

            val maxAllowedWidth = (screenW - (marginPx * 2)).coerceAtLeast(minExpandedWidthPx)
            val bubbleWidth = targetBounds.width().coerceIn(minExpandedWidthPx, maxAllowedWidth)

            val bottomLimit = if (inputBarTop != null && inputBarTop > (28 * density).toInt()) inputBarTop - (4 * density).toInt() else screenH - (104 * density).toInt()
            val measuredWidth: Int
            val measuredHeight: Int
            val posX: Int
            val posY: Int

            if (isExpanded) {
                overlayView.measure(View.MeasureSpec.makeMeasureSpec(bubbleWidth, View.MeasureSpec.EXACTLY), View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED))
                measuredWidth = bubbleWidth
                measuredHeight = overlayView.measuredHeight
                var calculatedX = if (isOutgoing) targetBounds.right - measuredWidth else targetBounds.left
                if (calculatedX + measuredWidth > screenW - marginPx) calculatedX = screenW - measuredWidth - marginPx
                if (calculatedX < marginPx) calculatedX = marginPx
                posX = calculatedX
                posY = if (targetBounds.bottom + gapPx + measuredHeight <= bottomLimit) targetBounds.bottom + gapPx else (targetBounds.top - measuredHeight - gapPx).coerceAtLeast((28 * density).toInt())
            } else {
                overlayView.measure(View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED), View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED))
                measuredWidth = overlayView.measuredWidth
                measuredHeight = overlayView.measuredHeight
                var calculatedX = if (isOutgoing) targetBounds.left - measuredWidth - badgeGapPx else targetBounds.right + badgeGapPx
                if (calculatedX + measuredWidth > screenW - marginPx) calculatedX = screenW - measuredWidth - marginPx
                if (calculatedX < marginPx) calculatedX = marginPx
                posX = calculatedX
                posY = targetBounds.centerY() - (measuredHeight / 2)
            }

            if (targetBounds.top >= bottomLimit && !isExpanded) return@post

            val lp = WindowManager.LayoutParams().apply {
                type = WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY
                format = PixelFormat.TRANSLUCENT
                flags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                gravity = Gravity.TOP or Gravity.START
                x = posX
                y = posY
                width = measuredWidth
                height = WindowManager.LayoutParams.WRAP_CONTENT
            }

            try {
                windowManager.addView(overlayView, lp)
                activeOverlays[displayKey] = ActiveOverlay(overlayView, displayKey, sessionGeneration, targetBounds, screenBounds, inputBarTop, Rect(posX, posY, posX + measuredWidth, posY + measuredHeight))
            } catch (_: Exception) {}
        }
    }

    fun expandOverlay(displayKey: String) {
        mainHandler.post {
            val prev = expandedDisplayKey
            expandedDisplayKey = displayKey
            ensureDismissBackdropAttached()
            if (prev != null && prev != displayKey) activeOverlays[prev]?.let { updateDisplayState(it, false) }
            for ((key, other) in activeOverlays) {
                if (key != displayKey) other.view.findViewById<View>(R.id.llCollapsedBadge)?.visibility = View.GONE
            }
            activeOverlays[displayKey]?.let { updateDisplayState(it, true) }
        }
    }

    fun collapseOverlay(displayKey: String) {
        mainHandler.post { collapseAll() }
    }

    fun collapseAll() {
        mainHandler.post {
            removeDismissBackdrop()
            val curr = expandedDisplayKey
            expandedDisplayKey = null
            for ((_, item) in activeOverlays) item.view.findViewById<View>(R.id.llCollapsedBadge)?.visibility = View.VISIBLE
            if (curr != null) activeOverlays[curr]?.let { updateDisplayState(it, false) }
        }
    }

    private fun ensureDismissBackdropAttached() {
        if (dismissBackdropView != null) return
        val backdrop = View(context).apply {
            setBackgroundColor(Color.TRANSPARENT)
            setOnClickListener { collapseAll() }
        }
        val lp = WindowManager.LayoutParams().apply {
            type = WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY
            format = PixelFormat.TRANSLUCENT
            flags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
            width = WindowManager.LayoutParams.MATCH_PARENT
            height = WindowManager.LayoutParams.MATCH_PARENT
        }
        try {
            windowManager.addView(backdrop, lp)
            dismissBackdropView = backdrop
        } catch (_: Exception) {}
    }

    private fun removeDismissBackdrop() {
        val bd = dismissBackdropView ?: return
        dismissBackdropView = null
        try { windowManager.removeView(bd) } catch (_: Exception) {}
    }

    private fun updateDisplayState(active: ActiveOverlay, isExpanded: Boolean) {
        val llCollapsed = active.view.findViewById<LinearLayout>(R.id.llCollapsedBadge) ?: return
        val llExpanded = active.view.findViewById<LinearLayout>(R.id.llExpandedCard) ?: return
        val lp = active.view.layoutParams as? WindowManager.LayoutParams ?: return

        val isOtherExpanded = (expandedDisplayKey != null && !isExpanded)
        llCollapsed.visibility = if (isExpanded || isOtherExpanded) View.GONE else View.VISIBLE
        llExpanded.visibility = if (isExpanded) View.VISIBLE else View.GONE

        val screenW = active.lastScreenBounds.width()
        val screenH = active.lastScreenBounds.height()
        val isOutgoing = active.currentBounds.right > screenW * 0.78f || active.currentBounds.left > screenW * 0.40f
        val maxAllowedWidth = (screenW - (marginPx * 2)).coerceAtLeast(minExpandedWidthPx)
        val bubbleWidth = active.currentBounds.width().coerceIn(minExpandedWidthPx, maxAllowedWidth)
        val bottomLimit = if (active.lastInputBarTop != null && active.lastInputBarTop!! > (28 * density).toInt()) active.lastInputBarTop!! - (4 * density).toInt() else screenH - (104 * density).toInt()

        val measuredWidth: Int
        val measuredHeight: Int
        val posX: Int
        val posY: Int

        if (isExpanded) {
            active.view.measure(View.MeasureSpec.makeMeasureSpec(bubbleWidth, View.MeasureSpec.EXACTLY), View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED))
            measuredWidth = bubbleWidth
            measuredHeight = active.view.measuredHeight
            var calculatedX = if (isOutgoing) active.currentBounds.right - measuredWidth else active.currentBounds.left
            if (calculatedX + measuredWidth > screenW - marginPx) calculatedX = screenW - measuredWidth - marginPx
            if (calculatedX < marginPx) calculatedX = marginPx
            posX = calculatedX
            posY = if (active.currentBounds.bottom + gapPx + measuredHeight <= bottomLimit) active.currentBounds.bottom + gapPx else (active.currentBounds.top - measuredHeight - gapPx).coerceAtLeast((28 * density).toInt())
        } else {
            active.view.measure(View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED), View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED))
            measuredWidth = active.view.measuredWidth
            measuredHeight = active.view.measuredHeight
            var calculatedX = if (isOutgoing) active.currentBounds.left - measuredWidth - badgeGapPx else active.currentBounds.right + badgeGapPx
            if (calculatedX + measuredWidth > screenW - marginPx) calculatedX = screenW - measuredWidth - marginPx
            if (calculatedX < marginPx) calculatedX = marginPx
            posX = calculatedX
            posY = active.currentBounds.centerY() - (measuredHeight / 2)
        }

        lp.x = posX
        lp.y = posY
        lp.width = measuredWidth
        try {
            windowManager.updateViewLayout(active.view, lp)
            active.overlayScreenRect = Rect(posX, posY, posX + measuredWidth, posY + measuredHeight)
        } catch (_: Exception) {}
    }

    private fun updateOverlayView(active: ActiveOverlay, translatedText: String, targetBounds: Rect, screenBounds: Rect, inputBarTop: Int?) {
        val tv = active.view.findViewById<TextView>(R.id.tvTranslatedText)
        if (tv.text != translatedText) tv.text = translatedText
        active.currentBounds = targetBounds
        active.lastScreenBounds = screenBounds
        active.lastInputBarTop = inputBarTop

        val isExpanded = (active.displayKey == expandedDisplayKey)
        updateDisplayState(active, isExpanded)
    }

    fun removeOverlay(displayKey: String) {
        mainHandler.post {
            if (expandedDisplayKey == displayKey) {
                expandedDisplayKey = null
                removeDismissBackdrop()
            }
            activeOverlays.remove(displayKey)?.let {
                try { windowManager.removeView(it.view) } catch (_: Exception) {}
            }
        }
    }

    fun reconcileVisibleOverlays(currentlyVisibleKeys: Set<String>) {
        mainHandler.post {
            val iterator = activeOverlays.entries.iterator()
            while (iterator.hasNext()) {
                val entry = iterator.next()
                if (entry.key !in currentlyVisibleKeys) {
                    if (expandedDisplayKey == entry.key) {
                        expandedDisplayKey = null
                        removeDismissBackdrop()
                    }
                    try { windowManager.removeView(entry.value.view) } catch (_: Exception) {}
                    iterator.remove()
                }
            }
        }
    }

    fun removeAllOverlays() {
        mainHandler.post {
            expandedDisplayKey = null
            removeDismissBackdrop()
            for ((_, item) in activeOverlays) {
                try { windowManager.removeView(item.view) } catch (_: Exception) {}
            }
            activeOverlays.clear()
        }
    }

    val activeCount: Int get() = activeOverlays.size
}
`,

  'app/src/main/java/com/bangla/translator/service/BanglaAccessibilityService.kt': `package com.bangla.translator.service

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.content.SharedPreferences
import android.graphics.Rect
import android.os.Handler
import android.os.Looper
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import com.bangla.translator.data.AppPreferences
import com.bangla.translator.data.ScannedMessage
import com.bangla.translator.overlay.OverlayController
import com.bangla.translator.scanner.WhatsAppMessageScanner
import com.bangla.translator.translation.TranslationEngine
import java.util.concurrent.atomic.AtomicLong

class BanglaAccessibilityService : AccessibilityService(), SharedPreferences.OnSharedPreferenceChangeListener {
    private val sessionGeneration = AtomicLong(1L)
    private lateinit var appPreferences: AppPreferences
    private lateinit var overlayController: OverlayController
    private lateinit var messageScanner: WhatsAppMessageScanner
    private val mainHandler = Handler(Looper.getMainLooper())
    private val screenBounds = Rect()

    override fun onServiceConnected() {
        super.onServiceConnected()
        val wm = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        appPreferences = AppPreferences(this)
        appPreferences.registerListener(this)
        messageScanner = WhatsAppMessageScanner(appPreferences.sourceLanguageCode, appPreferences.bengaliRatioThreshold)
        overlayController = OverlayController(this, wm)
        TranslationEngine.setLanguagePair(appPreferences.sourceLanguageCode, appPreferences.targetLanguageCode)

        val metrics = resources.displayMetrics
        screenBounds.set(0, 0, metrics.widthPixels, metrics.heightPixels)

        val info = serviceInfo ?: AccessibilityServiceInfo()
        info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED or
                AccessibilityEvent.TYPE_VIEW_SCROLLED or
                AccessibilityEvent.TYPE_WINDOWS_CHANGED
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
        info.flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
        info.notificationTimeout = 100
        serviceInfo = info
        TranslationEngine.checkModelAvailability()
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return
        val pkg = event.packageName?.toString() ?: ""
        if (pkg !in WhatsAppMessageScanner.SUPPORTED_PACKAGES) {
            if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED && pkg.isNotEmpty()) {
                sessionGeneration.incrementAndGet()
                overlayController.removeAllOverlays()
            }
            return
        }

        if (!appPreferences.isOverlayEnabled) return

        mainHandler.postDelayed({
            val root = rootInActiveWindow ?: return@postDelayed
            val currentGen = sessionGeneration.get()
            val messages = messageScanner.scanVisibleMessages(root, screenBounds, currentGen)
            root.recycle()

            val currentlyVisible = messages.map { it.displayKey }.toSet()
            overlayController.reconcileVisibleOverlays(currentlyVisible)

            for (msg in messages) {
                TranslationEngine.translate(
                    text = msg.normalizedText,
                    onSuccess = { translated ->
                        if (sessionGeneration.get() == currentGen) {
                            overlayController.showOverlay(
                                displayKey = msg.displayKey,
                                translatedText = translated,
                                targetBounds = msg.bounds,
                                sessionGeneration = currentGen,
                                screenBounds = screenBounds
                            )
                        }
                    },
                    onFailure = {}
                )
            }
        }, 150L)
    }

    override fun onSharedPreferenceChanged(sharedPreferences: SharedPreferences?, key: String?) {
        if (key == "key_overlay_enabled") {
            if (!appPreferences.isOverlayEnabled) overlayController.removeAllOverlays()
        } else if (key == "key_bengali_ratio" || key == "key_source_lang" || key == "key_target_lang") {
            messageScanner = WhatsAppMessageScanner(appPreferences.sourceLanguageCode, appPreferences.bengaliRatioThreshold)
            TranslationEngine.setLanguagePair(appPreferences.sourceLanguageCode, appPreferences.targetLanguageCode)
            overlayController.removeAllOverlays()
        }
    }

    override fun onInterrupt() {
        overlayController.removeAllOverlays()
    }

    override fun onDestroy() {
        super.onDestroy()
        appPreferences.unregisterListener(this)
        overlayController.removeAllOverlays()
        TranslationEngine.close()
    }
}
`,

  'app/src/main/java/com/bangla/translator/service/NotificationTranslationService.kt': `package com.bangla.translator.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.core.app.NotificationCompat
import com.bangla.translator.R
import com.bangla.translator.data.AppPreferences
import com.bangla.translator.translation.LanguageDetector
import com.bangla.translator.translation.TranslationEngine

class NotificationTranslationService : NotificationListenerService() {
    private lateinit var appPreferences: AppPreferences

    override fun onCreate() {
        super.onCreate()
        appPreferences = AppPreferences(this)
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return
        val pkg = sbn.packageName ?: return
        if (pkg !in setOf("com.whatsapp", "com.whatsapp.w4b")) return
        if (!appPreferences.isNotificationTranslationEnabled) return

        val extras = sbn.notification?.extras ?: return
        val title = extras.getCharSequence("android.title")?.toString() ?: ""
        val text = extras.getCharSequence("android.text")?.toString() ?: return

        if (LanguageDetector.isTargetLanguageMessage(text, appPreferences.sourceLanguageCode, appPreferences.bengaliRatioThreshold)) {
            TranslationEngine.translate(
                text = text,
                onSuccess = { translatedText ->
                    postTranslatedNotification(pkg, title, text, translatedText, sbn.id)
                },
                onFailure = {}
            )
        }
    }

    private fun postTranslatedNotification(originalPkg: String, senderTitle: String, originalText: String, translatedText: String, notificationId: Int) {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channelId = "chatnora_translations"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(channelId, "ChatNora Translations", NotificationManager.IMPORTANCE_DEFAULT)
            nm.createNotificationChannel(channel)
        }

        val launchIntent = packageManager.getLaunchIntentForPackage(originalPkg)
        val pendingIntent = if (launchIntent != null) {
            PendingIntent.getActivity(this, notificationId, launchIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        } else null

        val builder = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_app_launcher)
            .setContentTitle(if (senderTitle.isNotBlank()) "\$senderTitle (Translated)" else "ChatNora")
            .setContentText(translatedText)
            .setStyle(NotificationCompat.BigTextStyle().bigText("\$translatedText\\n\\nOriginal: \$originalText"))
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)

        nm.notify(notificationId + 200000, builder.build())
    }
}
`,

  'app/src/main/java/com/bangla/translator/MainActivity.kt': `package com.bangla.translator

import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.bangla.translator.data.AppPreferences
import com.bangla.translator.data.ModelDownloadState
import com.bangla.translator.data.SupportedLanguages
import com.bangla.translator.databinding.ActivityMainBinding
import com.bangla.translator.translation.TranslationEngine

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private lateinit var appPreferences: AppPreferences

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        appPreferences = AppPreferences(this)

        val srcAdapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, SupportedLanguages.ALL)
        binding.spinnerSourceLanguage.adapter = srcAdapter
        val trgAdapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, SupportedLanguages.TARGET_LANGUAGES)
        binding.spinnerTargetLanguage.adapter = trgAdapter

        binding.spinnerSourceLanguage.setSelection(SupportedLanguages.ALL.indexOfFirst { it.code == appPreferences.sourceLanguageCode }.coerceAtLeast(0))
        binding.spinnerTargetLanguage.setSelection(SupportedLanguages.TARGET_LANGUAGES.indexOfFirst { it.code == appPreferences.targetLanguageCode }.coerceAtLeast(0))

        binding.spinnerSourceLanguage.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(p: AdapterView<*>?, v: View?, pos: Int, id: Long) {
                val item = SupportedLanguages.ALL[pos]
                if (item.code != appPreferences.sourceLanguageCode) {
                    appPreferences.sourceLanguageCode = item.code
                    TranslationEngine.setLanguagePair(item.code, appPreferences.targetLanguageCode)
                }
            }
            override fun onNothingSelected(p: AdapterView<*>?) {}
        }

        binding.spinnerTargetLanguage.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(p: AdapterView<*>?, v: View?, pos: Int, id: Long) {
                val item = SupportedLanguages.TARGET_LANGUAGES[pos]
                if (item.code != appPreferences.targetLanguageCode) {
                    appPreferences.targetLanguageCode = item.code
                    TranslationEngine.setLanguagePair(appPreferences.sourceLanguageCode, item.code)
                }
            }
            override fun onNothingSelected(p: AdapterView<*>?) {}
        }

        binding.btnEnableAccessibility.setOnClickListener {
            startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
        }

        binding.btnDownloadModel.setOnClickListener {
            binding.pbModelDownload.visibility = View.VISIBLE
            TranslationEngine.prepareModelIfNeeded(
                onSuccess = {
                    runOnUiThread {
                        binding.pbModelDownload.visibility = View.GONE
                        Toast.makeText(this, "Model ready offline!", Toast.LENGTH_SHORT).show()
                    }
                },
                onFailure = {
                    runOnUiThread {
                        binding.pbModelDownload.visibility = View.GONE
                        Toast.makeText(this, "Download error: \${it.message}", Toast.LENGTH_LONG).show()
                    }
                }
            )
        }

        binding.btnDeleteModel.setOnClickListener {
            TranslationEngine.deleteModel {
                runOnUiThread { Toast.makeText(this, "Model deleted.", Toast.LENGTH_SHORT).show() }
            }
        }
    }
}
`
};

export async function downloadProjectZip() {
  const zip = new JSZip();

  for (const [filename, content] of Object.entries(ALL_PROJECT_FILES)) {
    zip.file(filename, content);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ChatNora-AndroidStudio.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

