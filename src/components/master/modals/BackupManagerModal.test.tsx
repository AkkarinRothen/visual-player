import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BackupManagerModal } from './BackupManagerModal';

const {
  mockGetAllCampaigns,
  mockDbAssetsCount,
  mockCreateBackupPackage,
  mockInspectBackupPackage,
  mockRestoreBackupPackage,
} = vi.hoisted(() => ({
  mockGetAllCampaigns: vi.fn(),
  mockDbAssetsCount: vi.fn(),
  mockCreateBackupPackage: vi.fn(),
  mockInspectBackupPackage: vi.fn(),
  mockRestoreBackupPackage: vi.fn(),
}));

vi.mock('../../../db', () => ({
  getAllCampaigns: mockGetAllCampaigns,
  db: {
    assets: {
      count: mockDbAssetsCount,
    },
  },
}));

vi.mock('../../../services/backupPackageService', () => ({
  createBackupPackage: mockCreateBackupPackage,
  inspectBackupPackage: mockInspectBackupPackage,
  restoreBackupPackage: mockRestoreBackupPackage,
}));

describe('BackupManagerModal Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllCampaigns.mockResolvedValue([
      { id: 'c1', title: 'Campaña 1' },
      { id: 'c2', title: 'Campaña 2' },
    ]);
    mockDbAssetsCount.mockResolvedValue(15);
    mockCreateBackupPackage.mockResolvedValue({
      blob: new Blob(['{"test": 1}'], { type: 'application/json' }),
      fileName: 'VisualPlayer_Backup_2026-09-06.vpbackup',
    });
    mockInspectBackupPackage.mockResolvedValue({
      isValid: true,
      campaignNames: ['Campaña 1', 'Campaña 2'],
      totalAssets: 15,
      estimatedSizeStr: '1.2 MB',
    });
    mockRestoreBackupPackage.mockResolvedValue({
      success: true,
      message: '2 campaña(s) restauradas con éxito.',
    });
  });

  it('1. Renderiza la pestaña "Crear Respaldo" con estadísticas de campañas y recursos', async () => {
    const onClose = vi.fn();
    render(<BackupManagerModal isOpen={true} onClose={onClose} />);

    expect(screen.getByText('Respaldos de Campañas (.vpbackup)')).toBeTruthy();
    expect(screen.getByText('Crear Respaldo')).toBeTruthy();
    expect(screen.getByText('Restaurar Copia')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('2')).toBeTruthy();
      expect(screen.getByText('15')).toBeTruthy();
    });

    expect(screen.getByText('Exportar Copia .vpbackup')).toBeTruthy();
  });

  it('2. Ejecuta la exportación al pulsar "Exportar Copia .vpbackup"', async () => {
    const onClose = vi.fn();
    render(<BackupManagerModal isOpen={true} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText('Exportar Copia .vpbackup')).toBeTruthy();
    });

    const exportBtn = screen.getByText('Exportar Copia .vpbackup');
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(mockCreateBackupPackage).toHaveBeenCalled();
      expect(screen.getByText('VisualPlayer_Backup_2026-09-06.vpbackup')).toBeTruthy();
    });
  });

  it('3. Cambia a la pestaña "Restaurar Copia", inspecciona un archivo y permite restaurar', async () => {
    const onClose = vi.fn();
    const onRefresh = vi.fn();

    render(
      <BackupManagerModal
        isOpen={true}
        onClose={onClose}
        onRefreshCampaigns={onRefresh}
      />
    );

    // Click Restore tab
    const restoreTabBtn = screen.getByText('Restaurar Copia');
    fireEvent.click(restoreTabBtn);

    expect(screen.getByText('Tocar para seleccionar archivo .vpbackup')).toBeTruthy();

    // Simulate file selection
    const fileInput = document.getElementById('backupFileInput') as HTMLInputElement;
    const testFile = new File(['test'], 'backup.vpbackup', { type: 'application/octet-stream' });
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    await waitFor(() => {
      expect(mockInspectBackupPackage).toHaveBeenCalledWith(testFile);
      expect(screen.getByText('Paquete Verificado e Íntegro')).toBeTruthy();
      expect(screen.getByText('Confirmar y Restaurar Partida')).toBeTruthy();
    });

    // Confirm restore
    const confirmBtn = screen.getByText('Confirmar y Restaurar Partida');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockRestoreBackupPackage).toHaveBeenCalledWith(testFile, 'copy');
      expect(screen.getByText('2 campaña(s) restauradas con éxito.')).toBeTruthy();
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  it('4. Cierra el modal al hacer clic en el botón de cerrar o en el overlay', () => {
    const onClose = vi.fn();
    const { container } = render(<BackupManagerModal isOpen={true} onClose={onClose} />);

    const closeBtn = screen.getByLabelText('Cerrar modal de respaldos');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    const overlay = container.querySelector('.modal-overlay');
    fireEvent.click(overlay!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
