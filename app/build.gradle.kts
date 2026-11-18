plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.sonamoni.pathshala"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.sonamoni.pathshala"
        minSdk = 26
        targetSdk = 35
        // প্রতি রিলিজে versionCode অবশ্যই বাড়াতে হবে, নইলে আপডেট ইনস্টল হবে না
        versionCode = 2
        versionName = "1.1.0"
    }

    // স্থায়ী চাবি: CI-তে GitHub Secret থেকে আসে (আদেশ-নিষেধের আয়াত অ্যাপের একই চাবি)।
    // একই চাবি থাকলে নতুন APK আগেরটার ওপর সরাসরি ইনস্টল হয়, বাবুর অগ্রগতি মুছে যায় না।
    val releaseKeystore = System.getenv("KEYSTORE_FILE")
    signingConfigs {
        if (releaseKeystore != null) {
            create("release") {
                storeFile = file(releaseKeystore)
                storePassword = System.getenv("KEYSTORE_PASSWORD")
                keyAlias = System.getenv("KEY_ALIAS")?.takeIf { it.isNotBlank() } ?: "adesh"
                keyPassword = System.getenv("KEYSTORE_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = if (releaseKeystore != null) signingConfigs.getByName("release")
            else signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    androidResources {
        // অডিও আর ফন্ট যেন আগে থেকে সংকুচিত না হয়
        noCompress += listOf("mp3", "ttf")
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.webkit:webkit:1.12.1")
}
