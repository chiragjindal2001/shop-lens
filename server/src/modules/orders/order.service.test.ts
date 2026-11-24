import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { NotFoundError } from '../../lib/errors';
import { startTestEnv, type TestEnv } from '../../../tests/helpers/test-container';
import { OrderService, RETURN_WINDOW_DAYS } from './order.service';

let env: TestEnv;
let svc: OrderService;
const USER = 'user-1';
beforeAll(async () => void (env = await startTestEnv()));
afterAll(() => env.stop());
beforeEach(async () => {
  await env.clear();
  svc = new OrderService(env.repos.orders, env.repos.returns);
  await svc.seedDemoOrders(USER);
});

describe('return eligibility', () => {
  it('delivered within the window is eligible', async () => {
    expect((await svc.checkReturnEligibility(USER, 'SE1042')).eligible).toBe(true);
  });
  it('delivered outside the window is not', async () => {
    const r = await svc.checkReturnEligibility(USER, 'SE1039');
    expect(r.eligible).toBe(false);
    expect(r.reason).toContain(`${RETURN_WINDOW_DAYS}-day`);
  });
  it('undelivered orders are not eligible', async () => {
    expect((await svc.checkReturnEligibility(USER, 'SE1041')).eligible).toBe(false);
  });
  it('accepts #se1042-style input', async () => {
    expect((await svc.checkReturnEligibility(USER, '#se1042')).eligible).toBe(true);
  });
  it("another user's or unknown order is NotFound", async () => {
    await expect(svc.checkReturnEligibility('someone-else', 'SE1042')).rejects.toBeInstanceOf(NotFoundError);
    await expect(svc.checkReturnEligibility(USER, 'SE0000')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('create return request', () => {
  it('creates once, then refuses a duplicate', async () => {
    const first = await svc.createReturnRequest(USER, 'SE1042', 'earbud stopped working');
    expect(first.ok).toBe(true);
    expect((await env.repos.orders.findByOrderNumber(USER, 'SE1042'))!.status).toBe('return_requested');
    const second = await svc.createReturnRequest(USER, 'SE1042', 'again');
    expect(second.ok).toBe(false);
  });
  it('refuses ineligible orders without writing anything', async () => {
    expect((await svc.createReturnRequest(USER, 'SE1039', 'late')).ok).toBe(false);
    expect((await env.repos.orders.findByOrderNumber(USER, 'SE1039'))!.status).toBe('delivered');
  });
});

describe('cancellation rules', () => {
  it.each([['SE1040', true], ['SE1041', false], ['SE1042', false]])('%s cancellable=%s', async (n, ok) => {
    expect((await svc.cancel(USER, n)).ok).toBe(ok);
  });
  it('cannot cancel twice', async () => {
    expect((await svc.cancel(USER, 'SE1040')).ok).toBe(true);
    expect((await svc.cancel(USER, 'SE1040')).ok).toBe(false);
  });
});
