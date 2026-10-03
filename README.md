# ChatNora: Universal On-Device WhatsApp Translator

An independent, privacy-first native Android application and companion simulator engineered to translate multilingual WhatsApp and WhatsApp Business messages directly on-device using Android's **AccessibilityService** and **Google ML Kit On-Device Translation**.

---

## 1. What ChatNora Does

ChatNora operates as a non-invasive, floating accessibility translation overlay:
- **Instant In-Chat Overlays:** Displays compact, discreet translation cards directly attached to visible WhatsApp and WhatsApp Business message bubbles without copying, pasting, or switching apps.
- **Configurable Multi-Language Slots (Up to 3 Active Pairs):** Users can activate up to 3 simultaneous source-to-target language pairs (e.g. Bengali → English, Hindi → English, Spanish → English).
- **On-Demand Local Model Downloads:** Downloads Google ML Kit offline neural language models (~30MB per language) directly to `/data/` partition for 100% offline translations.
- **Automatic Model Pack Purging (Zero Storage/RAM Bloat):** Whenever a language pair is removed or replaced, ChatNora immediately purges the corresponding offline language model pack from device flash storage and unloads its memory buffers from RAM.
- **Live New Language Detection:** Automatically scans incoming chats using fast Unicode script boundary heuristics and ML Kit identification, proposing to download the required pack when encountering new foreign languages.
- **Master Live Detection Toggle:** Users can toggle live new language detection ON or OFF from Settings at any time.
- **Language Ignore List & "Don't Ask Again":** If a language is falsely detected or the user does not wish to translate it, they can add it to the Ignore List directly from the live detection popup or through Settings. Ignored languages will never prompt again.
- **WhatsApp Notification Translation:** Optional companion `NotificationListenerService` that translates incoming notifications in real time.

---

## 2. What ChatNora Does NOT Do (Non-Goals & System Boundaries)

To ensure strict user privacy, minimal memory footprint, and operating stability, the application has explicit functional boundaries:

1. **Does NOT Send Any Chat Data to the Cloud:**
   - ChatNora does **NOT** connect to OpenAI, Google Cloud, Gemini, Claude, DeepL, or any custom backend server to translate messages.
   - 100% of text processing and translation inference occurs locally on your phone's processor.
   - Network connectivity is used strictly once per language by Google Play Services / ML Kit to download the compressed offline translation models.

2. **Does NOT Retain Orphaned Language Packs:**
   - ChatNora does **NOT** leave downloaded ~30MB language packs sitting in phone storage when a language pair is removed from settings or replaced in a slot.
   - The app actively calls `deleteDownloadedModel()` and closes active `Translator` instances to free flash storage and reclaim RAM immediately.

3. **Does NOT Translate Voice Notes, Audio, or Calls:**
   - ChatNora interacts with text elements exposed by Android's accessibility node hierarchy (`AccessibilityNodeInfo`).
   - It does **NOT** record microphone audio, intercept VoIP WhatsApp phone calls, or transcribe voice notes.

4. **Does NOT Perform OCR on Photos, Images, or Stickers:**
   - ChatNora does not inspect image bitmaps, stickers, memes, or photos sent inside chats.

5. **Does NOT Modify, Send, or Delete WhatsApp Messages:**
   - ChatNora is strictly **read-only**.
   - It never accesses WhatsApp's internal SQLite database, never modifies chat history, and never types or sends messages on behalf of the user.
   - Translations are displayed as standalone window manager overlays (`TYPE_ACCESSIBILITY_OVERLAY`) rendered above WhatsApp views.

6. **Does NOT Prompt for Ignored Languages:**
   - Any language placed in the **Ignore List** or encountered while the **Live Detection** toggle is disabled will never trigger download popups, banners, or badges.

7. **Does NOT Exceed 3 Active Language Slots:**
   - To guarantee that low-end and mid-range Android devices maintain fluid 60fps scrolling and under 50MB RAM overhead, concurrent active translation pairs are capped at 3 slots.

8. **Does NOT Monitor or Overlay Non-WhatsApp Applications:**
   - The service is strictly scoped to `com.whatsapp` and `com.whatsapp.w4b`.
   - Built-in watchdogs immediately purge all active overlays the instant the user presses Home, switches tasks, or opens another application.

