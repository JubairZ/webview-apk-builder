import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useBuilder } from "@/context/BuilderContext";
import { SectionCard } from "@/components/SectionCard";
import { InputRow } from "@/components/InputRow";
import {
  createRepo,
  deleteRepo,
  getArtifacts,
  getLatestWorkflowRun,
  pushFiles,
  repoExists,
  sanitizeRepoName,
  type Artifact,
} from "@/services/github";

type BuildPhase =
  | "idle"
  | "creating_repo"
  | "pushing_files"
  | "queued"
  | "in_progress"
  | "success"
  | "failed";

interface BuildLog {
  time: string;
  message: string;
  type: "info" | "success" | "error";
}

function buildAndroidFiles(config: ReturnType<typeof useBuilder>["config"]) {
  const perms: string[] = [];
  if (config.permissions.internet)
    perms.push('<uses-permission android:name="android.permission.INTERNET"/>');
  if (config.permissions.camera) {
    perms.push('<uses-permission android:name="android.permission.CAMERA"/>');
    perms.push(
      '<uses-feature android:name="android.hardware.camera" android:required="false"/>'
    );
  }
  if (config.permissions.location) {
    perms.push(
      '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>'
    );
    perms.push(
      '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>'
    );
  }
  if (config.permissions.microphone) {
    perms.push(
      '<uses-permission android:name="android.permission.RECORD_AUDIO"/>'
    );
  }
  if (config.permissions.storage) {
    perms.push(
      '<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>'
    );
    perms.push(
      '<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>'
    );
  }
  if (config.permissions.vibration) {
    perms.push('<uses-permission android:name="android.permission.VIBRATE"/>');
  }

  const configJson = JSON.stringify({
    url: config.url,
    appName: config.appName,
    packageId: config.packageId,
    primaryColor: config.primaryColor,
    splashColor: config.splashColor,
    enableJavaScript: config.enableJavaScript,
    enableDomStorage: config.enableDomStorage,
    allowZoom: config.allowZoom,
    showLoadingBar: config.showLoadingBar,
    fullScreen: config.fullScreen,
    hideStatusBar: config.hideStatusBar,
    cacheMode: config.cacheMode,
    userAgent: config.userAgent,
    orientation: config.orientation,
  });

  return {
    ".github/workflows/build.yml": `name: Build WebView APK

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Read config
        run: |
          echo "APP_NAME=$(jq -r '.appName' config.json)" >> $GITHUB_ENV
          echo "PACKAGE_ID=$(jq -r '.packageId' config.json)" >> $GITHUB_ENV
          echo "VERSION_NAME=$(jq -r '.versionName' config.json)" >> $GITHUB_ENV
          echo "VERSION_CODE=$(jq -r '.versionCode' config.json)" >> $GITHUB_ENV

      - name: Apply config to Android project
        run: |
          sed -i "s/APP_NAME_PLACEHOLDER/$APP_NAME/g" app/src/main/res/values/strings.xml
          SAFE_PKG=$(echo "$PACKAGE_ID" | sed 's/\\./\\./g')
          sed -i "s/com\\.webviewapp/$SAFE_PKG/g" app/build.gradle
          sed -i "s/com\\.webviewapp/$SAFE_PKG/g" app/src/main/AndroidManifest.xml
          sed -i "s|package com\\.webviewapp|package $PACKAGE_ID|g" app/src/main/java/com/webviewapp/MainActivity.kt
          sed -i "s/VERSION_NAME_PLACEHOLDER/$VERSION_NAME/g" app/build.gradle
          sed -i "s/VERSION_CODE_PLACEHOLDER/$VERSION_CODE/g" app/build.gradle
          cp config.json app/src/main/assets/config.json

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Install Gradle 8.4
        run: |
          wget -q https://services.gradle.org/distributions/gradle-8.4-bin.zip -P /tmp
          unzip -q /tmp/gradle-8.4-bin.zip -d /opt/gradle-dist
          echo "/opt/gradle-dist/gradle-8.4/bin" >> $GITHUB_PATH

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Accept licenses
        run: yes | sdkmanager --licenses || true

      - name: Build debug APK
        run: gradle assembleDebug --no-daemon -p app

      - name: Rename APK
        run: |
          mv app/build/outputs/apk/debug/app-debug.apk app/build/outputs/apk/debug/$APP_NAME.apk

      - name: Upload APK artifact
        uses: actions/upload-artifact@v4
        with:
          name: ${"$"}{{ env.APP_NAME }}-apk
          path: app/build/outputs/apk/debug/${"$"}{{ env.APP_NAME }}.apk
          retention-days: 30
`,

    "config.json": JSON.stringify(
      {
        url: config.url,
        appName: config.appName,
        packageId: config.packageId,
        versionName: config.versionName,
        versionCode: config.versionCode,
        primaryColor: config.primaryColor,
        splashColor: config.splashColor,
        enableJavaScript: config.enableJavaScript,
        enableDomStorage: config.enableDomStorage,
        allowZoom: config.allowZoom,
        showLoadingBar: config.showLoadingBar,
        fullScreen: config.fullScreen,
        hideStatusBar: config.hideStatusBar,
        cacheMode: config.cacheMode,
        userAgent: config.userAgent,
        orientation: config.orientation,
      },
      null,
      2
    ),

    "app/build.gradle": `plugins {
    id 'com.android.application'
    id 'org.jetbrains.kotlin.android'
}

android {
    namespace 'com.webviewapp'
    compileSdk 34

    defaultConfig {
        applicationId "com.webviewapp"
        minSdk 21
        targetSdk 34
        versionCode VERSION_CODE_PLACEHOLDER
        versionName "VERSION_NAME_PLACEHOLDER"
    }

    buildTypes {
        debug {
            debuggable true
        }
        release {
            minifyEnabled false
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = '17'
    }

    sourceSets {
        main {
            assets.srcDirs = ['src/main/assets']
        }
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'androidx.webkit:webkit:1.8.0'
    implementation 'org.jetbrains.kotlin:kotlin-stdlib:1.9.0'
}
`,

    "build.gradle": `buildscript {
    ext.kotlin_version = '1.9.0'
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.1.4'
        classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlin_version"
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}
`,

    "settings.gradle": `rootProject.name = "APP_NAME_PLACEHOLDER"
include ':app'
`,

    "gradle.properties": `android.useAndroidX=true
android.enableJetifier=true
org.gradle.jvmargs=-Xmx2048m
`,

    "app/src/main/AndroidManifest.xml": `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.webviewapp">

    ${perms.join("\n    ")}

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
    </application>
</manifest>
`,

    "app/src/main/java/com/webviewapp/MainActivity.kt": `package com.webviewapp

import android.annotation.SuppressLint
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.view.Window
import android.view.WindowManager
import android.webkit.*
import android.widget.ProgressBar
import androidx.appcompat.app.AppCompatActivity
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private var progressBar: ProgressBar? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val config = loadConfig()

        // Full screen / hide status bar
        if (config.optBoolean("hideStatusBar", false)) {
            window.setFlags(
                WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN
            )
        }
        if (config.optBoolean("fullScreen", false)) {
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_FULLSCREEN or
                View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            )
        }

        // Set splash/background color
        val splashColor = try {
            Color.parseColor(config.optString("splashColor", "#6366f1"))
        } catch (e: Exception) { Color.parseColor("#6366f1") }
        window.decorView.setBackgroundColor(splashColor)

        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webview)
        progressBar = if (config.optBoolean("showLoadingBar", true)) {
            findViewById(R.id.progress_bar)
        } else {
            findViewById<ProgressBar>(R.id.progress_bar)?.visibility = View.GONE
            null
        }

        // Primary color for progress bar
        val primaryColor = try {
            Color.parseColor(config.optString("primaryColor", "#6366f1"))
        } catch (e: Exception) { Color.parseColor("#6366f1") }
        progressBar?.let {
            it.progressTintList = android.content.res.ColorStateList.valueOf(primaryColor)
        }

        val settings = webView.settings
        settings.javaScriptEnabled = config.optBoolean("enableJavaScript", true)
        settings.domStorageEnabled = config.optBoolean("enableDomStorage", true)
        settings.loadWithOverviewMode = true
        settings.useWideViewPort = true
        settings.builtInZoomControls = config.optBoolean("allowZoom", false)
        settings.displayZoomControls = false
        settings.setSupportZoom(config.optBoolean("allowZoom", false))
        settings.allowFileAccess = true
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW

        val ua = config.optString("userAgent", "")
        if (ua.isNotEmpty()) settings.userAgentString = ua

        if (config.optString("cacheMode") == "no-cache") {
            settings.cacheMode = WebSettings.LOAD_NO_CACHE
        }

        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                progressBar?.visibility = View.VISIBLE
            }
            override fun onPageFinished(view: WebView?, url: String?) {
                progressBar?.visibility = View.GONE
                window.decorView.setBackgroundColor(Color.WHITE)
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                progressBar?.progress = newProgress
            }
            override fun onPermissionRequest(request: PermissionRequest?) {
                request?.grant(request.resources)
            }
        }

        webView.loadUrl(config.optString("url", "https://example.com"))
    }

    private fun loadConfig(): JSONObject {
        return try {
            val inputStream = assets.open("config.json")
            val reader = BufferedReader(InputStreamReader(inputStream))
            val json = reader.readText()
            reader.close()
            JSONObject(json)
        } catch (e: Exception) {
            JSONObject()
        }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack()
        else super.onBackPressed()
    }
}
`,

    "app/src/main/res/layout/activity_main.xml": `<?xml version="1.0" encoding="utf-8"?>
<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent">

    <WebView
        android:id="@+id/webview"
        android:layout_width="match_parent"
        android:layout_height="match_parent"/>

    <ProgressBar
        android:id="@+id/progress_bar"
        style="?android:attr/progressBarStyleHorizontal"
        android:layout_width="match_parent"
        android:layout_height="4dp"
        android:max="100"
        android:visibility="gone"/>
</RelativeLayout>
`,

    "app/src/main/res/values/strings.xml": `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">APP_NAME_PLACEHOLDER</string>
</resources>
`,

    "app/src/main/res/values/colors.xml": `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="primary">${config.primaryColor}</color>
    <color name="splash_background">${config.splashColor}</color>
    <color name="white">#FFFFFF</color>
    <color name="black">#000000</color>
</resources>
`,

    "app/src/main/res/values/themes.xml": `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.Light.NoActionBar">
        <item name="colorPrimary">@color/primary</item>
        <item name="android:windowBackground">@color/splash_background</item>
    </style>
</resources>
`,

    "app/src/main/assets/config.json": configJson,

    "app/src/main/res/mipmap-hdpi/ic_launcher.xml": `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/primary"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>
`,

    "app/src/main/res/mipmap-hdpi/ic_launcher_round.xml": `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/primary"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>
`,

    "app/src/main/res/drawable/ic_launcher_foreground.xml": `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M54,28C39.64,28 28,39.64 28,54C28,68.36 39.64,80 54,80C68.36,80 80,68.36 80,54C80,39.64 68.36,28 54,28ZM54,72C44.06,72 36,63.94 36,54C36,44.06 44.06,36 54,36C63.94,36 72,44.06 72,54C72,63.94 63.94,72 54,72Z"/>
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M50,44L58,44L58,52L66,52L66,60L58,60L58,68L50,68L50,60L42,60L42,52L50,52Z"/>
</vector>
`,

    "README.md": `# WebView APK Template

This repository was generated by **WebView APK Builder**.

## Configuration

App settings are stored in \`config.json\`. The GitHub Actions workflow automatically builds the APK when you push changes.

## Build

Push to the \`main\` branch to trigger an automatic APK build. Download the APK from the **Actions** tab > **Artifacts**.

## Settings

| Key | Value |
|-----|-------|
| URL | ${config.url} |
| App Name | ${config.appName} |
| Package ID | ${config.packageId} |
`,
  };
}

