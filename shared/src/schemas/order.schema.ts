export type OrderStatus = 'placed' | 'packed' | 'shipped' | 'delivered' | 'cancelled' | 'return_requested';

export interface OrderItemDto {
  name: string;
  quantity: number;
  /** INR, whole rupees */
  price: number;
}

export interface OrderDto {
  orderNumber: string;
  status: OrderStatus;
  items: OrderItemDto[];
  /** INR, whole rupees */
  total: number;
  placedAt: string;
  expectedDeliveryAt: string | null;
  deliveredAt: string | null;
}

export interface OrdersResponse {
  orders: OrderDto[];
}
