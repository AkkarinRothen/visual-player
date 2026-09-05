#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import sharp from 'sharp';

const DEFAULT_SOURCE_BASE = 'I:\\TTRPG\\Visuales';
const DEFAULT_OUTPUT_DIR = path.resolve(process.cwd(), 'packs');
const REPO_PACKS_DIR = 'I:\\TTRPG\\Visuales\\Packs_VP';
const GOOGLE_DRIVE_VP_DIR = 'G:\\Mi unidad\\4.Juegos de Rol\\0.Visual player';

// Parser de argumentos de línea de comandos
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        options[key] = next;
        i++;
      } else {
        options[key] = true;
      }
    }
  }
  return options;
}

function ask(rl, question, defaultValue = '', forceDefault = false) {
  if (forceDefault) return Promise.resolve(defaultValue);
  return new Promise((resolve) => {
    const promptText = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
    rl.question(promptText, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function normalizeSearchText(...parts) {
  return parts
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function classifyAssetCategory(category, targetFolder) {
  const text = normalizeSearchText(category, targetFolder);

  if (/(personaje|personajes|character|characters|npc|npcs|pnj|pnjs|heroe|heroes|aldeano|aldeanos|aventurero|aventureros|retrato|retratos|avatar|avatares|faceset|figura|figuras|full art)/.test(text)) {
    return 'character';
  }

  if (/(token|tokens|criatura|criaturas|monster|monsters|monstruo|monstruos|bestiario|manual)/.test(text)) {
    return 'token';
  }

  if (/(mapa|mapas|maps?|fondo|fondos|background|backgrounds|escena|scene|battlemap|battlemaps)/.test(text)) {
    return 'background';
  }

  if (/(prop|props|atrezo|atrezos|asset|assets|objeto|objetos|item|items|furniture|mueble|muebles|barril|barriles|taberna|naval|pirata)/.test(text)) {
    return 'asset';
  }

  return 'asset';
}

function packCategoryFromAssetCategory(assetCategory) {
  if (assetCategory === 'background') return 'backgrounds';
  if (assetCategory === 'character') return 'characters';
  if (assetCategory === 'token') return 'tokens';
  if (assetCategory === 'prop') return 'props';
  return 'assets';
}

function usageFromAssetCategory(assetCategory) {
  if (assetCategory === 'background') return ['scene-background'];
  if (assetCategory === 'character') return ['invoke-character'];
  if (assetCategory === 'token') return ['place-token', 'invoke-character'];
  if (assetCategory === 'prop') return ['place-prop', 'show-asset'];
  return ['show-asset', 'place-prop'];
}

function findImagesRecursively(dir, max = Infinity, options = {}) {
  const results = [];
  const validExts = new Set(['.png', '.jpg', '.jpeg', '.webp']);
  const preferNoGrid = !!options.preferNoGrid;

  function walk(current) {
    if (results.length >= max) return;
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (results.length >= max) break;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (validExts.has(ext)) {
          if (preferNoGrid) {
            const lower = entry.name.toLowerCase();
            const hasGrid = lower.includes('grid');
            const hasNoGrid = lower.includes('no grid') || lower.includes('no_grid') || lower.includes('nogrid') || lower.includes('ungridded');
            if (hasGrid && !hasNoGrid) {
              continue; // Omitir versiones con cuadrícula impresa
            }
          }
          results.push(full);
        }
      }
    }
  }

  walk(dir);
  return results;
}

async function processImage(filePath, maxDimension, quality = 80) {
  const metadata = await sharp(filePath).metadata();
  
  // Imagen optimizada principal en WebP
  const mainBuffer = await sharp(filePath)
    .resize({
      width: maxDimension,
      height: maxDimension,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality, alphaQuality: 90 })
    .toBuffer();

  // Miniatura liviana de 128px para preview ultra-rápido
  const thumbBuffer = await sharp(filePath)
    .resize({
      width: 128,
      height: 128,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 65 })
    .toBuffer();

  const mainMeta = await sharp(mainBuffer).metadata();

  return {
    dataUrl: `data:image/webp;base64,${mainBuffer.toString('base64')}`,
    thumbnailUrl: `data:image/webp;base64,${thumbBuffer.toString('base64')}`,
    width: mainMeta.width || metadata.width || 0,
    height: mainMeta.height || metadata.height || 0,
    originalWidth: metadata.width,
    originalHeight: metadata.height,
    optimizedSize: mainBuffer.length,
  };
}

async function main() {
  console.log('\n=============================================================');
  console.log('  ⚔️  Visual Player — Generador de Packs de Recursos (.vppack)');
  console.log('=============================================================\n');

  const cliOptions = parseArgs();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    let sourceBase = cliOptions.source || DEFAULT_SOURCE_BASE;
    if (!fs.existsSync(sourceBase)) {
      console.log(`⚠️  Ruta por defecto '${sourceBase}' no encontrada.`);
      sourceBase = await ask(rl, 'Ingresá la ruta raíz de recursos', process.cwd());
    }

    let targetFolder = '';
    let category = cliOptions.category ? String(cliOptions.category).toLowerCase() : 'tokens';
    let defaultAuthor = '';

    if (cliOptions['folder']) {
      targetFolder = path.isAbsolute(cliOptions['folder'])
        ? cliOptions['folder']
        : path.join(sourceBase, cliOptions['folder']);
    } else {
      // Menú interactivo
      console.log('Categorías principales detectadas:');
      const categories = ['Tokens', 'Mapas', 'Props', 'Assets'];
      categories.forEach((cat, idx) => console.log(`  [${idx + 1}] ${cat}`));
      console.log('  [5] Otra ruta personalizada');

      const catChoice = await ask(rl, 'Seleccioná una categoría (1-5)', '1');
      const choiceNum = parseInt(catChoice, 10);

      let selectedCategoryFolder = '';
      if (choiceNum >= 1 && choiceNum <= 4) {
        const catName = categories[choiceNum - 1];
        category = catName.toLowerCase();
        selectedCategoryFolder = path.join(sourceBase, catName);
      } else {
        selectedCategoryFolder = await ask(rl, 'Ingresá la ruta de la carpeta');
      }

      if (!fs.existsSync(selectedCategoryFolder)) {
        console.error(`❌ La carpeta '${selectedCategoryFolder}' no existe.`);
        process.exit(1);
      }

      // Listar subcarpetas / autores disponibles
      const subdirs = fs
        .readdirSync(selectedCategoryFolder, { withFileTypes: true })
        .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
        .map((d) => d.name);

      if (subdirs.length > 0) {
        console.log(`\nCarpetas / Autores encontrados en '${path.basename(selectedCategoryFolder)}':`);
        subdirs.slice(0, 15).forEach((sd, idx) => console.log(`  [${idx + 1}] ${sd}`));
        if (subdirs.length > 15) {
          console.log(`  ... y ${subdirs.length - 15} más`);
        }

        const subChoice = await ask(rl, `Elegí una carpeta (1-${Math.min(15, subdirs.length)}) o escribí el nombre`, '1');
        const subIndex = parseInt(subChoice, 10);
        if (!isNaN(subIndex) && subIndex >= 1 && subIndex <= subdirs.length) {
          targetFolder = path.join(selectedCategoryFolder, subdirs[subIndex - 1]);
          defaultAuthor = subdirs[subIndex - 1].split(' - ')[0].trim();
        } else {
          targetFolder = path.join(selectedCategoryFolder, subChoice);
          defaultAuthor = subChoice;
        }
      } else {
        targetFolder = selectedCategoryFolder;
      }
    }

    if (!fs.existsSync(targetFolder)) {
      console.error(`❌ Carpeta no encontrada: ${targetFolder}`);
      process.exit(1);
    }

    console.log(`\n📁 Carpeta seleccionada: ${targetFolder}`);

    const autoMode = Boolean(cliOptions.yes || cliOptions['non-interactive'] || (cliOptions.folder && cliOptions.name));

    // Si tiene subcarpetas (ej. Czepeku con varios packs), permitir seleccionar subpack si se desea
    const innerSubdirs = fs
      .readdirSync(targetFolder, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
      .map((d) => d.name);

    if (innerSubdirs.length > 0 && !cliOptions['no-subdirs'] && !autoMode) {
      console.log(`\nSubcolecciones dentro de esta carpeta:`);
      console.log(`  [0] Todo el contenido (combinado)`);
      innerSubdirs.slice(0, 15).forEach((sd, idx) => console.log(`  [${idx + 1}] ${sd}`));
      const innerChoice = await ask(rl, '¿Empaquetar subcolección específica o todo? (0-15)', '0', autoMode);
      const innerIdx = parseInt(innerChoice, 10);
      if (innerIdx > 0 && innerIdx <= innerSubdirs.length) {
        targetFolder = path.join(targetFolder, innerSubdirs[innerIdx - 1]);
        console.log(`🎯 Subcolección elegida: ${path.basename(targetFolder)}`);
      }
    }

    // Configuración del paquete
    const folderBaseName = path.basename(targetFolder);
    const defaultName = cliOptions.name || folderBaseName;
    const packName = cliOptions.name || (await ask(rl, 'Nombre del Pack', defaultName, autoMode));
    const author = cliOptions.author || (await ask(rl, 'Autor / Creador', defaultAuthor || 'Comunidad TTRPG', autoMode));
    const packId = cliOptions.id || slugify(`pack-${author}-${packName}`.slice(0, 50));
    const description = cliOptions.desc || (await ask(rl, 'Descripción corta', `Colección de ${category} para Visual Player`, autoMode));
    
    // Parámetros de imagen
    const assetCategory = classifyAssetCategory(category, targetFolder);
    const packCategory = packCategoryFromAssetCategory(assetCategory);
    const usage = usageFromAssetCategory(assetCategory);
    const isMap = assetCategory === 'background';
    const defaultMaxDim = isMap ? '1920' : '512';
    const maxDimStr = cliOptions['max-size'] || (await ask(rl, 'Resolución máxima (px)', defaultMaxDim, autoMode));
    const maxDimension = parseInt(maxDimStr, 10) || (isMap ? 1920 : 512);

    const defaultLimit = isMap ? '25' : '60';
    const limitStr = cliOptions['max-items'] || (await ask(rl, 'Límite de imágenes (0 para todas)', defaultLimit, autoMode));
    const maxItems = parseInt(limitStr, 10) === 0 ? Infinity : parseInt(limitStr, 10) || 50;

    const preferNoGrid = cliOptions['with-grid'] ? false : Boolean(cliOptions['no-grid'] || cliOptions['prefer-no-grid'] || isMap);
    console.log(`\n🔍 Buscando imágenes en ${targetFolder}...${preferNoGrid ? ' (filtrando mapas sin cuadrícula impresa)' : ''}`);
    const files = findImagesRecursively(targetFolder, maxItems, { preferNoGrid });

    if (files.length === 0) {
      console.error('❌ No se encontraron imágenes válidas (.png, .jpg, .webp) en la carpeta.');
      process.exit(1);
    }

    console.log(`✨ Se procesarán ${files.length} archivos a WebP (máx ${maxDimension}px)...`);

    const assets = [];
    let totalOptimizedBytes = 0;

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const fileName = path.basename(f, path.extname(f));
      // Nombre amigable: reemplaza guiones bajos por espacios y quita prefijos numéricos si existen
      const cleanName = fileName.replace(/^\d+[-_]/, '').replace(/[-_]/g, ' ').trim();

      process.stdout.write(`\r[${i + 1}/${files.length}] Procesando: ${cleanName.slice(0, 35).padEnd(35)}`);

      try {
        const processed = await processImage(f, maxDimension, 82);
        totalOptimizedBytes += processed.optimizedSize;

        assets.push({
          id: `${packId}-${slugify(cleanName)}-${i + 1}`,
          name: cleanName,
          type: 'image',
          category: assetCategory,
          usage,
          dataUrl: processed.dataUrl,
          thumbnailUrl: processed.thumbnailUrl,
          dimensions: { width: processed.width, height: processed.height },
          tags: [slugify(author), assetCategory, slugify(cleanName)],
          originalFileName: path.basename(f),
        });
      } catch (err) {
        console.error(`\n⚠️ Error al procesar ${f}:`, err.message);
      }
    }

    console.log('\n\n📦 Ensamblando paquete de recursos...');

    const packData = {
      schemaVersion: 1,
      type: 'visual_resource_pack',
      id: packId,
      name: packName,
      category: packCategory,
      author,
      description,
      coverDataUrl: assets[0]?.thumbnailUrl || assets[0]?.dataUrl || '',
      createdAt: Date.now(),
      itemCount: assets.length,
      totalSizeBytes: totalOptimizedBytes,
      tags: [slugify(author), category],
      assets,
    };

    const outDir = cliOptions.output || DEFAULT_OUTPUT_DIR;
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const outFileName = `${packId}.vppack`;
    const outFilePath = path.join(outDir, outFileName);

    fs.writeFileSync(outFilePath, JSON.stringify(packData, null, 2), 'utf8');

    // Guardar también copia en I:\TTRPG\Visuales\Packs_VP si la ruta está disponible
    if (fs.existsSync(path.dirname(REPO_PACKS_DIR))) {
      if (!fs.existsSync(REPO_PACKS_DIR)) fs.mkdirSync(REPO_PACKS_DIR, { recursive: true });
      const repoCopyPath = path.join(REPO_PACKS_DIR, outFileName);
      fs.copyFileSync(outFilePath, repoCopyPath);
    }

    // Guardar también copia en Google Drive (0.Visual player) si está disponible
    if (fs.existsSync(GOOGLE_DRIVE_VP_DIR)) {
      const gDriveCopyPath = path.join(GOOGLE_DRIVE_VP_DIR, outFileName);
      fs.copyFileSync(outFilePath, gDriveCopyPath);
    }

    const fileStat = fs.statSync(outFilePath);

    console.log('\n=============================================================');
    console.log('  🎉 ¡Pack Creado con Éxito!');
    console.log('=============================================================');
    console.log(`  Nombre:       ${packName}`);
    console.log(`  ID:           ${packId}`);
    console.log(`  Autor:        ${author}`);
    console.log(`  Categoría:    ${packData.category}`);
    console.log(`  Recursos:     ${assets.length} activos WebP`);
    console.log(`  Tamaño Final: ${formatBytes(fileStat.size)}`);
    console.log(`  Archivo:      ${outFilePath}`);
    console.log('=============================================================\n');
    console.log('👉 Podés instalar este pack directamente en Visual Player desde el');
    console.log('   Gestor de Packs en Herramientas de Mesa o Biblioteca de Recursos.\n');
  } catch (err) {
    console.error('\n❌ Ocurrió un error inesperado:', err);
  } finally {
    rl.close();
  }
}

main();
