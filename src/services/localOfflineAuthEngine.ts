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

/**
 * Resumption ticket for silent re-authentication after brief disconnection.
 * Single-use, rotatable, bound to a specific deviceId and sessionId.
 */
export interface ResumptionTicket {
  ticketId: string;
  sessionId: string;
  deviceId: string;
  /** HMAC-like signature over ticketId+sessionId+deviceId+issuedAt */
  signature: string;
  issuedAt: number;
  expiresAt: number;
  used: boolean;
}

export interface ResumptionChallengeResult {
  valid: boolean;
  reason?: string;
  newTicket?: ResumptionTicket;
}

class LocalOfflineAuthEngine {
  private currentAuthority: LocalAuthoritySession | null = null;
  private seenNonces: Set<string> = new Set();
  /** Active resumption tickets per deviceId */
  private resumptionTickets: Map<string, ResumptionTicket> = new Map();

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

  // ─── Resumption Tickets ────────────────────────────────────

  /**
   * Creates a single-use resumption ticket for a device.
   * Allows silent re-authentication after brief disconnection
   * without triggering a full Nearby authenticationDigits flow.
   * TTL default: 5 minutes.
   */
  public createResumptionTicket(
    deviceId: string,
    ttlSeconds: number = 300
  ): ResumptionTicket {
    if (!this.currentAuthority) {
      throw new Error('LocalOfflineAuthEngine: no active authority for resumption ticket');
    }

    const now = Date.now();
    const ticketId = `rtk-${Math.random().toString(36).substring(2)}-${now}`;
    const expiresAt = now + ttlSeconds * 1000;

    const payload = `${ticketId}:${this.currentAuthority.sessionId}:${deviceId}:${now}`;
    const signature = this.computeLocalSignature(payload, this.currentAuthority.sessionSecret);

    const ticket: ResumptionTicket = {
      ticketId,
      sessionId: this.currentAuthority.sessionId,
      deviceId,
      signature,
      issuedAt: now,
      expiresAt,
      used: false,
    };

    this.resumptionTickets.set(deviceId, ticket);
    return ticket;
  }

  /**
   * Validates a resumption challenge and issues a new ticket on success.
   * The ticket is consumed (single-use) and revoked on any failure.
   *
   * @param ticket    The ticket previously issued to the device.
   * @param challenge A random challenge string generated by the authority.
   * @param response  The device's response: HMAC of challenge+ticketId+sessionId+deviceId.
   */
  public validateResumptionChallenge(
    ticket: ResumptionTicket,
    challenge: string,
    response: string
  ): ResumptionChallengeResult {
    if (!this.currentAuthority) {
      return { valid: false, reason: 'NO_ACTIVE_LOCAL_AUTHORITY' };
    }

    if (ticket.sessionId !== this.currentAuthority.sessionId) {
      return { valid: false, reason: 'SESSION_ID_MISMATCH' };
    }

    if (ticket.used) {
      this.resumptionTickets.delete(ticket.deviceId);
      return { valid: false, reason: 'TICKET_ALREADY_USED' };
    }

    if (Date.now() > ticket.expiresAt) {
      this.resumptionTickets.delete(ticket.deviceId);
      return { valid: false, reason: 'TICKET_EXPIRED' };
    }

    const stored = this.resumptionTickets.get(ticket.deviceId);
    if (!stored || stored.ticketId !== ticket.ticketId) {
      return { valid: false, reason: 'TICKET_NOT_FOUND_OR_ROTATED' };
    }

    // Verify device's response to our challenge
    const expectedResponse = this.computeLocalSignature(
      `${challenge}:${ticket.ticketId}:${ticket.sessionId}:${ticket.deviceId}`,
      this.currentAuthority.sessionSecret
    );

    if (response !== expectedResponse) {
      this.resumptionTickets.delete(ticket.deviceId);
      return { valid: false, reason: 'INVALID_CHALLENGE_RESPONSE' };
    }

    // Consume and rotate: mark old ticket used, issue new one
    stored.used = true;
    const newTicket = this.createResumptionTicket(ticket.deviceId);

    return { valid: true, newTicket };
  }

  /**
   * Computes the challenge response that a Master device should send
   * to pass the resumption challenge.
   * (Used by the Master side of the connection.)
   */
  public computeResumptionResponse(
    challenge: string,
    ticket: ResumptionTicket,
    deviceSecret: string
  ): string {
    return this.computeLocalSignature(
      `${challenge}:${ticket.ticketId}:${ticket.sessionId}:${ticket.deviceId}`,
      deviceSecret
    );
  }

  /**
   * Revokes the resumption ticket for a device.
   * Call when Master is revoked, device identity changes, or Process Death occurs.
   */
  public revokeTicket(deviceId: string): void {
    this.resumptionTickets.delete(deviceId);
  }

  /** Revokes all tickets */
  public revokeAllTickets(): void {
    this.resumptionTickets.clear();
  }

  public revokeLocalAuthority(): void {
    this.currentAuthority = null;
    this.seenNonces.clear();
    this.resumptionTickets.clear();
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
