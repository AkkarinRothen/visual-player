import type { Campaign, SavedEncounter } from '../types';
import { db } from './index';
import { DEMO_CAMPAIGN } from './demoData';

// ─── Campaign CRUD ────────────────────────────────────────────────────────────

export async function getAllCampaigns(): Promise<Campaign[]> {
  return await db.campaigns.toArray();
}

export async function getActiveCampaignId(): Promise<string> {
  const setting = await db.settings.get('activeCampaignId');
  if (setting) return setting.value;
  return DEMO_CAMPAIGN.id;
}

export async function setActiveCampaignId(id: string): Promise<void> {
  await db.settings.put({ key: 'activeCampaignId', value: id });
}

export async function createCampaign(camp: Campaign): Promise<void> {
  await db.campaigns.put(camp);
  await setActiveCampaignId(camp.id);
}

export async function updateCampaign(camp: Campaign): Promise<void> {
  camp.updatedAt = Date.now();
  await db.campaigns.put(camp);
}

export async function duplicateCampaign(id: string): Promise<Campaign | null> {
  const original = await db.campaigns.get(id);
  if (!original) return null;

  const duplicated: Campaign = {
    ...original,
    id: `campaign-${Date.now()}`,
    title: `${original.title} (Copia)`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await db.campaigns.put(duplicated);
  return duplicated;
}

export async function deleteCampaign(id: string): Promise<void> {
  await db.campaigns.delete(id);
  const remaining = await getAllCampaigns();
  if (remaining.length > 0) {
    await setActiveCampaignId(remaining[0].id);
  }
}

// ─── Saved Encounters CRUD ────────────────────────────────────────────────────

export async function getCampaignEncounters(campaignId: string): Promise<SavedEncounter[]> {
  return await db.encounters.where('campaignId').equals(campaignId).toArray();
}

export async function saveEncounter(encounter: SavedEncounter): Promise<void> {
  await db.encounters.put(encounter);
}

export async function deleteEncounter(id: string): Promise<void> {
  await db.encounters.delete(id);
}

// ─── Inicialización de datos por defecto ──────────────────────────────────────

export async function initDefaultDataIfNeeded(): Promise<Campaign> {
  const count = await db.campaigns.count();
  if (count === 0) {
    await db.campaigns.put(DEMO_CAMPAIGN);
    await setActiveCampaignId(DEMO_CAMPAIGN.id);
    const { DEMO_CHARACTERS, DEMO_SCENES, DEMO_ENCOUNTERS } = await import('./demoData');
    for (const char of DEMO_CHARACTERS) {
      await db.characters.put(char);
    }
    for (const sc of DEMO_SCENES) {
      await db.scenes.put(sc);
    }
    for (const enc of DEMO_ENCOUNTERS) {
      await db.encounters.put(enc);
    }
    return DEMO_CAMPAIGN;
  }
  const activeId = await getActiveCampaignId();
  const activeCamp = await db.campaigns.get(activeId);
  if (activeCamp) {
    const { DEMO_MACROS, DEMO_ENCOUNTERS } = await import('./demoData');
    if (!activeCamp.macros || activeCamp.macros.length === 0) {
      activeCamp.macros = DEMO_MACROS;
      await db.campaigns.put(activeCamp);
    }
    if (!activeCamp.encounters || activeCamp.encounters.length === 0) {
      activeCamp.encounters = DEMO_ENCOUNTERS;
      await db.campaigns.put(activeCamp);
      for (const enc of DEMO_ENCOUNTERS) {
        await db.encounters.put(enc);
      }
    }
    return activeCamp;
  }

  const campaigns = await db.campaigns.toArray();
  return campaigns[0] || DEMO_CAMPAIGN;
}
