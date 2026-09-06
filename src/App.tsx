import React, { Suspense, lazy, useState, useEffect } from 'react';
import type { Role } from './types';
import { VisualProviders } from './components/ui/VisualProviders';

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

export const App: React.FC = () => {
  const [initialRoute] = useState<InitialRoute>(() => getInitialRoute());
  const [role, setRole] = useState<Role>(initialRoute.role);
  const [roomCode, setRoomCode] = useState<string>(initialRoute.roomCode);
  const [pairingSecret] = useState<string>(initialRoute.pairingSecret);

  useEffect(() => {
    if (initialRoute.shouldScrubUrl) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [initialRoute.shouldScrubUrl]);

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
