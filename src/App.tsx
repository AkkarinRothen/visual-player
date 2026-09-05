import React, { Suspense, lazy, useState, useEffect } from 'react';
import type { Role } from './types';
import { VisualProviders } from './components/ui/VisualProviders';

const Lobby = lazy(() => import('./components/lobby/Lobby').then((module) => ({ default: module.Lobby })));
const PlayerDisplay = lazy(() => import('./components/display/PlayerDisplay').then((module) => ({ default: module.PlayerDisplay })));
const MasterController = lazy(() => import('./components/master/MasterController').then((module) => ({ default: module.MasterController })));
const WorkshopView = lazy(() => import('./components/master/workshop/WorkshopView').then((module) => ({ default: module.WorkshopView })));

const AppLoading: React.FC = () => (
  <div className="app-loading-screen">
    <div className="app-loading-mark" />
    <span>Visual Player</span>
  </div>
);

export const App: React.FC = () => {
  const [role, setRole] = useState<Role>('lobby');
  const [roomCode, setRoomCode] = useState<string>('');
  const [pairingSecret, setPairingSecret] = useState<string>('');

  useEffect(() => {
    // 1. Check Fragment Hash (#join=VP-XXXX&secret=HEX128) for secure Zero-Leak pairing
    const hash = window.location.hash.startsWith('#') ? window.location.hash.substring(1) : '';
    const hashParams = new URLSearchParams(hash);
    const hashJoin = hashParams.get('join');
    const hashSecret = hashParams.get('secret');

    if (hashJoin) {
      setRoomCode(hashJoin.toUpperCase());
      if (hashSecret) {
        setPairingSecret(hashSecret);
      }
      setRole('master');

      // Immediately scrub the secret from the browser address bar & history
      window.history.replaceState(null, '', window.location.pathname);
      return;
    }

    // 2. Fallback to standard query parameters
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    const secretParam = params.get('secret');
    const roleParam = params.get('role');

    if (joinCode) {
      setRoomCode(joinCode.toUpperCase());
      if (secretParam) {
        setPairingSecret(secretParam);
      }
      setRole('master');
      window.history.replaceState(null, '', window.location.pathname);
    } else if (roleParam === 'display') {
      setRole('display');
    } else if (roleParam === 'workshop') {
      setRole('workshop');
    }
  }, []);

  const handleSelectRole = (selectedRole: Role, code?: string) => {
    if (code) {
      setRoomCode(code);
    }
    setRole(selectedRole);
  };

  return (
    <VisualProviders>
      <div className="visual-player-app" style={{ width: '100%', height: '100%' }}>
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
              onExitToLobby={() => setRole('lobby')}
            />
          )}
          {role === 'workshop' && (
            <WorkshopView onExitToLobby={() => setRole('lobby')} />
          )}
        </Suspense>
      </div>
    </VisualProviders>
  );
};

export default App;
