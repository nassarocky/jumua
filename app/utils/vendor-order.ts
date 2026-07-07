import type {
  VendorOrder,
  VendorOrderFulfillment,
  VendorOrderItem,
  VendorOrderSummary,
} from '@api/vendor-api';
import { convertToLocale } from '@utils/product-price';
import type { FulfillmentStatus } from '@utils/order';

export const normalizeAmount = (value: unknown): number | undefined => {
  if (value == null) {
    return undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown> & {
      toJSON?: () => unknown;
      toNumber?: () => number;
      valueOf?: () => unknown;
    };

    if (typeof record.toJSON === 'function') {
      const jsonValue = record.toJSON();
      if (jsonValue !== value) {
        return normalizeAmount(jsonValue);
      }
    }
    if (typeof record.toNumber === 'function') {
      const parsed = record.toNumber();
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    if (typeof record.valueOf === 'function') {
      const primitive = record.valueOf();
      if (primitive !== value) {
        return normalizeAmount(primitive);
      }
    }
    if ('numeric' in record) {
      return normalizeAmount(record.numeric);
    }
    if ('amount' in record) {
      return normalizeAmount(record.amount);
    }
    if ('value' in record) {
      return normalizeAmount(record.value);
    }
    if ('raw' in record && record.raw && typeof record.raw === 'object') {
      return normalizeAmount((record.raw as Record<string, unknown>).value);
    }
  }
  return undefined;
};

const firstAmount = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    const parsed = normalizeAmount(value);
    if (parsed != null) {
      return parsed;
    }
  }
  return undefined;
};

const getSummaryAmount = (
  summary: VendorOrderSummary | undefined,
  key: keyof VendorOrderSummary,
): number | undefined => {
  if (!summary) {
    return undefined;
  }
  const rawKey = `raw_${String(key)}` as keyof VendorOrderSummary;
  return firstAmount(summary[key], (summary as Record<string, unknown>)[rawKey]);
};

const getOfferUnitPrice = (
  item: VendorOrderItem,
  currencyCode?: string,
): number | undefined => {
  const prices = item.offer?.prices;
  if (!prices?.length) {
    return undefined;
  }
  const match =
    prices.find(
      price =>
        !currencyCode ||
        !price.currency_code ||
        price.currency_code.toLowerCase() === currencyCode.toLowerCase(),
    ) ?? prices[0];
  return normalizeAmount(match?.amount);
};

const getItemUnitPrice = (
  item: VendorOrderItem,
  currencyCode?: string,
): number | undefined => {
  const quantity = item.quantity ?? 1;
  return firstAmount(
    item.unit_price,
    item.detail?.unit_price,
    getOfferUnitPrice(item, currencyCode),
    item.quantity
      ? (() => {
          const lineTotal = firstAmount(item.total, item.item_total, item.subtotal);
          return lineTotal != null ? lineTotal / quantity : undefined;
        })()
      : undefined,
  );
};

const sumItemTotals = (
  items?: VendorOrderItem[],
  currencyCode?: string,
): number | undefined => {
  if (!items?.length) {
    return undefined;
  }
  let total = 0;
  let hasValue = false;
  for (const item of items) {
    const lineTotal =
      firstAmount(item.total, item.item_total, item.subtotal) ??
      (() => {
        const unit = getItemUnitPrice(item, currencyCode);
        if (unit == null) {
          return undefined;
        }
        return unit * (item.quantity ?? 1);
      })();
    if (lineTotal != null) {
      total += lineTotal;
      hasValue = true;
    }
  }
  return hasValue ? total : undefined;
};

const getPaymentCollectionTotal = (order: VendorOrder): number | undefined => {
  const collections = order.payment_collections;
  if (!collections?.length) {
    return undefined;
  }

  let total = 0;
  let hasValue = false;

  for (const collection of collections) {
    const captured = normalizeAmount(collection.captured_amount);
    const authorized = normalizeAmount(collection.authorized_amount);
    const amount = normalizeAmount(collection.amount);
    const value = captured ?? authorized ?? amount;
    if (value != null) {
      total += value;
      hasValue = true;
    }
  }

  return hasValue ? total : undefined;
};

export const getVendorOrderSummaryTotal = (
  summary?: VendorOrderSummary,
): number | undefined =>
  firstAmount(
    getSummaryAmount(summary, 'current_order_total'),
    getSummaryAmount(summary, 'accounting_total'),
    getSummaryAmount(summary, 'paid_total'),
    getSummaryAmount(summary, 'original_order_total'),
    getSummaryAmount(summary, 'transaction_total'),
    getSummaryAmount(summary, 'total'),
    getSummaryAmount(summary, 'ordered_total'),
  );

