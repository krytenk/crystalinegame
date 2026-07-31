# Android APK (Capacitor)

Crystalline is a Vite web game wrapped for Android with **[Capacitor](https://capacitorjs.com/)**.

## Pre-built debug APK

After a successful build:

```text
release/crystalline-debug.apk
```

Install on a device (USB debugging on):

```bash
adb install -r release/crystalline-debug.apk
```

Or copy the APK to the phone and open it (allow “install from unknown sources” if prompted).

**Note:** This is a **debug-signed** APK for demos / sideloading — not a Play Store release. For store publishing you need a release keystore (`assembleRelease`).

## Build yourself

### Prerequisites

| Tool | Notes |
|------|--------|
| **Node 18+** | Already used for the web game |
| **JDK 21** | Capacitor 8 / modern AGP require Java 21 |
| **Android SDK** | Platform **36**, build-tools, platform-tools |

Example portable layout used on this machine:

```bash
export JAVA_HOME="$HOME/.local/jdk21"
export ANDROID_HOME="$HOME/android-sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
```

### One-shot

```bash
npm install
npm run android:apk
```

That runs: Vite build → `cap sync android` → Gradle `assembleDebug` → copies APK to `release/`.

### Step by step

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

Open in Android Studio:

```bash
npm run android:open
```

## App identity

| Field | Value |
|-------|--------|
| Application ID | `ca.departurebaydigital.crystalline` |
| App name | Crystalline |
| Min SDK | 24 (Android 7.0+) |
| Permissions | `INTERNET` (YouTube Shorts ad placeholders), `VIBRATE` (haptics) |

## What works offline

- Core match-3, cavern, album, economy (all local)  
- **Needs network** only for Discworld Shorts embeds in the simulated ad UI  

## Play Store / release signing

1. Generate a keystore (keep it private).  
2. Configure `android/app` signing in `build.gradle` or via Android Studio.  
3. `./gradlew assembleRelease` (or App Bundle: `bundleRelease`).  

Not set up in this repo by default (demo / portfolio build).

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `invalid source release: 21` | Use JDK **21**, not 17 |
| AAR metadata wants compileSdk 36 | Install `platforms;android-36` via `sdkmanager` |
| `sdk.dir` missing | Write `android/local.properties` → `sdk.dir=/path/to/sdk` |
| Blank WebView | Re-run `npm run build && npx cap sync android` |
