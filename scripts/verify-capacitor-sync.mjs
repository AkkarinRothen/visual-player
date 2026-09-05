import { readFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const webRoot = path.resolve('dist');
const androidRoot = path.resolve('android/app/src/main/assets/public');

const webIndex = await readFile(path.join(webRoot, 'index.html'), 'utf8');
const androidIndex = await readFile(path.join(androidRoot, 'index.html'), 'utf8');

if (webIndex !== androidIndex) {
  throw new Error('Capacitor está desactualizado: dist/index.html no coincide con Android. Ejecutá npx cap sync android.');
}

const assetReferences = [...androidIndex.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((asset) => asset.startsWith('./') || asset.startsWith('assets/') || asset.startsWith('/assets/'));

for (const reference of assetReferences) {
  const relativeAsset = reference.replace(/^\.\//, '').replace(/^\//, '');
  try {
    await access(path.join(androidRoot, relativeAsset), constants.F_OK);
  } catch {
    throw new Error(`Falta un asset sincronizado en Android: ${relativeAsset}`);
  }
}

console.log(`Capacitor sincronizado: ${assetReferences.length} assets web verificados.`);
