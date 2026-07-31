#!/usr/bin/env node
/**
 * Build a debug APK via Gradle (Capacitor android/ project).
 *
 * Expects:
 *   - JAVA_HOME pointing at JDK 21+
 *   - ANDROID_HOME pointing at an Android SDK with platform 36 + build-tools
 *   - Web assets already synced (`npm run cap:sync`)
 *
 * Output: release/crystalline-debug.apk
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

// Ensure local.properties has sdk.dir
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

console.log('Building debug APK…');
const r = spawnSync(gradlew, ['assembleDebug', '--no-daemon'], {
  cwd: androidDir,
  env: {
    ...env,
    PATH: `${join(env.JAVA_HOME, 'bin')}:${join(sdk, 'platform-tools')}:${env.PATH || ''}`,
  },
  stdio: 'inherit',
});
if (r.status !== 0) process.exit(r.status ?? 1);

const apk = join(androidDir, 'app/build/outputs/apk/debug/app-debug.apk');
if (!existsSync(apk)) {
  console.error('APK not found at', apk);
  process.exit(1);
}

const outDir = join(root, 'release');
mkdirSync(outDir, { recursive: true });
const dest = join(outDir, 'crystalline-debug.apk');
copyFileSync(apk, dest);
console.log('APK ready:', dest);
