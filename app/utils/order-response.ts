import { HttpTypes } from '@medusajs/types';

type Unknown = Record<string, unknown>;

const isOrderLike = (value: unknown): value is HttpTypes.StoreOrder => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Unknown;
  return (
    typeof candidate.id === 'string' &&
    // Medusa order IDs are prefixed with `order_`. This distinguishes real
    // orders from carts (`cart_`) and order groups (`og_`/`ordgrp_`) which
    // can otherwise look order-shaped (both may carry `items`/`total`).
    candidate.id.startsWith('order_') &&
    Array.isArray(candidate.items) &&
    ('total' in candidate || 'currency_code' in candidate)
  );
};

/**
 * The backend's cart-complete response shape for multi-seller orders isn't
 * part of the standard Medusa SDK types (it wraps orders under an
 * `order_group` key whose exact structure varies). Rather than guessing at
 * field names, walk the response and collect anything that looks like a
 * real order object.
 */
export const extractOrdersFromCompleteResponse = (
  response: unknown,
  maxDepth = 5,
): HttpTypes.StoreOrder[] => {
  const found = new Map<string, HttpTypes.StoreOrder>();
  const visited = new Set<unknown>();

  const walk = (value: unknown, depth: number) => {
    if (!value || typeof value !== 'object' || depth > maxDepth) {
      return;
    }
    if (visited.has(value)) {
      return;
    }
    visited.add(value);

    if (isOrderLike(value)) {
      found.set(value.id, value);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(item => walk(item, depth + 1));
      return;
    }

    Object.values(value as Unknown).forEach(item => walk(item, depth + 1));
  };

  walk(response, 0);

  return [...found.values()];
};
