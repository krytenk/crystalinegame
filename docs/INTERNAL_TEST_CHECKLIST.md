# Internal test → production checklist

**Build target:** Crystalline free app · Play **internal testing**  
**App version:** 1.0.2 · versionCode **4**  
**Engineering freeze for this pass:** free gifts (no Shorts), gem polish, L19 defuse test, Super Chest / Living Geode identity.

---

## Engineering done (this pass)

| # | Item | Status |
|---|------|--------|
| E1 | **300 levels** authored + map I–XXX | Done |
| E2 | **L19** line-power defuse (same-colour activation) | Done |
| E3 | **Gem polish** — multi-facet crystals + Living Geode | Done |
| E4 | **Peak fantasy** Super Chest / Living Geode (bible + FX) | Done |
| E5 | **No demo Shorts / no YouTube ads** — free-gift timer only | Done |
| E6 | **Interstitials off** (`interstitialEvery: 0`) | Done |
| E7 | **versionCode 4 / 1.0.2** + release AAB rebuild | Done when `npm run android:bundle` succeeds |
| E8 | Automated suite green | Done when `npm test` passes |

---

## Remaining 10 items (mostly human / Console)

| # | Item | Owner | Blocks internal? | Blocks production? |
|---|------|--------|------------------|---------------------|
| **1** | Upload **current** AAB to Play Console → Internal testing | You | Yes | Yes |
| **2** | Privacy policy **live HTTPS** URL in Console | You | Yes | Yes |
| **3** | Complete **App content** (ratings, Data safety, ads declaration: **no ad SDK**) | You | Yes | Yes |
| **4** | **Store listing** copy from `store/LISTING.md` | You | Partial | Yes |
| **5** | **Phone screenshots** (portrait) into Console / `store/screenshots/` | You | Partial | Yes |
| **6** | Icon 512 + feature graphic already in `store/` — confirm in listing | You | No | Yes |
| **7** | **Human smoke:** L1–30, L160/200/250/300, free gifts, shop soft currency | You | Recommended | Yes |
| **8** | Back up **upload keystore** offline | You | No | Yes (forever) |
| **9** | Decide production shop: keep soft-only wording **or** integrate Play Billing later | You | No | Soft-only OK for free |
| **10** | Closed/open test → production promote when internal is stable | You | No | Yes |

---

## How to build & install internal binary

```bash
export JAVA_HOME="$HOME/.local/jdk21"   # if needed
export ANDROID_HOME="$HOME/android-sdk"
npm run android:bundle
# → release/crystalline-release.aab   (upload this)
# → release/crystalline-release.apk   (device smoke)

adb uninstall ca.departurebaydigital.crystalline   # if debug was installed
adb install -r release/crystalline-release.apk
```

Debug sideload (unsigned for day-to-day):

```bash
npm run android:apk
adb install -r release/crystalline-debug.apk
```

---

## Play Console — ads / data honesty

- **Ads:** No ad network SDK. Free gifts are in-app timers. Declare **no ads** (or “no ads served by a network”) honestly.
- **Data safety:** Local save only; no account. Optional future network for assets only if any.
- **IAP:** Free app; soft currency shop does **not** charge real money until Billing is added.

---

## Explicitly not required for internal

- Act II levels 301–600  
- Real AdMob / IAP  
- iOS TestFlight  
- Harbor as separate listing  
- Full human play of all 300 levels (spot bosses + early game is enough for internal)