export const getVendorOrderTotal = (order: VendorOrder): number | undefined =>
  firstAmount(
    order.total,
    getVendorOrderSummaryTotal(order.summary),
    normalizeAmount(order.item_total) != null
      ? (normalizeAmount(order.item_total) ?? 0) +
          (normalizeAmount(order.shipping_total) ?? 0)
      : undefined,
    getPaymentCollectionTotal(order),
    sumItemTotals(order.items, order.currency_code),
  );

export const getVendorOrderSubtotal = (order: VendorOrder): number | undefined =>
  firstAmount(
    order.subtotal,
    order.item_total,
    order.item_subtotal,
    getSummaryAmount(order.summary, 'subtotal'),
    sumItemTotals(order.items, order.currency_code),
  );

export const formatVendorOrderAmount = (
  order: VendorOrder,
  locale = 'en-US',
): string => {
  const amount = getVendorOrderTotal(order);
  if (amount == null || !order.currency_code) {
    return '-';
  }
  return convertToLocale({
    amount,
    currency_code: order.currency_code,
    locale,
  });
};

export const getVendorItemUnitPrice = (
  item: VendorOrderItem,
  currencyCode?: string,
): number => getItemUnitPrice(item, currencyCode) ?? 0;

export const getVendorItemLineTotal = (
  item: VendorOrderItem,
  currencyCode?: string,
): number =>
  firstAmount(item.total, item.item_total, item.subtotal) ??
  (getItemUnitPrice(item, currencyCode) ?? 0) * (item.quantity ?? 1);

export const getUnfulfilledQuantity = (item: VendorOrderItem): number => {
  const quantity = item.quantity ?? 0;
  const fulfilled =
    normalizeAmount(item.detail?.fulfilled_quantity) ??
    normalizeAmount(item.detail?.shipped_quantity) ??
    0;
  return Math.max(0, quantity - fulfilled);
};

export const getUnfulfilledItems = (order: VendorOrder): VendorOrderItem[] =>
  (order.items ?? []).filter(item => getUnfulfilledQuantity(item) > 0);

export const canFulfillOrder = (order: VendorOrder): boolean =>
  getUnfulfilledItems(order).length > 0 &&
  order.fulfillment_status !== 'canceled' &&
  order.status !== 'canceled';

export const getActiveFulfillments = (
  order: VendorOrder,
): VendorOrderFulfillment[] =>
  (order.fulfillments ?? []).filter(f => !f.canceled_at);

export const getShippableFulfillment = (
  order: VendorOrder,
): VendorOrderFulfillment | undefined =>
  getActiveFulfillments(order).find(f => f.packed_at && !f.shipped_at);

export const getDeliverableFulfillment = (
  order: VendorOrder,
): VendorOrderFulfillment | undefined =>
  getActiveFulfillments(order).find(f => f.shipped_at && !f.delivered_at);

export const fulfillmentStatusStyles: Record<
  FulfillmentStatus | string,
  { bg: string; text: string }
> = {
  not_fulfilled: { bg: 'bg-amber-100', text: 'text-amber-800' },
  partially_fulfilled: { bg: 'bg-amber-100', text: 'text-amber-800' },
  fulfilled: { bg: 'bg-blue-100', text: 'text-blue-800' },
  partially_shipped: { bg: 'bg-blue-100', text: 'text-blue-800' },
  shipped: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  partially_delivered: { bg: 'bg-green-100', text: 'text-green-800' },
  delivered: { bg: 'bg-green-100', text: 'text-green-800' },
  canceled: { bg: 'bg-gray-200', text: 'text-gray-700' },
};

export const paymentStatusStyles: Record<string, { bg: string; text: string }> =
  {
    captured: { bg: 'bg-green-100', text: 'text-green-800' },
    authorized: { bg: 'bg-blue-100', text: 'text-blue-800' },
    awaiting: { bg: 'bg-amber-100', text: 'text-amber-800' },
    not_paid: { bg: 'bg-red-100', text: 'text-red-800' },
    refunded: { bg: 'bg-gray-200', text: 'text-gray-700' },
  };

export const isPendingFulfillment = (status?: string): boolean =>
  !status ||
  status === 'not_fulfilled' ||
  status === 'partially_fulfilled';
