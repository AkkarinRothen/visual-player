import type { VisualResourcePack, InstalledResourcePack } from '../types';
import {
  importResourcePack,
  uninstallResourcePack,
  getInstalledResourcePacks,
  getAssetsByPack,
  type StoredAsset,
} from '../db';

export class ResourcePackService {
  /**
   * Lee y valida un archivo .vppack o .json desde el cliente
   */
  public async readPackFromFile(file: File): Promise<VisualResourcePack> {
    const text = await file.text();
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch (_e) {
      throw new Error('El archivo seleccionado no tiene un formato JSON válido.');
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('El archivo no contiene un objeto válido.');
    }

    if (parsed.type !== 'visual_resource_pack') {
      throw new Error('El archivo no corresponde a un paquete de recursos de Visual Player (tipo esperado: visual_resource_pack).');
    }

    if (!parsed.id || !parsed.name || !Array.isArray(parsed.assets)) {
      throw new Error('El paquete está incompleto o su estructura está dañada.');
    }

    return parsed as VisualResourcePack;
  }

  /**
   * Instala un archivo .vppack directamente en IndexedDB
   */
  public async installPack(
    file: File,
    onProgress?: (current: number, total: number) => void
  ): Promise<InstalledResourcePack> {
    const pack = await this.readPackFromFile(file);
    return this.installPackObject(pack, onProgress);
  }

  /**
   * Instala un objeto de paquete de recursos en IndexedDB
   */
  public async installPackObject(
    pack: VisualResourcePack,
    onProgress?: (current: number, total: number) => void
  ): Promise<InstalledResourcePack> {
    return importResourcePack(pack, onProgress);
  }

  /**
   * Desinstala un paquete y libera el almacenamiento eliminando sus activos asociados
   */
  public async uninstallPack(packId: string): Promise<{ deletedAssetsCount: number }> {
    return uninstallResourcePack(packId);
  }

  /**
   * Retorna los paquetes instalados
   */
  public async listInstalledPacks(): Promise<InstalledResourcePack[]> {
    return getInstalledResourcePacks();
  }

  /**
   * Obtiene los activos de un paquete
   */
  public async getPackAssets(packId: string): Promise<StoredAsset[]> {
    return getAssetsByPack(packId);
  }

  /**
   * Descarga un objeto VisualResourcePack como archivo .vppack en el navegador
   */
  public exportPackToFile(pack: VisualResourcePack): void {
    const json = JSON.stringify(pack, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = (pack.id || pack.name).replace(/[^a-z0-9_-]/gi, '_');
    a.href = url;
    a.download = `${safeName}.vppack`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

export const resourcePackService = new ResourcePackService();
