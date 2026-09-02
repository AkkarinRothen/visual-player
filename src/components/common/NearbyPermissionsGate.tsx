/**
 * NearbyPermissionsGate.tsx
 *
 * Componente que gestiona el flujo de solicitud de permisos Nearby
 * de forma progresiva y contextual antes de intentar la conexión local.
 *
 * - Muestra rationale propio antes del diálogo del sistema.
 * - Si están todos concedidos, invoca onPermissionsGranted() directamente.
 * - Si hay alguno permanentemente denegado, muestra botón "Abrir Ajustes".
 * - Un rechazo no bloquea el resto de la app: ofrece fallback a WebRTC.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bluetooth,
  Wifi,
  MapPin,
  ShieldCheck,
  ShieldX,
  Settings,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import {
  nearbyPermissionsService,
  type PermissionCheckResult,
  type NearbyPermission,
  type PermissionRationale,
} from '../../services/nearbyPermissionsService';
import { Capacitor } from '@capacitor/core';

interface NearbyPermissionsGateProps {
  role: 'display' | 'master';
  onPermissionsGranted: () => void;
  onFallbackToWebRTC: () => void;
  onCancel: () => void;
}

const PERMISSION_ICONS: Partial<Record<NearbyPermission, React.ReactNode>> = {
  BLUETOOTH_SCAN: <Bluetooth size={18} />,
  BLUETOOTH_CONNECT: <Bluetooth size={18} />,
  BLUETOOTH_ADVERTISE: <Bluetooth size={18} />,
  NEARBY_WIFI_DEVICES: <Wifi size={18} />,
  ACCESS_FINE_LOCATION: <MapPin size={18} />,
  ACCESS_COARSE_LOCATION: <MapPin size={18} />,
  CHANGE_WIFI_STATE: <Wifi size={18} />,
  ACCESS_WIFI_STATE: <Wifi size={18} />,
};

export const NearbyPermissionsGate: React.FC<NearbyPermissionsGateProps> = ({
  role,
  onPermissionsGranted,
  onFallbackToWebRTC,
  onCancel,
}) => {
  const [step, setStep] = useState<'checking' | 'rationale' | 'requesting' | 'done' | 'failed'>(
    'checking'
  );
  const [checkResult, setCheckResult] = useState<PermissionCheckResult | null>(null);
  const [rationales, setRationales] = useState<PermissionRationale[]>([]);
  const [isNative] = useState(Capacitor.isNativePlatform());

  const checkPermissions = useCallback(async () => {
    setStep('checking');
    if (!isNative) {
      // Non-native (web): no permissions needed
      onPermissionsGranted();
      return;
    }
    const result = await nearbyPermissionsService.checkPermissionsForRole(role);
    setCheckResult(result);

    if (result.canProceed) {
      onPermissionsGranted();
      return;
    }

    // Build rationale for missing permissions
    const rationaleList = result.missingCritical
      .filter((p) => result.permissions[p] !== 'not_required')
      .map((p) => nearbyPermissionsService.getRationale(p));

    setRationales(rationaleList);
    setStep('rationale');
  }, [role, isNative, onPermissionsGranted]);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  const handleRequestPermissions = async () => {
    setStep('requesting');
    const result = await nearbyPermissionsService.requestPermissionsForRole(role);
    setCheckResult(result);

    if (result.canProceed) {
      setStep('done');
      onPermissionsGranted();
    } else if (result.permanentlyDenied.length > 0) {
      setStep('failed');
    } else {
      // Denied but can retry - show rationale again
      const rationaleList = result.missingCritical
        .filter((p) => result.permissions[p] !== 'not_required')
        .map((p) => nearbyPermissionsService.getRationale(p));
      setRationales(rationaleList);
      setStep('rationale');
    }
  };

  const openDeviceSettings = () => {
    // Capacitor App plugin can open app settings
    const { App } = (window as any)?.Capacitor?.Plugins ?? {};
    App?.openUrl?.({ url: 'app-settings:' });
  };

  if (step === 'checking' || step === 'done' || !isNative) {
    return null;
  }

  if (step === 'requesting') {
    return (
      <div style={overlayStyle}>
        <div style={cardStyle}>
          <div style={{ ...spinnerStyle }} aria-label="Solicitando permisos..." />
          <p style={{ color: '#a3a3a3', fontSize: '14px', margin: 0 }}>
            Solicitando permisos de conexión local...
          </p>
        </div>
      </div>
    );
  }

  const hasPermanentlyDenied = checkResult?.permanentlyDenied && checkResult.permanentlyDenied.length > 0;

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-label="Permisos de conexión local">
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          {step === 'failed' ? (
            <ShieldX size={28} color="#ef4444" />
          ) : (
            <ShieldCheck size={28} color="#10b981" />
          )}
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#f5f5f5' }}>
            {step === 'failed' ? 'Permisos Denegados' : 'Permisos para Conexión Local'}
          </h2>
        </div>

        <p style={{ margin: 0, fontSize: '13px', color: '#a3a3a3', lineHeight: 1.5 }}>
          {step === 'failed'
            ? 'Algunos permisos fueron denegados permanentemente. Ve a los ajustes del dispositivo para habilitarlos.'
            : 'Para conectar tu celular con la Tablet sin Internet, la app necesita los siguientes permisos:'}
        </p>

        {/* Permission List */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            width: '100%',
            maxHeight: '240px',
            overflowY: 'auto',
          }}
        >
          {rationales.map((r) => (
            <div
              key={r.permission}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                background: 'rgba(255,255,255,0.04)',
                borderRadius: '10px',
                padding: '10px 12px',
                border: r.isPermanentlyDenied
                  ? '1px solid rgba(239,68,68,0.4)'
                  : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <span style={{ color: r.isPermanentlyDenied ? '#ef4444' : '#10b981', marginTop: 2 }}>
                {PERMISSION_ICONS[r.permission] ?? <Wifi size={18} />}
              </span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#f5f5f5', marginBottom: '2px' }}>
                  {r.title}
                  {r.isPermanentlyDenied && (
                    <span
                      style={{
                        fontSize: '11px',
                        color: '#fca5a5',
                        marginLeft: '8px',
                        fontWeight: 400,
                      }}
                    >
                      · Denegado permanentemente
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#737373', lineHeight: 1.4 }}>
                  {r.explanation}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
          {step === 'failed' || hasPermanentlyDenied ? (
            <button
              id="nearby-open-settings"
              onClick={openDeviceSettings}
              style={{ ...primaryBtnStyle, background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}
              aria-label="Abrir ajustes del dispositivo para habilitar permisos"
            >
              <Settings size={18} />
              <span>Abrir Ajustes</span>
            </button>
          ) : (
            <button
              id="nearby-request-permissions"
              onClick={handleRequestPermissions}
              style={primaryBtnStyle}
              aria-label="Conceder permisos para conexión local"
            >
              <ArrowRight size={18} />
              <span>Conceder Permisos</span>
            </button>
          )}

          <button
            id="nearby-fallback-webrtc"
            onClick={onFallbackToWebRTC}
            style={secondaryBtnStyle}
            aria-label="Usar Internet en su lugar"
          >
            <Wifi size={16} />
            <span>Usar Internet en su lugar</span>
          </button>

          <button
            id="nearby-cancel"
            onClick={onCancel}
            style={{ ...secondaryBtnStyle, opacity: 0.6 }}
            aria-label="Cancelar"
          >
            <span>Cancelar</span>
          </button>
        </div>

        {/* Info Footer */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <AlertTriangle size={14} style={{ color: '#737373', flexShrink: 0, marginTop: 1 }} />
          <p style={{ margin: 0, fontSize: '11px', color: '#525252', lineHeight: 1.5 }}>
            Si rechazas, la app seguirá funcionando con Internet. Los permisos se pueden conceder
            más adelante desde la pantalla de conexión local.
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 9000,
  background: 'rgba(2, 6, 23, 0.94)',
  backdropFilter: 'blur(12px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
};

const cardStyle: React.CSSProperties = {
  background: 'rgba(23, 23, 23, 0.97)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '20px',
  padding: '28px',
  maxWidth: '440px',
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: '16px',
  color: '#f5f5f5',
  boxShadow: '0 24px 48px -8px rgba(0,0,0,0.8)',
};

const primaryBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '12px',
  borderRadius: '10px',
  background: 'linear-gradient(135deg, #10b981, #059669)',
  border: 'none',
  color: '#fff',
  fontWeight: 700,
  fontSize: '14px',
  cursor: 'pointer',
};

const secondaryBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '10px',
  borderRadius: '10px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#a3a3a3',
  fontWeight: 600,
  fontSize: '13px',
  cursor: 'pointer',
};

const spinnerStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: '50%',
  border: '3px solid rgba(255,255,255,0.1)',
  borderTopColor: '#10b981',
  animation: 'spin 0.8s linear infinite',
};
