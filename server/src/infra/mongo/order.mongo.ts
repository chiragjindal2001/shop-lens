import mongoose, { type Model } from 'mongoose';

const { Schema, model, models } = mongoose;
import type {
  NewOrder,
  Order,
  OrderItem,
  OrderRepository,
  OrderStatus,
} from '../../modules/orders/order.repository';

interface OrderDoc {
  _id: { toString(): string };
  userId: string;
  orderNumber: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  placedAt: Date;
  expectedDeliveryAt?: Date | null;
  deliveredAt?: Date | null;
}

const schema = new Schema({
  userId: { type: String, required: true },
  orderNumber: { type: String, required: true },
  items: [{ _id: false, name: String, quantity: Number, price: Number }],
  total: { type: Number, required: true },
  status: {
    type: String,
    enum: ['placed', 'packed', 'shipped', 'delivered', 'cancelled', 'return_requested'],
    required: true,
  },
  placedAt: { type: Date, required: true },
  expectedDeliveryAt: { type: Date, default: null },
  deliveredAt: { type: Date, default: null },
});
schema.index({ userId: 1, orderNumber: 1 }, { unique: true });

export const OrderModel: Model<OrderDoc> =
  (models.Order as Model<OrderDoc>) ?? model<OrderDoc>('Order', schema);

const toOrder = (d: OrderDoc): Order => ({
  id: d._id.toString(),
  userId: d.userId,
  orderNumber: d.orderNumber,
  items: d.items,
  total: d.total,
  status: d.status,
  placedAt: d.placedAt,
  expectedDeliveryAt: d.expectedDeliveryAt ?? null,
  deliveredAt: d.deliveredAt ?? null,
});

export class MongoOrderRepository implements OrderRepository {
  async createMany(userId: string, orders: NewOrder[]): Promise<void> {
    await OrderModel.insertMany(orders.map((o) => ({ ...o, userId })));
  }

  async listByUser(userId: string, limit: number): Promise<Order[]> {
    const docs = await OrderModel.find({ userId }).sort({ placedAt: -1 }).limit(limit).lean<OrderDoc[]>();
    return docs.map(toOrder);
  }

  async findByOrderNumber(userId: string, orderNumber: string): Promise<Order | null> {
    const doc = await OrderModel.findOne({ userId, orderNumber }).lean<OrderDoc>();
    return doc ? toOrder(doc) : null;
  }

  async transitionStatus(
    userId: string,
    orderNumber: string,
    from: OrderStatus[],
    to: OrderStatus,
  ): Promise<Order | null> {
    const doc = await OrderModel.findOneAndUpdate(
      { userId, orderNumber, status: { $in: from } },
      { $set: { status: to } },
      { new: true },
    ).lean<OrderDoc>();
    return doc ? toOrder(doc) : null;
  }
}
