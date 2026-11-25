import { NotFoundError } from '../../lib/errors';
import type { NewOrder, Order, OrderRepository } from './order.repository';
import type { ReturnRequest, ReturnRequestRepository } from './return-request.repository';

export const DEFAULT_RETURN_WINDOW_DAYS = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ReturnEligibility {
  eligible: boolean;
  reason: string;
}

export type CancelResult =
  | { ok: true; order: Order }
  | { ok: false; reason: string };

export type ReturnResult =
  | { ok: true; request: ReturnRequest }
  | { ok: false; reason: string };

export class OrderService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly returns: ReturnRequestRepository,
    private readonly opts: { returnWindowDays?: number; now?: () => Date } = {},
  ) {
    this.returnWindowDays = opts.returnWindowDays ?? DEFAULT_RETURN_WINDOW_DAYS;
    this.now = opts.now ?? (() => new Date());
  }

  /** 10 days in production (see DEFAULT_RETURN_WINDOW_DAYS). The constructor option exists so tests can vary it. */
  readonly returnWindowDays: number;
  private readonly now: () => Date;

  list(userId: string, limit = 5): Promise<Order[]> {
    return this.orders.listByUser(userId, Math.min(Math.max(limit, 1), 10));
  }

  /** Other users' orders are indistinguishable from missing ones: always NotFoundError. */
  async get(userId: string, orderNumber: string): Promise<Order> {
    const order = await this.orders.findByOrderNumber(userId, normalizeOrderNumber(orderNumber));
    if (!order) throw new NotFoundError('Order not found');
    return order;
  }

  async checkReturnEligibility(userId: string, orderNumber: string): Promise<ReturnEligibility> {
    const order = await this.get(userId, orderNumber);
    return this.evaluateReturn(userId, order);
  }

  async createReturnRequest(userId: string, orderNumber: string, reason: string): Promise<ReturnResult> {
    const order = await this.get(userId, orderNumber);
    const eligibility = await this.evaluateReturn(userId, order);
    if (!eligibility.eligible) return { ok: false, reason: eligibility.reason };
    // Atomic: only one concurrent request can move delivered → return_requested.
    const moved = await this.orders.transitionStatus(userId, order.orderNumber, ['delivered'], 'return_requested');
    if (!moved) return { ok: false, reason: 'A return was already requested for this order.' };
    const request = await this.returns.create(userId, { orderId: order.id, reason });
    return { ok: true, request };
  }

  /** Cancellation is allowed only while the order is `placed` or `packed`. */
  async cancel(userId: string, orderNumber: string): Promise<CancelResult> {
    const order = await this.get(userId, orderNumber);
    const updated = await this.orders.transitionStatus(userId, order.orderNumber, ['placed', 'packed'], 'cancelled');
    if (!updated) {
      return { ok: false, reason: `Order ${order.orderNumber} is ${describeStatus(order.status)} and can no longer be cancelled.` };
    }
    return { ok: true, order: updated };
  }

  async seedDemoOrders(userId: string): Promise<void> {
    await this.orders.createMany(userId, buildSeedOrders(this.now()));
  }

  private async evaluateReturn(userId: string, order: Order): Promise<ReturnEligibility> {
    if (order.status === 'return_requested' || (await this.returns.findByOrderId(userId, order.id))) {
      return { eligible: false, reason: 'A return has already been requested for this order.' };
    }
    if (order.status !== 'delivered' || !order.deliveredAt) {
      return { eligible: false, reason: `Order ${order.orderNumber} is ${describeStatus(order.status)}; only delivered orders can be returned.` };
    }
    const daysSince = Math.floor((this.now().getTime() - order.deliveredAt.getTime()) / DAY_MS);
    if (daysSince > this.returnWindowDays) {
      return { eligible: false, reason: `The ${this.returnWindowDays}-day return window ended ${daysSince - this.returnWindowDays} day(s) ago.` };
    }
    return { eligible: true, reason: `Delivered ${daysSince} day(s) ago, within the ${this.returnWindowDays}-day return window.` };
  }
}

export function normalizeOrderNumber(input: string): string {
  return input.trim().replace(/^#/, '').toUpperCase();
}

function describeStatus(status: Order['status']): string {
  return status.replace('_', ' ');
}

/** Four mock orders covering each tool path: return-eligible, shipped, cancellable, and out-of-window. */
export function buildSeedOrders(now: Date): NewOrder[] {
  const daysAgo = (n: number) => new Date(now.getTime() - n * DAY_MS);
  const inDays = (n: number) => new Date(now.getTime() + n * DAY_MS);
  return [
    {
      orderNumber: 'SE1042',
      items: [
        { name: 'boAt Airdopes 141 Earbuds', quantity: 1, price: 1499 },
        { name: 'USB-C Charging Cable 1m', quantity: 1, price: 299 },
      ],
      total: 1798,
      status: 'delivered',
      placedAt: daysAgo(7),
      expectedDeliveryAt: daysAgo(4),
      deliveredAt: daysAgo(4),
    },
    {
      orderNumber: 'SE1041',
      items: [{ name: 'Mi Power Bank 20000mAh', quantity: 1, price: 1799 }],
      total: 1799,
      status: 'shipped',
      placedAt: daysAgo(3),
      expectedDeliveryAt: inDays(2),
      deliveredAt: null,
    },
    {
      orderNumber: 'SE1040',
      items: [{ name: 'Logitech M331 Silent Mouse', quantity: 1, price: 899 }],
      total: 899,
      status: 'packed',
      placedAt: daysAgo(1),
      expectedDeliveryAt: inDays(4),
      deliveredAt: null,
    },
    {
      orderNumber: 'SE1039',
      items: [{ name: 'Noise ColorFit Smartwatch', quantity: 1, price: 2999 }],
      total: 2999,
      status: 'delivered',
      placedAt: daysAgo(45),
      expectedDeliveryAt: daysAgo(40),
      deliveredAt: daysAgo(40),
    },
  ];
}