function PhaseStep({
  label,
  phase,
  current,
  done,
  colors,
}: {
  label: string;
  phase: string;
  current: BuildPhase;
  done: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  const isActive = current === phase;
  const color = done
    ? colors.success
    : isActive
    ? colors.primary
    : colors.mutedForeground;

  return (
    <View style={styles.phaseStep}>
      <View
        style={[
          styles.phaseCircle,
          {
            backgroundColor: done
              ? colors.success + "20"
              : isActive
              ? colors.primary + "20"
              : colors.secondary,
            borderColor: color,
          },
        ]}
      >
        {done ? (
          <Feather name="check" size={12} color={colors.success} />
        ) : isActive ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <View
            style={[styles.phaseDot, { backgroundColor: colors.mutedForeground }]}
          />
        )}
      </View>
      <Text style={[styles.phaseLabel, { color }]}>{label}</Text>
    </View>
  );
}

export default function BuildScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { config, updateConfig } = useBuilder();
  const [phase, setPhase] = useState<BuildPhase>("idle");
  const [logs, setLogs] = useState<BuildLog[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [buttonScale] = useState(new Animated.Value(1));
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = (Platform.OS === "web" ? 34 : insets.bottom) + 100;

  const isReady =
    config.url.trim().length > 0 &&
    config.appName.trim().length > 0;

  const addLog = useCallback(
    (message: string, type: BuildLog["type"] = "info") => {
      const time = new Date().toLocaleTimeString();
      setLogs((prev) => [...prev, { time, message, type }]);
    },
    []
  );

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (owner: string, repo: string, token: string) => {
      stopPoll();
      pollRef.current = setInterval(async () => {
        try {
          const run = await getLatestWorkflowRun(token, owner, repo);
          if (!run) return;

          if (run.status === "completed") {
            stopPoll();
            if (run.conclusion === "success") {
              const arts = await getArtifacts(token, owner, repo, run.id);
              setArtifacts(arts);
              setPhase("success");
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              addLog("✅ Build succeeded! APK is ready.", "success");
            } else {
              setPhase("failed");
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              addLog(`❌ Build failed (${run.conclusion})`, "error");
            }
          } else if (run.status === "in_progress") {
            setPhase("in_progress");
          } else {
            setPhase("queued");
          }
        } catch {
          // ignore transient errors
        }
      }, 8000);
    },
    [stopPoll, addLog]
  );

  const handleBuild = useCallback(async () => {
    if (!isReady) return;

    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(buttonScale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();

    setLogs([]);
    setArtifacts([]);
    setShowLogs(true);

    const { githubToken: token, githubOwner: owner } = config;
    const repoName = sanitizeRepoName(config.appName) + "-apk";

    try {
      // Step 1: Create repo
      setPhase("creating_repo");
      addLog(`Creating repository: ${owner}/${repoName}...`);

      const exists = await repoExists(token, owner, repoName);
      if (exists) {
        addLog("Repository exists, deleting and recreating...");
        await deleteRepo(token, owner, repoName);
        await new Promise((r) => setTimeout(r, 2000));
      }

      await createRepo(token, repoName);
      updateConfig({ lastBuiltRepo: `${owner}/${repoName}` });
      addLog(`✓ Repository created: github.com/${owner}/${repoName}`, "success");

      // Step 2: Push files
      setPhase("pushing_files");
      addLog("Generating Android project files...");

      const fileMap = buildAndroidFiles(config);
      const files = Object.entries(fileMap).map(([path, content]) => ({
        path,
        content,
      }));

      await pushFiles(token, owner, repoName, files, `Build: ${config.appName} v${config.versionName}`);
      addLog(`✓ Pushed ${files.length} files to repository`, "success");

      // Step 3: Wait for workflow
      setPhase("queued");
      addLog("GitHub Actions workflow triggered. Building APK...");
      addLog("⏱ This usually takes 4–8 minutes...");

      await new Promise((r) => setTimeout(r, 5000));
      startPolling(owner, repoName, token);
    } catch (e) {
      setPhase("failed");
      addLog(`Error: ${(e as Error).message}`, "error");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [isReady, config, addLog, startPolling, updateConfig, buttonScale]);

  useEffect(() => () => stopPoll(), [stopPoll]);

  const phasesDone = (p: BuildPhase) => {
    const order: BuildPhase[] = [
      "idle",
      "creating_repo",
      "pushing_files",
      "queued",
      "in_progress",
      "success",
    ];
    const cur = order.indexOf(phase);
    const target = order.indexOf(p);
    return cur > target;
  };

  const isBuilding = ["creating_repo", "pushing_files", "queued", "in_progress"].includes(phase);

  return (
    <>
      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: config.primaryColor }]}>
            <Feather name="package" size={20} color="#fff" />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              Build APK
            </Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              Generate your Android WebView app
            </Text>
          </View>
        </View>

        {/* Readiness checks */}
        <SectionCard title="Build Checklist">
          {[
            {
              key: "url",
              label: "Website URL",
              ok: config.url.trim().length > 0,
              hint: config.url || "Not set — go to Configure tab",
            },
            {
              key: "name",
              label: "App Name",
              ok: config.appName.trim().length > 0,
              hint: config.appName,
            },
            {
              key: "pkg",
              label: "Package ID",
              ok: /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(config.packageId),
              hint: config.packageId,
            },
          ].map(({ key, label, ok, hint }) => (
            <View
              key={key}
              style={[styles.checkRow, { borderBottomColor: colors.border }]}
            >
              <Feather
                name={ok ? "check-circle" : "alert-circle"}
                size={16}
                color={ok ? colors.success : colors.warning}
              />
              <View style={styles.checkText}>
                <Text style={[styles.checkLabel, { color: colors.foreground }]}>
                  {label}
                </Text>
                <Text
                  style={[styles.checkHint, { color: colors.mutedForeground }]}
                  numberOfLines={1}
                >
                  {hint}
                </Text>
              </View>
            </View>
          ))}
        </SectionCard>

        {/* Version */}
        <SectionCard title="Version">
          <InputRow
            label="Version Name"
            value={config.versionName}
            onChangeText={(v) => updateConfig({ versionName: v })}
            placeholder="1.0.0"
            hint="Displayed to users"
          />
          <InputRow
            label="Version Code"
            value={String(config.versionCode)}
            onChangeText={(v) => {
              const n = parseInt(v, 10);
              if (!isNaN(n)) updateConfig({ versionCode: n });
            }}
            keyboardType="numeric"
            placeholder="1"
            hint="Must increase with each update"
            last
          />
        </SectionCard>

        {/* Build Progress */}
        {phase !== "idle" && (
          <SectionCard title="Build Progress">
            <View style={styles.phases}>
              {[
                { phase: "creating_repo", label: "Create Repo" },
                { phase: "pushing_files", label: "Push Files" },
                { phase: "queued", label: "Queued" },
                { phase: "in_progress", label: "Building" },
                { phase: "success", label: "Done" },
              ].map(({ phase: p, label }) => (
                <PhaseStep
                  key={p}
                  label={label}
                  phase={p}
                  current={phase}
                  done={phasesDone(p as BuildPhase)}
                  colors={colors}
                />
              ))}
            </View>

            {phase === "success" && artifacts.length > 0 && (
              <View style={styles.artifactsSection}>
                <Text style={[styles.artifactsTitle, { color: colors.foreground }]}>
                  📦 APK Ready for Download
                </Text>
                {artifacts.map((art) => (
                  <TouchableOpacity
                    key={art.id}
                    onPress={() => Linking.openURL(art.archive_download_url)}
                    style={[styles.artifactBtn, { backgroundColor: colors.success + "18", borderColor: colors.success + "40" }]}
                    activeOpacity={0.8}
                  >
                    <Feather name="download" size={16} color={colors.success} />
                    <Text style={[styles.artifactName, { color: colors.success }]}>
                      {art.name}.zip ({(art.size_in_bytes / 1024 / 1024).toFixed(1)} MB)
                    </Text>
                  </TouchableOpacity>
                ))}
                {config.lastBuiltRepo && (
                  <TouchableOpacity
                    onPress={() =>
                      Linking.openURL(
                        `https://github.com/${config.lastBuiltRepo}/actions`
                      )
                    }
                    style={styles.actionsLink}
                  >
                    <Feather name="external-link" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.actionsLinkText, { color: colors.mutedForeground }]}>
                      View on GitHub Actions
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {phase === "failed" && (
              <View style={[styles.failedBanner, { backgroundColor: colors.destructive + "18" }]}>
                <Feather name="alert-triangle" size={16} color={colors.destructive} />
                <Text style={[styles.failedText, { color: colors.destructive }]}>
                  Build failed. Check GitHub Actions for details.
                </Text>
                {config.lastBuiltRepo && (
                  <TouchableOpacity
                    onPress={() =>
                      Linking.openURL(
                        `https://github.com/${config.lastBuiltRepo}/actions`
                      )
                    }
                  >
                    <Text style={[styles.failedLink, { color: colors.primary }]}>
                      View Logs →
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Build Logs */}
            <TouchableOpacity
              style={[styles.logsToggle, { borderTopColor: colors.border }]}
              onPress={() => setShowLogs((s) => !s)}
              activeOpacity={0.7}
            >
              <Text style={[styles.logsToggleText, { color: colors.mutedForeground }]}>
                {showLogs ? "Hide" : "Show"} build logs ({logs.length})
              </Text>
              <Feather
                name={showLogs ? "chevron-up" : "chevron-down"}
                size={14}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>

            {showLogs && (
              <ScrollView
                style={[styles.logsBox, { backgroundColor: colors.secondary }]}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                {logs.map((log, i) => (
                  <View key={i} style={styles.logLine}>
                    <Text style={[styles.logTime, { color: colors.mutedForeground }]}>
                      {log.time}
                    </Text>
                    <Text
                      style={[
                        styles.logMsg,
                        {
                          color:
                            log.type === "success"
                              ? colors.success
                              : log.type === "error"
                              ? colors.destructive
                              : colors.foreground,
                        },
                      ]}
                    >
                      {log.message}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </SectionCard>
        )}

        {/* Build Button */}
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            onPress={handleBuild}
            disabled={isBuilding || !isReady}
            activeOpacity={0.85}
            style={[
              styles.buildBtn,
              {
                backgroundColor:
                  isBuilding
                    ? colors.muted
                    : isReady
                    ? config.primaryColor
                    : colors.secondary,
              },
            ]}
          >
            {isBuilding ? (
              <View style={styles.btnRow}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={[styles.btnText, { color: "#fff" }]}>Building…</Text>
              </View>
            ) : (
              <View style={styles.btnRow}>
                <Feather
                  name="zap"
                  size={20}
                  color={isReady ? "#fff" : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.btnText,
                    { color: isReady ? "#fff" : colors.mutedForeground },
                  ]}
                >
                  {phase === "success" ? "Rebuild APK" : "Build APK"}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {!isReady && (
          <Text style={[styles.notReadyHint, { color: colors.mutedForeground }]}>
            ⚠ Website URL and App Name are required
          </Text>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkText: { flex: 1 },
  checkLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  checkHint: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  phases: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 16,
    paddingBottom: 8,
  },
  phaseStep: { alignItems: "center", gap: 6, flex: 1 },
  phaseCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  phaseDot: { width: 6, height: 6, borderRadius: 3 },
  phaseLabel: { fontSize: 9, fontFamily: "Inter_500Medium", textAlign: "center" },
  artifactsSection: { padding: 16, gap: 10 },
  artifactsTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  artifactBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  artifactName: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  actionsLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  actionsLinkText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  failedBanner: {
    margin: 12,
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  failedText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  failedLink: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  logsToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  logsToggleText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  logsBox: {
    maxHeight: 180,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 8,
    padding: 10,
  },
  logLine: { flexDirection: "row", gap: 8, marginBottom: 4 },
  logTime: { fontSize: 10, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", opacity: 0.7, marginTop: 1 },
  logMsg: { fontSize: 11, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", flex: 1 },
  buildBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  btnRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  btnText: { fontSize: 17, fontFamily: "Inter_700Bold" },
  notReadyHint: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 8 },
});
