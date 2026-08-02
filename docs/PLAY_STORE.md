# Crystalline → Google Play readiness

This is the operator checklist for first upload. Engineering hooks live in the
repo; **you** complete Play Console account, policy questionnaires, and listing
graphics that need a device capture.

## What’s already wired in the repo

| Item | Status |
|------|--------|
| Application ID | `ca.departurebaydigital.crystalline` |
| App name | Crystalline |
| Portrait lock | Yes (`AndroidManifest`) |
| Min / target / compile SDK | 24 / 36 / 36 |
| Version | `versionName 1.0.0` · `versionCode 2` |
| Launcher icons (adaptive + legacy) | Generated gem icon |
| High-res icon 512 | `store/icons/ic_launcher_512.png` |
| Feature graphic 1024×500 | `store/feature_graphic.png` |
| Release signing via properties file | `android/keystore.properties` (local) |
| Upload keystore generator | `npm run android:keystore` |
| App Bundle build | `npm run android:bundle` → `release/crystalline-release.aab` |
| Privacy policy HTML | `store/privacy/index.html` |
| Listing copy | `store/LISTING.md` |
| Debug APK (sideload) | `npm run android:apk` |

## One-time: signing key

```bash
export JAVA_HOME="$HOME/.local/jdk21"
export ANDROID_HOME="$HOME/android-sdk"

# Creates android/keystore/crystalline-upload.jks + keystore.properties
npm run android:keystore
```

**Back up** the `.jks` and passwords offline (password manager + encrypted drive).  
Default Play App Signing lets Google hold the app signing key; your upload key
can be reset with Google support, but recovery is painful — still back up.

`android/keystore/`, `*.jks`, and `keystore.properties` are **gitignored**.

If a local demo keystore was generated with a placeholder password, **rotate**
before production:

1. Delete `android/keystore/` and `android/keystore.properties`
2. Re-run `npm run android:keystore` with a strong password
3. Never commit the new files

## Build the store artifact

```bash
export JAVA_HOME="$HOME/.local/jdk21"
export ANDROID_HOME="$HOME/android-sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"

npm run android:bundle
# → release/crystalline-release.aab  (upload this)
# → release/crystalline-release.apk  (optional device smoke-test)
```

Install release APK on a device (different signature than debug — uninstall debug first):

```bash
adb uninstall ca.departurebaydigital.crystalline
adb install -r release/crystalline-release.apk
```

## Host the privacy policy

Play requires a **public HTTPS** privacy URL.

Option A — Departure Bay site:

```bash
# example path; adjust to your nginx layout
rsync -avz -e 'ssh -p 5622' store/privacy/ \
  canspace:/var/www/departurebaydigital.ca/site/privacy/crystalline/
```

Then use:

`https://departurebaydigital.ca/privacy/crystalline/`

Option B — GitHub Pages raw project path if you prefer.

Paste the final URL into Play Console → App content → Privacy policy.

## Play Console steps (human)

1. Create app **Crystalline**, package must match `ca.departurebaydigital.crystalline`
2. Free app (until real Billing exists)
3. Dashboard → **Testing** → Internal testing track → create release → upload AAB
4. Complete **App content**:
   - Privacy policy URL
   - Ads declaration (this build: limited / demo embeds — answer honestly)
   - Content ratings (IARC questionnaire)
   - Target audience
   - Data safety form (mostly “no data collected / shared”; local only + optional YouTube)
5. **Store listing**: copy from `store/LISTING.md`, upload icon + feature graphic + ≥2 screenshots
6. **Countries**, **pricing**, **app access** (all features available without login)
7. Roll out internal test → promote to closed/open/production when stable

## Policy hotspots for this product

| Topic | Guidance |
|-------|----------|
| Simulated shop | Keep “simulated · no real money” badges until Play Billing is integrated. Misleading fake checkout can fail review. |
| “Ads” | Discworld Shorts are demo creatives, not a certified ad SDK. Declare carefully; do not claim AdMob mediation you don’t have. |
| Permissions | Only `INTERNET` + `VIBRATE`. Don’t add unused permissions. |
| Kids | If you select a primarily-child audience, COPPA/Families rules tighten — current copy targets general casual. |

## Version bumps

Before every Play upload that replaces a previous artifact:

1. Increment `versionCode` (integer, always +1) in `android/app/build.gradle`
2. Optionally bump `versionName` (`1.0.1`, `1.1.0`, …)
3. Rebuild AAB

## Not done yet (next store milestones)

- [ ] Device screenshots (phone portrait) committed under `store/screenshots/`
- [ ] Privacy URL live on production domain
- [ ] Play Console listing filled + internal test live
- [ ] Real Play Billing **or** permanently demo-only shop wording approved
- [ ] Optional: Firebase Crashlytics / Play pre-launch report fixes
- [ ] Optional: remove or gate simulated IAP UI behind a build flag for stricter review

## Quick commands

| Command | Purpose |
|---------|---------|
| `npm run android:keystore` | New upload key |
| `npm run android:bundle` | Release AAB + APK |
| `npm run android:apk` | Debug APK only |
| `adb install -r release/crystalline-release.apk` | Smoke-test release build |
