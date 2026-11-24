export interface Session {
  id: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface SessionRepository {
  create(input: { userId: string; refreshTokenHash: string; expiresAt: Date }): Promise<Session>;
  findById(id: string): Promise<Session | null>;
  /** Compare-and-set: rotates only if the stored hash still equals `expectedHash` and the session is live. */
  rotate(id: string, expectedHash: string, newHash: string, newExpiresAt: Date): Promise<boolean>;
  revoke(id: string): Promise<void>;
}
