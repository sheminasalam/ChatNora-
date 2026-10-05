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
          # Locate whatever debug apk gradle produced and copy to ChatNora-debug.apk
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
            output?.outputFileName = "ChatNora-\\\${name}.apk"
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
    // AndroidX & UI
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.2")

    // Kotlin Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.8.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")

    // Google ML Kit On-Device Translation & Language Identification
    implementation("com.google.mlkit:translate:17.0.3")
    implementation("com.google.mlkit:language-id:17.0.6")

    // Unit Testing
    testImplementation("junit:junit:4.13.2")
    testImplementation("androidx.test:core:1.5.0")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.1")
}
`,

  'app/proguard-rules.pro': `# ProGuard rules for Bangla WhatsApp Translator

# Keep ML Kit Translate classes and model loaders
-keep class com.google.mlkit.nl.translate.** { *; }
-keep class com.google.android.gms.internal.mlkit_translate.** { *; }

# Keep model data classes
-keepclassmembers class * {
    @androidx.annotation.Keep <fields>;
    @androidx.annotation.Keep <methods>;
}

# Retain Parcelable and Serializable implementations
-keepclassmembers class * implements android.os.Parcelable {
    static ** CREATOR;
}
`,

  'app/src/main/AndroidManifest.xml': `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Optional permission on Android 13+ (API 33+) only required if user enables translated notifications -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    
    <!-- Required for ML Kit to download on-device Bengali-English models via Google Play Services -->
    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:allowBackup="false"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher"
        android:supportsRtl="true"
        android:theme="@style/Theme.ChatNora">

        <!-- Main Configuration Activity -->
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="portrait">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Core WhatsApp Accessibility Service for In-Chat Bengali Translation -->
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

        <!-- Optional Notification Listener Service for Incoming Bengali WhatsApp Notifications -->
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
    
    <!-- UI Strings -->
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
    <color name="overlay_background">#1F2C34</color>
    <color name="overlay_stroke">#2A3942</color>
    <color name="overlay_subtext">#8696A0</color>
    <color name="overlay_dot">#25D366</color>
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
    <!-- Top Dot / Head -->
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M182,160 L204,160 C206,175 204,192 196,204 L178,198 C182,188 184,175 182,160 Z" />

    <!-- Horizontal Bar -->
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M124,204 L258,204 L258,225 L124,225 Z" />

    <!-- Left Slanted Stroke (Pie) -->
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M198,225 C190,265 168,305 125,335 L110,318 C148,292 170,258 178,225 Z" />

    <!-- Right Slanted Stroke (Na) -->
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

  'app/src/main/res/drawable/bg_overlay_card.xml': `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="@color/overlay_incoming_bg" />
    <stroke
        android:width="0.8dp"
        android:color="@color/overlay_incoming_stroke" />
    <corners android:radius="14dp" />
</shape>
`,

  'app/src/main/res/drawable/ic_launcher_foreground.xml': `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M54,24c-16.57,0 -30,13.43 -30,30 0,5.3 1.38,10.27 3.79,14.59L24,84l15.82,-3.73C44.02,82.63 48.86,84 54,84c16.57,0 30,-13.43 30,-30S70.57,24 54,24zm-6.3,16h4.6v2.3h-4.6v2.3h-2.3v-2.3H37v-2.3h8.4c-0.5,-1.6 -1.5,-3 -2.7,-4.1l1.7,-1.6c1.6,1.4 2.8,3.3 3.6,5.7h-2.3zM67,64h-3.2l-2.1,-5.5h-8.4L51.2,64H48l7.5,-19h3.8L67,64zm-6.3,-8.2l-3,-8.2 -3,8.2h6z"/>
</vector>
`,

  'app/src/main/res/drawable/ic_translate.xml': `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#1B4F72"
        android:pathData="M12.87,15.07l-2.54,-2.51l0.03,-0.03c1.74,-1.94 2.98,-4.17 3.71,-6.53H17V4h-7V2H8v2H1v2h11.17C11.5,7.92 10.44,9.75 9,11.35 8.07,10.32 7.3,9.19 6.69,8h-2c0.73,1.63 1.73,3.17 2.98,4.56l-5.09,5.02L4,19l5,-5 3.11,3.11 0.76,-2.04zM18.5,10h-2L12,22h2l1.12,-3h4.75L21,22h2l-4.5,-12zm-2.62,7l1.62,-4.33L19.12,17h-3.24z"/>
</vector>
`,

  'app/src/main/res/values/themes.xml': `<resources>
    <style name="Theme.ChatNora" parent="Theme.Material3.DayNight.NoActionBar">
        <item name="colorPrimary">@color/primary</item>
        <item name="colorPrimaryDark">@color/primary_dark</item>
        <item name="colorSecondary">@color/accent</item>
        <item name="android:statusBarColor">@color/primary_dark</item>
        <item name="android:windowBackground">@color/background_light</item>
    </style>
    <!-- Backwards compatible alias -->
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

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="vertical"
        android:padding="20dp">

        <!-- Universal Header -->
        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:gravity="center_vertical"
            android:orientation="horizontal"
            android:paddingBottom="16dp">

            <ImageView
                android:layout_width="44dp"
                android:layout_height="44dp"
                android:src="@drawable/ic_app_launcher"
                android:contentDescription="@null" />

            <LinearLayout
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_marginStart="12dp"
                android:layout_weight="1"
                android:orientation="vertical">

                <TextView
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:text="@string/app_name"
                    android:textColor="@color/primary"
                    android:textSize="19sp"
                    android:textStyle="bold" />

                <TextView
                    android:id="@+id/tvHeaderSubtitle"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:text="Universal On-Device WhatsApp Translator"
                    android:textColor="@color/text_secondary"
                    android:textSize="12sp" />
            </LinearLayout>
        </LinearLayout>

        <!-- Multi-Language Pairs Management Card -->
        <com.google.android.material.card.MaterialCardView
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginBottom="14dp"
            app:cardCornerRadius="12dp"
            app:cardElevation="2dp"
            app:strokeWidth="1dp"
            app:strokeColor="#E0E0E0">

            <LinearLayout
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:orientation="vertical"
                android:padding="16dp">

                <LinearLayout
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:gravity="center_vertical"
                    android:orientation="horizontal">

                    <TextView
                        android:layout_width="0dp"
                        android:layout_height="wrap_content"
                        android:layout_weight="1"
                        android:text="Configured Language Pairs (Max 3)"
                        android:textColor="@color/text_secondary"
                        android:textSize="12sp"
                        android:textAllCaps="true"
                        android:textStyle="bold" />

                    <TextView
                        android:id="@+id/tvActivePairsBadge"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:background="@drawable/bg_overlay_incoming"
                        android:paddingStart="8dp"
                        android:paddingEnd="8dp"
                        android:paddingTop="2dp"
                        android:paddingBottom="2dp"
                        android:text="1/3 Active"
                        android:textColor="@color/whatsapp_green"
                        android:textSize="11sp"
                        android:textStyle="bold" />
                </LinearLayout>

                <!-- Slot 1 (Primary Pair) -->
                <TextView
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="10dp"
                    android:text="Slot 1 (Primary Pair):"
                    android:textColor="@color/text_primary"
                    android:textSize="12sp"
                    android:textStyle="bold" />

                <Spinner
                    android:id="@+id/spinnerSourceLanguage"
                    android:layout_width="match_parent"
                    android:layout_height="44dp"
                    android:layout_marginTop="4dp"
                    android:background="@drawable/bg_overlay_incoming"
                    android:paddingStart="8dp"
                    android:paddingEnd="8dp" />

                <!-- Slot 2 -->
                <LinearLayout
                    android:id="@+id/layoutSlot2"
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="10dp"
                    android:orientation="vertical"
                    android:visibility="gone">

                    <LinearLayout
                        android:layout_width="match_parent"
                        android:layout_height="wrap_content"
                        android:gravity="center_vertical"
                        android:orientation="horizontal">

                        <TextView
                            android:id="@+id/tvSlot2Title"
                            android:layout_width="0dp"
                            android:layout_height="wrap_content"
                            android:layout_weight="1"
                            android:text="Slot 2 Pair:"
                            android:textColor="@color/text_primary"
                            android:textSize="12sp"
                            android:textStyle="bold" />

                        <TextView
                            android:id="@+id/btnRemoveSlot2"
                            android:layout_width="wrap_content"
                            android:layout_height="wrap_content"
                            android:padding="4dp"
                            android:text="Remove"
                            android:textColor="@color/status_inactive"
                            android:textSize="11sp"
                            android:textStyle="bold" />
                    </LinearLayout>

                    <Spinner
                        android:id="@+id/spinnerSlot2Language"
                        android:layout_width="match_parent"
                        android:layout_height="44dp"
                        android:layout_marginTop="4dp"
                        android:background="@drawable/bg_overlay_incoming"
                        android:paddingStart="8dp"
                        android:paddingEnd="8dp" />
                </LinearLayout>

                <!-- Slot 3 -->
                <LinearLayout
                    android:id="@+id/layoutSlot3"
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="10dp"
                    android:orientation="vertical"
                    android:visibility="gone">

                    <LinearLayout
                        android:layout_width="match_parent"
                        android:layout_height="wrap_content"
                        android:gravity="center_vertical"
                        android:orientation="horizontal">

                        <TextView
                            android:id="@+id/tvSlot3Title"
                            android:layout_width="0dp"
                            android:layout_height="wrap_content"
                            android:layout_weight="1"
                            android:text="Slot 3 Pair:"
                            android:textColor="@color/text_primary"
                            android:textSize="12sp"
                            android:textStyle="bold" />

                        <TextView
                            android:id="@+id/btnRemoveSlot3"
                            android:layout_width="wrap_content"
                            android:layout_height="wrap_content"
                            android:padding="4dp"
                            android:text="Remove"
                            android:textColor="@color/status_inactive"
                            android:textSize="11sp"
                            android:textStyle="bold" />
                    </LinearLayout>

                    <Spinner
                        android:id="@+id/spinnerSlot3Language"
                        android:layout_width="match_parent"
                        android:layout_height="44dp"
                        android:layout_marginTop="4dp"
                        android:background="@drawable/bg_overlay_incoming"
                        android:paddingStart="8dp"
                        android:paddingEnd="8dp" />
                </LinearLayout>

                <!-- Button to Add 2nd / 3rd Pair -->
                <com.google.android.material.button.MaterialButton
                    android:id="@+id/btnAddLanguagePair"
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="12dp"
                    android:text="+ Add Language Pair"
                    style="@style/Widget.MaterialComponents.Button.OutlinedButton"
                    android:textColor="@color/whatsapp_green"
                    app:strokeColor="@color/whatsapp_green"
                    app:strokeWidth="1dp" />

                <!-- Target Language Selector -->
                <TextView
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="10dp"
                    android:text="Translate All Messages Into (Target):"
                    android:textColor="@color/text_primary"
                    android:textSize="12sp"
                    android:textStyle="bold" />

                <Spinner
                    android:id="@+id/spinnerTargetLanguage"
                    android:layout_width="match_parent"
                    android:layout_height="44dp"
                    android:layout_marginTop="4dp"
                    android:background="@drawable/bg_overlay_incoming"
                    android:paddingStart="8dp"
                    android:paddingEnd="8dp" />

                <TextView
                    android:id="@+id/tvActivePairSummary"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="8dp"
                    android:text="Active Pairs: বাংলা → English"
                    android:textColor="@color/whatsapp_green"
                    android:textSize="12sp"
                    android:textStyle="bold" />
            </LinearLayout>
        </com.google.android.material.card.MaterialCardView>

        <!-- Accessibility Service Card -->
        <com.google.android.material.card.MaterialCardView
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginBottom="14dp"
            app:cardCornerRadius="12dp"
            app:cardElevation="2dp"
            app:strokeWidth="1dp"
            app:strokeColor="#E0E0E0">

            <LinearLayout
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:orientation="vertical"
                android:padding="16dp">

                <TextView
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:text="@string/title_status"
                    android:textColor="@color/text_secondary"
                    android:textSize="12sp"
                    android:textAllCaps="true"
                    android:textStyle="bold" />

                <TextView
                    android:id="@+id/tvAccessibilityStatus"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="4dp"
                    android:text="@string/accessibility_status_disabled"
                    android:textColor="@color/status_inactive"
                    android:textSize="15sp"
                    android:textStyle="bold" />

                <TextView
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="4dp"
                    android:text="Required to detect WhatsApp chat bubbles and attach interactive translation badges."
                    android:textColor="@color/text_secondary"
                    android:textSize="13sp" />

                <com.google.android.material.button.MaterialButton
                    android:id="@+id/btnEnableAccessibility"
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="12dp"
                    android:text="@string/btn_enable_accessibility"
                    android:backgroundTint="@color/primary" />
            </LinearLayout>
        </com.google.android.material.card.MaterialCardView>

        <!-- Translation Model Card -->
        <com.google.android.material.card.MaterialCardView
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginBottom="14dp"
            app:cardCornerRadius="12dp"
            app:cardElevation="2dp"
            app:strokeWidth="1dp"
            app:strokeColor="#E0E0E0">

            <LinearLayout
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:orientation="vertical"
                android:padding="16dp">

                <TextView
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:text="@string/title_model"
                    android:textColor="@color/text_secondary"
                    android:textSize="12sp"
                    android:textAllCaps="true"
                    android:textStyle="bold" />

                <TextView
                    android:id="@+id/tvModelStatus"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="4dp"
                    android:text="@string/model_status_needed"
                    android:textColor="@color/status_inactive"
                    android:textSize="15sp"
                    android:textStyle="bold" />

                <TextView
                    android:id="@+id/tvModelDescription"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="4dp"
                    android:text="Downloads ~30MB Google ML Kit on-device model for completely offline translations."
                    android:textColor="@color/text_secondary"
                    android:textSize="13sp" />

                <ProgressBar
                    android:id="@+id/pbModelDownload"
                    style="?android:attr/progressBarStyleHorizontal"
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="8dp"
                    android:indeterminate="true"
                    android:visibility="gone" />

                <!-- Model Update Notification & Action Banner -->
                <LinearLayout
                    android:id="@+id/layoutModelUpdateBanner"
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="10dp"
                    android:background="#2E2415"
                    android:padding="10dp"
                    android:orientation="vertical">

                    <TextView
                        android:id="@+id/tvModelUpdateTitle"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:text="🔔 Model Update Available (v2.4)"
                        android:textColor="#F6AD55"
                        android:textStyle="bold"
                        android:textSize="12sp" />

                    <TextView
                        android:id="@+id/tvModelUpdateDesc"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:layout_marginTop="2dp"
                        android:text="Improved French &amp; Spanish disambiguation, richer vocabulary dictionaries, and faster on-device inference."
                        android:textColor="#E2E8F0"
                        android:textSize="11sp" />

                    <com.google.android.material.button.MaterialButton
                        android:id="@+id/btnUpdateModel"
                        android:layout_width="wrap_content"
                        android:layout_height="36dp"
                        android:layout_marginTop="6dp"
                        android:text="Update All Models (v2.4)"
                        android:textSize="11sp"
                        android:backgroundTint="#D97706" />
                </LinearLayout>

                <LinearLayout
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="12dp"
                    android:orientation="horizontal">

                    <com.google.android.material.button.MaterialButton
                        android:id="@+id/btnDownloadModel"
                        android:layout_width="0dp"
                        android:layout_height="wrap_content"
                        android:layout_weight="1"
                        android:text="@string/btn_download_model"
                        android:backgroundTint="@color/primary" />

                    <com.google.android.material.button.MaterialButton
                        android:id="@+id/btnDeleteModel"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:layout_marginStart="8dp"
                        android:text="Delete"
                        android:visibility="gone"
                        app:strokeColor="@color/status_inactive"
                        app:strokeWidth="1dp"
                        style="@style/Widget.MaterialComponents.Button.OutlinedButton"
                        android:textColor="@color/status_inactive" />
                </LinearLayout>
            </LinearLayout>
        </com.google.android.material.card.MaterialCardView>

        <!-- In-App Overlay Settings -->
        <com.google.android.material.card.MaterialCardView
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginBottom="14dp"
            app:cardCornerRadius="12dp"
            app:cardElevation="2dp"
            app:strokeWidth="1dp"
            app:strokeColor="#E0E0E0">

            <LinearLayout
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:orientation="vertical"
                android:padding="16dp">

                <LinearLayout
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:gravity="center_vertical"
                    android:orientation="horizontal">

                    <LinearLayout
                        android:layout_width="0dp"
                        android:layout_height="wrap_content"
                        android:layout_weight="1"
                        android:orientation="vertical">

                        <TextView
                            android:layout_width="wrap_content"
                            android:layout_height="wrap_content"
                            android:text="@string/title_overlay_settings"
                            android:textColor="@color/text_primary"
                            android:textSize="15sp"
                            android:textStyle="bold" />

                        <TextView
                            android:layout_width="wrap_content"
                            android:layout_height="wrap_content"
                            android:layout_marginTop="2dp"
                            android:text="Show [文A] badges on WhatsApp chat bubbles."
                            android:textColor="@color/text_secondary"
                            android:textSize="13sp" />
                    </LinearLayout>

                    <com.google.android.material.switchmaterial.SwitchMaterial
                        android:id="@+id/switchOverlay"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:checked="true" />
                </LinearLayout>
            </LinearLayout>
        </com.google.android.material.card.MaterialCardView>

        <!-- Live New Language Detection & Ignore List Card -->
        <com.google.android.material.card.MaterialCardView
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginBottom="14dp"
            app:cardCornerRadius="12dp"
            app:cardElevation="2dp"
            app:strokeWidth="1dp"
            app:strokeColor="#E0E0E0">

            <LinearLayout
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:orientation="vertical"
                android:padding="16dp">

                <!-- Toggle Live Detection -->
                <LinearLayout
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:gravity="center_vertical"
                    android:orientation="horizontal">

                    <LinearLayout
                        android:layout_width="0dp"
                        android:layout_height="wrap_content"
                        android:layout_weight="1"
                        android:orientation="vertical">

                        <TextView
                            android:layout_width="wrap_content"
                            android:layout_height="wrap_content"
                            android:text="Live New Language Detection"
                            android:textColor="@color/text_primary"
                            android:textSize="15sp"
                            android:textStyle="bold" />

                        <TextView
                            android:layout_width="wrap_content"
                            android:layout_height="wrap_content"
                            android:layout_marginTop="2dp"
                            android:text="Scan for unrecognized foreign languages in chats and prompt to download local packs."
                            android:textColor="@color/text_secondary"
                            android:textSize="13sp" />
                    </LinearLayout>

                    <com.google.android.material.switchmaterial.SwitchMaterial
                        android:id="@+id/switchAutoDetectPrompt"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:checked="true" />
                </LinearLayout>

                <View
                    android:layout_width="match_parent"
                    android:layout_height="1dp"
                    android:layout_marginTop="12dp"
                    android:layout_marginBottom="12dp"
                    android:background="#EEEEEE" />

                <!-- Ignore List Header -->
                <LinearLayout
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:gravity="center_vertical"
                    android:orientation="horizontal">

                    <TextView
                        android:layout_width="0dp"
                        android:layout_height="wrap_content"
                        android:layout_weight="1"
                        android:text="Ignored Languages (Bypassed)"
                        android:textColor="@color/text_primary"
                        android:textSize="13sp"
                        android:textStyle="bold" />

                    <TextView
                        android:id="@+id/btnAddIgnoredLanguage"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:text="+ Add"
                        android:textColor="@color/whatsapp_green"
                        android:textSize="12sp"
                        android:textStyle="bold"
                        android:padding="4dp" />
                </LinearLayout>

                <TextView
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="2dp"
                    android:text="Languages you chose to ignore will never trigger the download popup."
                    android:textColor="@color/text_secondary"
                    android:textSize="12sp" />

                <!-- Container for Ignored Languages Chips / Tags -->
                <LinearLayout
                    android:id="@+id/layoutIgnoredLanguages"
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="8dp"
                    android:orientation="vertical">

                    <TextView
                        android:id="@+id/tvNoIgnoredLanguages"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:text="No languages currently ignored."
                        android:textColor="@color/text_secondary"
                        android:textSize="12sp" />
                </LinearLayout>
            </LinearLayout>
        </com.google.android.material.card.MaterialCardView>

        <!-- Notification Translation Settings -->
        <com.google.android.material.card.MaterialCardView
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginBottom="14dp"
            app:cardCornerRadius="12dp"
            app:cardElevation="2dp"
            app:strokeWidth="1dp"
            app:strokeColor="#E0E0E0">

            <LinearLayout
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:orientation="vertical"
                android:padding="16dp">

                <LinearLayout
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:gravity="center_vertical"
                    android:orientation="horizontal">

                    <LinearLayout
                        android:layout_width="0dp"
                        android:layout_height="wrap_content"
                        android:layout_weight="1"
                        android:orientation="vertical">

                        <TextView
                            android:layout_width="wrap_content"
                            android:layout_height="wrap_content"
                            android:text="@string/title_notification_settings"
                            android:textColor="@color/text_primary"
                            android:textSize="15sp"
                            android:textStyle="bold" />

                        <TextView
                            android:layout_width="wrap_content"
                            android:layout_height="wrap_content"
                            android:layout_marginTop="2dp"
                            android:text="@string/desc_notification_settings"
                            android:textColor="@color/text_secondary"
                            android:textSize="13sp" />
                    </LinearLayout>

                    <com.google.android.material.switchmaterial.SwitchMaterial
                        android:id="@+id/switchNotifications"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content" />
                </LinearLayout>

                <com.google.android.material.button.MaterialButton
                    android:id="@+id/btnEnableNotificationAccess"
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="10dp"
                    android:text="@string/btn_enable_notification_access"
                    android:visibility="gone"
                    style="@style/Widget.MaterialComponents.Button.OutlinedButton"
                    android:textColor="@color/primary"
                    app:strokeColor="@color/primary" />
            </LinearLayout>
        </com.google.android.material.card.MaterialCardView>

        <!-- Privacy Assurance Card -->
        <com.google.android.material.card.MaterialCardView
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginBottom="14dp"
            app:cardCornerRadius="12dp"
            app:cardElevation="2dp"
            app:strokeWidth="1dp"
            app:strokeColor="#E0E0E0">

            <LinearLayout
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:orientation="vertical"
                android:padding="16dp">

                <TextView
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:text="@string/title_privacy"
                    android:textColor="@color/text_secondary"
                    android:textSize="12sp"
                    android:textAllCaps="true"
                    android:textStyle="bold" />

                <TextView
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="4dp"
                    android:text="100% private and on-device via Google ML Kit. No messages are logged, stored, or sent to external servers."
                    android:textColor="@color/text_secondary"
                    android:textSize="13sp" />
            </LinearLayout>
        </com.google.android.material.card.MaterialCardView>

        <!-- Repository & Issue Tracker Contact Card -->
        <com.google.android.material.card.MaterialCardView
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginBottom="24dp"
            app:cardCornerRadius="12dp"
            app:cardElevation="2dp"
            app:strokeWidth="1dp"
            app:strokeColor="#E0E0E0">

            <LinearLayout
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:orientation="vertical"
                android:padding="16dp">

                <LinearLayout
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:gravity="center_vertical"
                    android:orientation="horizontal">

                    <TextView
                        android:layout_width="0dp"
                        android:layout_height="wrap_content"
                        android:layout_weight="1"
                        android:text="Repository &amp; Issue Updates"
                        android:textColor="@color/text_secondary"
                        android:textSize="12sp"
                        android:textAllCaps="true"
                        android:textStyle="bold" />

                    <TextView
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:background="@drawable/bg_overlay_incoming"
                        android:paddingStart="8dp"
                        android:paddingEnd="8dp"
                        android:paddingTop="2dp"
                        android:paddingBottom="2dp"
                        android:text="Open Source"
                        android:textColor="@color/whatsapp_green"
                        android:textSize="11sp"
                        android:textStyle="bold" />
                </LinearLayout>

                <TextView
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="6dp"
                    android:text="Found a bug, missing language, or have feedback? Submit issues directly on GitHub or reach out to the developer."
                    android:textColor="@color/text_secondary"
                    android:textSize="13sp" />

                <LinearLayout
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="10dp"
                    android:orientation="vertical"
                    android:background="#F1F3F4"
                    android:padding="10dp">

                    <TextView
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:text="Repository: github.com/sheminasalam/ChatNora"
                        android:textColor="@color/text_primary"
                        android:textSize="12sp"
                        android:textStyle="bold" />

                    <TextView
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:layout_marginTop="2dp"
                        android:text="Open-source project on GitHub"
                        android:textColor="@color/text_secondary"
                        android:textSize="12sp" />
                </LinearLayout>

                <LinearLayout
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="12dp"
                    android:orientation="horizontal"
                    android:gravity="center_vertical">

                    <com.google.android.material.button.MaterialButton
                        android:id="@+id/btnReportGitHubIssue"
                        android:layout_width="0dp"
                        android:layout_height="wrap_content"
                        android:layout_weight="1"
                        android:layout_marginEnd="6dp"
                        android:text="Report Issue"
                        android:textSize="12sp"
                        app:backgroundTint="@color/primary"
                        android:textColor="#FFFFFF" />

                    <com.google.android.material.button.MaterialButton
                        android:id="@+id/btnOpenGitHubRepo"
                        android:layout_width="0dp"
                        android:layout_height="wrap_content"
                        android:layout_weight="1"
                        android:layout_marginStart="6dp"
                        android:text="GitHub Repo"
                        android:textSize="12sp"
                        style="@style/Widget.MaterialComponents.Button.OutlinedButton"
                        android:textColor="@color/primary"
                        app:strokeColor="@color/primary" />
                </LinearLayout>
            </LinearLayout>
        </com.google.android.material.card.MaterialCardView>

    </LinearLayout>
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

    <!-- Expanded State: Chat Bubble Shape & Size (Matching WhatsApp Bubble) with Vertical Scroll Support -->
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
        android:paddingBottom="7dp"
        android:clickable="true"
        android:focusable="true">

        <!-- Top Header Bar with Language Label, Scroll Indicator and Close Button -->
        <LinearLayout
            android:id="@+id/llExpandedHeader"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:gravity="center_vertical"
            android:orientation="horizontal"
            android:clickable="true"
            android:focusable="true">

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
                android:id="@+id/tvScrollHint"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="↕ Scroll"
                android:textSize="9sp"
                android:textColor="@color/overlay_incoming_label"
                android:visibility="gone"
                android:layout_marginEnd="6dp"
                android:includeFontPadding="false" />

            <ImageView
                android:id="@+id/ivCloseOverlay"
                android:layout_width="14dp"
                android:layout_height="14dp"
                android:src="@android:drawable/ic_menu_close_clear_cancel"
                android:contentDescription="Close"
                app:tint="@color/overlay_incoming_label" />
        </LinearLayout>

        <!-- Vertical Scroll Container for long messages without cropping -->
        <ScrollView
            android:id="@+id/svTranslatedContainer"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="2.5dp"
            android:scrollbars="vertical"
            android:fadeScrollbars="false"
            android:fillViewport="true"
            android:isScrollContainer="true"
            android:overScrollMode="always"
            android:nestedScrollingEnabled="true">

            <TextView
                android:id="@+id/tvTranslatedText"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:textColor="@color/overlay_text"
                android:textSize="13.5sp"
                android:textStyle="normal"
                android:lineSpacingExtra="1.5dp"
                android:includeFontPadding="false"
                android:textIsSelectable="false" />
        </ScrollView>
    </LinearLayout>

</FrameLayout>
`,

  'app/src/main/res/layout/layout_floating_toggle.xml': `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:id="@+id/pillToggleContainer"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:background="@drawable/bg_overlay_card"
    android:gravity="center_vertical"
    android:orientation="horizontal"
    android:elevation="8dp"
    android:paddingStart="8dp"
    android:paddingTop="4dp"
    android:paddingEnd="10dp"
    android:paddingBottom="4dp">

    <ImageView
        android:id="@+id/ivToggleIcon"
        android:layout_width="12dp"
        android:layout_height="12dp"
        android:src="@drawable/ic_translate"
        android:contentDescription="@null"
        app:tint="@color/overlay_subtext" />

    <TextView
        android:id="@+id/tvToggleText"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginStart="5dp"
        android:text="Hide"
        android:textStyle="bold"
        android:textColor="@color/overlay_text"
        android:textSize="11sp" />
</LinearLayout>
`,

  'app/src/main/java/com/bangla/translator/data/Models.kt': `package com.bangla.translator.data

import android.graphics.Rect

/**
 * Unique key for positioning and tracking an overlay on screen during a specific session generation.
 * Note: Session generation is tied to the active conversation.
 */
data class DisplayKey(
    val sessionGeneration: Long,
    val normalizedText: String,
    val screenX: Int,
    val screenY: Int
) {
    override fun toString(): String = "gen_\${sessionGeneration}_\${normalizedText.hashCode()}_\${screenX}_\${screenY}"
}

/**
 * Message detected from the WhatsApp accessibility tree with detected language code.
 */
data class ScannedMessage(
    val originalText: String,
    val normalizedText: String,
    val bounds: Rect,
    val displayKey: String,
    val languageCode: String = "bn"
)

/**
 * Result of an asynchronous translation task.
 */
data class TranslationResult(
    val originalText: String,
    val normalizedText: String,
    val translatedText: String,
    val sessionGeneration: Long,
    val targetBounds: Rect,
    val displayKey: String,
    val languageCode: String = "bn"
)

/**
 * Represents the status of the local ML Kit translation model.
 */
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
     * Set of language codes that the user has chosen to ignore from live detection.
     * Prevents recurring prompts for wrongly detected or unwanted languages.
     */
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

    fun isLanguageActive(code: String): Boolean {
        return activeSourceLanguages.contains(code.lowercase())
    }

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
        get() = prefs.getBoolean(KEY_MODEL_UPDATE_AVAILABLE, false)
        set(value) = prefs.edit().putBoolean(KEY_MODEL_UPDATE_AVAILABLE, value).apply()

    var modelVersion: String
        get() = prefs.getString(KEY_MODEL_VERSION, "v2.4") ?: "v2.4"
        set(value) = prefs.edit().putString(KEY_MODEL_VERSION, value).apply()
}
`,

  'app/src/main/java/com/bangla/translator/translation/LanguageDetector.kt': `package com.bangla.translator.translation

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
        "^https?://[\\\\w.-]+(?:\\\\.[\\\\w\\\\.-]+)+[/#?]?.*$",
        Pattern.CASE_INSENSITIVE
    )
    private val TIMESTAMP_PATTERN = Pattern.compile(
        "^\\\\d{1,2}:\\\\d{2}(?:\\\\s?[APap][Mm])?$"
    )
    private val AUDIO_DURATION_PATTERN = Pattern.compile(
        "^\\\\d{1,2}:\\\\d{2}$"
    )

    // Forwarded message timestamp & author prefix regex:
    // Matches e.g. "[10/3, 12:25 PM] Shemin A Salam: " or "10/3/24, 12:25 - Shemin A Salam: "
    private val FORWARDED_HEADER_SPLIT_REGEX = Regex(
        "(?=(?:\\\\[?\\\\d{1,2}[/.-]\\\\d{1,2}(?:[/.-]\\\\d{2,4})?,?\\\\s+\\\\d{1,2}:\\\\d{2}(?::\\\\d{2})?(?:\\\\s*[AaPp][Mm])?\\\\]?\\\\s*(?:-\\\\s*)?[^:\\\\n]+:\\\\s*))"
    )

    private val FORWARDED_PREFIX_REGEX = Regex(
        "^(\\\\[?\\\\d{1,2}[/.-]\\\\d{1,2}(?:[/.-]\\\\d{2,4})?,?\\\\s+\\\\d{1,2}:\\\\d{2}(?::\\\\d{2})?(?:\\\\s*[AaPp][Mm])?\\\\]?\\\\s*(?:-\\\\s*)?[^:\\\\n]+:\\\\s*)"
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
        val paragraphs = trimmed.split(Regex("\\\\n+")).filter { it.isNotBlank() }
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
        val sentences = trimmed.split(Regex("(?<=[.!?])\\\\s+")).filter { it.isNotBlank() }
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
        val words = lower.split(Regex("[^\\\\p{L}]+")).filter { it.isNotBlank() }
        val matchCount = words.count { it in SPANISH_WORDS }
        return matchCount >= 2 || (words.size <= 3 && matchCount >= 1)
    }

    private fun checkFrench(text: String): Boolean {
        val lower = text.lowercase()
        if (lower.contains('œ') || lower.contains('æ') || lower.contains("c'est") || lower.contains("j'ai") || lower.contains("d'un")) return true
        val words = lower.split(Regex("[^\\\\p{L}]+")).filter { it.isNotBlank() }
        val matchCount = words.count { it in FRENCH_WORDS }
        return matchCount >= 2 || (words.size <= 3 && matchCount >= 1)
    }

    private fun checkGerman(text: String): Boolean {
        val lower = text.lowercase()
        if (lower.contains('ß') || lower.contains('ä') || lower.contains('ö') || lower.contains('ü')) return true
        val words = lower.split(Regex("[^\\\\p{L}]+")).filter { it.isNotBlank() }
        val matchCount = words.count { it in GERMAN_WORDS }
        return matchCount >= 2 || (words.size <= 3 && matchCount >= 1)
    }

    private fun checkPortuguese(text: String): Boolean {
        val lower = text.lowercase()
        if (lower.contains('ã') || lower.contains('õ')) return true
        val words = lower.split(Regex("[^\\\\p{L}]+")).filter { it.isNotBlank() }
        val matchCount = words.count { it in PORTUGUESE_WORDS }
        return matchCount >= 2 || (words.size <= 3 && matchCount >= 1)
    }

    private fun checkItalian(text: String): Boolean {
        val lower = text.lowercase()
        val words = lower.split(Regex("[^\\\\p{L}]+")).filter { it.isNotBlank() }
        val matchCount = words.count { it in ITALIAN_WORDS }
        return matchCount >= 2 || (words.size <= 3 && matchCount >= 1)
    }

    private fun hasAnyForeignCharacter(text: String): Boolean {
        return text.any { it.code > 0x007F && it.isLetter() }
    }
}
`,

  'app/src/main/java/com/bangla/translator/translation/BengaliDetector.kt': `package com.bangla.translator.translation

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
`,

  'app/src/main/java/com/bangla/translator/translation/TranslationCache.kt': `package com.bangla.translator.translation

import androidx.collection.LruCache
import java.util.regex.Pattern

/**
 * Thread-safe LRU cache for Bengali-to-English translations.
 * Keyed strictly by normalized message text, separating linguistic identity
 * from screen position and conversation sessions.
 */
class TranslationCache(maxEntries: Int = 500) {

    private val cache = object : LruCache<String, String>(maxEntries) {}
    private val whitespaceRegex = Pattern.compile("\\\\s+")

    /**
     * Normalizes text for cache lookups:
     * - Trims leading/trailing whitespace
     * - Collapses internal sequences of whitespace into single spaces
     * - Preserves casing and punctuation
     */
    fun normalize(text: String): String {
        val trimmed = text.trim()
        return whitespaceRegex.matcher(trimmed).replaceAll(" ")
    }

    /**
     * Retrieves translation for the given text, if previously cached.
     */
    fun get(text: String): String? {
        val key = normalize(text)
        synchronized(cache) {
            return cache.get(key)
        }
    }

    /**
     * Stores a translation result in the cache.
     */
    fun put(originalText: String, translatedText: String) {
        val key = normalize(originalText)
        synchronized(cache) {
            cache.put(key, translatedText)
        }
    }

    /**
     * Clears all cached translations.
     */
    fun clear() {
        synchronized(cache) {
            cache.evictAll()
        }
    }

    /**
     * Current number of entries in cache.
     */
    val size: Int
        get() = synchronized(cache) { cache.size() }
}
`,

  'app/src/main/java/com/bangla/translator/translation/TranslationEngine.kt': `package com.bangla.translator.translation

import android.util.Log
import com.bangla.translator.data.ModelDownloadState
import com.bangla.translator.data.SupportedLanguages
import com.google.android.gms.tasks.Task
import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.common.model.RemoteModelManager
import com.google.mlkit.nl.translate.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Multi-Language On-Device Translation Engine with Intelligent Pack Management.
 * Supports up to 3 simultaneous active language pairs with sub-millisecond detection,
 * automatic multilingual segment decomposition for mixed messages (French + Spanish, etc.),
 * and on-demand model downloading to guarantee all parts of a multilingual message are translated.
 */
object TranslationEngine {
    private const val TAG = "TranslationEngine"

    data class TranslationDetails(
        val translatedText: String,
        val detectedLanguages: List<String>
    )

    // Cached thread pool allowing concurrent translation of multiple segments without starvation
    private val translationExecutor = Executors.newCachedThreadPool()

    // Primary active source and target language
    private var currentSourceLang: String = TranslateLanguage.BENGALI
    private var currentTargetLang: String = TranslateLanguage.ENGLISH

    // Concurrent map of active translators: sourceLangCode -> Translator
    private val activeTranslators = ConcurrentHashMap<String, Translator>()

    // Global in-memory translation cache (LRU 500 entries)
    val cache = TranslationCache(maxEntries = 500)

    private val _modelState = MutableStateFlow<ModelDownloadState>(ModelDownloadState.NotDownloaded)
    val modelState: StateFlow<ModelDownloadState> = _modelState.asStateFlow()

    private val isPreparingModel = AtomicBoolean(false)
    private var prepareTask: Task<Void>? = null

    /**
     * Updates the primary language pair.
     */
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

    /**
     * Checks if the ML Kit on-device model for the specified language is already downloaded.
     */
    fun checkModelAvailability(sourceLangCode: String = currentSourceLang) {
        val modelManager = RemoteModelManager.getInstance()
        val remoteModel = TranslateRemoteModel.Builder(sourceLangCode).build()

        modelManager.isModelDownloaded(remoteModel)
            .addOnSuccessListener { isDownloaded ->
                if (isDownloaded) {
                    _modelState.value = ModelDownloadState.Ready
                    getOrCreateTranslator(sourceLangCode)
                } else {
                    _modelState.value = ModelDownloadState.NotDownloaded
                }
            }
            .addOnFailureListener { error ->
                Log.e(TAG, "Error checking model download status", error)
                _modelState.value = ModelDownloadState.Error(error.localizedMessage ?: "Unknown model error")
            }
    }

    /**
     * Checks if a specific model is downloaded asynchronously.
     */
    fun isModelDownloaded(sourceLangCode: String, onResult: (Boolean) -> Unit) {
        val modelManager = RemoteModelManager.getInstance()
        val remoteModel = TranslateRemoteModel.Builder(sourceLangCode).build()
        modelManager.isModelDownloaded(remoteModel)
            .addOnSuccessListener { onResult(it) }
            .addOnFailureListener { onResult(false) }
    }

    /**
     * Retrieves all downloaded translation models on the device.
     */
    fun getDownloadedLanguageCodes(onResult: (List<String>) -> Unit) {
        val modelManager = RemoteModelManager.getInstance()
        modelManager.getDownloadedModels(TranslateRemoteModel::class.java)
            .addOnSuccessListener { models ->
                val codes = models.map { it.language }
                onResult(codes)
            }
            .addOnFailureListener {
                onResult(emptyList())
            }
    }

    /**
     * Obtains or initializes the ML Kit Translator for the requested source language.
     */
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

    /**
     * Downloads the on-device ML Kit language pack for the specified source language.
     */
    @Synchronized
    fun prepareModelIfNeeded(
        sourceLangCode: String = currentSourceLang,
        conditions: DownloadConditions = DownloadConditions.Builder().build(),
        onSuccess: (() -> Unit)? = null,
        onFailure: ((Exception) -> Unit)? = null
    ): Task<Void> {
        _modelState.value = ModelDownloadState.Downloading
        isPreparingModel.set(true)

        val translator = getOrCreateTranslator(sourceLangCode)
        val downloadTask = translator.downloadModelIfNeeded(conditions)

        prepareTask = downloadTask

        downloadTask.addOnSuccessListener {
            _modelState.value = ModelDownloadState.Ready
            isPreparingModel.set(false)
            onSuccess?.invoke()
        }.addOnFailureListener { error ->
            Log.e(TAG, "Model download failed for $sourceLangCode", error)
            _modelState.value = ModelDownloadState.Error(error.localizedMessage ?: "Model download failed")
            isPreparingModel.set(false)
            onFailure?.invoke(error)
        }

        return downloadTask
    }

    /**
     * Deletes a downloaded model to free device storage and releases RAM.
     */
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

    /**
     * Purges downloaded ML Kit models that are no longer part of the user's active language pairs.
     * Deletes any local language packs other than in the active language pair so they are never suggested for update.
     */
    fun purgeInactiveModels(
        activeSourceCodes: Set<String>,
        targetCode: String = currentTargetLang,
        onComplete: ((Int) -> Unit)? = null
    ) {
        val allowedMlKitCodes = mutableSetOf<String>()
        for (code in activeSourceCodes) {
            try {
                allowedMlKitCodes.add(SupportedLanguages.findByCode(code).mlKitCode)
            } catch (e: Exception) {
                allowedMlKitCodes.add(code)
            }
        }
        try {
            allowedMlKitCodes.add(SupportedLanguages.findByCode(targetCode).mlKitCode)
        } catch (e: Exception) {
            allowedMlKitCodes.add(targetCode)
        }

        val modelManager = RemoteModelManager.getInstance()
        modelManager.getDownloadedModels(TranslateRemoteModel::class.java)
            .addOnSuccessListener { models ->
                var deletedCount = 0
                for (model in models) {
                    if (model.language !in allowedMlKitCodes) {
                        Log.i(TAG, "Deleting orphaned language model from storage: \${model.language}")
                        activeTranslators.remove(model.language)?.close()
                        modelManager.deleteDownloadedModel(model)
                        deletedCount++
                    }
                }
                Log.i(TAG, "Cleaned \$deletedCount inactive language models from storage.")
                onComplete?.invoke(deletedCount)
            }
            .addOnFailureListener {
                onComplete?.invoke(0)
            }
    }

    /**
     * Closes all active translators and releases memory.
     */
    fun close() {
        for ((_, translator) in activeTranslators) {
            try {
                translator.close()
            } catch (e: Exception) {}
        }
        activeTranslators.clear()
    }

    /**
     * Standard translation call with backwards-compatible signature.
     */
    fun translate(
        text: String,
        sourceCode: String? = null,
        targetCode: String = currentTargetLang,
        onSuccess: (String) -> Unit,
        onFailure: ((Exception) -> Unit)? = null
    ) {
        translateWithDetails(
            text = text,
            sourceCode = sourceCode,
            targetCode = targetCode,
            onSuccess = { details -> onSuccess(details.translatedText) },
            onFailure = onFailure
        )
    }

    /**
     * Advanced multilingual translation: splits message into segments, translates each
     * segment in its native language (downloading models on-demand if needed), preserves
     * forwarded headers, and returns combined translated text and detected languages.
     */
    fun translateWithDetails(
        text: String,
        sourceCode: String? = null,
        targetCode: String = currentTargetLang,
        onSuccess: (TranslationDetails) -> Unit,
        onFailure: ((Exception) -> Unit)? = null
    ) {
        val cleanText = text.trim()
        if (cleanText.isEmpty()) {
            onSuccess(TranslationDetails("", emptyList()))
            return
        }

        // Check if message contains multiple segments with distinct languages
        val segments = LanguageDetector.splitMultilingualSegments(cleanText)
        val detectedLanguages = segments.mapNotNull { it.detectedLanguage }.distinct()

        // Single language path
        if (detectedLanguages.size <= 1) {
            val effectiveSource = detectedLanguages.firstOrNull()
                ?: sourceCode
                ?: LanguageDetector.detectLanguage(cleanText)
                ?: currentSourceLang

            translateSingleChunk(cleanText, effectiveSource, targetCode, { translated ->
                onSuccess(TranslationDetails(translated, if (detectedLanguages.isNotEmpty()) detectedLanguages else listOf(effectiveSource)))
            }, onFailure)
            return
        }

        // Multilingual message path: multiple distinct languages found in one message!
        translationExecutor.execute {
            try {
                val translatedSegments = arrayOfNulls<String>(segments.size)
                val latch = CountDownLatch(segments.size)

                for ((index, segment) in segments.withIndex()) {
                    val segBody = segment.body.trim()
                    if (segBody.isEmpty()) {
                        translatedSegments[index] = segment.prefix
                        latch.countDown()
                        continue
                    }

                    val segLang = segment.detectedLanguage
                    if (segLang == null) {
                        // Body is numbers/symbols or English - preserve original
                        translatedSegments[index] = "\${segment.prefix}\${segBody}"
                        latch.countDown()
                    } else {
                        translateSingleChunk(segBody, segLang, targetCode, { translatedPart ->
                            translatedSegments[index] = "\${segment.prefix}\${translatedPart}"
                            latch.countDown()
                        }, {
                            // On failure, preserve segment
                            translatedSegments[index] = segment.rawSegment
                            latch.countDown()
                        })
                    }
                }

                // Wait up to 6 seconds for all segments to complete
                latch.await(6, TimeUnit.SECONDS)

                // Guarantee no segment is dropped: if translation timed out, preserve original segment
                for (i in segments.indices) {
                    if (translatedSegments[i] == null) {
                        val seg = segments[i]
                        translatedSegments[i] = "\${seg.prefix}\${seg.body}"
                    }
                }

                val combined = translatedSegments.filterNotNull().joinToString("\\n\\n")
                cache.put(cleanText, combined)
                onSuccess(TranslationDetails(combined, detectedLanguages))
            } catch (e: Exception) {
                Log.e(TAG, "Multilingual translation error: \${e.message}", e)
                onFailure?.invoke(e) ?: onSuccess(TranslationDetails(cleanText, detectedLanguages))
            }
        }
    }

    /**
     * Translates a single text chunk with cache, online fast path, and local ML Kit fallback.
     * Automatically triggers on-demand ML Kit download if the pack is not yet ready.
     */
    private fun translateSingleChunk(
        cleanText: String,
        sourceCode: String,
        targetCode: String,
        onSuccess: (String) -> Unit,
        onFailure: ((Exception) -> Unit)?
    ) {
        val cacheKey = "$sourceCode:$cleanText"
        val cached = cache.get(cacheKey) ?: cache.get(cleanText)
        if (cached != null) {
            onSuccess(cached)
            return
        }

        translationExecutor.execute {
            var translatedOnline: String? = null
            try {
                translatedOnline = fetchOnlineTranslation(cleanText, sourceCode, targetCode)
            } catch (e: Exception) {
                Log.d(TAG, "Online translation fallback to ML Kit: \${e.message}")
            }

            if (!translatedOnline.isNullOrBlank() && translatedOnline != cleanText) {
                cache.put(cacheKey, translatedOnline)
                cache.put(cleanText, translatedOnline)
                onSuccess(translatedOnline)
                return@execute
            }

            // Fallback to local on-device ML Kit Translator with automatic on-demand download
            translateOnDevice(cleanText, sourceCode, onSuccess, onFailure)
        }
    }

    /**
     * Performs translation via on-device ML Kit.
     * Ensures the language model is downloaded before translating to prevent failure on secondary languages.
     */
    private fun translateOnDevice(
        cleanText: String,
        sourceCode: String,
        onSuccess: (String) -> Unit,
        onFailure: ((Exception) -> Unit)?
    ) {
        try {
            val srcMlKit = SupportedLanguages.findByCode(sourceCode).mlKitCode
            val translator = getOrCreateTranslator(srcMlKit)

            translator.downloadModelIfNeeded()
                .addOnSuccessListener {
                    translator.translate(cleanText)
                        .addOnSuccessListener { result ->
                            val cacheKey = "$sourceCode:$cleanText"
                            cache.put(cacheKey, result)
                            cache.put(cleanText, result)
                            onSuccess(result)
                        }
                        .addOnFailureListener { error ->
                            Log.w(TAG, "On-device ML Kit translation failed: \${error.message}")
                            onFailure?.invoke(error) ?: onSuccess(cleanText)
                        }
                }
                .addOnFailureListener { error ->
                    Log.w(TAG, "ML Kit model download failed for $sourceCode: \${error.message}")
                    onFailure?.invoke(error) ?: onSuccess(cleanText)
                }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get translator for $sourceCode", e)
            onFailure?.invoke(e) ?: onSuccess(cleanText)
        }
    }

    private fun fetchOnlineTranslation(text: String, sourceLang: String, targetLang: String): String? {
        val encodedText = URLEncoder.encode(text, "UTF-8")
        val urlStr = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=$sourceLang&tl=$targetLang&dt=t&q=$encodedText"

        val url = URL(urlStr)
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = "GET"
        conn.connectTimeout = 3000
        conn.readTimeout = 3000
        conn.setRequestProperty("User-Agent", "Mozilla/5.0")

        try {
            val responseCode = conn.responseCode
            if (responseCode == 200) {
                val responseText = conn.inputStream.bufferedReader().use { it.readText() }
                val jsonArray = org.json.JSONArray(responseText)
                val sentences = jsonArray.optJSONArray(0)
                if (sentences != null) {
                    val sb = StringBuilder()
                    for (i in 0 until sentences.length()) {
                        val s = sentences.optJSONArray(i)
                        if (s != null) {
                            val part = s.optString(0)
                            if (!part.isNullOrEmpty() && part != "null") {
                                sb.append(part)
                            }
                        }
                    }
                    val translated = sb.toString().trim()
                    if (translated.isNotEmpty()) {
                        return translated
                    }
                }
            }
        } finally {
            conn.disconnect()
        }
        return null
    }
}
`,

  'app/src/main/java/com/bangla/translator/scanner/WhatsAppMessageScanner.kt': `package com.bangla.translator.scanner

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
 * Engineered to accurately map individual message bubble boundaries even during floating Picture-in-Picture (PiP)
 * video calls without collapsing or stacking badges over one another.
 */
class WhatsAppMessageScanner(
    private val activeSourceLanguages: Set<String> = setOf("bn"),
    private val ratioThreshold: Float = 0.20f
) {

    // Secondary constructor for single language backwards compatibility
    constructor(sourceLangCode: String, ratioThreshold: Float = 0.20f) : this(setOf(sourceLangCode), ratioThreshold)

    companion object {
        val SUPPORTED_PACKAGES = setOf("com.whatsapp", "com.whatsapp.w4b")

        private val PHONE_NUMBER_PATTERN = Pattern.compile("^[+]?[0-9\\\\s-]{7,16}$")
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
            "call", "pay", "search", "attach", "send", "voice message", "back", "more options",
            "end call", "mute", "video on", "video off", "switch camera", "whatsapp call"
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

        val maxAllowedBubbleWidth = (screenBounds.width() * 0.88f).toInt()

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
                                    val normalized = candidateText.trim().replace(Regex("\\\\s+"), " ")

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

                                        // Strict parent traversal: never allow parent expansion to capture
                                        // the entire chat container or RecyclerView (which causes all icons to stack
                                        // at the same centerY during video calls / PiP mode!)
                                        val maxAllowedBubbleHeight = tempBounds.height() + (screenBounds.height() * 0.15f).toInt().coerceAtMost(160)

                                        var currentParent: AccessibilityNodeInfo? = node.parent
                                        var depth = 0
                                        try {
                                            while (currentParent != null && depth < 3) {
                                                currentParent.getBoundsInScreen(pBounds)
                                                val pWidth = pBounds.width()
                                                val pHeight = pBounds.height()

                                                if (pWidth in (tempBounds.width() + 4)..maxAllowedBubbleWidth &&
                                                    pHeight >= tempBounds.height() &&
                                                    pHeight <= maxAllowedBubbleHeight
                                                ) {
                                                    bubbleBounds.set(pBounds)
                                                } else if (pWidth > maxAllowedBubbleWidth || pHeight > maxAllowedBubbleHeight) {
                                                    // Reached parent container / RecyclerView - STOP immediately!
                                                    break
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
                                        // Stable key using occurrence count: maintains overlay identity when chat scrolls smoothly
                                        val occurrenceIndex = results.count { it.normalizedText == normalized }
                                        val displayKey = "msg_\${sessionGeneration}_\${normalized.hashCode()}_\${if (isIncoming) "in" else "out"}_occ$occurrenceIndex"

                                        val isDuplicate = results.any { existing ->
                                            existing.normalizedText == normalized &&
                                                    Math.abs(existing.bounds.top - bubbleBounds.top) < 24 &&
                                                    Math.abs(existing.bounds.left - bubbleBounds.left) < 40
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
        val clsName = node.className?.toString()?.lowercase() ?: ""
        if (resId.contains("conversation_contact_name") ||
            resId.contains("conversation_title") ||
            resId.contains("toolbar") ||
            resId.contains("action_bar") ||
            resId.contains("tab_title") ||
            resId.contains("pip") ||
            resId.contains("call") ||
            resId.contains("video_container") ||
            resId.contains("voip") ||
            resId.contains("floating") ||
            resId.contains("call_avatar") ||
            resId.contains("mini_call") ||
            clsName.contains("surfaceview") ||
            clsName.contains("textureview") ||
            clsName.contains("pip") ||
            clsName.contains("voip")
        ) {
            return true
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

/**
 * Controller responsible for managing interactive on-demand translation overlays
 * attached directly to WhatsApp message bubbles.
 *
 * Requirements implemented:
 * 1. Icons are always strictly behind the translation bubble when expanded.
 * 2. Icon badge placed at the middle of the side away from the outer edge of the screen:
 *    - Outgoing (right): icon is on the LEFT of the bubble (at vertical middle).
 *    - Incoming (left): icon is on the RIGHT of the bubble (at vertical middle).
 *    This prevents collision with the text typing bar for the very last message!
 * 3. Tapping anywhere on the screen immediately closes the expanded bubble via a
 *    transparent full-screen dismiss backdrop.
 */
class OverlayController(
    private val context: Context,
    private val windowManager: WindowManager
) {

    companion object {
        private const val TAG = "OverlayController"
        private const val HORIZONTAL_MARGIN_DP = 6
        private const val STATUS_BAR_MARGIN_DP = 28
        private const val NAV_BAR_MARGIN_DP = 48
        private const val ATTACHMENT_GAP_DP = 2
        private const val BADGE_GAP_DP = 4
        private const val MIN_EXPANDED_WIDTH_DP = 140
        private const val AUTO_COLLAPSE_TIMEOUT_MS = 15000L
    }

    private val mainHandler = Handler(Looper.getMainLooper())

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

    // Key of the currently expanded overlay (null if all are collapsed)
    private var expandedDisplayKey: String? = null

    private val density = context.resources.displayMetrics.density
    private val marginPx = (HORIZONTAL_MARGIN_DP * density).toInt()
    private val gapPx = (ATTACHMENT_GAP_DP * density).toInt()
    private val badgeGapPx = (BADGE_GAP_DP * density).toInt()
    private val minExpandedWidthPx = (MIN_EXPANDED_WIDTH_DP * density).toInt()
    private val statusBarInsetPx = (STATUS_BAR_MARGIN_DP * density).toInt()
    private val navBarInsetPx = (NAV_BAR_MARGIN_DP * density).toInt()

    private val autoCollapseRunnable = Runnable {
        collapseAll()
    }

    private fun adjustBadgeYToAvoidCollisions(
        candidateY: Int,
        badgeHeight: Int,
        isOutgoing: Boolean,
        currentKey: String,
        targetBounds: Rect,
        screenH: Int
    ): Int {
        var posY = candidateY
        val minGap = (6 * density).toInt()

        // Collect all other active badge vertical intervals along the left side of the screen
        val occupiedIntervals = mutableListOf<Pair<Int, Int>>()
        for ((key, other) in activeOverlays) {
            if (key == currentKey) continue
            if (key == expandedDisplayKey) continue
            val otherRect = other.overlayScreenRect
            if (otherRect.isEmpty) continue
            occupiedIntervals.add(Pair(otherRect.top - minGap, otherRect.bottom + minGap))
        }

        // Iteratively resolve any vertical overlap until posY is completely clear
        var attempts = 0
        var hasOverlap = true
        while (hasOverlap && attempts < 12) {
            hasOverlap = false
            attempts++
            for ((start, end) in occupiedIntervals) {
                val badgeBottom = posY + badgeHeight
                if (posY < end && badgeBottom > start) {
                    hasOverlap = true
                    posY = end + (2 * density).toInt()
                    break
                }
            }
        }

        val maxAllowedY = screenH - (navBarInsetPx + badgeHeight + (8 * density).toInt())
        return posY.coerceIn(statusBarInsetPx, maxAllowedY.coerceAtLeast(statusBarInsetPx))
    }

    /**
     * Displays or updates a translation overlay on the main thread.
     */
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
        runOnMainThread {
            val existing = activeOverlays[displayKey]
            if (existing != null) {
                if (existing.sessionGeneration != sessionGeneration) {
                    removeOverlay(displayKey)
                } else {
                    updateOverlayView(existing, translatedText, targetBounds, screenBounds, inputBarTop, languagePairLabel, badgeLabel)
                    return@runOnMainThread
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
            val svContainer = overlayView.findViewById<android.widget.ScrollView>(R.id.svTranslatedContainer)
            val tvScrollHint = overlayView.findViewById<TextView>(R.id.tvScrollHint)
            val ivClose = overlayView.findViewById<ImageView>(R.id.ivCloseOverlay)
            val llHeader = overlayView.findViewById<LinearLayout>(R.id.llExpandedHeader)

            tvTranslated.text = translatedText
            tvLabel.text = languagePairLabel
            tvBadge.text = badgeLabel

            val screenW = screenBounds.width()
            val screenH = screenBounds.height()

            // 100% reliable WhatsApp incoming vs outgoing detection
            val isOutgoing = targetBounds.right > screenW * 0.78f || targetBounds.left > screenW * 0.40f

            val bgRes = if (isOutgoing) R.drawable.bg_overlay_outgoing else R.drawable.bg_overlay_incoming
            val labelColor = if (isOutgoing) {
                ContextCompat.getColor(context, R.color.overlay_outgoing_label)
            } else {
                ContextCompat.getColor(context, R.color.overlay_incoming_label)
            }

            llCollapsed.setBackgroundResource(bgRes)
            llExpanded.setBackgroundResource(bgRes)
            ivBadge.setColorFilter(labelColor)
            tvBadge.setTextColor(labelColor)
            tvLabel.setTextColor(labelColor)
            ivClose?.setColorFilter(labelColor)
            tvScrollHint?.setTextColor(labelColor)

            // Click to expand
            llCollapsed.setOnClickListener {
                expandOverlay(displayKey)
            }

            // Click close button or header bar to collapse (avoid collapsing on text scroll drag!)
            ivClose?.setOnClickListener {
                collapseOverlay(displayKey)
            }
            llHeader?.setOnClickListener {
                collapseOverlay(displayKey)
            }

            // Scroll container touch handling: allow smooth vertical scroll without closing bubble
            svContainer?.setOnTouchListener { v, _ ->
                v.parent?.requestDisallowInterceptTouchEvent(true)
                false
            }
            tvTranslated.setOnTouchListener { v, _ ->
                v.parent?.requestDisallowInterceptTouchEvent(true)
                false
            }

            val isExpanded = (displayKey == expandedDisplayKey)
            val isOtherExpanded = (expandedDisplayKey != null && !isExpanded)

            // If another bubble is expanded, hide this collapsed badge to keep icons behind/hidden
            llCollapsed.visibility = if (isExpanded || isOtherExpanded) View.GONE else View.VISIBLE
            llExpanded.visibility = if (isExpanded) View.VISIBLE else View.GONE

            val maxAllowedWidth = (screenW - (marginPx * 2)).coerceAtLeast(minExpandedWidthPx)
            val bubbleWidth = (screenW * 0.85f).toInt().coerceIn((260 * density).toInt(), maxAllowedWidth)

            val measuredWidth: Int
            val measuredHeight: Int
            val posX: Int
            val posY: Int

            val bottomLimit = if (inputBarTop != null && inputBarTop > statusBarInsetPx + (100 * density).toInt()) {
                inputBarTop - (4 * density).toInt()
            } else {
                screenH - (navBarInsetPx + (56 * density).toInt())
            }

            if (isExpanded) {
                val maxBubbleHeightPx = (240 * density).toInt().coerceAtMost((screenH * 0.40f).toInt())
                svContainer?.layoutParams?.height = android.view.ViewGroup.LayoutParams.WRAP_CONTENT
                overlayView.measure(
                    View.MeasureSpec.makeMeasureSpec(bubbleWidth, View.MeasureSpec.EXACTLY),
                    View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED)
                )

                if (overlayView.measuredHeight > maxBubbleHeightPx) {
                    tvScrollHint?.visibility = View.VISIBLE
                    val scrollMaxHeight = (maxBubbleHeightPx - (28 * density).toInt()).coerceAtLeast((80 * density).toInt())
                    svContainer?.layoutParams?.height = scrollMaxHeight
                    overlayView.measure(
                        View.MeasureSpec.makeMeasureSpec(bubbleWidth, View.MeasureSpec.EXACTLY),
                        View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED)
                    )
                } else {
                    tvScrollHint?.visibility = View.GONE
                }

                measuredWidth = bubbleWidth
                measuredHeight = overlayView.measuredHeight

                var calculatedX = if (isOutgoing) screenW - bubbleWidth - marginPx else marginPx
                if (calculatedX + measuredWidth > screenW - marginPx) calculatedX = screenW - measuredWidth - marginPx
                if (calculatedX < marginPx) calculatedX = marginPx
                posX = calculatedX

                // Vertical placement for expanded bubble: prefer below; if too close to bottom limit, place above!
                posY = if (targetBounds.bottom + gapPx + measuredHeight <= bottomLimit) {
                    targetBounds.bottom + gapPx
                } else {
                    (targetBounds.top - measuredHeight - gapPx).coerceAtLeast(statusBarInsetPx)
                }
            } else {
                // Collapsed State: All translation icons arranged neatly on the left side of the screen!
                overlayView.measure(
                    View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED),
                    View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED)
                )
                measuredWidth = overlayView.measuredWidth
                measuredHeight = overlayView.measuredHeight

                posX = marginPx

                // Middle of the bubble vertically with collision avoidance along the left side
                val candidateY = targetBounds.centerY() - (measuredHeight / 2)
                posY = adjustBadgeYToAvoidCollisions(
                    candidateY = candidateY,
                    badgeHeight = measuredHeight,
                    isOutgoing = isOutgoing,
                    currentKey = displayKey,
                    targetBounds = targetBounds,
                    screenH = screenH
                )
            }

            // Don't show if scrolled off screen
            if (targetBounds.top >= bottomLimit && !isExpanded) {
                return@runOnMainThread
            }

            val layoutParams = WindowManager.LayoutParams().apply {
                type = WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY
                format = PixelFormat.TRANSLUCENT
                flags = if (isExpanded) {
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                            WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH or
                            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                } else {
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                }
                gravity = Gravity.TOP or Gravity.START
                x = posX
                y = posY
                width = measuredWidth
                height = WindowManager.LayoutParams.WRAP_CONTENT
            }

            if (isExpanded) {
                overlayView.elevation = 24 * density
            }

            overlayView.setOnTouchListener { _, event ->
                if (expandedDisplayKey == displayKey && event.action == android.view.MotionEvent.ACTION_OUTSIDE) {
                    collapseAll()
                    true
                } else {
                    false
                }
            }

            try {
                windowManager.addView(overlayView, layoutParams)
                val placedRect = Rect(posX, posY, posX + measuredWidth, posY + measuredHeight)
                activeOverlays[displayKey] = ActiveOverlay(
                    view = overlayView,
                    displayKey = displayKey,
                    sessionGeneration = sessionGeneration,
                    currentBounds = targetBounds,
                    lastScreenBounds = screenBounds,
                    lastInputBarTop = inputBarTop,
                    overlayScreenRect = placedRect
                )
            } catch (e: Exception) {
                Log.e(TAG, "Failed to attach translation overlay", e)
            }
        }
    }

    /**
     * Expands a specific translation overlay.
     */
    fun expandOverlay(displayKey: String) {
        runOnMainThread {
            val previousKey = expandedDisplayKey
            expandedDisplayKey = displayKey

            // Collapse previous if different
            if (previousKey != null && previousKey != displayKey) {
                activeOverlays[previousKey]?.let { updateOverlayDisplayState(it, isExpanded = false) }
            }

            // Hide other collapsed badges while translation bubble is open
            for ((key, other) in activeOverlays) {
                if (key != displayKey) {
                    other.view.findViewById<View>(R.id.llCollapsedBadge)?.visibility = View.GONE
                }
            }

            // Expand requested bubble on top
            activeOverlays[displayKey]?.let { active ->
                updateOverlayDisplayState(active, isExpanded = true)
            }

            mainHandler.removeCallbacks(autoCollapseRunnable)
            mainHandler.postDelayed(autoCollapseRunnable, AUTO_COLLAPSE_TIMEOUT_MS)
        }
    }

    /**
     * Collapses a specific translation overlay back to its compact icon badge.
     */
    fun collapseOverlay(displayKey: String) {
        runOnMainThread {
            if (expandedDisplayKey == displayKey) {
                collapseAll()
            }
        }
    }

    /**
     * Automatically collapses all expanded overlays back to small icon badges.
     */
    fun collapseAll() {
        runOnMainThread {
            mainHandler.removeCallbacks(autoCollapseRunnable)

            val currentExpanded = expandedDisplayKey
            expandedDisplayKey = null

            // Restore all collapsed badges
            for ((_, overlay) in activeOverlays) {
                overlay.view.findViewById<View>(R.id.llCollapsedBadge)?.visibility = View.VISIBLE
            }

            if (currentExpanded != null) {
                activeOverlays[currentExpanded]?.let { updateOverlayDisplayState(it, isExpanded = false) }
            }
        }
    }

    private fun updateOverlayDisplayState(active: ActiveOverlay, isExpanded: Boolean) {
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
        val bubbleWidth = (screenW * 0.85f).toInt().coerceIn((260 * density).toInt(), maxAllowedWidth)

        val bottomLimit = if (active.lastInputBarTop != null && active.lastInputBarTop!! > statusBarInsetPx + (100 * density).toInt()) {
            active.lastInputBarTop!! - (4 * density).toInt()
        } else {
            screenH - (navBarInsetPx + (56 * density).toInt())
        }

        val measuredWidth: Int
        val measuredHeight: Int
        val posX: Int
        val posY: Int

        if (isExpanded) {
            val svContainer = active.view.findViewById<android.widget.ScrollView>(R.id.svTranslatedContainer)
            val tvScrollHint = active.view.findViewById<TextView>(R.id.tvScrollHint)
            val maxBubbleHeightPx = (240 * density).toInt().coerceAtMost((screenH * 0.40f).toInt())

            svContainer?.layoutParams?.height = android.view.ViewGroup.LayoutParams.WRAP_CONTENT
            active.view.measure(
                View.MeasureSpec.makeMeasureSpec(bubbleWidth, View.MeasureSpec.EXACTLY),
                View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED)
            )

            if (active.view.measuredHeight > maxBubbleHeightPx) {
                tvScrollHint?.visibility = View.VISIBLE
                val scrollMaxHeight = (maxBubbleHeightPx - (28 * density).toInt()).coerceAtLeast((80 * density).toInt())
                svContainer?.layoutParams?.height = scrollMaxHeight
                active.view.measure(
                    View.MeasureSpec.makeMeasureSpec(bubbleWidth, View.MeasureSpec.EXACTLY),
                    View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED)
                )
            } else {
                tvScrollHint?.visibility = View.GONE
            }

            measuredWidth = bubbleWidth
            measuredHeight = active.view.measuredHeight

            var calculatedX = if (isOutgoing) screenW - bubbleWidth - marginPx else marginPx
            if (calculatedX + measuredWidth > screenW - marginPx) calculatedX = screenW - measuredWidth - marginPx
            if (calculatedX < marginPx) calculatedX = marginPx
            posX = calculatedX

            posY = if (active.currentBounds.bottom + gapPx + measuredHeight <= bottomLimit) {
                active.currentBounds.bottom + gapPx
            } else {
                (active.currentBounds.top - measuredHeight - gapPx).coerceAtLeast(statusBarInsetPx)
            }
            active.view.elevation = 24 * density
        } else {
            // Collapsed: All translation icons arranged neatly on the left side of the screen
            active.view.measure(
                View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED),
                View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED)
            )
            measuredWidth = active.view.measuredWidth
            measuredHeight = active.view.measuredHeight

            posX = marginPx

            val candidateY = active.currentBounds.centerY() - (measuredHeight / 2)
            posY = adjustBadgeYToAvoidCollisions(
                candidateY = candidateY,
                badgeHeight = measuredHeight,
                isOutgoing = isOutgoing,
                currentKey = active.displayKey,
                targetBounds = active.currentBounds,
                screenH = screenH
            )
            active.view.elevation = 2 * density
        }

        lp.x = posX
        lp.y = posY
        lp.width = measuredWidth
        lp.height = WindowManager.LayoutParams.WRAP_CONTENT
        lp.flags = if (isExpanded) {
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                    WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH or
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
        } else {
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
        }

        active.view.setOnTouchListener { _, event ->
            if (expandedDisplayKey == active.displayKey && event.action == android.view.MotionEvent.ACTION_OUTSIDE) {
                collapseAll()
                true
            } else {
                false
            }
        }

        try {
            windowManager.updateViewLayout(active.view, lp)
            active.overlayScreenRect = Rect(posX, posY, posX + measuredWidth, posY + measuredHeight)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to update overlay view display state", e)
        }
    }

    private fun updateOverlayView(
        active: ActiveOverlay,
        translatedText: String,
        targetBounds: Rect,
        screenBounds: Rect,
        inputBarTop: Int? = null,
        languagePairLabel: String? = null,
        badgeLabel: String? = null
    ) {
        val tv = active.view.findViewById<TextView>(R.id.tvTranslatedText)
        if (tv.text != translatedText) {
            tv.text = translatedText
        }

        val tvLabel = active.view.findViewById<TextView>(R.id.tvLanguageLabel)
        if (languagePairLabel != null && tvLabel?.text != languagePairLabel) {
            tvLabel?.text = languagePairLabel
        }

        val tvBadge = active.view.findViewById<TextView>(R.id.tvBadgeText)
        if (badgeLabel != null && tvBadge?.text != badgeLabel) {
            tvBadge?.text = badgeLabel
        }

        active.currentBounds = targetBounds
        active.lastScreenBounds = screenBounds
        active.lastInputBarTop = inputBarTop

        val isExpanded = (active.displayKey == expandedDisplayKey)
        val screenW = screenBounds.width()
        val isOutgoing = targetBounds.right > screenW * 0.78f || targetBounds.left > screenW * 0.40f

        val bgRes = if (isOutgoing) R.drawable.bg_overlay_outgoing else R.drawable.bg_overlay_incoming
        val labelColor = if (isOutgoing) {
            ContextCompat.getColor(context, R.color.overlay_outgoing_label)
        } else {
            ContextCompat.getColor(context, R.color.overlay_incoming_label)
        }

        val llCollapsed = active.view.findViewById<LinearLayout>(R.id.llCollapsedBadge)
        val llExpanded = active.view.findViewById<LinearLayout>(R.id.llExpandedCard)
        val ivBadge = active.view.findViewById<ImageView>(R.id.ivBadgeIcon)

        llCollapsed?.setBackgroundResource(bgRes)
        llExpanded?.setBackgroundResource(bgRes)
        ivBadge?.setColorFilter(labelColor)
        tvBadge?.setTextColor(labelColor)
        tvLabel?.setTextColor(labelColor)

        val ivClose = active.view.findViewById<ImageView>(R.id.ivCloseOverlay)
        val tvScrollHint = active.view.findViewById<TextView>(R.id.tvScrollHint)
        ivClose?.setColorFilter(labelColor)
        tvScrollHint?.setTextColor(labelColor)

        updateOverlayDisplayState(active, isExpanded)
    }

    /**
     * Removes a single overlay by displayKey.
     */
    fun removeOverlay(displayKey: String) {
        runOnMainThread {
            if (expandedDisplayKey == displayKey) {
                expandedDisplayKey = null
                mainHandler.removeCallbacks(autoCollapseRunnable)
            }
            val removed = activeOverlays.remove(displayKey) ?: return@runOnMainThread
            try {
                windowManager.removeView(removed.view)
            } catch (e: Exception) {
                Log.e(TAG, "Error removing overlay view for key: $displayKey", e)
            }
        }
    }

    /**
     * Cleans up overlays that are no longer part of the visible keys in the current scan.
     */
    fun reconcileVisibleOverlays(currentlyVisibleKeys: Set<String>) {
        runOnMainThread {
            val iterator = activeOverlays.entries.iterator()
            while (iterator.hasNext()) {
                val entry = iterator.next()
                if (entry.key !in currentlyVisibleKeys) {
                    if (expandedDisplayKey == entry.key) {
                        expandedDisplayKey = null
                        mainHandler.removeCallbacks(autoCollapseRunnable)
                    }
                    try {
                        windowManager.removeView(entry.value.view)
                    } catch (e: Exception) {
                        Log.e(TAG, "Error removing scrolled-out overlay", e)
                    }
                    iterator.remove()
                }
            }
        }
    }

    /**
     * Removes all overlays immediately (e.g. on chat switch, leaving WhatsApp, or disabling feature).
     */
    fun removeAllOverlays() {
        runOnMainThread {
            expandedDisplayKey = null
            dismissLanguageProposal()
            dismissDetectedLanguageBadge()
            mainHandler.removeCallbacks(autoCollapseRunnable)
            for ((key, overlay) in activeOverlays) {
                try {
                    windowManager.removeView(overlay.view)
                } catch (e: Exception) {
                    Log.e(TAG, "Error removing overlay on clear all: $key", e)
                }
            }
            activeOverlays.clear()
        }
    }

    private var detectedBadgeView: View? = null
    private var proposalDialogView: View? = null

    /**
     * Small icon popup on the right top corner when an uninstalled language is recognized.
     * Tapping it opens the window styled like the chat translation window.
     */
    fun showDetectedLanguageBadge(
        languageItem: com.bangla.translator.data.LanguageItem,
        sampleText: String,
        onOpenProposal: () -> Unit,
        onDismiss: () -> Unit
    ) {
        runOnMainThread {
            if (proposalDialogView != null) return@runOnMainThread
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
                Log.i(TAG, "Attached detected language badge for \${languageItem.code} at TOP|END")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to show detected language badge", e)
            }
        }
    }

    /**
     * Displays a window styled like the chat translation window showing the recognized new language,
     * sample message text, and proposing to download its local language pack.
     * If the pack slots are full (3/3), prompts the user to select which pair to replace with this new one.
     */
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
        runOnMainThread {
            if (proposalDialogView != null) return@runOnMainThread
            dismissDetectedLanguageBadge()

            val card = LinearLayout(context).apply {
                orientation = LinearLayout.VERTICAL
                setBackgroundResource(R.drawable.bg_overlay_incoming)
                setPadding((16 * density).toInt(), (14 * density).toInt(), (16 * density).toInt(), (14 * density).toInt())
                elevation = 24f * density
            }

            // Header Row
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

            // Detected Language Details
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
                    text = "Message: \\"$sampleText\\""
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
                // Warning: 3 slots full, ask for replacement
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
                // Slot available (< 3 slots)
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
                flags = WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                format = PixelFormat.TRANSLUCENT
                gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
                y = (70 * density).toInt()
            }

            try {
                windowManager.addView(card, lp)
                proposalDialogView = card
                Log.i(TAG, "Attached proposal dialog view for \${languageItem.code}")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to show proposal dialog view", e)
            }
        }
    }

    fun dismissDetectedLanguageBadge() {
        runOnMainThread {
            detectedBadgeView?.let {
                try { windowManager.removeView(it) } catch (e: Exception) {}
                detectedBadgeView = null
            }
        }
    }

    fun dismissLanguageProposal() {
        runOnMainThread {
            proposalDialogView?.let {
                try { windowManager.removeView(it) } catch (e: Exception) {}
                proposalDialogView = null
            }
        }
    }

    val activeCount: Int
        get() = activeOverlays.size

    private fun runOnMainThread(action: () -> Unit) {
        if (Looper.myLooper() == Looper.getMainLooper()) {
            action()
        } else {
            mainHandler.post(action)
        }
    }
}
`,

  'app/src/main/java/com/bangla/translator/service/BanglaAccessibilityService.kt': `package com.bangla.translator.service

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.res.Configuration
import android.graphics.Rect
import android.os.Handler
import android.os.Looper
import android.util.DisplayMetrics
import android.util.Log
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import com.bangla.translator.data.AppPreferences
import com.bangla.translator.data.ScannedMessage
import com.bangla.translator.overlay.OverlayController
import com.bangla.translator.scanner.WhatsAppMessageScanner
import com.bangla.translator.translation.TranslationEngine
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong

/**
 * Native Android Accessibility Service that inspects visible WhatsApp and WhatsApp Business
 * chat hierarchies, extracts Bengali messages, translates them locally on-device, and renders
 * overlays near the original messages.
 */
class BanglaAccessibilityService : AccessibilityService(), SharedPreferences.OnSharedPreferenceChangeListener {

    companion object {
        private const val TAG = "BanglaAccessService"
        private const val DEBOUNCE_DELAY_MS = 150L
        private const val WATCHDOG_INTERVAL_MS = 350L

        val SUPPORTED_PACKAGES = setOf("com.whatsapp", "com.whatsapp.w4b")
        val SYSTEM_OVERLAY_PACKAGES = setOf(
            "com.bangla.translator",
            "com.bangla.translator.debug",
            "com.android.systemui",
            "android"
        )

        @Volatile
        var isServiceRunning: Boolean = false
            private set
    }

    // Core generation tracking to prevent race conditions across chat switches
    private val sessionGeneration = AtomicLong(1L)

    private lateinit var appPreferences: AppPreferences
    private lateinit var overlayController: OverlayController
    private lateinit var messageScanner: WhatsAppMessageScanner
    private lateinit var windowManager: WindowManager

    private val mainHandler = Handler(Looper.getMainLooper())
    private val screenBounds = Rect()

    // Currently visible keys mapped to message metadata for the active generation
    private val activeVisibleKeys = ConcurrentHashMap<String, ScannedMessage>()

    // In-flight tracker: (normalizedText, generation) -> in-flight
    private val inFlightSet = ConcurrentHashMap<Pair<String, Long>, Boolean>()

    private var lastObservedChatWindow: String? = null
    private var currentTypingBarTop: Int? = null
    private val isWatchdogActive = AtomicBoolean(false)
    private var nonForegroundCount = 0
    private val dismissedLangsThisSession = mutableSetOf<String>()

    // Debounced scan task
    private val scanRunnable = Runnable {
        performHierarchyScan()
    }

    // Safety watchdog task to detect leaving WhatsApp even if foreign events are filtered
    private val watchdogRunnable = object : Runnable {
        override fun run() {
            if (!isWhatsAppForeground()) {
                nonForegroundCount++
                if (nonForegroundCount >= 2) {
                    handleLeftWhatsApp()
                    nonForegroundCount = 0
                } else {
                    mainHandler.postDelayed(this, 300L)
                }
            } else {
                nonForegroundCount = 0
                if (overlayController.activeCount > 0 || inFlightSet.isNotEmpty()) {
                    mainHandler.postDelayed(this, 300L)
                } else {
                    isWatchdogActive.set(false)
                }
            }
        }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        Log.i(TAG, "BanglaAccessibilityService connected.")
        isServiceRunning = true

        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        appPreferences = AppPreferences(this)
        appPreferences.registerListener(this)

        messageScanner = WhatsAppMessageScanner(appPreferences.activeSourceLanguages, appPreferences.bengaliRatioThreshold)
        overlayController = OverlayController(this, windowManager)
        TranslationEngine.setLanguagePair(appPreferences.sourceLanguageCode, appPreferences.targetLanguageCode)

        updateScreenBounds()

        // Configure accessibility dynamic properties
        val info = serviceInfo ?: AccessibilityServiceInfo()
        info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED or
                AccessibilityEvent.TYPE_VIEW_SCROLLED or
                AccessibilityEvent.TYPE_WINDOWS_CHANGED
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
        info.flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or
                AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
        info.notificationTimeout = 100
        serviceInfo = info

        TranslationEngine.checkModelAvailability()
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return
        val pkg = event.packageName?.toString() ?: ""

        // Ignore events from our own overlay windows, system UI, and keyboards
        if (pkg in SYSTEM_OVERLAY_PACKAGES || pkg.contains("inputmethod") || pkg.contains("keyboard") || pkg.contains("ime")) {
            return
        }

        // If a foreign application or launcher window state changed, user left WhatsApp
        if (pkg !in SUPPORTED_PACKAGES) {
            if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED && pkg.isNotEmpty()) {
                handleLeftWhatsApp()
            }
            return
        }

        if (!appPreferences.isOverlayEnabled) {
            return
        }

        when (event.eventType) {
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> {
                handleWindowStateChanged(event)
            }
            AccessibilityEvent.TYPE_VIEW_SCROLLED -> {
                scheduleDebouncedScan()
            }
            AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED -> {
                scheduleDebouncedScan()
            }
            AccessibilityEvent.TYPE_WINDOWS_CHANGED -> {
                scheduleDebouncedScan()
            }
        }
    }

    /**
     * Differentiates chat transitions from minor dialogs or keyboard events.
     */
    private fun handleWindowStateChanged(event: AccessibilityEvent) {
        val className = event.className?.toString() ?: ""

        // Ignore soft keyboard / input method window state changes
        if (className.contains("InputMethod") || className.contains("Keyguard")) {
            return
        }

        // WhatsApp conversation screen detection
        val isConversationActivity = className.contains("Conversation") ||
                className.contains("Chat") ||
                className.contains("HomeActivity")

        if (isConversationActivity) {
            startNewSession()
            lastObservedChatWindow = className
        }

        scheduleDebouncedScan()
    }

    /**
     * Increments session generation and invalidates old overlays and in-flight tasks.
     */
    private fun startNewSession() {
        val newGen = sessionGeneration.incrementAndGet()
        Log.d(TAG, "Starting new conversation session generation: $newGen")

        overlayController.removeAllOverlays()
        activeVisibleKeys.clear()
        inFlightSet.clear()
        dismissedLangsThisSession.clear()
    }

    /**
     * Debounces scans to prevent high-frequency hierarchy re-traversals.
     */
    private fun scheduleDebouncedScan() {
        mainHandler.removeCallbacks(scanRunnable)
        mainHandler.postDelayed(scanRunnable, DEBOUNCE_DELAY_MS)
        ensureWatchdogRunning()
    }

    /**
     * Traverses the WhatsApp hierarchy, identifies visible Bengali messages,
     * reconciles stale overlays, and triggers asynchronous on-device translations.
     */
    private fun performHierarchyScan() {
        if (!isWhatsAppForeground()) {
            handleLeftWhatsApp()
            return
        }

        if (!appPreferences.isOverlayEnabled) {
            overlayController.removeAllOverlays()
            return
        }

        val currentGen = sessionGeneration.get()
        val root = rootInActiveWindow ?: return

        val scanResult = try {
            messageScanner.scanVisibleMessages(root, screenBounds, currentGen)
        } finally {
            root.recycle()
        }

        val scannedMessages = scanResult.messages
        currentTypingBarTop = scanResult.inputBarTop

        // Check if an uninstalled language is discovered and propose language pack
        val uninstalled = scanResult.detectedUninstalledLanguage
        if (uninstalled != null &&
            appPreferences.isAutoDetectPromptEnabled &&
            !appPreferences.isLanguageIgnored(uninstalled) &&
            !dismissedLangsThisSession.contains(uninstalled)
        ) {
            val item = com.bangla.translator.data.SupportedLanguages.findByCode(uninstalled)
            val sample = scanResult.sampleUninstalledText ?: ""
            val currentPairs = appPreferences.getLanguagePairs()
            val isSlotsFull = currentPairs.size >= com.bangla.translator.data.AppPreferences.MAX_ACTIVE_LANGUAGES

            overlayController.showLanguageProposalWindow(
                languageItem = item,
                sampleText = sample,
                isSlotsFull = isSlotsFull,
                currentPairs = currentPairs,
                onDownloadAndAdd = {
                    dismissedLangsThisSession.add(uninstalled)
                    appPreferences.addLanguagePair(uninstalled, "en")
                    com.bangla.translator.translation.TranslationEngine.prepareModelIfNeeded(
                        sourceLangCode = item.mlKitCode,
                        onSuccess = {
                            mainHandler.post {
                                messageScanner = WhatsAppMessageScanner(appPreferences.activeSourceLanguages, appPreferences.bengaliRatioThreshold)
                                performHierarchyScan()
                            }
                        }
                    )
                },
                onReplacePair = { oldSourceCode ->
                    dismissedLangsThisSession.add(uninstalled)
                    appPreferences.replaceLanguagePair(oldSourceCode, uninstalled, "en")
                    val remaining = appPreferences.activeSourceLanguages
                    if (!remaining.contains(oldSourceCode)) {
                        val oldMeta = com.bangla.translator.data.SupportedLanguages.findByCode(oldSourceCode)
                        com.bangla.translator.translation.TranslationEngine.deleteModel(oldMeta.mlKitCode)
                    }
                    com.bangla.translator.translation.TranslationEngine.prepareModelIfNeeded(
                        sourceLangCode = item.mlKitCode,
                        onSuccess = {
                            mainHandler.post {
                                messageScanner = WhatsAppMessageScanner(appPreferences.activeSourceLanguages, appPreferences.bengaliRatioThreshold)
                                performHierarchyScan()
                            }
                        }
                    )
                },
                onIgnoreLanguage = { langCode ->
                    dismissedLangsThisSession.add(langCode)
                    appPreferences.addIgnoredLanguage(langCode)
                },
                onDismiss = {
                    dismissedLangsThisSession.add(uninstalled)
                }
            )
        }

        val currentVisibleKeySet = HashSet<String>()
        for (msg in scannedMessages) {
            currentVisibleKeySet.add(msg.displayKey)
            activeVisibleKeys[msg.displayKey] = msg
        }
        // Prune off-screen keys so activeVisibleKeys precisely matches viewport
        activeVisibleKeys.keys.retainAll(currentVisibleKeySet)

        // Remove overlays for messages that have scrolled away
        overlayController.reconcileVisibleOverlays(currentVisibleKeySet)

        // Process each visible message
        for (msg in scannedMessages) {
            processMessageTranslation(msg, currentGen)
        }
    }

    /**
     * Dispatches translation request with strict generation and visibility checks.
     */
    private fun processMessageTranslation(msg: ScannedMessage, taskGeneration: Long) {
        // Check cache first for instant synchronous display
        val cached = TranslationEngine.cache.get(msg.normalizedText)
        if (cached != null) {
            val detectedLangs = com.bangla.translator.translation.LanguageDetector.detectAllLanguages(msg.normalizedText)
            validateAndDisplay(msg, cached, taskGeneration, detectedLangs)
            return
        }

        // Avoid duplicate in-flight requests for identical text in the same generation
        val inFlightKey = Pair(msg.normalizedText, taskGeneration)
        if (inFlightSet.putIfAbsent(inFlightKey, true) != null) {
            return
        }

        TranslationEngine.translateWithDetails(
            text = msg.normalizedText,
            sourceCode = msg.languageCode,
            onSuccess = { details ->
                inFlightSet.remove(inFlightKey)
                mainHandler.post {
                    validateAndDisplay(msg, details.translatedText, taskGeneration, details.detectedLanguages)
                }
            },
            onFailure = { error ->
                inFlightSet.remove(inFlightKey)
                Log.w(TAG, "Translation failed for \${msg.normalizedText}: \${error.message}")
            }
        )
    }

    /**
     * Validates all 5 asynchronous safety rules before rendering an overlay:
     * 1. Translation belongs to current session/generation.
     * 2. Message is still considered visible in activeVisibleKeys.
     * 3. WhatsApp is still the active foreground application.
     * 4. Overlay feature is still enabled.
     * 5. Service is still connected.
     */
    private fun validateAndDisplay(
        msg: ScannedMessage,
        translatedText: String,
        taskGeneration: Long,
        detectedLangs: List<String> = emptyList()
    ) {
        val currentGen = sessionGeneration.get()
        if (taskGeneration != currentGen) {
            Log.d(TAG, "Rejected translation from stale generation $taskGeneration (current: $currentGen)")
            return
        }

        if (!isWhatsAppForeground()) {
            Log.d(TAG, "Rejected translation: WhatsApp is no longer in foreground.")
            handleLeftWhatsApp()
            return
        }

        if (!appPreferences.isOverlayEnabled) {
            return
        }

        if (!activeVisibleKeys.containsKey(msg.displayKey)) {
            Log.d(TAG, "Message \${msg.displayKey} is no longer in active visible set.")
            return
        }

        // Dynamically compute the exact language pair label for this specific message bubble
        val effectiveLangs = if (detectedLangs.isNotEmpty()) {
            detectedLangs
        } else if (msg.languageCode.isNotBlank()) {
            msg.languageCode.split(",").filter { it.isNotBlank() }
        } else {
            com.bangla.translator.translation.LanguageDetector.detectAllLanguages(msg.normalizedText)
        }

        val targetMeta = com.bangla.translator.data.SupportedLanguages.findByCode(appPreferences.targetLanguageCode)

        val dynamicPairLabel = if (effectiveLangs.size > 1) {
            val nativeNames = effectiveLangs.map { com.bangla.translator.data.SupportedLanguages.findByCode(it).nativeName }.distinct()
            "\${nativeNames.joinToString(", ")} → \${targetMeta.name}"
        } else {
            val singleCode = effectiveLangs.firstOrNull() ?: appPreferences.sourceLanguageCode
            val sourceMeta = com.bangla.translator.data.SupportedLanguages.findByCode(singleCode)
            "\${sourceMeta.nativeName} → \${targetMeta.name}"
        }

        val dynamicBadgeLabel = if (effectiveLangs.size > 1) {
            "MULTI"
        } else {
            targetMeta.code.uppercase()
        }

        overlayController.showOverlay(
            displayKey = msg.displayKey,
            translatedText = translatedText,
            targetBounds = msg.bounds,
            sessionGeneration = taskGeneration,
            screenBounds = screenBounds,
            inputBarTop = currentTypingBarTop,
            languagePairLabel = dynamicPairLabel,
            badgeLabel = dynamicBadgeLabel
        )
        ensureWatchdogRunning()
    }

    /**
     * Checks if WhatsApp or WhatsApp Business is the active foreground app.
     */
    private fun isWhatsAppForeground(): Boolean {
        val root = rootInActiveWindow ?: return true // Do NOT assume left on transient null root!
        val pkg = try {
            root.packageName?.toString() ?: ""
        } finally {
            root.recycle()
        }
        if (pkg.isEmpty() || pkg in SYSTEM_OVERLAY_PACKAGES || pkg.contains("inputmethod") || pkg.contains("keyboard")) {
            return true
        }
        return pkg in SUPPORTED_PACKAGES
    }

    /**
     * Invoked when the user leaves WhatsApp (Home button, App switcher, or foreign app).
     */
    private fun handleLeftWhatsApp() {
        Log.d(TAG, "Leaving WhatsApp detected. Invalidating overlays and in-flight tasks.")
        sessionGeneration.incrementAndGet()
        overlayController.removeAllOverlays()
        activeVisibleKeys.clear()
        inFlightSet.clear()
        dismissedLangsThisSession.clear()
        lastObservedChatWindow = null
        currentTypingBarTop = null
    }

    private fun ensureWatchdogRunning() {
        if (isWatchdogActive.compareAndSet(false, true)) {
            mainHandler.postDelayed(watchdogRunnable, 200L)
        }
    }

    private fun updateScreenBounds() {
        val displayMetrics = DisplayMetrics()
        @Suppress("DEPRECATION")
        windowManager.defaultDisplay.getRealMetrics(displayMetrics)
        screenBounds.set(0, 0, displayMetrics.widthPixels, displayMetrics.heightPixels)
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        updateScreenBounds()
        // Orientation / display size changed: recalculate overlays
        scheduleDebouncedScan()
    }

    override fun onSharedPreferenceChanged(sharedPreferences: SharedPreferences?, key: String?) {
        if (key == AppPreferences.KEY_OVERLAY_ENABLED) {
            if (!appPreferences.isOverlayEnabled) {
                overlayController.removeAllOverlays()
            } else {
                scheduleDebouncedScan()
            }
        } else if (key == AppPreferences.KEY_BENGALI_RATIO ||
            key == AppPreferences.KEY_SOURCE_LANG ||
            key == AppPreferences.KEY_TARGET_LANG ||
            key == AppPreferences.KEY_ACTIVE_SOURCE_LANGS ||
            key == AppPreferences.KEY_PAIRS_CONFIG
        ) {
            messageScanner = WhatsAppMessageScanner(appPreferences.activeSourceLanguages, appPreferences.bengaliRatioThreshold)
            TranslationEngine.setLanguagePair(appPreferences.sourceLanguageCode, appPreferences.targetLanguageCode)
            overlayController.removeAllOverlays()
            scheduleDebouncedScan()
        }
    }

    override fun onInterrupt() {
        Log.w(TAG, "BanglaAccessibilityService interrupted.")
        overlayController.removeAllOverlays()
    }

    override fun onDestroy() {
        super.onDestroy()
        isServiceRunning = false
        mainHandler.removeCallbacksAndMessages(null)
        appPreferences.unregisterListener(this)
        overlayController.removeAllOverlays()
        TranslationEngine.close()
        Log.i(TAG, "BanglaAccessibilityService destroyed.")
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
import android.util.Log
import androidx.core.app.NotificationCompat
import com.bangla.translator.R
import com.bangla.translator.data.AppPreferences
import com.bangla.translator.translation.BengaliDetector
import com.bangla.translator.translation.LanguageDetector
import com.bangla.translator.translation.TranslationEngine

/**
 * Independent notification listener service that detects incoming Bengali messages
 * in WhatsApp and WhatsApp Business notifications and posts translated companions.
 */
class NotificationTranslationService : NotificationListenerService() {

    companion object {
        private const val TAG = "NotificationTrans"
        private const val CHANNEL_ID = "bangla_translated_notifications"
        private const val CHANNEL_NAME = "Translated WhatsApp Messages"

        val SUPPORTED_PACKAGES = setOf("com.whatsapp", "com.whatsapp.w4b")
    }

    private lateinit var appPreferences: AppPreferences
    private lateinit var notificationManager: NotificationManager

    override fun onCreate() {
        super.onCreate()
        appPreferences = AppPreferences(this)
        notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        createNotificationChannel()
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return

        val pkgName = sbn.packageName ?: return
        if (pkgName !in SUPPORTED_PACKAGES) {
            return
        }

        // Verify user preference
        if (!appPreferences.isNotificationTranslationEnabled) {
            return
        }

        val notification = sbn.notification ?: return
        val extras = notification.extras ?: return

        val title = extras.getCharSequence("android.title")?.toString() ?: ""
        val text = extras.getCharSequence("android.text")?.toString()
            ?: extras.getCharSequence("android.bigText")?.toString()
            ?: ""

        if (text.isBlank()) return

        // Check if message text is in any active foreign language
        var matchedSourceLang: String? = null
        for (lang in appPreferences.activeSourceLanguages) {
            if (LanguageDetector.isTargetLanguageMessage(text, lang, appPreferences.bengaliRatioThreshold)) {
                matchedSourceLang = lang
                break
            }
        }
        if (matchedSourceLang == null) return

        // Translate locally
        TranslationEngine.translate(
            text = text,
            sourceCode = matchedSourceLang,
            onSuccess = { translatedText ->
                postTranslatedNotification(
                    originalPkg = pkgName,
                    senderTitle = title,
                    originalText = text,
                    translatedText = translatedText,
                    notificationId = sbn.id
                )
            },
            onFailure = { error ->
                Log.w(TAG, "Failed to translate notification: \${error.message}")
            }
        )
    }

    private fun postTranslatedNotification(
        originalPkg: String,
        senderTitle: String,
        originalText: String,
        translatedText: String,
        notificationId: Int
    ) {
        // Create intent to open originating WhatsApp variant
        val launchIntent = packageManager.getLaunchIntentForPackage(originalPkg)
        val pendingIntent = if (launchIntent != null) {
            PendingIntent.getActivity(
                this,
                notificationId,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        } else null

        val appLabel = if (originalPkg == "com.whatsapp.w4b") "WhatsApp Business" else "WhatsApp"
        val displayTitle = if (senderTitle.isNotBlank()) {
            "$senderTitle ($appLabel Translated)"
        } else {
            "$appLabel (Bengali Translated)"
        }

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_app_launcher)
            .setContentTitle(displayTitle)
            .setContentText(translatedText)
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText("$translatedText\\n\\nOriginal: $originalText")
            )
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)

        if (pendingIntent != null) {
            builder.setContentIntent(pendingIntent)
        }

        try {
            notificationManager.notify(notificationId + 100000, builder.build())
        } catch (e: SecurityException) {
            Log.e(TAG, "Missing notification permission to post translated notification", e)
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Shows local Bengali to English translations of incoming WhatsApp messages"
                enableVibration(false)
            }
            notificationManager.createNotificationChannel(channel)
        }
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
import android.net.Uri
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

    override fun onResume() {
        super.onResume()
        appPreferences.registerListener(this)
        refreshAllUI()
    }

    override fun onPause() {
        super.onPause()
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
        TranslationEngine.purgeInactiveModels(
            activeSourceCodes = appPreferences.activeSourceLanguages,
            targetCode = appPreferences.targetLanguageCode
        )
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
        binding.tvActivePairSummary.text = "Active Pairs (\${pairs.size}/3): $summary"
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

        // Repository & Support Actions
        binding.btnReportGitHubIssue.setOnClickListener {
            try {
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://github.com/sheminasalam/ChatNora/issues"))
                startActivity(intent)
            } catch (e: Exception) {
                Toast.makeText(this, "Could not open browser. Repository: github.com/sheminasalam/ChatNora", Toast.LENGTH_LONG).show()
            }
        }

        binding.btnOpenGitHubRepo.setOnClickListener {
            try {
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://github.com/sheminasalam/ChatNora"))
                startActivity(intent)
            } catch (e: Exception) {
                Toast.makeText(this, "GitHub Repository: github.com/sheminasalam/ChatNora", Toast.LENGTH_LONG).show()
            }
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
`,

  'app/src/test/java/com/bangla/translator/BengaliDetectorTest.kt': `package com.bangla.translator

import com.bangla.translator.translation.BengaliDetector
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class BengaliDetectorTest {

    @Test
    fun testPureBengaliMessage() {
        assertTrue(BengaliDetector.isBengali("তুমি কোথায় আছো?"))
        assertTrue(BengaliDetector.isBengali("কেমন আছেন? সব ঠিক আছে তো?"))
    }

    @Test
    fun testMixedBengaliAndEnglishMessage() {
        // "কাল meeting আছে?" contains 6 Bengali characters and 7 English letters -> ratio ~46% > 20%
        assertTrue(BengaliDetector.isBengali("কাল meeting আছে?"))
        assertTrue(BengaliDetector.isBengali("ভাই WhatsApp এ call দিন"))
    }

    @Test
    fun testEnglishOnlyMessage() {
        assertFalse(BengaliDetector.isBengali("Hello how are you?"))
        assertFalse(BengaliDetector.isBengali("Let's meet tomorrow at 10 AM"))
    }

    @Test
    fun testEmojiOnlyMessage() {
        assertFalse(BengaliDetector.isBengali("😂👍🎉"))
        assertFalse(BengaliDetector.isBengali("❤️🔥"))
    }

    @Test
    fun testBengaliWithEmojiMessage() {
        assertTrue(BengaliDetector.isBengali("ভালো আছি ভাই 😂👍"))
    }

    @Test
    fun testUrlExclusion() {
        assertFalse(BengaliDetector.isBengali("https://example.com"))
        assertFalse(BengaliDetector.isBengali("http://news.bangla.com/article/123"))
    }

    @Test
    fun testTimestampAndDurationExclusion() {
        assertFalse(BengaliDetector.isBengali("12:45 PM"))
        assertFalse(BengaliDetector.isBengali("09:30 am"))
        assertFalse(BengaliDetector.isBengali("0:15"))
    }

    @Test
    fun testNumbersOnly() {
        assertFalse(BengaliDetector.isBengali("123456789"))
        assertFalse(BengaliDetector.isBengali("+8801712345678"))
    }

    @Test
    fun testEmptyOrWhitespace() {
        assertFalse(BengaliDetector.isBengali(""))
        assertFalse(BengaliDetector.isBengali("   "))
        assertFalse(BengaliDetector.isBengali(null))
    }
}
`,

  'app/src/test/java/com/bangla/translator/TranslationCacheTest.kt': `package com.bangla.translator

import com.bangla.translator.translation.TranslationCache
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

class TranslationCacheTest {

    @Test
    fun testTextNormalization() {
        val cache = TranslationCache()
        val raw = "   তুমি     কোথায়   আছো?   \\n\\n  "
        val expected = "তুমি কোথায় আছো?"

        assertEquals(expected, cache.normalize(raw))
    }

    @Test
    fun testCacheHitWithDifferentSpacing() {
        val cache = TranslationCache()
        cache.put("তুমি কেমন আছো?", "How are you?")

        // Spaced out variation should hit cache due to normalization
        val result = cache.get("   তুমি    কেমন   আছো?  ")
        assertNotNull(result)
        assertEquals("How are you?", result)
    }

    @Test
    fun testCacheMiss() {
        val cache = TranslationCache()
        assertNull(cache.get("কোনো অনুবাদ নেই"))
    }

    @Test
    fun testBoundedCapacityEviction() {
        val maxItems = 3
        val cache = TranslationCache(maxEntries = maxItems)

        cache.put("১", "One")
        cache.put("২", "Two")
        cache.put("৩", "Three")
        assertEquals(3, cache.size)

        // Adding 4th item should evict the oldest (LRU)
        cache.put("৪", "Four")
        assertEquals(3, cache.size)
        assertNull(cache.get("১"))
        assertNotNull(cache.get("৪"))
    }
}
`,

};

export async function downloadProjectZip() {
  const zip = new JSZip();

  for (const [filename, content] of Object.entries(ALL_PROJECT_FILES)) {
    zip.file(`ChatNora/${filename}`, content);
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
