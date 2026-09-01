import React, { useState, useEffect } from 'react';
import type { ConnectionStatus, DisplayState } from '../../types';
import type { ChaosConfig } from '../../domain/protocol/transport';
import { peerService } from '../../services/peerService';
import { iceTelemetry, type IceTelemetrySnapshot } from '../../services/iceTelemetry';
import {
  Activity,
  X,
  Wifi,
  WifiOff,
  RotateCcw,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Server,
} from 'lucide-react';

interface NetworkDiagnosticsModalProps {
  roomCode: string;
  connectionStatus: ConnectionStatus;
  latencyMs: number;
  liveState: DisplayState;
  onForceResync: () => void;
  onClose: () => void;
}

export const NetworkDiagnosticsModal: React.FC<NetworkDiagnosticsModalProps> = ({
  roomCode,
  connectionStatus,
  latencyMs,
  onForceResync,
  onClose,
}) => {
  const [chaos, setChaos] = useState<ChaosConfig>(peerService.getChaosConfig());
  const [forceRelay, setForceRelay] = useState<boolean>(peerService.getForceRelayOnly());
  const [telemetry, setTelemetry] = useState<IceTelemetrySnapshot>(iceTelemetry.getSnapshot());

  useEffect(() => {
    setChaos(peerService.getChaosConfig());
    setForceRelay(peerService.getForceRelayOnly());

    const unsub = iceTelemetry.onTelemetry((snap) => {
      setTelemetry(snap);
    });

    return () => unsub();
  }, []);

  const applyChaos = (updated: Partial<ChaosConfig>) => {
    const next = { ...chaos, ...updated };
    setChaos(next);
    peerService.setChaosConfig(next);
  };

  const applyPreset = (preset: 'optimal' | 'wifi_unstable' | 'slow_3g' | 'partitioned') => {
    switch (preset) {
      case 'optimal':
        applyChaos({ latencyMs: 0, packetLossRate: 0, duplicationRate: 0, isPartitioned: false });
        break;
      case 'wifi_unstable':
        applyChaos({ latencyMs: 120, packetLossRate: 0.15, duplicationRate: 0, isPartitioned: false });
        break;
      case 'slow_3g':
        applyChaos({ latencyMs: 350, packetLossRate: 0.3, duplicationRate: 0.1, isPartitioned: false });
        break;
      case 'partitioned':
        applyChaos({ isPartitioned: true });
        break;
    }
  };

  const handleReset = () => {
    peerService.resetChaos();
    setChaos(peerService.getChaosConfig());
  };

  const handleToggleForceRelay = async (val: boolean) => {
    setForceRelay(val);
    peerService.setForceRelayOnly(val);
    // Re-connect to apply the new ICE transport policy (relay vs all)
    await peerService.connectAsMaster(roomCode);
  };

  const isChaosActive = peerService.isChaosActive();

  const getCandidateBadge = () => {
    if (telemetry.candidateType === 'host') {
      return (
        <span className="ice-badge host">
          🏠 Red Local Directa (host)
        </span>
      );
    }
    if (telemetry.candidateType === 'srflx' || telemetry.candidateType === 'prflx') {
      return (
        <span className="ice-badge srflx">
          🌐 NAT Directo STUN (srflx)
        </span>
      );
    }
    if (telemetry.candidateType === 'relay' || telemetry.isRelay) {
      return (
        <span className="ice-badge relay">
          🔄 Servidor Relay TURN (relay)
        </span>
      );
    }
    return (
      <span className="ice-badge unknown">
        ⚡ Negociando Candidatos ICE...
      </span>
    );
  };

  return (
    <div className="modal-overlay diagnostics-modal-overlay" onClick={onClose}>
      <div className="modal-content diagnostics-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex-align-gap">
            <Activity size={20} className="text-amber-400" />
            <h2>Diagnóstico ICE & Modo Caos WebRTC</h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <p className="modal-subtitle">
          Telemetría en tiempo real del enlace ICE/TURN, detección de NAT simétrico e inyector de fallos para evaluar la convergencia.
        </p>

        {/* 1. Live Connection & ICE Telemetry Metrics */}
        <div className="diagnostics-metrics-grid">
          <div className="diag-metric-card">
            <span className="metric-label">Estado de Conexión</span>
            <div className="flex-align-gap mt-1">
              {connectionStatus === 'connected' ? (
                <Wifi size={16} className="text-emerald-400" />
              ) : (
                <WifiOff size={16} className="text-rose-400" />
              )}
              <strong className={`status-text ${connectionStatus}`}>{connectionStatus.toUpperCase()}</strong>
            </div>
            <span className="metric-sub">PIN de Sala: {roomCode}</span>
          </div>

          <div className="diag-metric-card">
            <span className="metric-label">Latencia RTT Real</span>
            <span className="metric-value text-amber-400">{latencyMs} ms</span>
            <span className="metric-sub">Protocolo v1 (SyncMessage)</span>
          </div>
        </div>

        {/* 2. ICE Candidate Telemetry Inspector Card */}
        <div className="ice-telemetry-box">
          <div className="flex-between mb-1">
            <div className="flex-align-gap">
              <Server size={16} className="text-indigo-400" />
              <strong>Tipo de Enlace ICE Activo:</strong>
            </div>
            {getCandidateBadge()}
          </div>

          <div className="ice-details-grid">
            <div className="ice-detail-item">
              <span>Protocolo:</span>
              <strong>{telemetry.protocol.toUpperCase()}</strong>
            </div>
            <div className="ice-detail-item">
              <span>ICE State:</span>
              <strong>{telemetry.connectionState}</strong>
            </div>
            <div className="ice-detail-item">
              <span>Candidato Remoto:</span>
              <strong>{telemetry.remoteCandidateType}</strong>
            </div>
          </div>

          {/* Force Relay (TURN) Test Switch */}
          <div className="force-relay-row">
            <label className="checkbox-pill-lg">
              <input
                type="checkbox"
                checked={forceRelay}
                onChange={(e) => handleToggleForceRelay(e.target.checked)}
              />
              <ShieldCheck size={16} className="text-emerald-400" />
              <span>
                <strong>Forzar Modo Solo Relay (TURN)</strong> (Prueba de NAT Simétrico)
              </span>
            </label>
          </div>
        </div>

        {/* 3. Resync Action Bar */}
        <div className="resync-action-box">
          <div className="resync-info">
            <strong>Resincronización de Emergencia:</strong>
            <span>Envía un `FULL_STATE` transaccional forzado para reparar discrepancias visuales.</span>
          </div>
          <button className="btn-primary-sm" onClick={onForceResync}>
            <RefreshCw size={14} />
            <span>⚡ Forzar FULL_STATE</span>
          </button>
        </div>

        {/* 4. Chaos Simulation Section (DEV) */}
        <div className="chaos-section">
          <div className="flex-between mb-2">
            <div className="flex-align-gap">
              <Sliders size={16} className="text-rose-400" />
              <strong className="text-white">Simulador de Caos de Red</strong>
            </div>
            {isChaosActive && <span className="chaos-active-badge">⚠️ CAOS ACTIVO</span>}
          </div>

          {/* Presets */}
          <div className="chaos-presets-row">
            <button
              className={`preset-btn ${!isChaosActive ? 'active' : ''}`}
              onClick={() => applyPreset('optimal')}
            >
              🟢 Red Normal (0ms)
            </button>
            <button
              className={`preset-btn ${chaos.latencyMs === 120 ? 'active' : ''}`}
              onClick={() => applyPreset('wifi_unstable')}
            >
              🟡 WiFi Inestable (120ms + 15%)
            </button>
            <button
              className={`preset-btn ${chaos.latencyMs === 350 ? 'active' : ''}`}
              onClick={() => applyPreset('slow_3g')}
            >
              🟠 3G Débil (350ms + 30%)
            </button>
            <button
              className={`preset-btn ${chaos.isPartitioned ? 'active danger' : ''}`}
              onClick={() => applyPreset('partitioned')}
            >
              🔴 Corte Total
            </button>
          </div>

          {/* Sliders */}
          <div className="chaos-sliders-list">
            <div className="chaos-slider-row">
              <div className="flex-between">
                <span>Latencia Artificial:</span>
                <strong>{chaos.latencyMs} ms</strong>
              </div>
              <input
                type="range"
                min="0"
                max="800"
                step="25"
                value={chaos.latencyMs}
                onChange={(e) => applyChaos({ latencyMs: parseInt(e.target.value) || 0 })}
                className="master-range"
              />
            </div>

            <div className="chaos-slider-row">
              <div className="flex-between">
                <span>Pérdida de Paquetes:</span>
                <strong>{Math.round(chaos.packetLossRate * 100)}%</strong>
              </div>
              <input
                type="range"
                min="0"
                max="0.8"
                step="0.05"
                value={chaos.packetLossRate}
                onChange={(e) => applyChaos({ packetLossRate: parseFloat(e.target.value) || 0 })}
                className="master-range"
              />
            </div>

            <div className="chaos-slider-row">
              <div className="flex-between">
                <span>Duplicación de Paquetes:</span>
                <strong>{Math.round(chaos.duplicationRate * 100)}%</strong>
              </div>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.05"
                value={chaos.duplicationRate}
                onChange={(e) => applyChaos({ duplicationRate: parseFloat(e.target.value) || 0 })}
                className="master-range"
              />
            </div>

            <label className="checkbox-pill-lg">
              <input
                type="checkbox"
                checked={chaos.isPartitioned}
                onChange={(e) => applyChaos({ isPartitioned: e.target.checked })}
              />
              <span>🚫 Cortar conexión completamente (Partición de Red)</span>
            </label>
          </div>

          {/* Reset Button */}
          <div className="chaos-footer">
            <button className="btn-secondary-sm" onClick={handleReset}>
              <RotateCcw size={14} />
              <span>Restablecer Red Normal</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <button className="btn-primary full mt-2" onClick={onClose}>
          Cerrar Diagnóstico
        </button>
      </div>
    </div>
  );
};
