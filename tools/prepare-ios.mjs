#!/usr/bin/env node
/**
 * Prepare the Capacitor iOS project for Mac / CI packaging.
 *
 * On Linux: builds web assets, syncs into ios/, validates the Xcode project.
 * Does NOT produce a signed .ipa (requires macOS + Xcode + Apple Developer cert).
 *
 * On macOS: same sync, then prints the archive / export commands.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { platform } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const iosApp = join(root, 'ios', 'App');
const xcodeproj = join(iosApp, 'App.xcodeproj');
const iconSrc = join(root, 'store', 'icons', 'ic_launcher_512.png');
const iconDst = join(
  iosApp,
  'App',
  'Assets.xcassets',
  'AppIcon.appiconset',
  'AppIcon-512@2x.png',
);

const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    ...opts,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

console.log('Crystalline · iOS prepare\n');

if (!existsSync(xcodeproj)) {
  console.error('Missing ios/App/App.xcodeproj — run: npx cap add ios');
  process.exit(1);
}

// Fresh web → native assets
run('npm', ['run', 'build']);
run('npx', ['cap', 'sync', 'ios']);

// Prefer store icon for the 1024-class slot Capacitor ships
if (existsSync(iconSrc) && existsSync(dirname(iconDst))) {
  try {
    copyFileSync(iconSrc, iconDst);
    console.log('App icon refreshed from store/icons/ic_launcher_512.png');
  } catch (e) {
    console.warn('Could not copy app icon:', e.message);
  }
}

const notesDir = join(root, 'release');
mkdirSync(notesDir, { recursive: true });
const isMac = platform() === 'darwin';
const readme = `# Crystalline — iOS package

**Bundle ID:** \`ca.departurebaydigital.crystalline\`  
**Display name:** Crystalline  
**Min iOS:** 15.0  
**Orientation:** Portrait  
**Xcode project:** \`ios/App/App.xcodeproj\`

## Why there is no .ipa in this folder on Linux

Apple requires **macOS + Xcode** (or a Mac-based CI such as Codemagic / GitHub Actions macos runners)
to compile, sign, and export an IPA. This machine scaffolded the native project; signing is Mac-side.

## On a Mac (device / TestFlight)

\`\`\`bash
cd "/path/to/3 in 1 game"
npm install
npm run ios:prepare   # or: npm run ios:sync
npm run ios:open      # opens Xcode
\`\`\`

In Xcode:

1. Select target **App** → Signing & Capabilities  
2. Team = your Apple Developer team  
3. Bundle ID must stay \`ca.departurebaydigital.crystalline\`  
4. Run on a simulator or device (▶)  
5. **Product → Archive** → Distribute App → App Store Connect / Ad Hoc / Development

### CLI archive (Mac only, after signing is set)

\`\`\`bash
cd ios/App
xcodebuild -scheme App -configuration Release \\
  -destination 'generic/platform=iOS' \\
  -archivePath ../../release/Crystalline.xcarchive archive

xcodebuild -exportArchive \\
  -archivePath ../../release/Crystalline.xcarchive \\
  -exportPath ../../release/ios \\
  -exportOptionsPlist ../../tools/ios-export-options.plist
\`\`\`

Create \`tools/ios-export-options.plist\` with your method (\`app-store-connect\`, \`ad-hoc\`, etc.)
and provisioning profile when you have certificates.

## Privacy

App Store privacy policy (same as Play):  
https://departurebaydigital.ca/privacy/crystalline/

## Prepared

- Capacitor 8 iOS platform  
- Plugins: App, Haptics, SplashScreen  
- Web assets synced from latest Vite \`dist/\`  
- Portrait locked in Info.plist  

Prepared at: ${new Date().toISOString()}  
Host: ${platform()} ${isMac ? '(can archive here)' : '(scaffold only — need Mac for IPA)'}
`;

writeFileSync(join(notesDir, 'IOS_PACKAGE.md'), readme);
console.log('\nWrote release/IOS_PACKAGE.md');

if (!isMac) {
  console.log(`
────────────────────────────────────────────────────────
iOS project is ready under ios/

This environment is Linux — a signed .ipa cannot be built here.
Copy the repo to a Mac (or use CI) and run:

  npm run ios:prepare
  npm run ios:open

Then Archive in Xcode for TestFlight / App Store.
────────────────────────────────────────────────────────
`);
} else {
  console.log(`
Mac detected. Next:

  npm run ios:open
  # or xcodebuild archive (see release/IOS_PACKAGE.md)
`);
}
