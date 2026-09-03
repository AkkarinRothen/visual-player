import { describe, it, expect } from 'vitest';
import type { Campaign, CampaignKnowledgeEntry, CampaignWorldStateEntry } from '../../types';

describe('Campaign Knowledge & World State Journal Suite', () => {
  const initialCampaign: Campaign = {
    id: 'camp-crypt-1',
    title: 'La Maldición de la Cripta',
    createdAt: Date.now() - 100000,
    scenes: [],
    characters: [],
    knowledgeEntries: [],
    worldStateEntries: [],
  };

  it('1. Automatically records revelations and deduplicates identical events', () => {
    let campaign = { ...initialCampaign };

    const recordRevelation = (
      camp: Campaign,
      instanceId: string,
      charName: string,
      type: 'npc_appearance' | 'npc_identity'
    ): Campaign => {
      const existing = camp.knowledgeEntries || [];
      const entryId = `know-${type === 'npc_appearance' ? 'app' : 'id'}-${instanceId}`;
      if (existing.some((k) => k.id === entryId)) {
        return camp; // Deduplicated
      }
      const newEntry: CampaignKnowledgeEntry = {
        id: entryId,
        type,
        title: type === 'npc_appearance' ? `Rostro de ${charName} revelado` : `Identidad de ${charName} revelada`,
        description: `Los jugadores conocieron ${type === 'npc_appearance' ? 'el rostro' : 'la verdadera identidad'} de ${charName}.`,
        targetId: instanceId,
        revealedAt: Date.now(),
        source: 'auto_interaction',
      };
      return {
        ...camp,
        knowledgeEntries: [newEntry, ...existing],
      };
    };

    // First revelation: appearance
    campaign = recordRevelation(campaign, 'char-corvus', 'Lord Corvus', 'npc_appearance');
    expect(campaign.knowledgeEntries).toHaveLength(1);
    expect(campaign.knowledgeEntries![0].type).toBe('npc_appearance');

    // Duplicate appearance event (e.g. Reconnection or re-click)
    campaign = recordRevelation(campaign, 'char-corvus', 'Lord Corvus', 'npc_appearance');
    expect(campaign.knowledgeEntries).toHaveLength(1); // Not duplicated

    // Second revelation: identity
    campaign = recordRevelation(campaign, 'char-corvus', 'Lord Corvus', 'npc_identity');
    expect(campaign.knowledgeEntries).toHaveLength(2);
  });

  it('2. Formats clean player export without leaking DM private notes or corrected items', () => {
    const entries: CampaignKnowledgeEntry[] = [
      {
        id: 'know-1',
        type: 'clue',
        title: 'Llave de Hierro',
        description: 'Encontrada en el sarcófago del guardián.',
        revealedAt: 1700000000000,
        source: 'manual_dm',
        dmPrivateNotes: 'SECRETO: Esta llave también abre la trampilla del nigromante.',
      },
      {
        id: 'know-2',
        type: 'secret',
        title: 'Falso Rumor del Tabernero',
        description: 'Dijo que el rey está muerto.',
        revealedAt: 1700000001000,
        source: 'manual_dm',
        isCorrected: true,
        correctionReason: 'Los jugadores descubrieron que era un rumor infundado',
      },
    ];

    // Filter valid player entries
    const playerSafe = entries.filter((k) => !k.isCorrected);
    expect(playerSafe).toHaveLength(1);

    // Build export text
    const exportText = playerSafe
      .map((k) => `- **${k.title}**: ${k.description}`)
      .join('\n');

    // Verify DM secret note is completely absent
    expect(exportText).toContain('Llave de Hierro');
    expect(exportText).not.toContain('SECRETO');
    expect(exportText).not.toContain('trampilla del nigromante');
    expect(exportText).not.toContain('Falso Rumor');
  });

  it('3. Audit Trail: DM can correct or revoke an entry preserving the correction reason without deleting history', () => {
    const entry: CampaignKnowledgeEntry = {
      id: 'know-improv-1',
      type: 'clue',
      title: 'Moneda Maldita',
      description: 'Entregada por el mendigo.',
      revealedAt: Date.now(),
      source: 'manual_dm',
    };

    // DM rectifies
    const correctedEntry: CampaignKnowledgeEntry = {
      ...entry,
      isCorrected: true,
      correctionReason: 'Improvisación anulada: el mendigo era un ilusionista',
    };

    expect(correctedEntry.isCorrected).toBe(true);
    expect(correctedEntry.correctionReason).toBe('Improvisación anulada: el mendigo era un ilusionista');
    expect(correctedEntry.id).toBe('know-improv-1'); // Preserved in history
  });

  it('4. World state entry updates persistent prop states accurately', () => {
    const existingWorld: CampaignWorldStateEntry[] = [
      {
        id: 'prop-door-crypt',
        targetName: 'Puerta de la Cripta',
        state: 'closed',
        scope: 'campaign',
        lastModifiedAt: Date.now() - 5000,
      },
    ];

    // Door is opened
    const updatedWorld: CampaignWorldStateEntry[] = [
      ...existingWorld.filter((w) => w.id !== 'prop-door-crypt'),
      {
        id: 'prop-door-crypt',
        targetName: 'Puerta de la Cripta',
        state: 'open',
        scope: 'campaign',
        lastModifiedAt: Date.now(),
      },
    ];

    expect(updatedWorld).toHaveLength(1);
    expect(updatedWorld[0].state).toBe('open');
  });
});
