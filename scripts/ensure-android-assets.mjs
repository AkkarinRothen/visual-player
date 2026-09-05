import { stat, readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const rootDir = process.cwd();
const androidIndexPath = path.join(rootDir, 'android/app/src/main/assets/public/index.html');
const distIndexPath = path.join(rootDir, 'dist/index.html');

const isForce = process.argv.includes('--force');

async function getMaxMtimeInDir(dirPath) {
  let maxTime = 0;
  if (!existsSync(dirPath)) return 0;

  const entries = await readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
      const subMax = await getMaxMtimeInDir(fullPath);
      if (subMax > maxTime) maxTime = subMax;
    } else if (entry.isFile()) {
      const stats = await stat(fullPath);
      if (stats.mtimeMs > maxTime) {
        maxTime = stats.mtimeMs;
      }
    }
  }
  return maxTime;
}

async function checkNeedsSync() {
  if (isForce) {
    return { needsSync: true, reason: 'Flag --force activado' };
  }

  if (!existsSync(androidIndexPath)) {
    return { needsSync: true, reason: 'No existe android/app/src/main/assets/public/index.html' };
  }

  if (!existsSync(distIndexPath)) {
    return { needsSync: true, reason: 'No existe dist/index.html (falta compilación previa)' };
  }

  // Comprobar contenido de index.html
  const distHtml = await readFile(distIndexPath, 'utf8');
  const androidHtml = await readFile(androidIndexPath, 'utf8');
  if (distHtml !== androidHtml) {
    return { needsSync: true, reason: 'dist/index.html difiere de la copia en Android' };
  }

  const androidStats = await stat(androidIndexPath);
  const androidMtime = androidStats.mtimeMs;

  // Comparar con fuentes
  const srcMtime = await getMaxMtimeInDir(path.join(rootDir, 'src'));
  if (srcMtime > androidMtime) {
    return { needsSync: true, reason: 'Hay modificaciones en src/ posteriores a la última sincronización' };
  }

  const publicMtime = await getMaxMtimeInDir(path.join(rootDir, 'public'));
  if (publicMtime > androidMtime) {
    return { needsSync: true, reason: 'Hay modificaciones en public/ posteriores a la última sincronización' };
  }

  const rootFiles = ['index.html', 'package.json', 'vite.config.ts', 'capacitor.config.ts'];
  for (const file of rootFiles) {
    const filePath = path.join(rootDir, file);
    if (existsSync(filePath)) {
      const fileStats = await stat(filePath);
      if (fileStats.mtimeMs > androidMtime) {
        return { needsSync: true, reason: `El archivo ${file} es más reciente que los assets de Android` };
      }
    }
  }

  return { needsSync: false };
}

async function main() {
  try {
    const { needsSync, reason } = await checkNeedsSync();

    if (!needsSync) {
      console.log('[Android Auto-Sync] Los assets web ya están actualizados en Android. Omitiendo compilación.');
      process.exit(0);
    }

    console.log(`[Android Auto-Sync] Sincronización requerida: ${reason}`);
    console.log('[Android Auto-Sync] Recompilando frontend web y sincronizando con Capacitor...');

    // Ejecutar npm run android:build
    execSync('npm run android:build', {
      cwd: rootDir,
      stdio: 'inherit',
      shell: true,
    });

    console.log('[Android Auto-Sync] Sincronización con Android completada con éxito.');
  } catch (err) {
    console.error('[Android Auto-Sync] ERROR durante la sincronización:', err.message);
    process.exit(1);
  }
}

main();
