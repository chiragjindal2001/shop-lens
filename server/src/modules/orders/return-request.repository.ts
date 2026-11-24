export interface ReturnRequest {
  id: string;
  userId: string;
  orderId: string;
  reason: string;
  status: 'requested';
  createdAt: Date;
}

export interface ReturnRequestRepository {
  create(userId: string, input: { orderId: string; reason: string }): Promise<ReturnRequest>;
  findByOrderId(userId: string, orderId: string): Promise<ReturnRequest | null>;
}
