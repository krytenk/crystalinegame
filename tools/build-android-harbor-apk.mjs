#!/usr/bin/env node
/**
 * Build a **separate** Lantern Harbor debug APK that does NOT overwrite Crystalline.
 *
 * Differences from the Crystalline APK:
 *   - applicationId: ca.departurebaydigital.lanternharbor  (new app on device)
 *   - app name: Lantern Harbor
 *   - entry HTML: harbor.html (theme pack, not crystalline index)
 *
 * Crystalline android/ config is restored after the build so market packaging
 * stays ca.departurebaydigital.crystalline + index.html.
 *
 * Output: release/lanternharbor-debug.apk
 */
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const androidDir = join(root, 'android');
const appGradle = join(androidDir, 'app/build.gradle');
const stringsXml = join(androidDir, 'app/src/main/res/values/strings.xml');
const capConfigTs = join(root, 'capacitor.config.ts');
const distHarbor = join(root, 'dist-harbor');
const home = homedir();

const HARBOR_ID = 'ca.departurebaydigital.lanternharbor';
const CRYSTAL_ID = 'ca.departurebaydigital.crystalline';

const env = {
  ...process.env,
  JAVA_HOME: process.env.JAVA_HOME || join(home, '.local/jdk21'),
  ANDROID_HOME: process.env.ANDROID_HOME || join(home, 'android-sdk'),
};

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    env: {
      ...env,
      PATH: `${join(env.JAVA_HOME, 'bin')}:${join(env.ANDROID_HOME, 'platform-tools')}:${env.PATH || ''}`,
    },
    stdio: 'inherit',
    ...opts,
  });
  if (r.status !== 0) {
    throw new Error(`Command failed: ${cmd} ${args.join(' ')}`);
  }
}

// Keep backups OUTSIDE android/app/src/main/res — Gradle merges every file there.
const bakDir = join(root, '.harbor-apk-bak');

function backup(path, key) {
  mkdirSync(bakDir, { recursive: true });
  const bak = join(bakDir, key);
  copyFileSync(path, bak);
  return bak;
}

function restore(path, key) {
  const bak = join(bakDir, key);
  if (existsSync(bak)) {
    copyFileSync(bak, path);
    rmSync(bak);
  }
}

// --- 1. Web build ---
console.log('== 1/5 Vite production build ==');
run('npm', ['run', 'build']);

// --- 2. Harbor webDir: same assets, harbor.html as the app entry ---
console.log('== 2/5 Stage dist-harbor (harbor.html → index.html) ==');
if (existsSync(distHarbor)) rmSync(distHarbor, { recursive: true });
cpSync(join(root, 'dist'), distHarbor, { recursive: true });
const harborHtml = join(distHarbor, 'harbor.html');
if (!existsSync(harborHtml)) {
  console.error('dist/harbor.html missing after build');
  process.exit(1);
}
copyFileSync(harborHtml, join(distHarbor, 'index.html'));
// Ensure theme flag even if hash path changes
let index = readFileSync(join(distHarbor, 'index.html'), 'utf8');
if (!index.includes("__THEME__ = 'harbor'")) {
  index = index.replace('<head>', "<head>\n    <script>window.__THEME__='harbor';</script>");
  writeFileSync(join(distHarbor, 'index.html'), index);
}

// --- 3. Patch Capacitor + Android identity (backed up) ---
console.log('== 3/5 Patch package id for Harbor (temporary) ==');
backup(appGradle, 'build.gradle');
backup(stringsXml, 'strings.xml');
backup(capConfigTs, 'capacitor.config.ts');
// Remove any leftover bak files that would break aapt (from earlier attempts)
const badBak = join(androidDir, 'app/src/main/res/values/strings.xml.harbor-build.bak');
if (existsSync(badBak)) rmSync(badBak);

