import type { Campaign, CampaignRecap, RecapSlide } from '../../types';

/**
 * Pure generator to synthesize a safe, zero-spoiler recap draft ("Anteriormente en la campaña...")
 * from confirmed public knowledge entries and world state entries in the campaign.
 */
export function generateRecapDraftFromCampaign(campaign: Campaign): CampaignRecap {
  const slides: RecapSlide[] = [];

  // 1. Extract only confirmed PUBLIC knowledge entries (excluding secret notes and corrected rumors)
  const publicEntries = (campaign.knowledgeEntries || [])
    .filter((entry) => entry.type !== 'secret' && !entry.isCorrected)
    .sort((a, b) => b.revealedAt - a.revealedAt);

  // Take the most recent 3 to 5 public milestones
  const selectedEntries = publicEntries.slice(0, 5).reverse();

  // Find a fallback atmospheric image from existing campaign scenes
  const fallbackSceneImage =
    campaign.scenes && campaign.scenes.length > 0 && campaign.scenes[0].backgroundUrl
      ? campaign.scenes[0].backgroundUrl
      : 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80';

  if (selectedEntries.length > 0) {
    selectedEntries.forEach((entry, idx) => {
      // Find scene if targetId matches or fallback
      const relatedScene = campaign.scenes?.find((s) => s.id === entry.targetId);
      const imageUrl = relatedScene?.backgroundUrl || fallbackSceneImage;

      slides.push({
        id: `slide-${entry.id || idx}`,
        title: entry.title || `Hito ${idx + 1}`,
        text: entry.description,
        imageUrl,
        caption: relatedScene ? `Lugar: ${relatedScene.name}` : undefined,
        durationSeconds: 8,
      });
    });
  }

  // If no public knowledge entries exist yet, construct an introductory opening slide
  if (slides.length === 0) {
    const firstScene = campaign.scenes?.[0];
    slides.push({
      id: 'slide-intro',
      title: 'El Comienzo de la Aventura',
      text: campaign.description || `La historia comienza en las tierras de ${campaign.title}...`,
      imageUrl: firstScene?.backgroundUrl || fallbackSceneImage,
      caption: firstScene ? firstScene.name : undefined,
      durationSeconds: 10,
    });
  }

  return {
    id: `recap-${Date.now()}`,
    title: `Crónica de ${campaign.title}`,
    slides,
    currentSlideIndex: 0,
  };
}

/**
 * Pure slide navigation functions
 */
export function nextRecapSlide(recap: CampaignRecap): CampaignRecap {
  if (recap.slides.length === 0) return recap;
  const nextIndex = Math.min(recap.slides.length - 1, recap.currentSlideIndex + 1);
  return { ...recap, currentSlideIndex: nextIndex };
}

export function prevRecapSlide(recap: CampaignRecap): CampaignRecap {
  if (recap.slides.length === 0) return recap;
  const prevIndex = Math.max(0, recap.currentSlideIndex - 1);
  return { ...recap, currentSlideIndex: prevIndex };
}

export function goToRecapSlide(recap: CampaignRecap, index: number): CampaignRecap {
  if (recap.slides.length === 0) return recap;
  const clampedIndex = Math.max(0, Math.min(recap.slides.length - 1, index));
  return { ...recap, currentSlideIndex: clampedIndex };
}
