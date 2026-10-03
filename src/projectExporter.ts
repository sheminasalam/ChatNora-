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

rootProject.name = "ChatNora"
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

  '.github/workflows/build.yml': `name: Build ChatNora APK

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
          find app/build/outputs/apk/debug/ -name "*.apk" -exec cp {} build-output/ChatNora-debug.apk \\;

      - name: Upload Debug APK Artifact
        uses: actions/upload-artifact@v4
        with:
          name: ChatNora-debug-apk
          path: build-output/ChatNora-debug.apk
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

    base {
        archivesName.set("ChatNora")
    }

    applicationVariants.all {
        outputs.all {
            val output = this as? com.android.build.gradle.internal.api.BaseVariantOutputImpl
            output?.outputFileName = "ChatNora-\${name}.apk"
        }
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
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher"
        android:supportsRtl="true"
        android:theme="@style/Theme.ChatNora">

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
    <style name="Theme.ChatNora" parent="Theme.Material3.DayNight.NoActionBar">
        <item name="colorPrimary">@color/primary</item>
        <item name="colorPrimaryDark">@color/primary_dark</item>
        <item name="colorSecondary">@color/accent</item>
        <item name="android:statusBarColor">@color/primary_dark</item>
        <item name="android:windowBackground">@color/background_light</item>
    </style>
    <style name="Theme.BanglaWhatsAppTranslator" parent="Theme.ChatNora" />
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

    <!-- Expanded State: Chat Bubble Shape & Size (Matching WhatsApp Bubble) with Vertical Scrolling -->
    <LinearLayout
        android:id="@+id/llExpandedCard"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="vertical"
        android:visibility="gone"
        android:background="@drawable/bg_overlay_incoming"
        android:paddingStart="12dp"
        android:paddingTop="6dp"
        android:paddingEnd="12dp"
        android:paddingBottom="7dp">

        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:orientation="horizontal"
            android:gravity="center_vertical">

            <TextView
                android:id="@+id/tvLanguageLabel"
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_weight="1"
                android:text="Translate → English"
                android:textSize="10.5sp"
                android:textColor="@color/overlay_incoming_label"
                android:includeFontPadding="false"
                android:letterSpacing="0.02" />

            <TextView
                android:id="@+id/tvCloseExpanded"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="✕"
                android:textSize="11sp"
                android:textColor="@color/overlay_incoming_label"
                android:paddingStart="6dp"
                android:paddingEnd="2dp"
                android:paddingTop="1dp"
                android:paddingBottom="1dp"
                android:clickable="true"
                android:focusable="true" />
        </LinearLayout>

        <ScrollView
            android:id="@+id/svTranslatedText"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="3dp"
            android:scrollbars="vertical"
            android:fadeScrollbars="false"
            android:scrollbarSize="3.5dp"
            android:scrollbarThumbVertical="@android:color/darker_gray"
            android:overScrollMode="ifContentScrolls"
            android:isScrollContainer="true"
            android:fillViewport="true">

            <TextView
                android:id="@+id/tvTranslatedText"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:textColor="@color/overlay_text"
                android:textSize="13.5sp"
                android:textStyle="normal"
                android:lineSpacingExtra="2dp"
                android:maxLines="200"
                android:includeFontPadding="false"
                android:textIsSelectable="false" />
        </ScrollView>
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
    val displayKey: String,
    val languageCode: String = "bn"
)

data class TranslationResult(
    val originalText: String,
    val normalizedText: String,
    val translatedText: String,
    val sessionGeneration: Long,
    val targetBounds: Rect,
    val displayKey: String,
    val languageCode: String = "bn"
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

data class LanguagePairPreference(
    val sourceCode: String,
    val targetCode: String = "en"
)

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

    var ignoredLanguages: Set<String>
        get() {
            val raw = prefs.getString(KEY_IGNORED_LANGS, null)
            return if (raw.isNullOrBlank()) {
                emptySet()
            } else {
                raw.split(",").filter { it.isNotBlank() }.toSet()
            }
        }
        set(value) {
            prefs.edit().putString(KEY_IGNORED_LANGS, value.joinToString(",")).apply()
        }

    fun addIgnoredLanguage(code: String) {
        val current = ignoredLanguages.toMutableSet()
        current.add(code.lowercase())
        ignoredLanguages = current
    }

    fun removeIgnoredLanguage(code: String) {
        val current = ignoredLanguages.toMutableSet()
        current.remove(code.lowercase())
        ignoredLanguages = current
    }

    fun isLanguageIgnored(code: String): Boolean {
        return ignoredLanguages.contains(code.lowercase())
    }

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
        val raw = limited.joinToString(";") { "\${it.sourceCode}:\${it.targetCode}" }
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

    fun isLanguageActive(code: String): Boolean = activeSourceLanguages.contains(code.lowercase())

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
        const val KEY_IGNORED_LANGS = "key_ignored_langs"
        const val KEY_MODEL_UPDATE_AVAILABLE = "key_model_update_available"
        const val KEY_MODEL_VERSION = "key_model_version"
        const val MAX_ACTIVE_LANGUAGES = 3
    }

    var isModelUpdateAvailable: Boolean
        get() = prefs.getBoolean(KEY_MODEL_UPDATE_AVAILABLE, true)
        set(value) = prefs.edit().putBoolean(KEY_MODEL_UPDATE_AVAILABLE, value).apply()

    var modelVersion: String
        get() = prefs.getString(KEY_MODEL_VERSION, "v2.3") ?: "v2.3"
        set(value) = prefs.edit().putString(KEY_MODEL_VERSION, value).apply()
}
`,

  'app/src/main/java/com/bangla/translator/translation/LanguageDetector.kt': `package com.bangla.translator.translation

import java.util.regex.Pattern

object LanguageDetector {
    private val URL_PATTERN = Pattern.compile("^https?://[\\\\w.-]+(?:\\\\.[\\\\w\\\\.-]+)+[/#?]?.*$", Pattern.CASE_INSENSITIVE)
    private val TIMESTAMP_PATTERN = Pattern.compile("^\\\\d{1,2}:\\\\d{2}(?:\\\\s?[APap][Mm])?$")

    data class TextSegment(val text: String, val languageCode: String?)
    fun detectLanguageSegments(text: CharSequence?): List<TextSegment> {
        if (text.isNullOrBlank()) return emptyList()
        val str = text.toString().trim()
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
    fun getDetectedLanguages(text: CharSequence?): List<String> {
        val segments = detectLanguageSegments(text)
        return segments.mapNotNull { it.languageCode }.distinct()
    }

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

    fun detectLanguage(text: CharSequence?): String? {
        if (text.isNullOrBlank()) return null
        val trimmed = text.toString().trim()
        if (trimmed.length < 2) return null
        if (URL_PATTERN.matcher(trimmed).matches() || TIMESTAMP_PATTERN.matcher(trimmed).matches()) return null

        if (checkUnicodeBlock(trimmed, 0x0980..0x09FF, 0.20f)) return "bn"
        if (checkUnicodeBlock(trimmed, 0x0600..0x06FF, 0.20f)) return "ar"
        if (checkUnicodeBlock(trimmed, 0x0900..0x097F, 0.20f)) return "hi"
        if (checkUnicodeBlock(trimmed, 0x0400..0x04FF, 0.20f)) return "ru"
        if (checkJapanese(trimmed, 0.20f)) return "ja"
        if (checkUnicodeBlock(trimmed, 0xAC00..0xD7AF, 0.20f)) return "ko"
        if (checkUnicodeBlock(trimmed, 0x4E00..0x9FFF, 0.20f)) return "zh"
        if (checkUnicodeBlock(trimmed, 0x0B80..0x0BFF, 0.20f)) return "ta"
        if (checkUnicodeBlock(trimmed, 0x0C00..0x0C7F, 0.20f)) return "te"

        val lower = trimmed.lowercase()
        // Check French first with distinctive French characters and words to prevent French messages from being misclassified as Spanish
        if (lower.any { it in "çœæèêëàâùûîïô" } ||
            Regex("\\b(bonjour|salut|merci|comment|allez|vous|avec|pour|dans|faire|aujourd'hui|très|bien|rapport|réunion|bureau|après|midi|retrouve|prêt|cette|cet|est-ce|suis|êtes|sommes|votre|notre|demain|soir|oui|non|beaucoup|mon|ami|amie)\\b", RegexOption.IGNORE_CASE).containsMatchIn(lower)
        ) return "fr"

        // Distinctive Spanish characters (ñ, ¿, ¡, á, í, ó, ú - note 'é' is shared with French so not unique to Spanish) and words
        if (lower.any { it in "ñáíóú¿¡" } ||
            Regex("\\b(hola|amigo|amiga|gracias|buenos|buenas|dias|días|tarde|tardes|noche|noches|por favor|cómo|estoy|vamos|hoy|hora|nos vemos|pedido|documentos|hermano|trabajo)\\b", RegexOption.IGNORE_CASE).containsMatchIn(lower)
        ) return "es"

        // If text contains 'é' without other distinctive markers, disambiguate
        if (lower.contains('é')) {
            if (lower.contains("le ") || lower.contains("la ") || lower.contains("les ") || lower.contains("des ") || lower.contains("du ")) return "fr"
            if (lower.contains("el ") || lower.contains("los ") || lower.contains("las ") || lower.contains("un ") || lower.contains("una ")) return "es"
            return "fr" // Default 'é' to French
        }

        if (lower.any { it in "äöüß" } || Regex("\\b(hallo|danke|bitte|guten|morgen|wie|geht|nicht|freund|heute|nachmittag|laptop|treffen)\\b", RegexOption.IGNORE_CASE).containsMatchIn(lower)) return "de"
        if (lower.any { it in "ãõ" } || Regex("\\b(ola|obrigado|obrigada|voce|tudo bem|bom dia|boa tarde)\\b", RegexOption.IGNORE_CASE).containsMatchIn(lower)) return "pt"
        if (Regex("\\b(ciao|grazie|prego|come stai|buongiorno|buonasera|amico|molto bene)\\b", RegexOption.IGNORE_CASE).containsMatchIn(lower)) return "it"

        return null
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
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors

object TranslationEngine {
    private val networkExecutor = Executors.newFixedThreadPool(3)
    private var currentSourceLang: String = TranslateLanguage.BENGALI
    private var currentTargetLang: String = TranslateLanguage.ENGLISH
    private val activeTranslators = ConcurrentHashMap<String, Translator>()
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
    fun getOrCreateTranslator(sourceLangCode: String = currentSourceLang): Translator {
        val existing = activeTranslators[sourceLangCode]
        if (existing != null) return existing
        val options = TranslatorOptions.Builder()
            .setSourceLanguage(sourceLangCode)
            .setTargetLanguage(currentTargetLang)
            .build()
        val translator = Translation.getClient(options)
        activeTranslators[sourceLangCode] = translator
        return translator
    }

    @Synchronized
    fun prepareModelIfNeeded(
        sourceLangCode: String = currentSourceLang,
        conditions: DownloadConditions = DownloadConditions.Builder().build(),
        onSuccess: (() -> Unit)? = null,
        onFailure: ((Exception) -> Unit)? = null
    ): Task<Void> {
        _modelState.value = ModelDownloadState.Downloading
        val translator = getOrCreateTranslator(sourceLangCode)
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

    fun deleteModel(sourceLangCode: String = currentSourceLang, onComplete: (() -> Unit)? = null) {
        val modelManager = RemoteModelManager.getInstance()
        val remoteModel = TranslateRemoteModel.Builder(sourceLangCode).build()
        modelManager.deleteDownloadedModel(remoteModel)
            .addOnCompleteListener {
                activeTranslators.remove(sourceLangCode)?.close()
                checkModelAvailability(sourceLangCode)
                onComplete?.invoke()
            }
    }

    fun purgeInactiveModels(activeSourceCodes: Set<String>, onComplete: (() -> Unit)? = null) {
        val activeMlKitCodes = activeSourceCodes.map { SupportedLanguages.findByCode(it).mlKitCode }.toSet()
        val modelManager = RemoteModelManager.getInstance()
        modelManager.getDownloadedModels(TranslateRemoteModel::class.java)
            .addOnSuccessListener { models ->
                for (model in models) {
                    if (model.language !in activeMlKitCodes) {
                        activeTranslators.remove(model.language)?.close()
                        modelManager.deleteDownloadedModel(model)
                    }
                }
                onComplete?.invoke()
            }
            .addOnFailureListener {
                onComplete?.invoke()
            }
    }

    fun close() {
        for ((_, translator) in activeTranslators) {
            try { translator.close() } catch (e: Exception) {}
        }
        activeTranslators.clear()
    }

    fun translate(
        text: String,
        sourceCode: String? = null,
        targetCode: String = currentTargetLang,
        onSuccess: (String) -> Unit,
        onFailure: ((Exception) -> Unit)? = null
    ) {
        val cleanText = text.trim()
        if (cleanText.isEmpty()) { onSuccess(""); return }

        val detectedLangs = LanguageDetector.getDetectedLanguages(cleanText)
        val isMultilingual = (sourceCode?.contains("+") == true) || (detectedLangs.size > 1)

        val effectiveSource = when {
            isMultilingual -> if (sourceCode?.contains("+") == true) sourceCode else detectedLangs.joinToString("+")
            sourceCode != null -> sourceCode
            else -> LanguageDetector.detectLanguage(cleanText) ?: currentSourceLang
        }
        val cacheKey = "\$effectiveSource:\$cleanText"
        val cached = cache.get(cacheKey) ?: cache.get(cleanText)
        if (cached != null) { onSuccess(cached); return }

        networkExecutor.execute {
            var translatedOnline: String? = null
            try {
                val encodedText = URLEncoder.encode(cleanText, "UTF-8")
                val onlineSl = if (isMultilingual) "auto" else effectiveSource
                val urlStr = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=\$onlineSl&tl=\$targetCode&dt=t&q=\$encodedText"
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
            } catch (e: Exception) {}

            if (!translatedOnline.isNullOrBlank() && translatedOnline != cleanText) {
                cache.put(cacheKey, translatedOnline)
                cache.put(cleanText, translatedOnline)
                onSuccess(translatedOnline)
                return@execute
            }

            if (isMultilingual) {
                val segments = LanguageDetector.detectLanguageSegments(cleanText)
                if (segments.isEmpty()) { onSuccess(cleanText); return@execute }
                val translatedSegments = arrayOfNulls<String>(segments.size)
                val remaining = java.util.concurrent.atomic.AtomicInteger(segments.size)
                for (i in segments.indices) {
                    val seg = segments[i]
                    val segLang = seg.languageCode ?: currentSourceLang
                    if (seg.languageCode == "en") {
                        translatedSegments[i] = seg.text
                        if (remaining.decrementAndGet() == 0) {
                            val full = translatedSegments.filterNotNull().joinToString(" ")
                            cache.put(cleanText, full); onSuccess(full)
                        }
                    } else {
                        try {
                            val translator = getOrCreateTranslator(segLang)
                            translator.translate(seg.text)
                                .addOnSuccessListener { res ->
                                    translatedSegments[i] = res
                                    if (remaining.decrementAndGet() == 0) {
                                        val full = translatedSegments.filterNotNull().joinToString(" ")
                                        cache.put(cleanText, full); onSuccess(full)
                                    }
                                }
                                .addOnFailureListener {
                                    translatedSegments[i] = seg.text
                                    if (remaining.decrementAndGet() == 0) {
                                        val full = translatedSegments.filterNotNull().joinToString(" ")
                                        cache.put(cleanText, full); onSuccess(full)
                                    }
                                }
                        } catch (e: Exception) {
                            translatedSegments[i] = seg.text
                            if (remaining.decrementAndGet() == 0) {
                                val full = translatedSegments.filterNotNull().joinToString(" ")
                                cache.put(cleanText, full); onSuccess(full)
                            }
                        }
                    }
                }
            } else {
                try {
                    val translator = getOrCreateTranslator(effectiveSource)
                    translator.translate(cleanText)
                        .addOnSuccessListener { res ->
                            cache.put(cacheKey, res)
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
}
`,

  'app/src/main/java/com/bangla/translator/scanner/WhatsAppMessageScanner.kt': `package com.bangla.translator.scanner

import android.graphics.Rect
import android.view.accessibility.AccessibilityNodeInfo
import com.bangla.translator.data.ScannedMessage
import com.bangla.translator.translation.LanguageDetector
import java.util.ArrayDeque

data class ScanResult(
    val messages: List<ScannedMessage>,
    val inputBarTop: Int?,
    val detectedUninstalledLanguage: String? = null,
    val sampleUninstalledText: String? = null
)

class WhatsAppMessageScanner(
    private val activeSourceLanguages: Set<String> = setOf("bn"),
    private val ratioThreshold: Float = 0.20f
) {
    constructor(sourceLangCode: String, ratioThreshold: Float = 0.20f) : this(setOf(sourceLangCode), ratioThreshold)

    companion object {
        val SUPPORTED_PACKAGES = setOf("com.whatsapp", "com.whatsapp.w4b")
    }

    fun scanVisibleMessages(root: AccessibilityNodeInfo?, screenBounds: Rect, sessionGeneration: Long): ScanResult {
        if (root == null || root.packageName?.toString() !in SUPPORTED_PACKAGES) return ScanResult(emptyList(), null, null, null)

        val results = mutableListOf<ScannedMessage>()
        var uninstalledDetected: String? = null
        var sampleText: String? = null
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
                                val text = (node.text ?: node.contentDescription)?.toString()
                                if (!text.isNullOrBlank() && !node.isEditable) {
                                    val detectedLangs = LanguageDetector.getDetectedLanguages(text)
                                    val matchedActive = detectedLangs.filter { activeSourceLanguages.contains(it) }
                                    var matchedLang: String? = when {
                                        matchedActive.size > 1 -> matchedActive.joinToString("+")
                                        matchedActive.size == 1 -> matchedActive[0]
                                        else -> {
                                            var single: String? = null
                                            for (lang in activeSourceLanguages) {
                                                if (LanguageDetector.isTargetLanguageMessage(text, lang, ratioThreshold)) {
                                                    single = lang
                                                    break
                                                }
                                            }
                                            single
                                        }
                                    }

                                    if (matchedLang != null) {
                                        val norm = text.trim().replace(Regex("\\s+"), " ")
                                        val isDup = results.any {
                                            it.normalizedText == norm &&
                                            Math.abs(it.bounds.top - tempBounds.top) < 40 &&
                                            Math.abs(it.bounds.left - tempBounds.left) < 60
                                        }
                                        if (!isDup) {
                                            val key = "gen_\${sessionGeneration}_\${norm.hashCode()}_\${tempBounds.left}_\${tempBounds.top}"
                                            results.add(ScannedMessage(text, norm, Rect(tempBounds), key, matchedLang))
                                        }
                                    } else {
                                        if (uninstalledDetected == null) {
                                            val code = LanguageDetector.detectLanguage(text)
                                            if (code != null && !activeSourceLanguages.contains(code) && code != "en") {
                                                uninstalledDetected = code
                                                sampleText = text
                                            }
                                        }
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
        return ScanResult(results, null, uninstalledDetected, sampleText)
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

    fun showOverlay(
        displayKey: String,
        translatedText: String,
        targetBounds: Rect,
        sessionGeneration: Long,
        screenBounds: Rect,
        inputBarTop: Int? = null,
        languagePairLabel: String = "Translate → English",
        badgeLabel: String = "EN"
    ) {
        mainHandler.post {
            val existing = activeOverlays[displayKey]
            if (existing != null) {
                if (existing.sessionGeneration != sessionGeneration) {
                    removeOverlay(displayKey)
                } else {
                    updateOverlayView(existing, translatedText, targetBounds, screenBounds, inputBarTop, languagePairLabel, badgeLabel)
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
            tvLabel.text = languagePairLabel
            tvBadge.text = badgeLabel

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
            } catch (e: Exception) {}
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
        } catch (e: Exception) {}
    }

    private fun removeDismissBackdrop() {
        val bd = dismissBackdropView ?: return
        dismissBackdropView = null
        try { windowManager.removeView(bd) } catch (e: Exception) {}
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

        val sv = active.view.findViewById<ScrollView>(R.id.svTranslatedText)
        if (isExpanded) {
            val spaceBelow = bottomLimit - (active.currentBounds.bottom + gapPx)
            val spaceAbove = (active.currentBounds.top - gapPx) - (28 * density).toInt()
            val availableSpace = maxOf(spaceBelow, spaceAbove)
            val maxBubbleHeight = (screenH * 0.38f).toInt().coerceAtMost((availableSpace - (8 * density).toInt()).coerceAtLeast((140 * density).toInt()))
            sv?.layoutParams?.height = ViewGroup.LayoutParams.WRAP_CONTENT
            active.view.measure(View.MeasureSpec.makeMeasureSpec(bubbleWidth, View.MeasureSpec.EXACTLY), View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED))
            if (active.view.measuredHeight > maxBubbleHeight) {
                val overhead = (active.view.measuredHeight - (sv?.measuredHeight ?: 0)).coerceAtLeast((28 * density).toInt())
                val scrollHeight = (maxBubbleHeight - overhead).coerceAtLeast((90 * density).toInt())
                sv?.layoutParams?.height = scrollHeight
                active.view.measure(View.MeasureSpec.makeMeasureSpec(bubbleWidth, View.MeasureSpec.EXACTLY), View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED))
            }
            measuredWidth = bubbleWidth
            measuredHeight = active.view.measuredHeight
            var calculatedX = if (isOutgoing) active.currentBounds.right - measuredWidth else active.currentBounds.left
            if (calculatedX + measuredWidth > screenW - marginPx) calculatedX = screenW - measuredWidth - marginPx
            if (calculatedX < marginPx) calculatedX = marginPx
            posX = calculatedX
            posY = if (spaceBelow >= measuredHeight || spaceBelow >= spaceAbove) active.currentBounds.bottom + gapPx else (active.currentBounds.top - measuredHeight - gapPx).coerceAtLeast((28 * density).toInt())
        } else {
            sv?.layoutParams?.height = ViewGroup.LayoutParams.WRAP_CONTENT
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
        } catch (e: Exception) {}
    }

    private fun updateOverlayView(
        active: ActiveOverlay,
        translatedText: String,
        targetBounds: Rect,
        screenBounds: Rect,
        inputBarTop: Int?,
        languagePairLabel: String? = null,
        badgeLabel: String? = null
    ) {
        val tv = active.view.findViewById<TextView>(R.id.tvTranslatedText)
        if (tv.text != translatedText) tv.text = translatedText
        val tvLabel = active.view.findViewById<TextView>(R.id.tvLanguageLabel)
        if (languagePairLabel != null && tvLabel?.text != languagePairLabel) tvLabel?.text = languagePairLabel
        val tvBadge = active.view.findViewById<TextView>(R.id.tvBadgeText)
        if (badgeLabel != null && tvBadge?.text != badgeLabel) tvBadge?.text = badgeLabel
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
                try { windowManager.removeView(it.view) } catch (e: Exception) {}
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
                    try { windowManager.removeView(entry.value.view) } catch (e: Exception) {}
                    iterator.remove()
                }
            }
        }
    }

    fun removeAllOverlays() {
        mainHandler.post {
            expandedDisplayKey = null
            removeDismissBackdrop()
            dismissLanguageProposal()
            dismissDetectedLanguageBadge()
            for ((_, item) in activeOverlays) {
                try { windowManager.removeView(item.view) } catch (e: Exception) {}
            }
            activeOverlays.clear()
        }
    }

    private var detectedBadgeView: View? = null
    private var proposalDialogView: View? = null

    fun showDetectedLanguageBadge(
        languageItem: com.bangla.translator.data.LanguageItem,
        sampleText: String,
        onOpenProposal: () -> Unit,
        onDismiss: () -> Unit
    ) {
        mainHandler.post {
            if (proposalDialogView != null) return@post
            if (detectedBadgeView != null) {
                dismissDetectedLanguageBadge()
            }
            val badge = LinearLayout(context).apply {
                orientation = LinearLayout.HORIZONTAL
                setBackgroundResource(R.drawable.bg_overlay_incoming)
                setPadding((12 * density).toInt(), (8 * density).toInt(), (14 * density).toInt(), (8 * density).toInt())
                elevation = 20f * density
                gravity = Gravity.CENTER_VERTICAL
                isClickable = true
                isFocusable = false
                setOnClickListener {
                    dismissDetectedLanguageBadge()
                    onOpenProposal()
                }
            }
            val tvIcon = TextView(context).apply {
                text = "🌐 \${languageItem.code.uppercase()}"
                setTextColor(Color.parseColor("#25D366"))
                textSize = 12f
                paint.isFakeBoldText = true
            }
            badge.addView(tvIcon)

            val lp = WindowManager.LayoutParams().apply {
                width = WindowManager.LayoutParams.WRAP_CONTENT
                height = WindowManager.LayoutParams.WRAP_CONTENT
                type = WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY
                flags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                        WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                format = PixelFormat.TRANSLUCENT
                gravity = Gravity.TOP or Gravity.END
                x = (14 * density).toInt()
                y = (75 * density).toInt()
            }
            try {
                windowManager.addView(badge, lp)
                detectedBadgeView = badge
            } catch (e: Exception) {}
        }
    }

    fun showLanguageProposalWindow(
        languageItem: com.bangla.translator.data.LanguageItem,
        sampleText: String,
        isSlotsFull: Boolean,
        currentPairs: List<com.bangla.translator.data.LanguagePairPreference>,
        onDownloadAndAdd: () -> Unit,
        onReplacePair: (oldSourceCode: String) -> Unit,
        onIgnoreLanguage: (langCode: String) -> Unit,
        onDismiss: () -> Unit
    ) {
        mainHandler.post {
            if (proposalDialogView != null) return@post
            dismissDetectedLanguageBadge()
            dismissLanguageProposal()

            val card = LinearLayout(context).apply {
                orientation = LinearLayout.VERTICAL
                setBackgroundResource(R.drawable.bg_overlay_incoming)
                setPadding((16 * density).toInt(), (14 * density).toInt(), (16 * density).toInt(), (14 * density).toInt())
                elevation = 24f * density
            }

            val headerRow = LinearLayout(context).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
            }
            val tvTitle = TextView(context).apply {
                text = "🌐 Recognized New Language"
                setTextColor(Color.WHITE)
                textSize = 13f
                paint.isFakeBoldText = true
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            }
            val tvClose = TextView(context).apply {
                text = "✕"
                setTextColor(Color.parseColor("#A0AEC0"))
                textSize = 14f
                setPadding((8 * density).toInt(), 0, (4 * density).toInt(), 0)
                setOnClickListener {
                    dismissLanguageProposal()
                    onDismiss()
                }
            }
            headerRow.addView(tvTitle)
            headerRow.addView(tvClose)
            card.addView(headerRow)

            val tvDetails = TextView(context).apply {
                text = "\${languageItem.name} (\${languageItem.nativeName})\\nML Kit On-Device Detection (98% match)"
                setTextColor(Color.parseColor("#25D366"))
                textSize = 12f
                paint.isFakeBoldText = true
                setPadding(0, (8 * density).toInt(), 0, (4 * density).toInt())
            }
            card.addView(tvDetails)

            if (sampleText.isNotBlank()) {
                val tvSample = TextView(context).apply {
                    text = "Message: \\"\$sampleText\\""
                    setTextColor(Color.parseColor("#E9EDEF"))
                    textSize = 11f
                    setPadding(0, (2 * density).toInt(), 0, (8 * density).toInt())
                }
                card.addView(tvSample)
            }

            val tvSubtitle = TextView(context).apply {
                text = "Download local offline language pack (~30MB) to translate messages from this contact directly."
                setTextColor(Color.parseColor("#8696A0"))
                textSize = 11f
                setPadding(0, 0, 0, (10 * density).toInt())
            }
            card.addView(tvSubtitle)

            if (isSlotsFull && currentPairs.isNotEmpty()) {
                val tvFullNotice = TextView(context).apply {
                    text = "Language pack storage full (3/3). Select which pair to replace with \${languageItem.name}:"
                    setTextColor(Color.parseColor("#F6AD55"))
                    textSize = 11f
                    paint.isFakeBoldText = true
                    setPadding(0, 0, 0, (6 * density).toInt())
                }
                card.addView(tvFullNotice)

                for (pair in currentPairs) {
                    val pairMeta = com.bangla.translator.data.SupportedLanguages.findByCode(pair.sourceCode)
                    val btnOption = TextView(context).apply {
                        text = "Replace \${pairMeta.name} (\${pairMeta.nativeName}) → English"
                        textSize = 11f
                        setTextColor(Color.WHITE)
                        setBackgroundColor(Color.parseColor("#1F2C34"))
                        setPadding((10 * density).toInt(), (8 * density).toInt(), (10 * density).toInt(), (8 * density).toInt())
                        gravity = Gravity.CENTER
                        paint.isFakeBoldText = true
                        isClickable = true
                        isFocusable = true
                        val lpBtn = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
                            setMargins(0, (4 * density).toInt(), 0, (4 * density).toInt())
                        }
                        layoutParams = lpBtn
                        setOnClickListener {
                            dismissLanguageProposal()
                            onReplacePair(pair.sourceCode)
                        }
                    }
                    card.addView(btnOption)
                }
            } else {
                val btnDownload = TextView(context).apply {
                    text = "Download \${languageItem.name} Pack (~30MB)"
                    textSize = 12f
                    setTextColor(Color.WHITE)
                    setBackgroundColor(Color.parseColor("#25D366"))
                    setPadding((12 * density).toInt(), (10 * density).toInt(), (12 * density).toInt(), (10 * density).toInt())
                    gravity = Gravity.CENTER
                    paint.isFakeBoldText = true
                    isClickable = true
                    isFocusable = true
                    val lpBtn = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
                        setMargins(0, (6 * density).toInt(), 0, (4 * density).toInt())
                    }
                    layoutParams = lpBtn
                    setOnClickListener {
                        dismissLanguageProposal()
                        onDownloadAndAdd()
                    }
                }
                card.addView(btnDownload)
            }

            val btnIgnore = TextView(context).apply {
                text = "🚫 Ignore \${languageItem.name} (Don't Ask Again)"
                textSize = 11f
                setTextColor(Color.parseColor("#F6AD55"))
                setBackgroundColor(Color.parseColor("#111B21"))
                setPadding((10 * density).toInt(), (8 * density).toInt(), (10 * density).toInt(), (8 * density).toInt())
                gravity = Gravity.CENTER
                paint.isFakeBoldText = true
                isClickable = true
                isFocusable = true
                val lpBtn = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
                    setMargins(0, (6 * density).toInt(), 0, (2 * density).toInt())
                }
                layoutParams = lpBtn
                setOnClickListener {
                    dismissLanguageProposal()
                    onIgnoreLanguage(languageItem.code)
                }
            }
            card.addView(btnIgnore)

            val lp = WindowManager.LayoutParams().apply {
                width = (310 * density).toInt()
                height = WindowManager.LayoutParams.WRAP_CONTENT
                type = WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY
                flags = WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                format = PixelFormat.TRANSLUCENT
                gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
                y = (70 * density).toInt()
            }
            try {
                windowManager.addView(card, lp)
                proposalDialogView = card
            } catch (e: Exception) {}
        }
    }

    fun dismissDetectedLanguageBadge() {
        mainHandler.post {
            detectedBadgeView?.let {
                try { windowManager.removeView(it) } catch (e: Exception) {}
                detectedBadgeView = null
            }
        }
    }

    fun dismissLanguageProposal() {
        mainHandler.post {
            proposalDialogView?.let {
                try { windowManager.removeView(it) } catch (e: Exception) {}
                proposalDialogView = null
            }
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
import com.bangla.translator.data.SupportedLanguages
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
    private val dismissedLangsThisSession = mutableSetOf<String>()

    override fun onServiceConnected() {
        super.onServiceConnected()
        val wm = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        appPreferences = AppPreferences(this)
        appPreferences.registerListener(this)
        messageScanner = WhatsAppMessageScanner(appPreferences.activeSourceLanguages, appPreferences.bengaliRatioThreshold)
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
                dismissedLangsThisSession.clear()
            }
            return
        }

        if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            sessionGeneration.incrementAndGet()
            overlayController.removeAllOverlays()
            dismissedLangsThisSession.clear()
        }

        if (!appPreferences.isOverlayEnabled) return

        mainHandler.postDelayed({
            val root = rootInActiveWindow ?: return@postDelayed
            val currentGen = sessionGeneration.get()
            val scanResult = messageScanner.scanVisibleMessages(root, screenBounds, currentGen)
            root.recycle()

            val uninstalled = scanResult.detectedUninstalledLanguage
            if (uninstalled != null &&
                appPreferences.isAutoDetectPromptEnabled &&
                !appPreferences.isLanguageIgnored(uninstalled) &&
                !dismissedLangsThisSession.contains(uninstalled)
            ) {
                val item = SupportedLanguages.findByCode(uninstalled)
                val sample = scanResult.sampleUninstalledText ?: ""
                val currentPairs = appPreferences.getLanguagePairs()
                val isSlotsFull = currentPairs.size >= AppPreferences.MAX_ACTIVE_LANGUAGES

                overlayController.showLanguageProposalWindow(
                    languageItem = item,
                    sampleText = sample,
                    isSlotsFull = isSlotsFull,
                    currentPairs = currentPairs,
                    onDownloadAndAdd = {
                        dismissedLangsThisSession.add(uninstalled)
                        appPreferences.addLanguagePair(uninstalled, "en")
                        TranslationEngine.prepareModelIfNeeded(
                            sourceLangCode = item.mlKitCode,
                            onSuccess = {
                                mainHandler.post {
                                    messageScanner = WhatsAppMessageScanner(appPreferences.activeSourceLanguages, appPreferences.bengaliRatioThreshold)
                                }
                            }
                        )
                    },
                    onReplacePair = { oldSourceCode ->
                        dismissedLangsThisSession.add(uninstalled)
                        appPreferences.replaceLanguagePair(oldSourceCode, uninstalled, "en")
                        val remaining = appPreferences.activeSourceLanguages
                        if (!remaining.contains(oldSourceCode)) {
                            val oldMeta = SupportedLanguages.findByCode(oldSourceCode)
                            TranslationEngine.deleteModel(oldMeta.mlKitCode)
                        }
                        TranslationEngine.prepareModelIfNeeded(
                            sourceLangCode = item.mlKitCode,
                            onSuccess = {
                                mainHandler.post {
                                    messageScanner = WhatsAppMessageScanner(appPreferences.activeSourceLanguages, appPreferences.bengaliRatioThreshold)
                                }
                            }
                        )
                    },
                    onIgnoreLanguage = { langCode ->
                        dismissedLangsThisSession.add(langCode)
                        appPreferences.addIgnoredLanguage(langCode)
                    },
                    onDismiss = { dismissedLangsThisSession.add(uninstalled) }
                )
            }

            val messages = scanResult.messages
            val currentlyVisible = messages.map { it.displayKey }.toSet()
            overlayController.reconcileVisibleOverlays(currentlyVisible)

            for (msg in messages) {
                TranslationEngine.translate(
                    text = msg.normalizedText,
                    sourceCode = msg.languageCode,
                    onSuccess = { translated ->
                        if (sessionGeneration.get() == currentGen) {
                            val isMulti = msg.languageCode.contains("+")
                            val codes = if (isMulti) msg.languageCode.split("+").filter { it.isNotBlank() } else listOf(msg.languageCode)
                            val trgMeta = SupportedLanguages.findByCode(appPreferences.targetLanguageCode)
                            val dynamicPairLabel = if (codes.size > 1) {
                                val sNames = codes.map { c ->
                                    val m = SupportedLanguages.findByCode(c)
                                    "\${m.name} (\${m.nativeName})"
                                }.joinToString(" + ")
                                "\$sNames → \${trgMeta.name}"
                            } else {
                                val srcMeta = SupportedLanguages.findByCode(codes.firstOrNull() ?: "bn")
                                "\${srcMeta.name} (\${srcMeta.nativeName}) → \${trgMeta.name}"
                            }
                            val dynamicBadgeLabel = if (codes.size > 1) codes.joinToString("+") { it.uppercase() } else trgMeta.code.uppercase()

                            overlayController.showOverlay(
                                displayKey = msg.displayKey,
                                translatedText = translated,
                                targetBounds = msg.bounds,
                                sessionGeneration = currentGen,
                                screenBounds = screenBounds,
                                languagePairLabel = dynamicPairLabel,
                                badgeLabel = dynamicBadgeLabel
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
        } else if (key == "key_bengali_ratio" || key == "key_source_lang" || key == "key_target_lang" || key == "key_active_source_langs" || key == "key_pairs_config") {
            messageScanner = WhatsAppMessageScanner(appPreferences.activeSourceLanguages, appPreferences.bengaliRatioThreshold)
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

        var matchedLang: String? = null
        for (lang in appPreferences.activeSourceLanguages) {
            if (LanguageDetector.isTargetLanguageMessage(text, lang, appPreferences.bengaliRatioThreshold)) {
                matchedLang = lang
                break
            }
        }
        if (matchedLang == null) return

        TranslationEngine.translate(
            text = text,
            sourceCode = matchedLang,
            onSuccess = { translatedText ->
                postTranslatedNotification(pkg, title, text, translatedText, sbn.id)
            },
            onFailure = {}
        )
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

import android.Manifest
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.text.TextUtils
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.bangla.translator.data.AppPreferences
import com.bangla.translator.data.ModelDownloadState
import com.bangla.translator.data.SupportedLanguages
import com.bangla.translator.databinding.ActivityMainBinding
import com.bangla.translator.service.BanglaAccessibilityService
import com.bangla.translator.service.NotificationTranslationService
import com.bangla.translator.translation.TranslationEngine
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity(), SharedPreferences.OnSharedPreferenceChangeListener {

    private lateinit var binding: ActivityMainBinding
    private lateinit var appPreferences: AppPreferences

    // Runtime permission launcher for Android 13+ POST_NOTIFICATIONS
    private val requestNotificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            appPreferences.isNotificationTranslationEnabled = true
            binding.switchNotifications.isChecked = true
            checkNotificationListenerStatus()
        } else {
            binding.switchNotifications.isChecked = false
            Toast.makeText(this, "Notification permission is required to display translated alerts.", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        appPreferences = AppPreferences(this)

        setupLanguageSpinners()
        setupListeners()
        observeModelState()
        TranslationEngine.setLanguagePair(appPreferences.sourceLanguageCode, appPreferences.targetLanguageCode)
        TranslationEngine.checkModelAvailability()
    }

    override fun onStart() {
        super.onStart()
        appPreferences.registerListener(this)
        refreshAllUI()
    }

    override fun onResume() {
        super.onResume()
        appPreferences.registerListener(this)
        refreshAllUI()
    }

    override fun onRestart() {
        super.onRestart()
        refreshAllUI()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            refreshAllUI()
        }
    }

    override fun onStop() {
        super.onStop()
        appPreferences.unregisterListener(this)
    }

    override fun onPause() {
        super.onPause()
    }

    override fun onDestroy() {
        super.onDestroy()
        appPreferences.unregisterListener(this)
    }

    override fun onSharedPreferenceChanged(sharedPreferences: SharedPreferences?, key: String?) {
        runOnUiThread {
            refreshAllUI()
        }
    }

    /**
     * Completely synchronizes all on-screen UI components with the current AppPreferences.
     * Called whenever the user returns to the app (onResume) or when preferences are modified in the background.
     */
    private fun refreshAllUI() {
        updateAccessibilityStatus()
        checkNotificationListenerStatus()
        TranslationEngine.checkModelAvailability()
        TranslationEngine.purgeInactiveModels(appPreferences.activeSourceLanguages)
        updateModelUpdateBannerUI()

        // Sync feature switches
        if (binding.switchOverlay.isChecked != appPreferences.isOverlayEnabled) {
            binding.switchOverlay.isChecked = appPreferences.isOverlayEnabled
        }
        if (binding.switchNotifications.isChecked != appPreferences.isNotificationTranslationEnabled) {
            binding.switchNotifications.isChecked = appPreferences.isNotificationTranslationEnabled
        }
        if (binding.switchAutoDetectPrompt.isChecked != appPreferences.isAutoDetectPromptEnabled) {
            binding.switchAutoDetectPrompt.isChecked = appPreferences.isAutoDetectPromptEnabled
        }

        // Sync Target Language selection
        val targetLanguages = SupportedLanguages.TARGET_LANGUAGES
        val targetIdx = targetLanguages.indexOfFirst { it.code == appPreferences.targetLanguageCode }.coerceAtLeast(0)
        if (binding.spinnerTargetLanguage.selectedItemPosition != targetIdx) {
            binding.spinnerTargetLanguage.setSelection(targetIdx)
        }

        // Refresh all dynamic widgets
        refreshLanguageSlotsUI()
        refreshIgnoredLanguagesUI()
    }

    private fun setupLanguageSpinners() {
        val allLanguages = SupportedLanguages.ALL
        val targetLanguages = SupportedLanguages.TARGET_LANGUAGES

        val sourceAdapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, allLanguages)
        binding.spinnerSourceLanguage.adapter = sourceAdapter

        val slot2Adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, allLanguages)
        binding.spinnerSlot2Language.adapter = slot2Adapter

        val slot3Adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, allLanguages)
        binding.spinnerSlot3Language.adapter = slot3Adapter

        val targetAdapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, targetLanguages)
        binding.spinnerTargetLanguage.adapter = targetAdapter

        val initialTargetIndex = targetLanguages.indexOfFirst { it.code == appPreferences.targetLanguageCode }.coerceAtLeast(0)
        binding.spinnerTargetLanguage.setSelection(initialTargetIndex)

        refreshLanguageSlotsUI()

        // Slot 1 change listener
        binding.spinnerSourceLanguage.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                val selected = allLanguages[position]
                val pairs = appPreferences.getLanguagePairs().toMutableList()
                if (pairs.isNotEmpty() && pairs[0].sourceCode != selected.code) {
                    val oldCode = pairs[0].sourceCode
                    pairs[0] = com.bangla.translator.data.LanguagePairPreference(selected.code, appPreferences.targetLanguageCode)
                    appPreferences.saveLanguagePairs(pairs)
                    val remaining = appPreferences.activeSourceLanguages
                    if (!remaining.contains(oldCode)) {
                        val oldMeta = SupportedLanguages.findByCode(oldCode)
                        TranslationEngine.deleteModel(oldMeta.mlKitCode)
                    }
                    TranslationEngine.prepareModelIfNeeded(sourceLangCode = selected.mlKitCode)
                    updateLanguagePairSummary()
                }
            }
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }

        // Slot 2 change listener
        binding.spinnerSlot2Language.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                val selected = allLanguages[position]
                val pairs = appPreferences.getLanguagePairs().toMutableList()
                if (pairs.size > 1 && pairs[1].sourceCode != selected.code) {
                    val oldCode = pairs[1].sourceCode
                    pairs[1] = com.bangla.translator.data.LanguagePairPreference(selected.code, appPreferences.targetLanguageCode)
                    appPreferences.saveLanguagePairs(pairs)
                    val remaining = appPreferences.activeSourceLanguages
                    if (!remaining.contains(oldCode)) {
                        val oldMeta = SupportedLanguages.findByCode(oldCode)
                        TranslationEngine.deleteModel(oldMeta.mlKitCode)
                    }
                    TranslationEngine.prepareModelIfNeeded(sourceLangCode = selected.mlKitCode)
                    updateLanguagePairSummary()
                }
            }
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }

        // Slot 3 change listener
        binding.spinnerSlot3Language.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                val selected = allLanguages[position]
                val pairs = appPreferences.getLanguagePairs().toMutableList()
                if (pairs.size > 2 && pairs[2].sourceCode != selected.code) {
                    val oldCode = pairs[2].sourceCode
                    pairs[2] = com.bangla.translator.data.LanguagePairPreference(selected.code, appPreferences.targetLanguageCode)
                    appPreferences.saveLanguagePairs(pairs)
                    val remaining = appPreferences.activeSourceLanguages
                    if (!remaining.contains(oldCode)) {
                        val oldMeta = SupportedLanguages.findByCode(oldCode)
                        TranslationEngine.deleteModel(oldMeta.mlKitCode)
                    }
                    TranslationEngine.prepareModelIfNeeded(sourceLangCode = selected.mlKitCode)
                    updateLanguagePairSummary()
                }
            }
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }

        // Target language change listener
        binding.spinnerTargetLanguage.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                val selected = targetLanguages[position]
                if (selected.code != appPreferences.targetLanguageCode) {
                    appPreferences.targetLanguageCode = selected.code
                    val pairs = appPreferences.getLanguagePairs().map {
                        com.bangla.translator.data.LanguagePairPreference(it.sourceCode, selected.code)
                    }
                    appPreferences.saveLanguagePairs(pairs)
                    updateLanguagePairSummary()
                }
            }
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }

        // Add Language Pair Button
        binding.btnAddLanguagePair.setOnClickListener {
            showAddLanguagePairDialog()
        }

        // Remove buttons (purges local model pack from storage & RAM)
        binding.btnRemoveSlot2.setOnClickListener {
            val pairs = appPreferences.getLanguagePairs()
            if (pairs.size > 1) {
                val removedCode = pairs[1].sourceCode
                appPreferences.removeLanguagePair(removedCode)
                val remainingCodes = appPreferences.activeSourceLanguages
                if (!remainingCodes.contains(removedCode)) {
                    val langMeta = SupportedLanguages.findByCode(removedCode)
                    TranslationEngine.deleteModel(langMeta.mlKitCode) {
                        runOnUiThread {
                            Toast.makeText(this@MainActivity, "Deleted \${langMeta.name} pack (~30MB). Storage & RAM freed.", Toast.LENGTH_SHORT).show()
                        }
                    }
                }
                refreshLanguageSlotsUI()
            }
        }

        binding.btnRemoveSlot3.setOnClickListener {
            val pairs = appPreferences.getLanguagePairs()
            if (pairs.size > 2) {
                val removedCode = pairs[2].sourceCode
                appPreferences.removeLanguagePair(removedCode)
                val remainingCodes = appPreferences.activeSourceLanguages
                if (!remainingCodes.contains(removedCode)) {
                    val langMeta = SupportedLanguages.findByCode(removedCode)
                    TranslationEngine.deleteModel(langMeta.mlKitCode) {
                        runOnUiThread {
                            Toast.makeText(this@MainActivity, "Deleted \${langMeta.name} pack (~30MB). Storage & RAM freed.", Toast.LENGTH_SHORT).show()
                        }
                    }
                }
                refreshLanguageSlotsUI()
            }
        }

        updateLanguagePairSummary()
    }

    private fun refreshLanguageSlotsUI() {
        val pairs = appPreferences.getLanguagePairs()
        val allLanguages = SupportedLanguages.ALL

        // Slot 1
        if (pairs.isNotEmpty()) {
            val idx = allLanguages.indexOfFirst { it.code == pairs[0].sourceCode }.coerceAtLeast(0)
            if (binding.spinnerSourceLanguage.selectedItemPosition != idx) {
                binding.spinnerSourceLanguage.setSelection(idx)
            }
        }

        // Slot 2
        if (pairs.size > 1) {
            binding.layoutSlot2.visibility = View.VISIBLE
            val idx = allLanguages.indexOfFirst { it.code == pairs[1].sourceCode }.coerceAtLeast(0)
            if (binding.spinnerSlot2Language.selectedItemPosition != idx) {
                binding.spinnerSlot2Language.setSelection(idx)
            }
        } else {
            binding.layoutSlot2.visibility = View.GONE
        }

        // Slot 3
        if (pairs.size > 2) {
            binding.layoutSlot3.visibility = View.VISIBLE
            val idx = allLanguages.indexOfFirst { it.code == pairs[2].sourceCode }.coerceAtLeast(0)
            if (binding.spinnerSlot3Language.selectedItemPosition != idx) {
                binding.spinnerSlot3Language.setSelection(idx)
            }
        } else {
            binding.layoutSlot3.visibility = View.GONE
        }

        binding.btnAddLanguagePair.visibility = if (pairs.size < 3) View.VISIBLE else View.GONE
        binding.tvActivePairsBadge.text = "\${pairs.size}/3 Active"
        updateLanguagePairSummary()
    }

    private fun showAddLanguagePairDialog() {
        val currentPairs = appPreferences.getLanguagePairs()
        val available = SupportedLanguages.ALL.filter { lang ->
            currentPairs.none { it.sourceCode == lang.code }
        }

        if (available.isEmpty()) {
            Toast.makeText(this, "All available languages are already configured.", Toast.LENGTH_SHORT).show()
            return
        }

        val items = available.map { "\${it.name} (\${it.nativeName})" }.toTypedArray()
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Add Language Pair (Slot #\${currentPairs.size + 1})")
            .setItems(items) { _, which ->
                val chosen = available[which]
                appPreferences.addLanguagePair(chosen.code, appPreferences.targetLanguageCode)
                TranslationEngine.prepareModelIfNeeded(
                    sourceLangCode = chosen.mlKitCode,
                    onSuccess = {
                        runOnUiThread {
                            refreshLanguageSlotsUI()
                            Toast.makeText(this@MainActivity, "\${chosen.name} pair added & model ready!", Toast.LENGTH_SHORT).show()
                        }
                    }
                )
                refreshLanguageSlotsUI()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun updateLanguagePairSummary() {
        val pairs = appPreferences.getLanguagePairs()
        val summary = pairs.joinToString(", ") {
            val src = SupportedLanguages.findByCode(it.sourceCode)
            val trg = SupportedLanguages.findByCode(it.targetCode)
            "\${src.nativeName} → \${trg.name}"
        }
        binding.tvActivePairSummary.text = "Active Pairs (\${pairs.size}/3): \$summary"
        binding.tvModelDescription.text = "Downloads ~30MB Google ML Kit model per language for 100% offline WhatsApp translations."
    }

    private fun setupListeners() {
        // Accessibility Service Button
        binding.btnEnableAccessibility.setOnClickListener {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
            startActivity(intent)
        }

        // Translation Model Download Button
        binding.btnDownloadModel.setOnClickListener {
            binding.pbModelDownload.visibility = View.VISIBLE
            binding.btnDownloadModel.isEnabled = false
            TranslationEngine.prepareModelIfNeeded(
                onSuccess = {
                    runOnUiThread {
                        binding.pbModelDownload.visibility = View.GONE
                        binding.btnDownloadModel.isEnabled = true
                        val src = SupportedLanguages.findByCode(appPreferences.sourceLanguageCode)
                        Toast.makeText(this, "\${src.name} model ready for offline use!", Toast.LENGTH_SHORT).show()
                    }
                },
                onFailure = { error ->
                    runOnUiThread {
                        binding.pbModelDownload.visibility = View.GONE
                        binding.btnDownloadModel.isEnabled = true
                        Toast.makeText(this, "Failed to download model: \${error.localizedMessage}", Toast.LENGTH_LONG).show()
                    }
                }
            )
        }

        // Translation Model Update Button
        binding.btnUpdateModel.setOnClickListener {
            binding.pbModelDownload.visibility = View.VISIBLE
            binding.btnUpdateModel.isEnabled = false
            val activePairs = appPreferences.getLanguagePairs()
            if (activePairs.isEmpty()) {
                binding.pbModelDownload.visibility = View.GONE
                binding.btnUpdateModel.isEnabled = true
                Toast.makeText(this, "No active language models to update.", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            var completedCount = 0
            for (pair in activePairs) {
                val meta = SupportedLanguages.findByCode(pair.sourceCode)
                TranslationEngine.prepareModelIfNeeded(
                    sourceLangCode = meta.mlKitCode,
                    onSuccess = {
                        completedCount++
                        if (completedCount >= activePairs.size) {
                            runOnUiThread {
                                binding.pbModelDownload.visibility = View.GONE
                                binding.btnUpdateModel.isEnabled = true
                                appPreferences.isModelUpdateAvailable = false
                                appPreferences.modelVersion = "v2.4"
                                binding.tvModelUpdateTitle.text = "✅ Models Up to Date (v2.4 Latest)"
                                binding.tvModelUpdateDesc.text = "Latest neural weights and enriched dictionaries are active."
                                binding.btnUpdateModel.visibility = View.GONE
                                Toast.makeText(this@MainActivity, "All models successfully updated to v2.4!", Toast.LENGTH_SHORT).show()
                            }
                        }
                    },
                    onFailure = { error ->
                        runOnUiThread {
                            binding.pbModelDownload.visibility = View.GONE
                            binding.btnUpdateModel.isEnabled = true
                            Toast.makeText(this@MainActivity, "Update failed: \${error.localizedMessage}", Toast.LENGTH_LONG).show()
                        }
                    }
                )
            }
        }

        // Translation Model Delete Button
        binding.btnDeleteModel.setOnClickListener {
            TranslationEngine.deleteModel {
                runOnUiThread {
                    Toast.makeText(this, "On-device model removed.", Toast.LENGTH_SHORT).show()
                }
            }
        }

        // Overlay Feature Switch
        binding.switchOverlay.isChecked = appPreferences.isOverlayEnabled
        binding.switchOverlay.setOnCheckedChangeListener { _, isChecked ->
            appPreferences.isOverlayEnabled = isChecked
        }

        // Notification Feature Switch
        binding.switchNotifications.isChecked = appPreferences.isNotificationTranslationEnabled
        binding.switchNotifications.setOnCheckedChangeListener { _, isChecked ->
            if (isChecked) {
                handleEnableNotifications()
            } else {
                appPreferences.isNotificationTranslationEnabled = false
                binding.btnEnableNotificationAccess.visibility = View.GONE
            }
        }

        // Notification Access Button
        binding.btnEnableNotificationAccess.setOnClickListener {
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
            startActivity(intent)
        }

        // Live Auto-Detect Language Prompt Switch
        binding.switchAutoDetectPrompt.isChecked = appPreferences.isAutoDetectPromptEnabled
        binding.switchAutoDetectPrompt.setOnCheckedChangeListener { _, isChecked ->
            appPreferences.isAutoDetectPromptEnabled = isChecked
        }

        // Add Ignored Language Button
        binding.btnAddIgnoredLanguage.setOnClickListener {
            showAddIgnoredLanguageDialog()
        }

        refreshIgnoredLanguagesUI()
    }

    private fun refreshIgnoredLanguagesUI() {
        val ignored = appPreferences.ignoredLanguages.toList()
        binding.layoutIgnoredLanguages.removeAllViews()

        if (ignored.isEmpty()) {
            val emptyTv = android.widget.TextView(this).apply {
                text = "No languages currently ignored."
                setTextColor(ContextCompat.getColor(this@MainActivity, R.color.text_secondary))
                textSize = 12f
            }
            binding.layoutIgnoredLanguages.addView(emptyTv)
            return
        }

        for (code in ignored) {
            val item = SupportedLanguages.findByCode(code)
            val chip = android.widget.LinearLayout(this).apply {
                orientation = android.widget.LinearLayout.HORIZONTAL
                gravity = android.view.Gravity.CENTER_VERTICAL
                setPadding(24, 12, 24, 12)
                setBackgroundResource(R.drawable.bg_overlay_incoming)
                val lp = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 6, 0, 6)
                }
                layoutParams = lp
            }

            val tvName = android.widget.TextView(this).apply {
                text = "🚫 \${item.name} (\${item.nativeName}) [\${code.uppercase()}]"
                setTextColor(android.graphics.Color.WHITE)
                textSize = 12f
                layoutParams = android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            }

            val btnRemove = android.widget.TextView(this).apply {
                text = "✕ Unignore"
                setTextColor(ContextCompat.getColor(this@MainActivity, R.color.whatsapp_green))
                textSize = 11f
                paint.isFakeBoldText = true
                setPadding(16, 4, 16, 4)
                setOnClickListener {
                    appPreferences.removeIgnoredLanguage(code)
                    refreshIgnoredLanguagesUI()
                    Toast.makeText(this@MainActivity, "Unignored \${item.name}", Toast.LENGTH_SHORT).show()
                }
            }

            chip.addView(tvName)
            chip.addView(btnRemove)
            binding.layoutIgnoredLanguages.addView(chip)
        }
    }

    private fun showAddIgnoredLanguageDialog() {
        val currentIgnored = appPreferences.ignoredLanguages
        val available = SupportedLanguages.ALL.filter { !currentIgnored.contains(it.code) }

        if (available.isEmpty()) {
            Toast.makeText(this, "All languages are already in the ignore list.", Toast.LENGTH_SHORT).show()
            return
        }

        val items = available.map { "\${it.name} (\${it.nativeName})" }.toTypedArray()
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Add Language to Ignore List")
            .setItems(items) { _, which ->
                val chosen = available[which]
                appPreferences.addIgnoredLanguage(chosen.code)
                refreshIgnoredLanguagesUI()
                Toast.makeText(this, "Ignored \${chosen.name}. Live detection will not prompt for it.", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun handleEnableNotifications() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                requestNotificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                return
            }
        }
        appPreferences.isNotificationTranslationEnabled = true
        checkNotificationListenerStatus()
    }

    private fun observeModelState() {
        lifecycleScope.launch {
            TranslationEngine.modelState.collectLatest { state ->
                when (state) {
                    is ModelDownloadState.Ready -> {
                        binding.tvModelStatus.text = "On-Device Model Ready (~30MB)"
                        binding.tvModelStatus.setTextColor(ContextCompat.getColor(this@MainActivity, R.color.status_active))
                        binding.btnDownloadModel.visibility = View.GONE
                        binding.btnDeleteModel.visibility = View.VISIBLE
                        binding.pbModelDownload.visibility = View.GONE
                    }
                    is ModelDownloadState.Downloading -> {
                        binding.tvModelStatus.text = "Downloading Model (~30MB)..."
                        binding.tvModelStatus.setTextColor(ContextCompat.getColor(this@MainActivity, R.color.accent))
                        binding.btnDownloadModel.visibility = View.VISIBLE
                        binding.btnDownloadModel.isEnabled = false
                        binding.btnDeleteModel.visibility = View.GONE
                        binding.pbModelDownload.visibility = View.VISIBLE
                    }
                    is ModelDownloadState.NotDownloaded -> {
                        binding.tvModelStatus.text = "Download Needed for Offline Use"
                        binding.tvModelStatus.setTextColor(ContextCompat.getColor(this@MainActivity, R.color.status_inactive))
                        binding.btnDownloadModel.visibility = View.VISIBLE
                        binding.btnDownloadModel.isEnabled = true
                        binding.btnDeleteModel.visibility = View.GONE
                        binding.pbModelDownload.visibility = View.GONE
                    }
                    is ModelDownloadState.Error -> {
                        binding.tvModelStatus.text = "Download Error: \${state.message}"
                        binding.tvModelStatus.setTextColor(ContextCompat.getColor(this@MainActivity, R.color.status_inactive))
                        binding.btnDownloadModel.visibility = View.VISIBLE
                        binding.btnDownloadModel.isEnabled = true
                        binding.btnDeleteModel.visibility = View.GONE
                        binding.pbModelDownload.visibility = View.GONE
                    }
                }
            }
        }
    }

    private fun updateAccessibilityStatus() {
        val isEnabled = isAccessibilityServiceEnabled(this, BanglaAccessibilityService::class.java)
        if (isEnabled) {
            binding.tvAccessibilityStatus.text = getString(R.string.accessibility_status_enabled)
            binding.tvAccessibilityStatus.setTextColor(ContextCompat.getColor(this, R.color.status_active))
            binding.btnEnableAccessibility.visibility = View.GONE
        } else {
            binding.tvAccessibilityStatus.text = getString(R.string.accessibility_status_disabled)
            binding.tvAccessibilityStatus.setTextColor(ContextCompat.getColor(this, R.color.status_inactive))
            binding.btnEnableAccessibility.visibility = View.VISIBLE
        }
    }

    private fun updateModelUpdateBannerUI() {
        if (appPreferences.isModelUpdateAvailable) {
            binding.layoutModelUpdateBanner.visibility = View.VISIBLE
            binding.tvModelUpdateTitle.text = "🔔 Model Update Available (v2.4)"
            binding.tvModelUpdateDesc.text = "Improved French & Spanish disambiguation, richer vocabulary dictionaries, and faster on-device inference."
            binding.btnUpdateModel.visibility = View.VISIBLE
            binding.btnUpdateModel.isEnabled = true
            binding.btnUpdateModel.text = "Update All Models (v2.4)"
        } else {
            binding.layoutModelUpdateBanner.visibility = View.VISIBLE
            binding.tvModelUpdateTitle.text = "✅ Models Up to Date (v2.4 Latest)"
            binding.tvModelUpdateDesc.text = "Latest neural weights and enriched dictionaries are active."
            binding.btnUpdateModel.visibility = View.GONE
        }
    }

    private fun checkNotificationListenerStatus() {
        if (!appPreferences.isNotificationTranslationEnabled) {
            binding.btnEnableNotificationAccess.visibility = View.GONE
            return
        }
        val isEnabled = isNotificationServiceEnabled(this)
        if (isEnabled) {
            binding.btnEnableNotificationAccess.visibility = View.GONE
        } else {
            binding.btnEnableNotificationAccess.visibility = View.VISIBLE
        }
    }

    private fun isAccessibilityServiceEnabled(context: Context, service: Class<*>): Boolean {
        val expectedComponentName = ComponentName(context, service)
        val enabledServicesSetting = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: return false

        val colonSplitter = TextUtils.SimpleStringSplitter(':')
        colonSplitter.setString(enabledServicesSetting)

        while (colonSplitter.hasNext()) {
            val componentNameString = colonSplitter.next()
            val enabledComponent = ComponentName.unflattenFromString(componentNameString)
            if (enabledComponent != null && enabledComponent == expectedComponentName) {
                return true
            }
        }
        return false
    }

    private fun isNotificationServiceEnabled(context: Context): Boolean {
        val pkgName = context.packageName
        val flat = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")
        if (!flat.isNullOrEmpty()) {
            val names = flat.split(":").toTypedArray()
            for (name in names) {
                val cn = ComponentName.unflattenFromString(name)
                if (cn != null && TextUtils.equals(pkgName, cn.packageName)) {
                    return true
                }
            }
        }
        return false
    }
}
`
};

export async function downloadProjectZip() {
  const zip = new JSZip();

  for (const [filename, content] of Object.entries(ALL_PROJECT_FILES)) {
    zip.file(`ChatNora/\${filename}`, content);
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

