import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { resourcePackService } from './resourcePackService';
import type { VisualResourcePack } from '../types';

describe('ResourcePackService', () => {
  beforeEach(async () => {
    await db.assets.clear();
    await db.resourcePacks.clear();
  });

  const mockPack: VisualResourcePack = {
    schemaVersion: 1,
    type: 'visual_resource_pack',
    id: 'pack-czepeku-heroes-vol1',
    name: 'Czepeku Héroes y Aventureros Vol. 1',
    category: 'tokens',
    author: 'Czepeku',
    description: 'Pack de tokens de aventureros para D&D',
    coverDataUrl: 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoBAAEAAkA4JaQAA3AA/vuUAAA=',
    createdAt: 1725500000000,
    itemCount: 2,
    totalSizeBytes: 1024,
    tags: ['dnd', 'fantasy', 'heroes'],
    assets: [
      {
        id: 'token-eldrin',
        name: 'Eldrin Sombrasusurro',
        type: 'image',
        category: 'token',
        dataUrl: 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoBAAEAAkA4JaQAA3AA/vuUAAA=',
        thumbnailUrl: 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoBAAEAAkA4JaQAA3AA/vuUAAA=',
        dimensions: { width: 512, height: 512 },
        tags: ['elf', 'rogue'],
      },
      {
        id: 'token-valeria',
        name: 'Valeria Cruzardorada',
        type: 'image',
        category: 'token',
        dataUrl: 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoBAAEAAkA4JaQAA3AA/vuUAAA=',
        thumbnailUrl: 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoBAAEAAkA4JaQAA3AA/vuUAAA=',
        dimensions: { width: 512, height: 512 },
        tags: ['paladin', 'human'],
      },
    ],
  };

  it('1. Valida correctamente un archivo .vppack válido', async () => {
    const file = new File([JSON.stringify(mockPack)], 'heroes.vppack', { type: 'application/json' });
    const parsed = await resourcePackService.readPackFromFile(file);
    expect(parsed.id).toBe('pack-czepeku-heroes-vol1');
    expect(parsed.assets.length).toBe(2);
  });

  it('2. Rechaza un archivo corrupto o con tipo erróneo', async () => {
    const invalidFile = new File(['not-json'], 'bad.vppack', { type: 'text/plain' });
    await expect(resourcePackService.readPackFromFile(invalidFile)).rejects.toThrow('formato JSON válido');

    const wrongTypeFile = new File([JSON.stringify({ type: 'wrong_type' })], 'wrong.vppack', { type: 'application/json' });
    await expect(resourcePackService.readPackFromFile(wrongTypeFile)).rejects.toThrow('visual_resource_pack');
  });

  it('3. Instala un paquete registrando ficha y activos vinculados con packId', async () => {
    const installed = await resourcePackService.installPackObject(mockPack);
    expect(installed.id).toBe('pack-czepeku-heroes-vol1');
    expect(installed.name).toBe('Czepeku Héroes y Aventureros Vol. 1');
    expect(installed.itemCount).toBe(2);

    const storedAssets = await db.assets.where('packId').equals('pack-czepeku-heroes-vol1').toArray();
    expect(storedAssets.length).toBe(2);
    expect(storedAssets[0].packName).toBe('Czepeku Héroes y Aventureros Vol. 1');
    expect(storedAssets[0].category).toBe('token');

    const installedList = await resourcePackService.listInstalledPacks();
    expect(installedList.length).toBe(1);
    expect(installedList[0].author).toBe('Czepeku');
  });

  it('4. Re-importar el mismo pack actualiza sin duplicar activos', async () => {
    await resourcePackService.installPackObject(mockPack);
    // Re-import
    await resourcePackService.installPackObject(mockPack);

    const allAssets = await db.assets.where('packId').equals('pack-czepeku-heroes-vol1').toArray();
    expect(allAssets.length).toBe(2);
    const packs = await resourcePackService.listInstalledPacks();
    expect(packs.length).toBe(1);
  });

  it('5. Desinstalar un paquete elimina limpiamente sus activos y libera almacenamiento', async () => {
    await resourcePackService.installPackObject(mockPack);
    const result = await resourcePackService.uninstallPack('pack-czepeku-heroes-vol1');
    expect(result.deletedAssetsCount).toBe(2);

    const assetsAfter = await db.assets.where('packId').equals('pack-czepeku-heroes-vol1').toArray();
    expect(assetsAfter.length).toBe(0);

    const packsAfter = await resourcePackService.listInstalledPacks();
    expect(packsAfter.length).toBe(0);
  });

  it('6. Consulta los activos específicos de un paquete con getPackAssets', async () => {
    await resourcePackService.installPackObject(mockPack);
    const assets = await resourcePackService.getPackAssets('pack-czepeku-heroes-vol1');
    expect(assets.length).toBe(2);
    expect(assets.map(a => a.name)).toContain('Eldrin Sombrasusurro');
  });

  it('7. Instala paquetes grandes en lotes de 15 reportando progreso continuo', async () => {
    const largePack: VisualResourcePack = {
      schemaVersion: 1,
      type: 'visual_resource_pack',
      id: 'pack-large-batch',
      name: 'Pack de Lotes Grandes',
      category: 'tokens',
      assets: Array.from({ length: 35 }, (_, i) => ({
        id: `asset-large-${i}`,
        name: `Token ${i}`,
        dataUrl: `data:image/webp;base64,token${i}`,
        type: 'image' as const,
      })),
    };

    const progressReports: { current: number; total: number }[] = [];
    const installed = await resourcePackService.installPackObject(largePack, (current, total) => {
      progressReports.push({ current, total });
    });

    expect(installed.itemCount).toBe(35);
    expect(progressReports.length).toBeGreaterThanOrEqual(3);
    expect(progressReports[progressReports.length - 1]).toEqual({ current: 35, total: 35 });

    const storedAssets = await db.assets.where('packId').equals('pack-large-batch').toArray();
    expect(storedAssets.length).toBe(35);
  });
});
