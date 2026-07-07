jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
}));

jest.mock('@api/client', () => ({
  __esModule: true,
  default: {
    store: {
      order: {
        retrieve: jest.fn(),
        requestTransfer: jest.fn(),
      },
    },
  },
}));

import { mergeOrders } from '../app/utils/guest-orders';
import { HttpTypes } from '@medusajs/types';

const makeOrder = (id: string, createdAt: string): HttpTypes.StoreOrder =>
  ({
    id,
    created_at: createdAt,
  }) as HttpTypes.StoreOrder;

describe('guest orders utils', () => {
  it('merges account and guest orders without duplicates', () => {
    const accountOrders = [makeOrder('order_1', '2026-07-01T10:00:00.000Z')];
    const guestOrders = [
      makeOrder('order_1', '2026-07-01T10:00:00.000Z'),
      makeOrder('order_2', '2026-07-02T10:00:00.000Z'),
    ];

    const merged = mergeOrders(accountOrders, guestOrders);

    expect(merged.map(order => order.id)).toEqual(['order_2', 'order_1']);
  });
});
