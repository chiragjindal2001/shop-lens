import bcrypt from 'bcryptjs';
import type { AuthResponse, LoginInput, SignupInput, UserDto } from '@shared';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../lib/errors';
import type { OrderService } from '../orders/order.service';
import type { SessionRepository } from './session.repository';
import { REFRESH_TTL_SECONDS, type TokenService } from './token.service';
import type { User, UserRepository } from './user.repository';

export const DEMO_EMAIL = 'demo@shoplens.in';
export const DEMO_PASSWORD = 'Demo@1234';

export interface AuthResult extends AuthResponse {
  refreshToken: string;
}

const toDto = (u: User): UserDto => ({ id: u.id, name: u.name, email: u.email });

export class AuthService {
  private dummyHash: Promise<string>;

  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly tokens: TokenService,
    private readonly orders: OrderService,
    private readonly bcryptCost: number,
  ) {
    // Compared against when the email is unknown, so response time does not reveal which emails exist.
    this.dummyHash = bcrypt.hash('not-a-real-password', bcryptCost);
  }

  async signup(input: SignupInput): Promise<AuthResult> {
    const passwordHash = await bcrypt.hash(input.password, this.bcryptCost);
    const user = await this.users.create({ name: input.name, email: input.email, passwordHash }); // DuplicateEmailError → 409
    await this.orders.seedDemoOrders(user.id);
    return this.startSession(user);
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.users.findByEmail(input.email);
    const ok = await bcrypt.compare(input.password, user?.passwordHash ?? (await this.dummyHash));
    if (!user || !ok) throw new UnauthorizedError('Invalid email or password');
    return this.startSession(user);
  }

  /** Validates the refresh cookie against the sessions collection and rotates it. */
  async refresh(refreshToken: string | undefined): Promise<AuthResult> {
    if (!refreshToken) throw new UnauthorizedError('No session');
    const { userId, sessionId } = this.tokens.verifyRefresh(refreshToken);
    const session = await this.sessions.findById(sessionId);
    const hash = this.tokens.hashRefresh(refreshToken);
    if (!session || session.userId !== userId || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedError('Session expired');
    }
    const newToken = this.tokens.signRefresh(userId, sessionId);
    const rotated = await this.sessions.rotate(
      sessionId,
      hash,
      this.tokens.hashRefresh(newToken),
      new Date(Date.now() + REFRESH_TTL_SECONDS * 1000),
    );
    if (!rotated) {
      // A previously-used (possibly stolen) token was replayed: kill the whole session.
      await this.sessions.revoke(sessionId);
      throw new UnauthorizedError('Session expired');
    }
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedError('Session expired');
    return { accessToken: this.tokens.signAccess(userId), user: toDto(user), refreshToken: newToken };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    try {
      const { sessionId } = this.tokens.verifyRefresh(refreshToken);
      await this.sessions.revoke(sessionId);
    } catch {
      // Already invalid: nothing to revoke.
    }
  }

  async me(userId: string): Promise<UserDto> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError('User not found');
    return toDto(user);
  }

  /** Startup seed: the demo account shown in the README. Idempotent. */
  async ensureDemoUser(): Promise<void> {
    if (await this.users.findByEmail(DEMO_EMAIL)) return;
    try {
      const passwordHash = await bcrypt.hash(DEMO_PASSWORD, this.bcryptCost);
      const user = await this.users.create({ name: 'Demo User', email: DEMO_EMAIL, passwordHash });
      await this.orders.seedDemoOrders(user.id);
    } catch (err) {
      if (!(err instanceof ConflictError)) throw err; // another instance seeded it first
    }
  }

  private async startSession(user: User): Promise<AuthResult> {
    // Create the session first (to get its id), then store the hash of the token that references it.
    const session = await this.sessions.create({
      userId: user.id,
      refreshTokenHash: 'pending',
      expiresAt: new Date(Date.now() + REFRESH_TTL_SECONDS * 1000),
    });
    const refreshToken = this.tokens.signRefresh(user.id, session.id);
    const rotated = await this.sessions.rotate(
      session.id,
      'pending',
      this.tokens.hashRefresh(refreshToken),
      session.expiresAt,
    );
    if (!rotated) throw new Error('Failed to initialise session');
    return { accessToken: this.tokens.signAccess(user.id), user: toDto(user), refreshToken };
  }
}
