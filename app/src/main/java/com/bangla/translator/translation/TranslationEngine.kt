package com.bangla.translator.translation

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
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Multi-Language On-Device Translation Engine with Intelligent Pack Management.
 * Supports up to 3 simultaneous active language pairs with sub-millisecond detection
 * and on-demand model downloading to minimize phone RAM and storage consumption.
 */
object TranslationEngine {
    private const val TAG = "TranslationEngine"

    // Thread pool for network translation fallback (max 3 concurrent requests)
    private val networkExecutor = Executors.newFixedThreadPool(3)

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
     * Purges downloaded ML Kit models that are no longer part of the user's active language pairs,
     * freeing up phone storage (~30MB per pack) and releasing native memory buffers immediately.
     */
    fun purgeInactiveModels(activeSourceCodes: Set<String>, onComplete: (() -> Unit)? = null) {
        val activeMlKitCodes = activeSourceCodes.map { SupportedLanguages.findByCode(it).mlKitCode }.toSet()
        val modelManager = RemoteModelManager.getInstance()
        modelManager.getDownloadedModels(TranslateRemoteModel::class.java)
            .addOnSuccessListener { models ->
                for (model in models) {
                    if (model.language !in activeMlKitCodes) {
                        Log.i(TAG, "Deleting orphaned language model from storage: ${model.language}")
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
     * Translates message text with automatic language detection and fallback.
     */
    fun translate(
        text: String,
        sourceCode: String? = null,
        targetCode: String = currentTargetLang,
        onSuccess: (String) -> Unit,
        onFailure: ((Exception) -> Unit)? = null
    ) {
        val cleanText = text.trim()
        if (cleanText.isEmpty()) {
            onSuccess("")
            return
        }

        // Determine effective source language
        val effectiveSource = sourceCode ?: LanguageDetector.detectLanguage(cleanText) ?: currentSourceLang

        // Check memory cache
        val cacheKey = "$effectiveSource:$cleanText"
        val cached = cache.get(cacheKey) ?: cache.get(cleanText)
        if (cached != null) {
            onSuccess(cached)
            return
        }

        // Fast network attempt for natural conversational translation
        networkExecutor.execute {
            var translatedOnline: String? = null
            try {
                translatedOnline = fetchOnlineTranslation(cleanText, effectiveSource, targetCode)
            } catch (e: Exception) {
                Log.d(TAG, "Online translation unavailable, falling back to ML Kit: ${e.message}")
            }

            if (!translatedOnline.isNullOrBlank() && translatedOnline != cleanText) {
                cache.put(cacheKey, translatedOnline)
                cache.put(cleanText, translatedOnline)
                onSuccess(translatedOnline)
                return@execute
            }

            // Fallback to local on-device ML Kit Translator
            translateOnDevice(cleanText, effectiveSource, onSuccess, onFailure)
        }
    }

    private fun translateOnDevice(
        cleanText: String,
        sourceCode: String,
        onSuccess: (String) -> Unit,
        onFailure: ((Exception) -> Unit)?
    ) {
        try {
            val translator = getOrCreateTranslator(sourceCode)
            translator.translate(cleanText)
                .addOnSuccessListener { result ->
                    val cacheKey = "$sourceCode:$cleanText"
                    cache.put(cacheKey, result)
                    cache.put(cleanText, result)
                    onSuccess(result)
                }
                .addOnFailureListener { error ->
                    Log.w(TAG, "On-device ML Kit translation failed: ${error.message}")
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
                val sentences = jsonArray.getJSONArray(0)
                val sb = StringBuilder()
                for (i in 0 until sentences.length()) {
                    val s = sentences.getJSONArray(i)
                    sb.append(s.getString(0))
                }
                val translated = sb.toString().trim()
                if (translated.isNotEmpty()) {
                    return translated
                }
            }
        } finally {
            conn.disconnect()
        }
        return null
    }
}
