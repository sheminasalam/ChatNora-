package com.bangla.translator.translation

import android.content.Context
import android.util.Log
import com.bangla.translator.data.ModelDownloadState
import com.bangla.translator.data.SupportedLanguages
import com.google.android.gms.tasks.Task
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.common.model.RemoteModelManager
import com.google.mlkit.nl.translate.TranslateLanguage
import com.google.mlkit.nl.translate.TranslateRemoteModel
import com.google.mlkit.nl.translate.Translation
import com.google.mlkit.nl.translate.Translator
import com.google.mlkit.nl.translate.TranslatorOptions
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONArray
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Universal Hybrid Translation Engine for WhatsApp:
 * 1. Supports 19+ languages on-device (ML Kit) and online.
 * 2. Checks in-memory cache for fast instant rendering.
 * 3. Uses conversational translation when online.
 * 4. Seamlessly falls back to local Google ML Kit On-Device model (~30MB) when offline.
 */
object TranslationEngine {

    private const val TAG = "TranslationEngine"
    private val networkExecutor = Executors.newFixedThreadPool(3)

    private var currentSourceLang: String = TranslateLanguage.BENGALI
    private var currentTargetLang: String = TranslateLanguage.ENGLISH

    // Shared single translator instance
    private var sharedTranslator: Translator? = null

    // Cache instance
    val cache = TranslationCache(maxEntries = 500)

    private val _modelState = MutableStateFlow<ModelDownloadState>(ModelDownloadState.NotDownloaded)
    val modelState: StateFlow<ModelDownloadState> = _modelState.asStateFlow()

    private val isPreparingModel = AtomicBoolean(false)
    private var prepareTask: Task<Void>? = null

    /**
     * Updates the current active language pair.
     */
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
                    getOrCreateTranslator()
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
     * Obtains or initializes the shared ML Kit Translator for the active language pair.
     */
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

    /**
     * Requests model download and preparation for the active source language.
     */
    @Synchronized
    fun prepareModelIfNeeded(
        conditions: DownloadConditions = DownloadConditions.Builder().build(),
        onSuccess: (() -> Unit)? = null,
        onFailure: ((Exception) -> Unit)? = null
    ): Task<Void> {
        val existingTask = prepareTask
        if (existingTask != null && !existingTask.isComplete) {
            return existingTask
        }

        _modelState.value = ModelDownloadState.Downloading
        isPreparingModel.set(true)

        val translator = getOrCreateTranslator()
        val downloadTask = translator.downloadModelIfNeeded(conditions)

        prepareTask = downloadTask

        downloadTask.addOnSuccessListener {
            _modelState.value = ModelDownloadState.Ready
            isPreparingModel.set(false)
            onSuccess?.invoke()
        }.addOnFailureListener { error ->
            Log.e(TAG, "Model download failed", error)
            _modelState.value = ModelDownloadState.Error(error.localizedMessage ?: "Model download failed")
            isPreparingModel.set(false)
            onFailure?.invoke(error)
        }

        return downloadTask
    }

    /**
     * Deletes the downloaded model to free storage (~30MB).
     */
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

    /**
     * Translates message text with fallback from cloud to on-device ML Kit.
     */
    fun translate(
        text: String,
        sourceCode: String = currentSourceLang,
        targetCode: String = currentTargetLang,
        onSuccess: (String) -> Unit,
        onFailure: ((Exception) -> Unit)? = null
    ) {
        val cleanText = text.trim()
        if (cleanText.isEmpty()) {
            onSuccess("")
            return
        }

        // Check memory cache
        val cached = cache.get(cleanText)
        if (cached != null) {
            onSuccess(cached)
            return
        }

        // Fast network attempt for natural conversational translation
        networkExecutor.execute {
            var translatedOnline: String? = null
            try {
                translatedOnline = fetchOnlineTranslation(cleanText, sourceCode, targetCode)
            } catch (e: Exception) {
                Log.d(TAG, "Online translation unavailable, falling back to ML Kit: ${e.message}")
            }

            if (!translatedOnline.isNullOrBlank() && translatedOnline != cleanText) {
                cache.put(cleanText, translatedOnline)
                onSuccess(translatedOnline)
                return@execute
            }

            // Fallback to local on-device ML Kit Translator
            translateOnDevice(cleanText, onSuccess, onFailure)
        }
    }

    private fun translateOnDevice(
        text: String,
        onSuccess: (String) -> Unit,
        onError: ((Exception) -> Unit)?
    ) {
        try {
            val translator = getOrCreateTranslator()
            translator.translate(text)
                .addOnSuccessListener { result ->
                    if (!result.isNullOrBlank()) {
                        cache.put(text, result)
                        onSuccess(result)
                    } else {
                        onSuccess(text)
                    }
                }
                .addOnFailureListener { error ->
                    Log.w(TAG, "On-device translation failed", error)
                    onError?.invoke(error) ?: onSuccess(text)
                }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize translator client", e)
            onError?.invoke(e) ?: onSuccess(text)
        }
    }

    private fun fetchOnlineTranslation(text: String, sourceCode: String, targetCode: String): String? {
        val encodedText = URLEncoder.encode(text, "UTF-8")
        val urlStr = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=$sourceCode&tl=$targetCode&dt=t&q=$encodedText"

        val url = URL(urlStr)
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = "GET"
        conn.connectTimeout = 3000
        conn.readTimeout = 3000
        conn.setRequestProperty("User-Agent", "Mozilla/5.0")

        if (conn.responseCode == HttpURLConnection.HTTP_OK) {
            val response = conn.inputStream.bufferedReader().use { it.readText() }
            val jsonArray = JSONArray(response)
            val sentences = jsonArray.getJSONArray(0)
            val sb = StringBuilder()
            for (i in 0 until sentences.length()) {
                val sentence = sentences.getJSONArray(i)
                sb.append(sentence.getString(0))
            }
            val result = sb.toString().trim()
            if (result.isNotEmpty()) return result
        }
        return null
    }
}
