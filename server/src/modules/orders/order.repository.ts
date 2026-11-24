export type OrderStatus =
  | 'placed'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'return_requested';

export interface OrderItem {
  name: string;
  quantity: number;
  price: number; // INR, whole rupees
}

export interface Order {
  id: string;
  userId: string;
  orderNumber: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  placedAt: Date;
  expectedDeliveryAt: Date | null;
  deliveredAt: Date | null;
}

export type NewOrder = Omit<Order, 'id' | 'userId'>;

export interface OrderRepository {
  createMany(userId: string, orders: NewOrder[]): Promise<void>;
  listByUser(userId: string, limit: number): Promise<Order[]>;
  findByOrderNumber(userId: string, orderNumber: string): Promise<Order | null>;
  /** Generic compare-and-set: moves to `to` only if the current status is one of `from`. */
  transitionStatus(
    userId: string,
    orderNumber: string,
    from: OrderStatus[],
    to: OrderStatus,
  ): Promise<Order | null>;
}
