# Android (Capacitor) — debug & Play release

Crystalline is a Vite web game wrapped with **[Capacitor 8](https://capacitorjs.com/)**.

For the full Play Console checklist see **[PLAY_STORE.md](./PLAY_STORE.md)**.

## Identity

| Field | Value |
|-------|--------|
| Application ID | `ca.departurebaydigital.crystalline` |
| App name | Crystalline |
| Min SDK | 24 (Android 7.0+) |
| Target / compile SDK | 36 |
| Permissions | `INTERNET`, `VIBRATE` |
| Orientation | Portrait locked |

## Environment

```bash
export JAVA_HOME="$HOME/.local/jdk21"
export ANDROID_HOME="$HOME/android-sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
```

Need JDK **21**, Android SDK **platform 36**, build-tools, platform-tools.

## Debug APK (sideload / USB)

### Crystalline (market app — do not overwrite lightly)

```bash
npm run android:apk
adb install -r release/crystalline-debug.apk
```

Package id: `ca.departurebaydigital.crystalline`  
`adb install -r` **replaces** any existing Crystalline install (same id).

### Lantern Harbor (second app — will not overwrite Crystalline)

```bash
npm run android:apk:harbor
adb install release/lanternharbor-debug.apk
```

Package id: `ca.departurebaydigital.lanternharbor`  
Different id → **second icon** on the phone. Leaves Crystalline alone.

Harbor packaging temporarily stages `harbor.html` as the WebView entry, then
restores Crystalline’s Capacitor/Android config so market builds stay safe.


## Play Store App Bundle (AAB)

### 1. Upload keystore (once)

```bash
npm run android:keystore
# → android/keystore/crystalline-upload.jks
# → android/keystore.properties   (gitignored)
```

Back up the keystore and passwords offline.

### 2. Build release

```bash
npm run android:bundle
# → release/crystalline-release.aab   ← upload to Play Console
# → release/crystalline-release.apk   ← optional smoke-test
```

Release builds are signed only when `android/keystore.properties` exists.

### 3. Version bumps

Edit `android/app/build.gradle`:

- `versionCode` — integer, must increase every Play upload  
- `versionName` — user-visible (`1.0.0`, `1.0.1`, …)

## Store assets in repo

| Asset | Path |
|-------|------|
| 512 icon | `store/icons/ic_launcher_512.png` |
| Feature graphic | `store/feature_graphic.png` |
| Listing copy | `store/LISTING.md` |
| Privacy policy | `store/privacy/index.html` |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `invalid source release: 21` | Use JDK 21 |
| Missing `keystore.properties` | `npm run android:keystore` |
| Install fails “signatures do not match” | Uninstall debug build first |
| Blank WebView | `npm run build && npx cap sync android` |
| `sdk.dir` missing | Build scripts write `android/local.properties` |