try {
  let gradle = readFileSync(appGradle, 'utf8');
  gradle = gradle
    .replaceAll(CRYSTAL_ID, HARBOR_ID)
    .replace(/versionName "[^"]+"/, 'versionName "0.1.0-harbor"');
  // Keep Java namespace as crystalline package path (folder stays); only applicationId changes.
  // Revert namespace line if we replaced it — MainActivity lives under crystalline/
  gradle = gradle.replace(
    `namespace = "${HARBOR_ID}"`,
    `namespace = "${CRYSTAL_ID}"`,
  );
  writeFileSync(appGradle, gradle);

  writeFileSync(
    stringsXml,
    `<?xml version='1.0' encoding='utf-8'?>
<resources>
    <string name="app_name">Lantern Harbor</string>
    <string name="title_activity_main">Lantern Harbor</string>
    <string name="package_name">${HARBOR_ID}</string>
    <string name="custom_url_scheme">${HARBOR_ID}</string>
</resources>
`,
  );

  writeFileSync(
    capConfigTs,
    `import type { CapacitorConfig } from '@capacitor/cli';

/** TEMP Harbor packaging config — restored after APK build. */
const config: CapacitorConfig = {
  appId: '${HARBOR_ID}',
  appName: 'Lantern Harbor',
  webDir: 'dist-harbor',
  server: { androidScheme: 'https' },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0b1c2e',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#0b1c2e',
      showSpinner: false,
    },
  },
};

export default config;
`,
  );

  // local.properties
  writeFileSync(
    join(androidDir, 'local.properties'),
    `sdk.dir=${env.ANDROID_HOME.replace(/\\/g, '\\\\')}\n`,
  );

  console.log('== 4/5 Harbor launcher icons + cap sync + assembleDebug ==');
  // Swap mipmap launcher icons for Harbor lantern art (Crystalline icons restored in finally)
  const mipmapDens = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
  const iconSrc = join(root, 'public/themes/harbor/ui');
  for (const dens of mipmapDens) {
    const srcPng = join(iconSrc, `ic_launcher_${dens}.png`);
    if (!existsSync(srcPng)) continue;
    const dir = join(androidDir, `app/src/main/res/mipmap-${dens}`);
    for (const name of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']) {
      const dest = join(dir, name);
      if (existsSync(dest)) {
        backup(dest, `mipmap-${dens}-${name}`);
        copyFileSync(srcPng, dest);
      }
    }
  }
  // Adaptive icon background tint toward harbor navy
  const bgColorXml = join(androidDir, 'app/src/main/res/values/ic_launcher_background.xml');
  if (existsSync(bgColorXml)) {
    backup(bgColorXml, 'ic_launcher_background.xml');
    writeFileSync(
      bgColorXml,
      `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#0B1C2E</color>
</resources>
`,
    );
  }

  run('npx', ['cap', 'sync', 'android']);

  const gradlew = join(androidDir, 'gradlew');
  // Force package rebuild so new assets/id land in the APK
  run(gradlew, ['clean', 'assembleDebug', '--no-daemon'], { cwd: androidDir });

  const apk = join(androidDir, 'app/build/outputs/apk/debug/app-debug.apk');
  if (!existsSync(apk)) throw new Error(`APK missing: ${apk}`);

  const outDir = join(root, 'release');
  mkdirSync(outDir, { recursive: true });
  const dest = join(outDir, 'lanternharbor-debug.apk');
  copyFileSync(apk, dest);
  console.log('Harbor APK ready:', dest);
} finally {
  console.log('== 5/5 Restore Crystalline android + capacitor config ==');
  restore(appGradle, 'build.gradle');
  restore(stringsXml, 'strings.xml');
  restore(capConfigTs, 'capacitor.config.ts');
  // Restore launcher icons / adaptive bg
  for (const dens of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) {
    for (const name of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']) {
      restore(join(androidDir, `app/src/main/res/mipmap-${dens}`, name), `mipmap-${dens}-${name}`);
    }
  }
  restore(join(androidDir, 'app/src/main/res/values/ic_launcher_background.xml'), 'ic_launcher_background.xml');
  // Re-sync crystalline so android assets/config match market app again
  try {
    run('npx', ['cap', 'sync', 'android']);
  } catch (e) {
    console.warn('Warning: crystalline cap sync after restore failed — check android/ config');
  }
  if (existsSync(badBak)) rmSync(badBak);
}

console.log(`
Done.
  Harbor APK:     release/lanternharbor-debug.apk
  Package id:     ${HARBOR_ID}
  Install (safe): adb install release/lanternharbor-debug.apk
  (Does NOT use -r on Crystalline; different applicationId = second app icon)
`);
