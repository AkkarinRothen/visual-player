// Pure TypeScript Observable Store for Correlation and Lifecycle of Domain Commands and Receipts
export type CommandReceiptStatus =
  | 'queued'
  | 'sent'
  | 'received'
  | 'applied'
  | 'rejected'
  | 'timed_out'
  | 'cancelled'
  | 'saved';

export interface CommandReceipt {
  commandId: string;
  type: string;
  status: CommandReceiptStatus;
  sessionId?: string;
  connectionEpoch?: number;
  messageId?: string;
  queuedAt: number;
  sentAt?: number;
  receivedAt?: number;
  completedAt?: number;
  revision?: number;
  checksum?: string;
  errorCode?: string;
  errorMessage?: string;
  params?: Record<string, unknown>;
}

type ReceiptListener = (receipt: CommandReceipt) => void;
type GlobalReceiptListener = (receipts: Map<string, CommandReceipt>) => void;

export class CommandReceiptStore {
  private receipts: Map<string, CommandReceipt> = new Map();
  private commandListeners: Map<string, Set<ReceiptListener>> = new Map();
  private globalListeners: Set<GlobalReceiptListener> = new Set();
  private maxHistorySize: number = 200;

  constructor(maxHistorySize: number = 200) {
    this.maxHistorySize = maxHistorySize;
  }

  public registerCommand(
    commandId: string,
    type: string,
    options?: {
      sessionId?: string;
      connectionEpoch?: number;
      params?: Record<string, unknown>;
    }
  ): CommandReceipt {
    const receipt: CommandReceipt = {
      commandId,
      type,
      status: 'queued',
      sessionId: options?.sessionId,
      connectionEpoch: options?.connectionEpoch,
      queuedAt: Date.now(),
      params: options?.params,
    };

    this.receipts.set(commandId, receipt);
    this.trimHistory();
    this.emitChange(receipt);
    return receipt;
  }

  private isTerminal(status: CommandReceiptStatus): boolean {
    return (
      status === 'applied' ||
      status === 'rejected' ||
      status === 'timed_out' ||
      status === 'cancelled' ||
      status === 'saved'
    );
  }

  public markSent(commandId: string, messageId: string): void {
    const r = this.receipts.get(commandId);
    if (!r || this.isTerminal(r.status)) return;

    r.status = 'sent';
    r.messageId = messageId;
    r.sentAt = Date.now();
    this.emitChange(r);
  }

  public markReceived(commandId: string): void {
    const r = this.receipts.get(commandId);
    if (!r || this.isTerminal(r.status)) return;

    r.status = 'received';
    r.receivedAt = Date.now();
    this.emitChange(r);
  }

  public markReceivedByMessageId(messageId: string): void {
    for (const receipt of this.receipts.values()) {
      if (receipt.messageId === messageId) {
        this.markReceived(receipt.commandId);
        break;
      }
    }
  }

  public markApplied(
    commandId: string,
    result: { revision?: number; checksum?: string; appliedAt?: number }
  ): void {
    const r = this.receipts.get(commandId);
    if (!r || this.isTerminal(r.status)) return;

    r.status = 'applied';
    r.completedAt = result.appliedAt || Date.now();
    if (result.revision !== undefined) r.revision = result.revision;
    if (result.checksum !== undefined) r.checksum = result.checksum;
    this.emitChange(r);
  }

  public markRejected(
    commandId: string,
    error: { code?: string; message?: string }
  ): void {
    const r = this.receipts.get(commandId);
    if (!r || this.isTerminal(r.status)) return;

    r.status = 'rejected';
    r.completedAt = Date.now();
    r.errorCode = error.code || 'COMMAND_REJECTED';
    r.errorMessage = error.message || 'El comando fue rechazado por la Mesa';
    this.emitChange(r);
  }

  public markSaved(commandId: string): void {
    const r = this.receipts.get(commandId);
    if (!r || this.isTerminal(r.status)) return;

    r.status = 'saved';
    r.completedAt = Date.now();
    this.emitChange(r);
  }

  public markTimedOut(commandId: string): void {
    const r = this.receipts.get(commandId);
    if (!r || this.isTerminal(r.status)) return;

    r.status = 'timed_out';
    r.completedAt = Date.now();
    r.errorCode = 'TIMEOUT';
    r.errorMessage = 'Tiempo de espera agotado sin confirmación de la Mesa';
    this.emitChange(r);
  }

  public markCancelled(commandId: string, reason?: string): void {
    const r = this.receipts.get(commandId);
    if (!r || this.isTerminal(r.status)) return;

    r.status = 'cancelled';
    r.completedAt = Date.now();
    r.errorCode = 'CANCELLED';
    r.errorMessage = reason || 'Comando cancelado o invalidado';
    this.emitChange(r);
  }

  public getReceipt(commandId: string): CommandReceipt | undefined {
    return this.receipts.get(commandId);
  }

  public getAllReceipts(): CommandReceipt[] {
    return Array.from(this.receipts.values());
  }

  public subscribe(commandId: string, listener: ReceiptListener): () => void {
    if (!this.commandListeners.has(commandId)) {
      this.commandListeners.set(commandId, new Set());
    }
    this.commandListeners.get(commandId)!.add(listener);

    // If receipt already exists, immediately notify
    const current = this.receipts.get(commandId);
    if (current) {
      listener(current);
    }

    return () => {
      const set = this.commandListeners.get(commandId);
      if (set) {
        set.delete(listener);
        if (set.size === 0) {
          this.commandListeners.delete(commandId);
        }
      }
    };
  }

  public subscribeAll(listener: GlobalReceiptListener): () => void {
    this.globalListeners.add(listener);
    listener(this.receipts);
    return () => {
      this.globalListeners.delete(listener);
    };
  }

  public clear(): void {
    this.receipts.clear();
    this.commandListeners.clear();
    this.globalListeners.clear();
  }

  public clearOlderThan(ttlMs: number): void {
    const threshold = Date.now() - ttlMs;
    for (const [id, receipt] of this.receipts.entries()) {
      if (
        (receipt.status === 'applied' ||
          receipt.status === 'rejected' ||
          receipt.status === 'timed_out' ||
          receipt.status === 'cancelled' ||
          receipt.status === 'saved') &&
        (receipt.completedAt || receipt.queuedAt) < threshold
      ) {
        this.receipts.delete(id);
      }
    }
  }

  private trimHistory(): void {
    if (this.receipts.size <= this.maxHistorySize) return;
    const entries = Array.from(this.receipts.entries());
    const excess = entries.length - this.maxHistorySize;
    for (let i = 0; i < excess; i++) {
      this.receipts.delete(entries[i][0]);
    }
  }

  private emitChange(receipt: CommandReceipt): void {
    const listeners = this.commandListeners.get(receipt.commandId);
    if (listeners) {
      listeners.forEach((fn) => {
        try {
          fn(receipt);
        } catch (err) {
          console.error('[CommandReceiptStore] Listener error:', err);
        }
      });
    }

    this.globalListeners.forEach((fn) => {
      try {
        fn(this.receipts);
      } catch (err) {
        console.error('[CommandReceiptStore] Global listener error:', err);
      }
    });
  }
}

// Global default instance for convenience
export const commandReceiptStore = new CommandReceiptStore();
