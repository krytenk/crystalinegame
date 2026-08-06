# Mac handoff — iOS package (ignore the Linux chat)

You do **not** need the Grok session from the other machine.  
This repo **is** the handoff. Work on the Mac only for **Xcode / signing / IPA**.

**Repo:** `https://github.com/krytenk/crystalinegame.git`  
**Bundle ID:** `ca.departurebaydigital.crystalline`  
**App name:** Crystalline  
**Min iOS:** 15.0 · **Portrait**  
**Xcode project:** `ios/App/App.xcodeproj`

Longer detail: [`IOS.md`](./IOS.md) · after prepare: `release/IOS_PACKAGE.md`

---

## 1. Get the code on the 2018 MacBook

```bash
# first time
git clone https://github.com/krytenk/crystalinegame.git
cd crystalinegame
git checkout master   # or: git pull origin master if clone defaulted to main

# every later sync from the Linux machine
git pull
```

If `git pull` complains about `main` vs `master`, use whatever branch the push used:

```bash
git branch -a
git checkout master
git pull origin master
```

**Node:** install a current LTS (18+ or 20+) via [nodejs.org](https://nodejs.org) or `brew install node`.  
**Xcode:** from the Mac App Store (large download). Open once, accept license, install components.  
**CocoaPods / SPM:** Capacitor 8 uses Swift packages under `ios/App`; first Xcode open resolves packages.

---

## 2. Prepare web → native (every time web/game changes)

```bash
cd /path/to/crystalinegame
npm install
npm run ios:prepare    # Vite build + cap sync ios + refresh release/IOS_PACKAGE.md
# or: npm run ios:sync
npm run ios:open       # opens Xcode
```

If `ios:open` fails:

```bash
open ios/App/App.xcodeproj
```

---

## 3. In Xcode (the only Mac-only steps)

1. Select target **App** → **Signing & Capabilities**  
2. **Team** = your Apple ID / Developer team  
3. Keep bundle id **`ca.departurebaydigital.crystalline`**  
4. Pick a **Simulator** or plugged-in **iPhone** → ▶ Run (smoke test)  
5. **Product → Archive** → **Distribute App**  
   - TestFlight / App Store Connect, or  
   - Ad Hoc / Development for local devices  

### Optional CLI archive (after signing works in the GUI once)

```bash
cd ios/App
xcodebuild -scheme App -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath ../../release/Crystalline.xcarchive archive
```

Export needs an export options plist + profiles — see `release/IOS_PACKAGE.md`.

---

## 4. Smoke checklist on device / simulator

- [ ] App launches, title → map → a level plays  
- [ ] Portrait only  
- [ ] Audio / mute path works  
- [ ] Haptics on a real iPhone (optional)  
- [ ] Ice crust levels show ice shells (not blank pads)  
- [ ] Map can reach high level numbers (catalogue is **1–300**)  
- [ ] Privacy policy URL reachable:  
      https://departurebaydigital.ca/privacy/crystalline/

Store / TestFlight still need: Apple Developer Program, App Store Connect app record, screenshots, privacy questionnaire.

---

## 5. Two-machine workflow (don’t fight yourself)

| Machine | Do this | Don’t do this |
|---------|---------|----------------|
| **Linux / main PC** | Levels, engine, art, Android, Grok sessions, `git commit` + `git push` | Expect an IPA |
| **2018 MacBook** | `git pull` → `ios:prepare` → Xcode sign/archive | Large level redesign without push/pull first |

**Rule:** one person edits the game on one side, then push/pull.  
If you fix **native** iOS files on the Mac (`Info.plist`, signing notes, icons), commit on the Mac and push so Linux stays current:

```bash
git add ios docs/IOS.md
git commit -m "iOS: signing / project fix from Mac"
git push origin master
```

---

## 6. If GitHub is empty / behind

On the **Linux** machine (where development happened), after a clean commit:

```bash
git push -u origin master
# if remote default is main:
# git push -u origin master:main
```

Then on the Mac, `git pull` again.  
Do **not** re-scaffold `ios/` from scratch unless the folder is missing — the repo already has Capacitor iOS.

---

## 7. What you can ignore on the Mac

- This chat / any Grok session history  
- Android APK/AAB paths (`release/*.apk`, Play Console)  
- Act II planning docs beyond curiosity (`docs/CAMPAIGN_ARC.md` is for later)  
- Harbor dual APK scripts unless you are packaging Harbor separately  

**Identity / story anchors** (if you open a *new* AI session on the Mac):  
`docs/CAMPAIGN_ARC.md` (signature pillars + ice escalation) · `docs/STUDIO_FOCUS.md` · `docs/SHIP_TEST.md`

---

## 8. First-hour failure cheat sheet

| Symptom | Likely fix |
|---------|------------|
| `npm: command not found` | Install Node LTS |
| `xcode-select` / license errors | Open Xcode once; `sudo xcodebuild -license accept` |
| Signing red errors | Log into Xcode → Settings → Accounts; pick Team; unique bundle id if ID already taken on another team |
| Blank white WebView | Re-run `npm run ios:prepare` so `public` is synced into the app |
| Old game content | `git pull` then `ios:prepare` again |
| Disk full | Xcode + DerivedData are huge; free 20–40+ GB |
| Intel 2018 too old for latest Xcode | Install newest **macOS the 2018 MBP supports**, then newest **Xcode that supports that macOS**; min iOS 15 is usually fine on older toolchains |

---

## 9. Done when

You can **Run** on a simulator and (with a paid team) **Archive → TestFlight**.  
Ship content and balance stay on the other machine; the Mac is the **printer** for Apple’s store.
