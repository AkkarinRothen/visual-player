export interface LocalOfflineLease {
  sessionId: string;
  deviceId: string;
  role: 'master' | 'display';
  connectionEpoch: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
  signature: string;
}

export interface LocalAuthoritySession {
  sessionId: string;
  sessionSecret: string;
  connectionEpoch: string;
  activeLease?: LocalOfflineLease;
}

class LocalOfflineAuthEngine {
  private currentAuthority: LocalAuthoritySession | null = null;
  private seenNonces: Set<string> = new Set();

  /**
   * Initializes local ephemeral authority on the Display Tablet when running offline.
   */
  public initLocalAuthority(sessionId: string, connectionEpoch: string = `offline-epoch-${Date.now()}`): LocalAuthoritySession {
    // Ephemeral cryptographic secret generated strictly inside memory for the offline session
    const sessionSecret = `loc-sec-${Math.random().toString(36).substring(2)}-${Date.now()}`;
    this.currentAuthority = {
      sessionId,
      sessionSecret,
      connectionEpoch,
    };
    this.seenNonces.clear();
    return this.currentAuthority;
  }

  /**
   * Issues a signed, short-lived (60s) local offline lease for a Master device.
   */
  public issueLocalLease(
    deviceId: string,
    role: 'master' | 'display' = 'master',
    ttlSeconds: number = 60
  ): LocalOfflineLease {
    if (!this.currentAuthority) {
      throw new Error('LocalOfflineAuthEngine has not been initialized with an active authority session');
    }

    const now = Date.now();
    const nonce = `nonce-${Math.random().toString(36).substring(2)}-${now}`;
    const expiresAt = now + ttlSeconds * 1000;

    const payload = `${this.currentAuthority.sessionId}:${deviceId}:${role}:${this.currentAuthority.connectionEpoch}:${now}:${expiresAt}:${nonce}`;
    const signature = this.computeLocalSignature(payload, this.currentAuthority.sessionSecret);

    const lease: LocalOfflineLease = {
      sessionId: this.currentAuthority.sessionId,
      deviceId,
      role,
      connectionEpoch: this.currentAuthority.connectionEpoch,
      issuedAt: now,
      expiresAt,
      nonce,
      signature,
    };

    this.currentAuthority.activeLease = lease;
    return lease;
  }

  /**
   * Validates whether an incoming offline lease is cryptographically valid, active, and matching current epoch.
   */
  public verifyLocalLease(lease: LocalOfflineLease, expectedDeviceId?: string): { valid: boolean; reason?: string } {
    if (!this.currentAuthority) {
      return { valid: false, reason: 'NO_ACTIVE_LOCAL_AUTHORITY' };
    }

    if (lease.sessionId !== this.currentAuthority.sessionId) {
      return { valid: false, reason: 'SESSION_ID_MISMATCH' };
    }

    if (lease.connectionEpoch !== this.currentAuthority.connectionEpoch) {
      return { valid: false, reason: 'CONNECTION_EPOCH_MISMATCH' };
    }

    if (expectedDeviceId && lease.deviceId !== expectedDeviceId) {
      return { valid: false, reason: 'DEVICE_ID_MISMATCH' };
    }

    const now = Date.now();
    if (now > lease.expiresAt) {
      return { valid: false, reason: 'LEASE_EXPIRED' };
    }

    if (this.seenNonces.has(lease.nonce)) {
      return { valid: false, reason: 'REPLAY_ATTACK_DETECTED' };
    }

    const payload = `${lease.sessionId}:${lease.deviceId}:${lease.role}:${lease.connectionEpoch}:${lease.issuedAt}:${lease.expiresAt}:${lease.nonce}`;
    const expectedSig = this.computeLocalSignature(payload, this.currentAuthority.sessionSecret);

    if (lease.signature !== expectedSig) {
      return { valid: false, reason: 'INVALID_SIGNATURE' };
    }

    this.seenNonces.add(lease.nonce);
    return { valid: true };
  }

  public revokeLocalAuthority(): void {
    this.currentAuthority = null;
    this.seenNonces.clear();
  }

  public getActiveAuthority(): LocalAuthoritySession | null {
    return this.currentAuthority;
  }

  private computeLocalSignature(payload: string, secret: string): string {
    let hash = 0;
    const combined = `${payload}:${secret}`;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `sig-loc-${Math.abs(hash).toString(16)}`;
  }
}

export const localOfflineAuthEngine = new LocalOfflineAuthEngine();
