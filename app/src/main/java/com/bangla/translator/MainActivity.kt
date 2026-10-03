package com.bangla.translator

import android.Manifest
import android.content.ComponentName
import android.content.Context
import android.content.Intent
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

class MainActivity : AppCompatActivity() {

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
        updateAccessibilityStatus()
        checkNotificationListenerStatus()
        TranslationEngine.checkModelAvailability()
        TranslationEngine.purgeInactiveModels(appPreferences.activeSourceLanguages)
        updateModelUpdateBannerUI()
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
                            Toast.makeText(this@MainActivity, "Deleted ${langMeta.name} pack (~30MB). Storage & RAM freed.", Toast.LENGTH_SHORT).show()
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
                            Toast.makeText(this@MainActivity, "Deleted ${langMeta.name} pack (~30MB). Storage & RAM freed.", Toast.LENGTH_SHORT).show()
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
            binding.spinnerSourceLanguage.setSelection(idx)
        }

        // Slot 2
        if (pairs.size > 1) {
            binding.layoutSlot2.visibility = View.VISIBLE
            val idx = allLanguages.indexOfFirst { it.code == pairs[1].sourceCode }.coerceAtLeast(0)
            binding.spinnerSlot2Language.setSelection(idx)
        } else {
            binding.layoutSlot2.visibility = View.GONE
        }

        // Slot 3
        if (pairs.size > 2) {
            binding.layoutSlot3.visibility = View.VISIBLE
            val idx = allLanguages.indexOfFirst { it.code == pairs[2].sourceCode }.coerceAtLeast(0)
            binding.spinnerSlot3Language.setSelection(idx)
        } else {
            binding.layoutSlot3.visibility = View.GONE
        }

        binding.btnAddLanguagePair.visibility = if (pairs.size < 3) View.VISIBLE else View.GONE
        binding.tvActivePairsBadge.text = "${pairs.size}/3 Active"
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

        val items = available.map { "${it.name} (${it.nativeName})" }.toTypedArray()
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Add Language Pair (Slot #${currentPairs.size + 1})")
            .setItems(items) { _, which ->
                val chosen = available[which]
                appPreferences.addLanguagePair(chosen.code, appPreferences.targetLanguageCode)
                TranslationEngine.prepareModelIfNeeded(
                    sourceLangCode = chosen.mlKitCode,
                    onSuccess = {
                        runOnUiThread {
                            refreshLanguageSlotsUI()
                            Toast.makeText(this@MainActivity, "${chosen.name} pair added & model ready!", Toast.LENGTH_SHORT).show()
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
            "${src.nativeName} → ${trg.name}"
        }
        binding.tvActivePairSummary.text = "Active Pairs (${pairs.size}/3): $summary"
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
                        Toast.makeText(this, "${src.name} model ready for offline use!", Toast.LENGTH_SHORT).show()
                    }
                },
                onFailure = { error ->
                    runOnUiThread {
                        binding.pbModelDownload.visibility = View.GONE
                        binding.btnDownloadModel.isEnabled = true
                        Toast.makeText(this, "Failed to download model: ${error.localizedMessage}", Toast.LENGTH_LONG).show()
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
                            Toast.makeText(this@MainActivity, "Update failed: ${error.localizedMessage}", Toast.LENGTH_LONG).show()
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
                text = "🚫 ${item.name} (${item.nativeName}) [${code.uppercase()}]"
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
                    Toast.makeText(this@MainActivity, "Unignored ${item.name}", Toast.LENGTH_SHORT).show()
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

        val items = available.map { "${it.name} (${it.nativeName})" }.toTypedArray()
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Add Language to Ignore List")
            .setItems(items) { _, which ->
                val chosen = available[which]
                appPreferences.addIgnoredLanguage(chosen.code)
                refreshIgnoredLanguagesUI()
                Toast.makeText(this, "Ignored ${chosen.name}. Live detection will not prompt for it.", Toast.LENGTH_SHORT).show()
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
                        binding.tvModelStatus.text = "Download Error: ${state.message}"
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
