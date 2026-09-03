import { useState, useEffect } from 'react';
import {
  commandReceiptStore,
  type CommandReceipt,
} from '../services/commandReceiptStore';

/**
 * Custom React hook that subscribes to a specific commandId in the CommandReceiptStore.
 * Eliminates fake timers and provides real-time lifecycle tracking ('queued' | 'sent' | 'received' | 'applied' | 'rejected' | 'timed_out' | 'saved').
 */
export function useCommandReceipt(commandId: string | null | undefined): CommandReceipt | null {
  const [receipt, setReceipt] = useState<CommandReceipt | null>(() => {
    if (!commandId) return null;
    return commandReceiptStore.getReceipt(commandId) || null;
  });

  useEffect(() => {
    if (!commandId) {
      setReceipt(null);
      return;
    }

    const unsub = commandReceiptStore.subscribe(commandId, (updated) => {
      setReceipt({ ...updated });
    });

    return unsub;
  }, [commandId]);

  return receipt;
}
