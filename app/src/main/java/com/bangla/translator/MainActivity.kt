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
    }

    private fun setupLanguageSpinners() {
        val sourceAdapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, SupportedLanguages.ALL)
        binding.spinnerSourceLanguage.adapter = sourceAdapter

        val targetAdapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, SupportedLanguages.TARGET_LANGUAGES)
        binding.spinnerTargetLanguage.adapter = targetAdapter

        val initialSourceIndex = SupportedLanguages.ALL.indexOfFirst { it.code == appPreferences.sourceLanguageCode }.coerceAtLeast(0)
        binding.spinnerSourceLanguage.setSelection(initialSourceIndex)

        val initialTargetIndex = SupportedLanguages.TARGET_LANGUAGES.indexOfFirst { it.code == appPreferences.targetLanguageCode }.coerceAtLeast(0)
        binding.spinnerTargetLanguage.setSelection(initialTargetIndex)

        binding.spinnerSourceLanguage.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                val selected = SupportedLanguages.ALL[position]
                if (selected.code != appPreferences.sourceLanguageCode) {
                    appPreferences.sourceLanguageCode = selected.code
                    TranslationEngine.setLanguagePair(selected.code, appPreferences.targetLanguageCode)
                    updateLanguagePairSummary()
                }
            }
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }

        binding.spinnerTargetLanguage.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                val selected = SupportedLanguages.TARGET_LANGUAGES[position]
                if (selected.code != appPreferences.targetLanguageCode) {
                    appPreferences.targetLanguageCode = selected.code
                    TranslationEngine.setLanguagePair(appPreferences.sourceLanguageCode, selected.code)
                    updateLanguagePairSummary()
                }
            }
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }

        updateLanguagePairSummary()
    }

    private fun updateLanguagePairSummary() {
        binding.tvActivePairSummary.text = "Active Pair: ${appPreferences.languagePairLabel}"
        val src = SupportedLanguages.findByCode(appPreferences.sourceLanguageCode)
        binding.tvModelDescription.text = "Downloads ~30MB Google ML Kit on-device model for ${src.name} offline translations."
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
