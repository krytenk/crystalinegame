# iOS (Capacitor) — Xcode project & App Store

Crystalline is a Vite web game wrapped with **[Capacitor 8](https://capacitorjs.com/)**.  
Android ships as APK/AAB from Linux; **iOS requires a Mac (or Mac CI) for the final IPA**.

## Identity

| Field | Value |
|-------|--------|
| Bundle ID | `ca.departurebaydigital.crystalline` |
| App name | Crystalline |
| Min iOS | 15.0 |
| Orientation | Portrait |
| Privacy policy | https://departurebaydigital.ca/privacy/crystalline/ |

## What’s in the repo

```
ios/
  App/
    App.xcodeproj     ← open this in Xcode
    App/              ← Info.plist, assets, web public/
    CapApp-SPM/       ← Capacitor Swift packages
```

Native plugins already wired:

- `@capacitor/app`
- `@capacitor/haptics`
- `@capacitor/splash-screen`

## Prepare (any OS)

```bash
npm install
npm run ios:prepare   # build web + cap sync ios + write release/IOS_PACKAGE.md
```

Or:

```bash
npm run ios:sync
```

## Build IPA (macOS only)

```bash
npm run ios:open
```

Then in Xcode:

1. **Signing & Capabilities** → your Team  
2. Keep bundle id `ca.departurebaydigital.crystalline`  
3. Run on Simulator / device to smoke-test  
4. **Product → Archive** → Distribute (TestFlight / App Store / Ad Hoc)

### Optional CLI archive

See `release/IOS_PACKAGE.md` after `npm run ios:prepare`.

## Linux note

`npx cap add ios` and `cap sync ios` work on Linux and keep the Xcode project up to date.  
**Signing, archiving, and IPA export do not** — use a Mac or CI (Codemagic, GitHub Actions `macos-latest`, etc.).

## App icons

Capacitor ships a default `AppIcon.appiconset`.  
`ios:prepare` copies `store/icons/ic_launcher_512.png` into the large icon slot when present.  
For full App Store compliance, generate a complete icon set (1024×1024 master) in Xcode Assets.

## Checklist before TestFlight

- [ ] Apple Developer Program membership  
- [ ] Bundle ID registered in App Store Connect  
- [ ] Privacy policy URL live  
- [ ] Portrait-only verified on device  
- [ ] Haptics / audio smoke on real iPhone  
- [ ] Screenshots for App Store listing  

## Related

- [ANDROID.md](./ANDROID.md) — Play / APK  
- [PLAY_STORE.md](./PLAY_STORE.md) — store listing notes  
