import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';

const DISCONNECT_NOTIFICATION_ID = 8701;
const NOTIFICATIONS_ENABLED_KEY = 'visual-player.notify-mesa-disconnect';

export async function getMesaDisconnectNotificationsEnabled(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  const stored = await Preferences.get({ key: NOTIFICATIONS_ENABLED_KEY });
  return stored.value === 'true';
}

export async function setMesaDisconnectNotificationsEnabled(enabled: boolean): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  if (enabled) {
    const permission = await LocalNotifications.requestPermissions();
    if (permission.display !== 'granted') return false;
  }

  await Preferences.set({ key: NOTIFICATIONS_ENABLED_KEY, value: String(enabled) });
  if (!enabled) {
    await LocalNotifications.cancel({ notifications: [{ id: DISCONNECT_NOTIFICATION_ID }] });
  }
  return enabled;
}

export async function notifyMesaDisconnected(): Promise<void> {
  if (!(await getMesaDisconnectNotificationsEnabled())) return;

  await LocalNotifications.schedule({
    notifications: [{
      id: DISCONNECT_NOTIFICATION_ID,
      title: 'Mesa desconectada',
      body: 'Visual Player conserva la sesión. Volvé a la app para revisar la conexión.',
      schedule: { at: new Date(Date.now() + 250) },
      extra: { source: 'mesa-connection' },
    }],
  });
}

export async function clearMesaDisconnectNotification(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await LocalNotifications.cancel({ notifications: [{ id: DISCONNECT_NOTIFICATION_ID }] });
}
