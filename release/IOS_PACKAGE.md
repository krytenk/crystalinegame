# Crystalline — iOS package

**Bundle ID:** `ca.departurebaydigital.crystalline`  
**Display name:** Crystalline  
**Min iOS:** 15.0  
**Orientation:** Portrait  
**Xcode project:** `ios/App/App.xcodeproj`

## Why there is no .ipa in this folder on Linux

Apple requires **macOS + Xcode** (or a Mac-based CI such as Codemagic / GitHub Actions macos runners)
to compile, sign, and export an IPA. This machine scaffolded the native project; signing is Mac-side.

## On a Mac (device / TestFlight)

```bash
cd "/path/to/3 in 1 game"
npm install
npm run ios:prepare   # or: npm run ios:sync
npm run ios:open      # opens Xcode
```

In Xcode:

1. Select target **App** → Signing & Capabilities  
2. Team = your Apple Developer team  
3. Bundle ID must stay `ca.departurebaydigital.crystalline`  
4. Run on a simulator or device (▶)  
5. **Product → Archive** → Distribute App → App Store Connect / Ad Hoc / Development

### CLI archive (Mac only, after signing is set)

```bash
cd ios/App
xcodebuild -scheme App -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath ../../release/Crystalline.xcarchive archive

xcodebuild -exportArchive \
  -archivePath ../../release/Crystalline.xcarchive \
  -exportPath ../../release/ios \
  -exportOptionsPlist ../../tools/ios-export-options.plist
```

Create `tools/ios-export-options.plist` with your method (`app-store-connect`, `ad-hoc`, etc.)
and provisioning profile when you have certificates.

## Privacy

App Store privacy policy (same as Play):  
https://departurebaydigital.ca/privacy/crystalline/

## Prepared

- Capacitor 8 iOS platform  
- Plugins: App, Haptics, SplashScreen  
- Web assets synced from latest Vite `dist/`  
- Portrait locked in Info.plist  

Prepared at: 2026-08-02T18:08:39.054Z  
Host: linux (scaffold only — need Mac for IPA)
