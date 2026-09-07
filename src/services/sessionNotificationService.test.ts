import { beforeEach, describe, expect, it, vi } from 'vitest';

const native = vi.hoisted(() => ({
  isNativePlatform: vi.fn(() => true),
}));
const preferences = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
}));
const notifications = vi.hoisted(() => ({
  requestPermissions: vi.fn(),
  schedule: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({ Capacitor: native }));
vi.mock('@capacitor/preferences', () => ({ Preferences: preferences }));
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: notifications }));

import {
  getMesaDisconnectNotificationsEnabled,
  notifyMesaDisconnected,
  setMesaDisconnectNotificationsEnabled,
} from './sessionNotificationService';

describe('sessionNotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    preferences.get.mockResolvedValue({ value: 'false' });
    preferences.set.mockResolvedValue(undefined);
    notifications.requestPermissions.mockResolvedValue({ display: 'granted' });
    notifications.schedule.mockResolvedValue(undefined);
    notifications.cancel.mockResolvedValue(undefined);
  });

  it('persists the opt-in only after native permission is granted', async () => {
    expect(await setMesaDisconnectNotificationsEnabled(true)).toBe(true);
    expect(notifications.requestPermissions).toHaveBeenCalledOnce();
    expect(preferences.set).toHaveBeenCalledWith({
      key: 'visual-player.notify-mesa-disconnect',
      value: 'true',
    });
  });

  it('does not schedule a notification when the preference is disabled', async () => {
    expect(await getMesaDisconnectNotificationsEnabled()).toBe(false);
    await notifyMesaDisconnected();
    expect(notifications.schedule).not.toHaveBeenCalled();
  });

  it('schedules a native notification when the preference is enabled', async () => {
    preferences.get.mockResolvedValue({ value: 'true' });
    await notifyMesaDisconnected();
    expect(notifications.schedule).toHaveBeenCalledWith(expect.objectContaining({
      notifications: [expect.objectContaining({
        id: 8701,
        title: 'Mesa desconectada',
      })],
    }));
  });
});
