#!/usr/bin/env node
/**
 * Create an Android upload keystore for Play App Signing.
 *
 * Writes: android/keystore/crystalline-upload.jks
 * Does NOT print or store passwords — pass via env or prompts.
 *
 *   KEYSTORE_PASSWORD=... KEY_PASSWORD=... npm run android:keystore
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const keyDir = join(root, 'android/keystore');
const storeFile = join(keyDir, 'crystalline-upload.jks');
const propsFile = join(root, 'android/keystore.properties');
const javaHome = process.env.JAVA_HOME || join(homedir(), '.local/jdk21');
const keytool = join(javaHome, 'bin/keytool');

async function main() {
  mkdirSync(keyDir, { recursive: true });
  if (existsSync(storeFile)) {
    console.error('Keystore already exists:', storeFile);
    console.error('Delete it only if you intentionally want a new upload key.');
    process.exit(1);
  }

  let storePass = process.env.KEYSTORE_PASSWORD || '';
  let keyPass = process.env.KEY_PASSWORD || storePass;
  if (!storePass) {
    const rl = createInterface({ input, output });
    storePass = await rl.question('Keystore password (min 6 chars): ');
    keyPass = (await rl.question('Key password [same]: ')) || storePass;
    rl.close();
  }
  if (storePass.length < 6) {
    console.error('Password too short');
    process.exit(1);
  }

  const dname =
    process.env.KEY_DNAME ||
    'CN=Crystalline, OU=Games, O=Departure Bay Digital, L=Nanaimo, ST=BC, C=CA';

  const r = spawnSync(
    existsSync(keytool) ? keytool : 'keytool',
    [
      '-genkeypair',
      '-v',
      '-keystore',
      storeFile,
      '-alias',
      'crystalline',
      '-keyalg',
      'RSA',
      '-keysize',
      '2048',
      '-validity',
      '10000',
      '-storepass',
      storePass,
      '-keypass',
      keyPass,
      '-dname',
      dname,
    ],
    { stdio: 'inherit' },
  );
  if (r.status !== 0) process.exit(r.status ?? 1);

  writeFileSync(
    propsFile,
    [
      'storeFile=keystore/crystalline-upload.jks',
      `storePassword=${storePass}`,
      'keyAlias=crystalline',
      `keyPassword=${keyPass}`,
      '',
    ].join('\n'),
    { mode: 0o600 },
  );

  console.log('');
  console.log('Created:', storeFile);
  console.log('Wrote:  ', propsFile, '(gitignored)');
  console.log('');
  console.log('BACK UP the .jks and passwords offline. Losing them blocks updates');
  console.log('if you opt out of Play App Signing (default is enrolled — still back up).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
