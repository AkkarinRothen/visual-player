import React, { Suspense, lazy, useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { App as CapApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import type { Role } from './types';
import { VisualProviders } from './components/ui/VisualProviders';
import { parseAppJoinUrl } from './services/appLinkService';

const Lobby = lazy(() => import('./components/lobby/Lobby').then((module) => ({ default: module.Lobby })));
const PlayerDisplay = lazy(() => import('./components/display/PlayerDisplay').then((module) => ({ default: module.PlayerDisplay })));
const MasterController = lazy(() => import('./components/master/MasterController').then((module) => ({ default: module.MasterController })));
const WorkshopView = lazy(() => import('./components/master/workshop/WorkshopView').then((module) => ({ default: module.WorkshopView })));

interface InitialRoute {
  role: Role;
  roomCode: string;
  pairingSecret: string;
  shouldScrubUrl: boolean;
}

const getInitialRoute = (): InitialRoute => {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.substring(1) : '';
  const hashParams = new URLSearchParams(hash);
  const hashJoin = hashParams.get('join');
  const hashSecret = hashParams.get('secret');

  if (hashJoin) {
    return {
      role: 'master',
      roomCode: hashJoin.toUpperCase(),
      pairingSecret: hashSecret || '',
      shouldScrubUrl: true,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const joinCode = params.get('join');
  const secretParam = params.get('secret');
  const roleParam = params.get('role');

  if (joinCode) {
    return {
      role: 'master',
      roomCode: joinCode.toUpperCase(),
      pairingSecret: secretParam || '',
      shouldScrubUrl: true,
    };
  }

  return {
    role: roleParam === 'display' || roleParam === 'workshop' ? roleParam : 'lobby',
    roomCode: '',
    pairingSecret: '',
    shouldScrubUrl: false,
  };
};

const AppLoading: React.FC = () => (
  <div className="app-loading-screen">
    <div className="app-loading-mark" />
    <span>Visual Player</span>
  </div>
);

const AppErrorFallback: React.FC<FallbackProps & { onExitToLobby: () => void }> = ({
  error,
  resetErrorBoundary,
  onExitToLobby,
}) => {
  const errorMessage = error instanceof Error ? error.message : String(error);

  return (
    <div className="app-error-screen" role="alert">
      <div className="app-error-panel">
        <div className="app-error-icon"><AlertCircle size={28} /></div>
        <span className="app-error-kicker">VISUAL PLAYER</span>
        <h1>No pudimos mostrar esta vista</h1>
        <p>La sesión sigue protegida. Podés reintentar el módulo o volver al inicio.</p>
        {errorMessage && <small>{errorMessage}</small>}
        <div className="app-error-actions">
          <button type="button" className="app-error-secondary" onClick={onExitToLobby}>
            <Home size={16} />
            <span>Volver al inicio</span>
          </button>
          <button type="button" className="app-error-primary" onClick={resetErrorBoundary}>
            <RefreshCw size={16} />
            <span>Reintentar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const [initialRoute] = useState<InitialRoute>(() => getInitialRoute());
  const [role, setRole] = useState<Role>(initialRoute.role);
  const [roomCode, setRoomCode] = useState<string>(initialRoute.roomCode);
  const [pairingSecret, setPairingSecret] = useState<string>(initialRoute.pairingSecret);
  const [initialCheckpointId, setInitialCheckpointId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (initialRoute.shouldScrubUrl) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [initialRoute.shouldScrubUrl]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    void SplashScreen.hide({ fadeOutDuration: 180 });
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const appUrlListener = CapApp.addListener('appUrlOpen', ({ url }) => {
      const joinLink = parseAppJoinUrl(url);
      if (!joinLink) return;

      setRoomCode(joinLink.roomCode);
      setPairingSecret(joinLink.pairingSecret);
      setRole('master');
      window.history.replaceState(null, '', window.location.pathname);
    });

    return () => {
      void appUrlListener.then((listener) => listener.remove()).catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const syncStatusBar = async () => {
      try {
        if (role === 'display') {
          await StatusBar.hide();
          return;
        }

        await StatusBar.show();
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#090a0f' });
      } catch {
        // Status bar controls are optional on web views and older Android versions.
      }
    };

    void syncStatusBar();
  }, [role]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const syncKeepAwake = async () => {
      try {
        if (role === 'display') {
          await KeepAwake.keepAwake();
        } else {
          await KeepAwake.allowSleep();
        }
      } catch {
        // Keep-awake is optional and may be unavailable on some WebViews.
      }
    };

    void syncKeepAwake();
    const appStateListener = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (role !== 'display') return;
      void (isActive ? KeepAwake.keepAwake() : KeepAwake.allowSleep()).catch(() => {});
    });

    return () => {
      if (role === 'display') {
        void KeepAwake.allowSleep().catch(() => {});
      }
      void appStateListener.then((listener) => listener.remove()).catch(() => {});
    };
  }, [role]);

  const handleSelectRole = (selectedRole: Role, code?: string, checkpointId?: string) => {
    if (code) {
      setRoomCode(code);
    }
    setInitialCheckpointId(checkpointId || undefined);
    setRole(selectedRole);
  };

  return (
    <VisualProviders>
      <div className="visual-player-app" style={{ width: '100%', height: '100%' }}>
        <ErrorBoundary
          resetKeys={[role, roomCode]}
          fallbackRender={(fallbackProps) => (
            <AppErrorFallback {...fallbackProps} onExitToLobby={() => setRole('lobby')} />
          )}
        >
          <Suspense fallback={<AppLoading />}>
            {role === 'lobby' && <Lobby onSelectRole={handleSelectRole} />}
            {role === 'display' && (
              <PlayerDisplay
                initialRoomCode={roomCode}
                onExitToLobby={() => setRole('lobby')}
              />
            )}
            {role === 'master' && (
              <MasterController
                initialRoomCode={roomCode}
                pairingSecret={pairingSecret}
                initialCheckpointId={initialCheckpointId}
                onExitToLobby={() => setRole('lobby')}
              />
            )}
            {role === 'workshop' && (
              <WorkshopView onExitToLobby={() => setRole('lobby')} />
            )}
          </Suspense>
        </ErrorBoundary>
      </div>
    </VisualProviders>
  );
};

export default App;
