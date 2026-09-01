export type ConnectivityState =
  | 'ONLINE'
  | 'DEGRADED'
  | 'RECONNECTING'
  | 'RESYNCING'
  | 'READ_ONLY'
  | 'OFFLINE';

export type ConnectivityEventType =
  | 'DATA_CHANNEL_OPEN'
  | 'DATA_CHANNEL_CLOSED'
  | 'LATENCY_SAMPLE'
  | 'HEARTBEAT_ACK'
  | 'HEARTBEAT_MISSED'
  | 'APP_BACKGROUND'
  | 'APP_FOREGROUND'
  | 'LEASE_EXPIRED'
  | 'LEASE_VALIDATED'
  | 'NETWORK_LOST'
  | 'NETWORK_RESTORED'
  | 'RESYNC_COMPLETED'
  | 'RETRY_EXHAUSTED'
  | 'MANUAL_DISCONNECT';

export interface ConnectivityEvent {
  type: ConnectivityEventType;
  payload?: any;
}

export const MAX_GRACE_PERIOD_MS = 15_000; // 15 seconds grace period
export const BASE_RECONNECT_DELAY_MS = 1_000;
export const MAX_RECONNECT_DELAY_MS = 15_000;
export const MAX_RECONNECT_ATTEMPTS = 10;
export const HIGH_LATENCY_THRESHOLD_MS = 300; // 300ms threshold for DEGRADED

export type StateChangeListener = (state: ConnectivityState, prevState: ConnectivityState) => void;

/**
 * Unified and deterministic State Machine managing WebRTC transport and Master Authority.
 */
export class ConnectivityStateMachine {
  private currentState: ConnectivityState = 'OFFLINE';
  private listeners: Set<StateChangeListener> = new Set();
  private reconnectAttempts: number = 0;
  private lastSuccessfulHeartbeat: number = Date.now();
  private isAppInBackground: boolean = false;
  private isLeaseLocallyValid: boolean = false;

  constructor(initialState: ConnectivityState = 'OFFLINE') {
    this.currentState = initialState;
  }

  public getState(): ConnectivityState {
    return this.currentState;
  }

  public getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  public isInBackground(): boolean {
    return this.isAppInBackground;
  }

  public onStateChange(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setState(nextState: ConnectivityState): void {
    if (this.currentState === nextState) return;

    const prevState = this.currentState;
    this.currentState = nextState;

    // Reset attempt counter when transitioning to healthy states
    if (nextState === 'ONLINE' || nextState === 'DEGRADED') {
      this.reconnectAttempts = 0;
      this.lastSuccessfulHeartbeat = Date.now();
    }

    this.listeners.forEach((fn) => {
      try {
        fn(nextState, prevState);
      } catch (err) {
        console.warn('[ConnectivitySM] Listener threw:', err);
      }
    });
  }

  /**
   * Evaluates if the current state permits mutating the Display state.
   */
  public canMutateDisplay(): boolean {
    return (this.currentState === 'ONLINE' || this.currentState === 'DEGRADED') && this.isLeaseLocallyValid;
  }

  public setLeaseValid(valid: boolean): void {
    this.isLeaseLocallyValid = valid;
    if (!valid && (this.currentState === 'ONLINE' || this.currentState === 'DEGRADED')) {
      this.setState('READ_ONLY');
    }
  }

  /**
   * Calculates deterministic exponential backoff delay with bounded jitter.
   */
  public getReconnectDelay(randomJitterFactor: number = Math.random()): number {
    const exponential = Math.min(
      MAX_RECONNECT_DELAY_MS,
      BASE_RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempts)
    );
    // Bounded jitter between 0% and 25%
    const jitter = exponential * (randomJitterFactor * 0.25);
    return Math.round(exponential + jitter);
  }

  /**
   * Main state transition engine based on unified inputs.
   */
  public dispatch(event: ConnectivityEvent): ConnectivityState {
    const now = Date.now();

    switch (event.type) {
      case 'DATA_CHANNEL_OPEN': {
        this.setState('RESYNCING');
        break;
      }

      case 'RESYNC_COMPLETED': {
        if (this.isLeaseLocallyValid) {
          this.setState('ONLINE');
        } else {
          this.setState('READ_ONLY');
        }
        break;
      }

      case 'DATA_CHANNEL_CLOSED':
      case 'NETWORK_LOST': {
        if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          this.setState('OFFLINE');
        } else {
          this.reconnectAttempts++;
          this.setState('RECONNECTING');
        }
        break;
      }

      case 'LATENCY_SAMPLE': {
        const latency = typeof event.payload?.latencyMs === 'number' ? event.payload.latencyMs : 0;
        if (this.currentState === 'ONLINE' && latency > HIGH_LATENCY_THRESHOLD_MS) {
          this.setState('DEGRADED');
        } else if (this.currentState === 'DEGRADED' && latency <= HIGH_LATENCY_THRESHOLD_MS) {
          this.setState('ONLINE');
        }
        break;
      }

      case 'HEARTBEAT_ACK': {
        this.lastSuccessfulHeartbeat = now;
        if (this.currentState === 'DEGRADED' || this.currentState === 'READ_ONLY') {
          if (this.isLeaseLocallyValid) {
            this.setState('ONLINE');
          }
        }
        break;
      }

      case 'HEARTBEAT_MISSED': {
        const elapsedSinceHeartbeat = now - this.lastSuccessfulHeartbeat;
        if (elapsedSinceHeartbeat > MAX_GRACE_PERIOD_MS) {
          this.isLeaseLocallyValid = false;
          this.setState('READ_ONLY');
        } else if (this.currentState === 'ONLINE') {
          this.setState('DEGRADED');
        }
        break;
      }

      case 'LEASE_EXPIRED': {
        this.isLeaseLocallyValid = false;
        this.setState('READ_ONLY');
        break;
      }

      case 'LEASE_VALIDATED': {
        this.isLeaseLocallyValid = true;
        this.lastSuccessfulHeartbeat = now;
        if (this.currentState === 'RESYNCING' || this.currentState === 'READ_ONLY') {
          this.setState('ONLINE');
        }
        break;
      }

      case 'APP_BACKGROUND': {
        this.isAppInBackground = true;
        break;
      }

      case 'APP_FOREGROUND': {
        this.isAppInBackground = false;
        // If we were suspended in background and lost connection, trigger resync
        if (this.currentState === 'OFFLINE' || this.currentState === 'RECONNECTING') {
          this.reconnectAttempts = 0;
          this.setState('RECONNECTING');
        }
        break;
      }

      case 'RETRY_EXHAUSTED':
      case 'MANUAL_DISCONNECT': {
        this.reconnectAttempts = 0;
        this.setState('OFFLINE');
        break;
      }
    }

    return this.currentState;
  }
}

export const connectivityStateMachine = new ConnectivityStateMachine();
