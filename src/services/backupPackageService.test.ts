import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createBackupPackage,
  inspectBackupPackage,
  restoreBackupPackage,
} from './backupPackageService';
import { db, createCampaign, getAllCampaigns } from '../db';
import type { Campaign } from '../types';

describe('backupPackageService', () => {
  beforeEach(async () => {
    await db.campaigns.clear();
    await db.assets.clear();
    await db.checkpoints.clear();
  });

  it('empaqueta e inspecciona un archivo .vpbackup con integridad validada', async () => {
    const testCampaign: Campaign = {
      id: 'camp-test-1',
      title: 'Campaña de Prueba',
      description: 'Prueba de respaldo',
      scenes: [
        {
          id: 'sc-1',
          name: 'Escena 1',
          backgroundUrl: 'https://test.com/bg.jpg',
          activeCharacters: [],
        },
      ],
      characters: [
        {
          id: 'ch-1',
          name: 'Héroe',
          roleOrTitle: 'Guerrero',
          defaultAvatarUrl: 'https://test.com/hero.png',
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await createCampaign(testCampaign);

    // Crear paquete
    const { blob, fileName, manifest } = await createBackupPackage();
    expect(fileName).toMatch(/^VisualPlayer_Backup_\d{4}-\d{2}-\d{2}\.vpbackup$/);
    expect(manifest.campaignCount).toBe(1);
    expect(manifest.sceneCount).toBe(1);
    expect(manifest.characterCount).toBe(1);
    expect(manifest.checksum).toBeTruthy();

    // Inspección pre-vuelo
    const report = await inspectBackupPackage(blob);
    expect(report.isValid).toBe(true);
    expect(report.campaignNames).toContain('Campaña de Prueba');
    expect(report.manifest?.campaignCount).toBe(1);
  });

  it('restaura el paquete en modo copia sin sobrescribir las campañas existentes', async () => {
    const initialCamp: Campaign = {
      id: 'camp-orig',
      title: 'Campaña Inicial',
      scenes: [],
      characters: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await createCampaign(initialCamp);

    const backupCamp: Campaign = {
      id: 'camp-incoming',
      title: 'Campaña Respaldada',
      scenes: [],
      characters: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await createCampaign(backupCamp);

    const { blob } = await createBackupPackage();

    // Eliminar la de respaldo para simular restauración en otro entorno
    await db.campaigns.delete('camp-incoming');

    const result = await restoreBackupPackage(blob, 'copy');
    expect(result.success).toBe(true);
    expect(result.importedCampaigns).toBe(2);

    const all = await getAllCampaigns();
    // Debe haber la inicial + las 2 restauradas como copias
    expect(all.length).toBe(3);
    const titles = all.map((c) => c.title);
    expect(titles).toContain('Campaña Inicial');
    expect(titles.some((t) => t.includes('(Restaurado)'))).toBe(true);
  });

  it('rechaza archivos con formato inválido o corrupto', async () => {
    const invalidBlob = new Blob(['{"invalido": true}'], { type: 'application/json' });
    const report = await inspectBackupPackage(invalidBlob);
    expect(report.isValid).toBe(false);
    expect(report.error).toContain('no es un respaldo válido');
  });
});
