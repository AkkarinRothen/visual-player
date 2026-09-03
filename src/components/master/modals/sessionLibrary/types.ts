export type LibraryTab = 'preparing' | 'active' | 'completed' | 'archived' | 'trash';

export function formatRelativeDate(ts: number): string {
  const diff = Date.now() - ts;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'hace un momento';
  const minutes = Math.floor(seconds / 1000 / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} día${days !== 1 ? 's' : ''}`;
}
