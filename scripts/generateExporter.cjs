const fs = require('fs');
const path = require('path');

const files = [
  'settings.gradle.kts',
  'build.gradle.kts',
  'gradle.properties',
  '.github/workflows/build.yml',
  'app/build.gradle.kts',
  'app/proguard-rules.pro',
  'app/src/main/AndroidManifest.xml',
  'app/src/main/res/xml/accessibility_service_config.xml',
  'app/src/main/res/values/strings.xml',
  'app/src/main/res/values/colors.xml',
  'app/src/main/res/drawable/ic_app_launcher.xml',
  'app/src/main/res/drawable/bg_overlay_incoming.xml',
  'app/src/main/res/drawable/bg_overlay_outgoing.xml',
  'app/src/main/res/drawable/bg_overlay_card.xml',
  'app/src/main/res/drawable/ic_launcher_foreground.xml',
  'app/src/main/res/drawable/ic_translate.xml',
  'app/src/main/res/values/themes.xml',
  'app/src/main/res/layout/activity_main.xml',
  'app/src/main/res/layout/layout_translation_overlay.xml',
  'app/src/main/res/layout/layout_floating_toggle.xml',
  'app/src/main/java/com/bangla/translator/data/Models.kt',
  'app/src/main/java/com/bangla/translator/data/SupportedLanguages.kt',
  'app/src/main/java/com/bangla/translator/data/AppPreferences.kt',
  'app/src/main/java/com/bangla/translator/translation/LanguageDetector.kt',
  'app/src/main/java/com/bangla/translator/translation/BengaliDetector.kt',
  'app/src/main/java/com/bangla/translator/translation/TranslationCache.kt',
  'app/src/main/java/com/bangla/translator/translation/TranslationEngine.kt',
  'app/src/main/java/com/bangla/translator/scanner/WhatsAppMessageScanner.kt',
  'app/src/main/java/com/bangla/translator/overlay/OverlayController.kt',
  'app/src/main/java/com/bangla/translator/service/BanglaAccessibilityService.kt',
  'app/src/main/java/com/bangla/translator/service/NotificationTranslationService.kt',
  'app/src/main/java/com/bangla/translator/MainActivity.kt',
  'app/src/test/java/com/bangla/translator/BengaliDetectorTest.kt',
  'app/src/test/java/com/bangla/translator/TranslationCacheTest.kt'
];

let out = "import JSZip from 'jszip';\n\nexport const ALL_PROJECT_FILES: Record<string, string> = {\n";

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const escaped = content
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
  out += `  '${file}': \`${escaped}\`,\n\n`;
}

out += `};\n\nexport async function downloadProjectZip() {
  const zip = new JSZip();

  for (const [filename, content] of Object.entries(ALL_PROJECT_FILES)) {
    zip.file(\`ChatNora/\${filename}\`, content);
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
`;

fs.writeFileSync('src/projectExporter.ts', out, 'utf-8');
console.log('Successfully generated src/projectExporter.ts');
