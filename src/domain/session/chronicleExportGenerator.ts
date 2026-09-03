import type {
  Campaign,
  DisplayState,
  PublicChronicleDraft,
  PublicKnowledgeItem,
} from '../../types';

export function sanitizeExportText(str: string): string {
  if (!str) return '';
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .trim();
}

/**
 * Generates a public-safe chronicle draft exclusively using allowed public fields.
 * Explicitly excludes DM private notes, unrevealed secrets, hidden identities, and technical telemetry.
 */
export function generatePublicChronicleDraft(
  campaign: Campaign | null,
  liveState?: DisplayState
): PublicChronicleDraft {
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const campaignTitle = campaign?.title || 'Campaña Sin Título';

  // 1. Extract only valid, confirmed public knowledge entries (no corrections, no secrets, no private notes)
  const publicKnowledgeEntries: PublicKnowledgeItem[] = (campaign?.knowledgeEntries || [])
    .filter((k) => !k.isCorrected && k.type !== 'secret')
    .map((k) => ({
      id: k.id,
      title: sanitizeExportText(k.title),
      category: sanitizeExportText(
        k.type === 'clue'
          ? 'Pista'
          : k.type === 'npc_identity'
          ? 'Identidad'
          : k.type === 'npc_appearance'
          ? 'Apariencia'
          : 'General'
      ),
      summary: sanitizeExportText(k.description),
    }));

  // 2. Extract public milestones from confirmed recap slides or active scene
  const keyMilestones: string[] = [];
  if (campaign?.savedRecap?.slides && campaign.savedRecap.slides.length > 0) {
    for (const slide of campaign.savedRecap.slides) {
      if (slide.title) {
        const line = slide.caption
          ? `**${sanitizeExportText(slide.title)}:** ${sanitizeExportText(slide.caption)}`
          : sanitizeExportText(slide.title);
        keyMilestones.push(line);
      }
    }
  } else if (liveState?.sceneName) {
    keyMilestones.push(`Los héroes exploran el escenario de **${sanitizeExportText(liveState.sceneName)}**.`);
  } else {
    keyMilestones.push('El grupo continuó su travesía encarando nuevos misterios y decisiones cruciales.');
  }

  // 3. Extract active quests or objectives
  const activeQuestsOrObjectives: string[] = [];
  if (campaign?.sessionPrepDraft?.dmSessionGoals) {
    activeQuestsOrObjectives.push(sanitizeExportText(campaign.sessionPrepDraft.dmSessionGoals));
  }
  if (campaign?.worldStateEntries && campaign.worldStateEntries.length > 0) {
    for (const entry of campaign.worldStateEntries) {
      if (entry.targetName && entry.state) {
        activeQuestsOrObjectives.push(
          `${sanitizeExportText(entry.targetName)}: ${sanitizeExportText(entry.state)}`
        );
      }
    }
  }
  if (activeQuestsOrObjectives.length === 0) {
    activeQuestsOrObjectives.push('Investigar los últimos acontecimientos y determinar el próximo destino.');
  }

  return {
    title: `Crónica de Sesión: ${campaignTitle}`,
    campaignTitle,
    sessionDateLabel: dateFormatted,
    generatedAt: Date.now(),
    synopsis:
      'En esta sesión, los aventureros avanzaron en su viaje enfrentando desafíos decisivos que alteraron el curso de la historia.',
    keyMilestones,
    publicKnowledgeEntries,
    activeQuestsOrObjectives,
    dmClosingNotes:
      '¡Gran sesión! Revisad vuestros recursos e inventario antes de la próxima partida.',
  };
}

/**
 * Formats a PublicChronicleDraft into an elegant, portable Markdown document.
 */
export function formatChronicleToMarkdown(draft: PublicChronicleDraft): string {
  const sections: string[] = [];

  // Document Title & Metadata
  sections.push(`# ${sanitizeExportText(draft.title)}`);
  sections.push(
    `> **Campaña:** ${sanitizeExportText(draft.campaignTitle)} | **Fecha de Sesión:** ${sanitizeExportText(
      draft.sessionDateLabel
    )} | *Generado por Visual Player*`
  );
  sections.push('');

  // Synopsis
  if (draft.synopsis) {
    sections.push('## 📖 Sinopsis de la Sesión');
    sections.push(sanitizeExportText(draft.synopsis));
    sections.push('');
  }

  // Key Milestones
  if (draft.keyMilestones.length > 0) {
    sections.push('## ⚔️ Hitos y Acontecimientos Clave');
    for (const milestone of draft.keyMilestones) {
      sections.push(`- ${sanitizeExportText(milestone)}`);
    }
    sections.push('');
  }

  // Public Knowledge & Discoveries
  if (draft.publicKnowledgeEntries.length > 0) {
    sections.push('## 📜 Descubrimientos y Revelaciones Públicas');
    for (const item of draft.publicKnowledgeEntries) {
      sections.push(`### 🔹 ${sanitizeExportText(item.title)} *(${sanitizeExportText(item.category)})*`);
      sections.push(sanitizeExportText(item.summary));
      sections.push('');
    }
  }

  // Active Quests / Objectives
  if (draft.activeQuestsOrObjectives.length > 0) {
    sections.push('## 🎯 Objetivos y Próximos Pasos');
    for (const obj of draft.activeQuestsOrObjectives) {
      sections.push(`- [ ] ${sanitizeExportText(obj)}`);
    }
    sections.push('');
  }

  // Closing Notes
  if (draft.dmClosingNotes) {
    sections.push('## ✍️ Notas de la Mesa');
    sections.push(`*${sanitizeExportText(draft.dmClosingNotes)}*`);
    sections.push('');
  }

  return sections.join('\n');
}
