package com.sonamoni.pathshala

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.WebViewAssetLoader
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale

/**
 * পুরো অ্যাপটা assets/www-এর HTML/JS-এ লেখা। এই Activity শুধু:
 *  - WebView-এ সেটা খোলে (ইন্টারনেট লাগে না, সব ফাইল APK-র ভেতরে)
 *  - JS-কে Android-এর TextToSpeech দেয় (বাংলা, ইংরেজি, আরবি উচ্চারণ)
 *  - Back বাটন JS-কে দেয়, যাতে আগের স্ক্রিনে ফিরে যায়
 */
class MainActivity : ComponentActivity(), TextToSpeech.OnInitListener {

    private lateinit var web: WebView
    private var tts: TextToSpeech? = null
    @Volatile private var ttsReady = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val loader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        val root = FrameLayout(this)
        root.setBackgroundColor(Color.parseColor("#FF6C4BD8"))
        web = WebView(this)
        root.addView(web, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))

        // Android 15-এ অ্যাপ পুরো স্ক্রিন জুড়ে আঁকে; স্ট্যাটাস বার/নেভিগেশন বারের জায়গা ছেড়ে দিই
        ViewCompat.setOnApplyWindowInsetsListener(root) { v, insets ->
            val b = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            v.setPadding(b.left, b.top, b.right, b.bottom)
            WindowInsetsCompat.CONSUMED
        }

        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = false
            allowContentAccess = false
            textZoom = 100
        }
        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                loader.shouldInterceptRequest(request.url)

            // অ্যাপের বাইরের কোনো লিংক খুলবে না (শিশু যেন ভুলে কোথাও চলে না যায়)
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean =
                request.url.host != "appassets.androidplatform.net"
        }
        web.addJavascriptInterface(Bridge(), "Android")
        setContentView(root)
        web.loadUrl("https://appassets.androidplatform.net/assets/www/index.html")

        tts = TextToSpeech(this, this)

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                web.evaluateJavascript("(window.appBack ? window.appBack() : false)") { r ->
                    if (r != "true") finish()
                }
            }
        })
    }

    override fun onInit(status: Int) {
        val t = tts ?: return
        if (status != TextToSpeech.SUCCESS) return
        ttsReady = true
        t.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(utteranceId: String?) {}
            override fun onDone(utteranceId: String?) = notifyJs(utteranceId)
            @Deprecated("Deprecated in Java")
            override fun onError(utteranceId: String?) = notifyJs(utteranceId)
            override fun onError(utteranceId: String?, errorCode: Int) = notifyJs(utteranceId)
        })
        runOnUiThread { web.evaluateJavascript("window.onTtsReady && window.onTtsReady()", null) }
    }

    private fun notifyJs(id: String?) {
        if (id == null || !id.endsWith("#end")) return
        val clean = JSONObject.quote(id.removeSuffix("#end"))
        runOnUiThread { web.evaluateJavascript("window.onTtsDone && window.onTtsDone($clean)", null) }
    }

    private fun localesFor(lang: String): List<Locale> = when (lang) {
        "bn" -> listOf(Locale("bn", "BD"), Locale("bn", "IN"), Locale("bn"))
        "ar" -> listOf(Locale("ar", "SA"), Locale("ar", "EG"), Locale("ar"))
        else -> listOf(Locale.US, Locale.UK, Locale.ENGLISH)
    }

    /** ভাষা বসাই; পারলে true */
    private fun setLang(lang: String): Boolean {
        val t = tts ?: return false
        for (loc in localesFor(lang)) {
            val r = t.setLanguage(loc)
            if (r >= TextToSpeech.LANG_AVAILABLE) return true
        }
        return false
    }

    override fun onPause() {
        tts?.stop()
        super.onPause()
    }

    override fun onDestroy() {
        tts?.shutdown()
        web.destroy()
        super.onDestroy()
    }

    inner class Bridge {
        /**
         * json = {"id":"x","rate":0.85,"items":[{"t":"অ","l":"bn"},{"t":"Apple","l":"en"}]}
         * সবগুলো ক্রমানুসারে বলে; শেষ হলে JS-এ onTtsDone(id) ডাকে।
         */
        @JavascriptInterface
        fun speak(json: String) {
            val t = tts ?: return
            if (!ttsReady) return
            try {
                val o = JSONObject(json)
                val id = o.optString("id", "s")
                val rate = o.optDouble("rate", 0.85).toFloat()
                val items: JSONArray = o.getJSONArray("items")
                t.setSpeechRate(rate)
                var first = true
                for (i in 0 until items.length()) {
                    val it = items.getJSONObject(i)
                    val text = it.optString("t")
                    if (text.isBlank()) continue
                    if (!setLang(it.optString("l", "bn"))) continue
                    val uid = if (i == items.length() - 1) "$id#end" else "$id#$i"
                    t.speak(text, if (first) TextToSpeech.QUEUE_FLUSH else TextToSpeech.QUEUE_ADD, null, uid)
                    first = false
                }
                if (first) notifyJs("$id#end")
            } catch (e: Exception) {
            }
        }

        @JavascriptInterface
        fun stop() {
            tts?.stop()
        }

        /** 1 = আছে, 0 = ভয়েস ডাউনলোড করা হয়নি, -1 = সমর্থিত নয়, -2 = TTS এখনো চালু হয়নি */
        @JavascriptInterface
        fun langStatus(lang: String): Int {
            val t = tts ?: return -2
            if (!ttsReady) return -2
            var best = -1
            for (loc in localesFor(lang)) {
                val r = t.isLanguageAvailable(loc)
                if (r >= TextToSpeech.LANG_AVAILABLE) return 1
                if (r == TextToSpeech.LANG_MISSING_DATA) best = 0
            }
            return best
        }

        @JavascriptInterface
        fun openTtsSettings() {
            runOnUiThread {
                val intents = listOf(
                    Intent("com.android.settings.TTS_SETTINGS"),
                    Intent(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA)
                )
                for (i in intents) {
                    try {
                        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        startActivity(i)
                        return@runOnUiThread
                    } catch (e: ActivityNotFoundException) {
                    }
                }
            }
        }

        @JavascriptInterface
        fun appVersion(): String = try {
            packageManager.getPackageInfo(packageName, 0).versionName ?: ""
        } catch (e: Exception) {
            ""
        }
    }
}
