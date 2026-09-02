import React from 'react';
import { Sparkles } from 'lucide-react';
import type { CharacterOnScreen } from '../../types';

interface DisplayCharactersLayerProps {
  characters: CharacterOnScreen[];
}

export const DisplayCharactersLayer: React.FC<DisplayCharactersLayerProps> = ({ characters }) => {
  return (
    <div className="characters-container">
      {characters.map((char) => (
        <div
          key={char.id}
          className={`character-card ${char.isSpeaking ? 'speaking' : ''}`}
          style={{
            left: `${char.position}%`,
          }}
        >
          <div className="avatar-wrapper">
            <img src={char.avatarUrl} alt={char.name} className="character-avatar" />
            {char.isSpeaking && (
              <div className="speaking-indicator">
                <Sparkles size={16} />
              </div>
            )}
          </div>
          <div className="character-tag">
            <span className="char-name">{char.name}</span>
            {char.activeExpression && <span className="char-expression">({char.activeExpression})</span>}
          </div>
        </div>
      ))}
    </div>
  );
};
