#!/usr/bin/env node
/**
 * Build a Play Store Android App Bundle (AAB) + optional release APK.
 *
 * Expects:
 *   - JAVA_HOME → JDK 21+
 *   - ANDROID_HOME → SDK with platform 35/36 + build-tools
 *   - android/keystore.properties (see keystore.properties.example)
 *   - Web assets synced (`npm run cap:sync`)
 *
 * Outputs:
 *   release/crystalline-release.aab   ← upload this to Play Console
 *   release/crystalline-release.apk   ← sideload smoke-test (optional)
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const androidDir = join(root, 'android');
const home = homedir();

const env = {
  ...process.env,
  JAVA_HOME: process.env.JAVA_HOME || join(home, '.local/jdk21'),
  ANDROID_HOME: process.env.ANDROID_HOME || join(home, 'android-sdk'),
};

const props = join(androidDir, 'keystore.properties');
if (!existsSync(props)) {
  console.error('Missing android/keystore.properties');
  console.error('Run: npm run android:keystore');
  console.error('Or copy android/keystore.properties.example → keystore.properties');
  process.exit(1);
}

const sdk = env.ANDROID_HOME;
const localProps = join(androidDir, 'local.properties');
try {
  const { writeFileSync } = await import('node:fs');
  writeFileSync(localProps, `sdk.dir=${sdk.replace(/\\/g, '\\\\')}\n`);
} catch {
  /* ignore */
}

const gradlew = join(androidDir, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
if (!existsSync(gradlew)) {
  console.error('android/ project missing. Run: npx cap add android');
  process.exit(1);
}

const gradleEnv = {
  ...env,
  PATH: `${join(env.JAVA_HOME, 'bin')}:${join(sdk, 'platform-tools')}:${env.PATH || ''}`,
};

console.log('Building release App Bundle (AAB)…');
let r = spawnSync(gradlew, ['bundleRelease', '--no-daemon'], {
  cwd: androidDir,
  env: gradleEnv,
  stdio: 'inherit',
});
if (r.status !== 0) process.exit(r.status ?? 1);

const aab = join(androidDir, 'app/build/outputs/bundle/release/app-release.aab');
if (!existsSync(aab)) {
  console.error('AAB not found at', aab);
  process.exit(1);
}

const outDir = join(root, 'release');
mkdirSync(outDir, { recursive: true });
const aabDest = join(outDir, 'crystalline-release.aab');
copyFileSync(aab, aabDest);
console.log('AAB ready:', aabDest);

// Also build release APK for device smoke-test
console.log('Building release APK (smoke-test)…');
r = spawnSync(gradlew, ['assembleRelease', '--no-daemon'], {
  cwd: androidDir,
  env: gradleEnv,
  stdio: 'inherit',
});
if (r.status !== 0) process.exit(r.status ?? 1);

const apk = join(androidDir, 'app/build/outputs/apk/release/app-release.apk');
if (existsSync(apk)) {
  const apkDest = join(outDir, 'crystalline-release.apk');
  copyFileSync(apk, apkDest);
  console.log('APK ready:', apkDest);
}

console.log('');
console.log('Upload to Play Console → Production / Internal testing:');
console.log(' ', aabDest);