9. **Does NOT Collect Telemetry, Tracking, or Analytics:**
   - Contains zero analytics SDKs, advertising trackers, device fingerprinting, or crash reporting telemetry.

10. **Does NOT Require Root or Unlocked Bootloader:**
    - Uses standard, official Android Accessibility and Notification APIs supported on Android 8.0 (Oreo / API 26) through Android 15.

---

## 3. Privacy & On-Device Architecture

```
[WhatsApp / WhatsApp Business]
               ↓
   Android AccessibilityNodeInfo
               ↓
    LanguageDetector (Local Fast Unicode Heuristics)
               ↓
   TranslationCache (In-Memory LRU 500 Entries)
               ↓
  Google ML Kit Translate (100% Local On-Device)
  (Offline models stored on /data partition)
               ↓
    OverlayController (Main Thread)
               ↓
TYPE_ACCESSIBILITY_OVERLAY (Rendered directly in WhatsApp)
```

---

## 4. Automatic Language Pack Memory & Storage Management

| User Action | Flash Storage Impact | RAM Impact | Behavior |
|---|---|---|---|
| **Add Language Pair** | +30 MB | +14 MB | Downloads offline ML Kit model and prepares inference pipeline |
| **Remove Language Pair** | **-30 MB (Deleted)** | **-14 MB (Released)** | Calls `deleteDownloadedModel()`, closes translator, frees memory |
| **Replace Language Slot** | Net 0 MB (~30 MB swap) | Net 0 MB | Deletes previous model from storage and downloads replacement |
| **Add to Ignore List** | 0 MB | 0 MB | Prevents future prompts and avoids unnecessary model downloads |

---

## 5. Permissions Overview

| Permission | Purpose | Required / Optional |
|---|---|---|
| `BIND_ACCESSIBILITY_SERVICE` | Required to read visible WhatsApp message text bubbles and place overlays | **Required** |
| `BIND_NOTIFICATION_LISTENER_SERVICE` | Intercepts incoming WhatsApp notifications to post translated alerts | **Optional** (user toggle) |
| `POST_NOTIFICATIONS` | Needed on Android 13+ (API 33+) to display companion translated notifications | **Optional** |
| `INTERNET` | Used exclusively by Google Play Services / ML Kit to download offline models | **Setup only** |

---

## 6. How to Build & Install

### Option 1: GitHub Actions CI (Recommended & Automated)

This repository includes an automated GitHub Actions workflow at `.github/workflows/build.yml`.
1. Push this repository to GitHub (`main` or `master` branch).
2. Go to the **Actions** tab in GitHub.
3. The workflow **"Build ChatNora APK"** builds the project with JDK 17, Android SDK 34, and Gradle 8.7.
4. Download the compiled **`ChatNora-debug.apk`** artifact directly from the workflow summary.

### Option 2: Local Gradle CLI

```bash
# Verify Gradle & JDK
gradle -v

# Run unit tests
gradle test

# Assemble Debug APK
gradle assembleDebug

# Output APK: app/build/outputs/apk/debug/app-debug.apk
```

### Option 3: Android Studio

1. Open Android Studio (Hedgehog or newer).
2. Choose **File > Open** and select the project directory.
3. Allow Gradle to sync dependencies.
4. Connect an Android phone with USB Debugging enabled.
5. Click **Run 'app'** (`Shift + F10`).

---

## 7. Device Setup Guide

1. **Install APK** onto your Android phone:
   ```bash
   adb install -r app/build/outputs/apk/debug/app-debug.apk
   ```
2. **Open ChatNora:**
   - Configure your preferred language pairs (up to 3 slots).
   - Models (~30MB) will download for on-device offline translation.
3. **Enable Accessibility:**
   - Tap **"Configure Accessibility"**.
   - Select **ChatNora Service** under Installed Apps.
   - Toggle **Allow**.
4. **(Optional) Enable Notification Access:**
   - Toggle **WhatsApp Notification Translation**.
5. **Open WhatsApp:**
   - Open any chat containing messages in your configured languages.
   - Clean, discreet translation cards will instantly appear!
