import React, { useState, useEffect } from 'react';
import type { Role } from './types';
import { Lobby } from './components/lobby/Lobby';
import { PlayerDisplay } from './components/display/PlayerDisplay';
import { MasterController } from './components/master/MasterController';

export const App: React.FC = () => {
  const [role, setRole] = useState<Role>('lobby');
  const [roomCode, setRoomCode] = useState<string>('');

  useEffect(() => {
    // Check URL parameters for direct linking
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    const roleParam = params.get('role');

    if (joinCode) {
      setRoomCode(joinCode.toUpperCase());
      setRole('master');
    } else if (roleParam === 'display') {
      setRole('display');
    }
  }, []);

  const handleSelectRole = (selectedRole: Role, code?: string) => {
    if (code) {
      setRoomCode(code);
    }
    setRole(selectedRole);
  };

  return (
    <div className="visual-player-app" style={{ width: '100%', height: '100%' }}>
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
          onExitToLobby={() => setRole('lobby')}
        />
      )}
    </div>
  );
};

export default App;
