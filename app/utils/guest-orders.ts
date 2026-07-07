import AsyncStorage from '@react-native-async-storage/async-storage';
import { HttpTypes } from '@medusajs/types';
import apiClient from '@api/client';
import {
  emailsMatchForPhone,
  normalizePhoneNumber,
  phoneToAccountEmail,
  phonesMatch,
} from './phone-auth';

const GUEST_ORDERS_KEY = 'guest_orders';
const MAX_STORED_GUEST_ORDERS = 25;

export type GuestOrderRecord = {
  orderId: string;
  phone: string;
  email: string;
  createdAt: string;
  order: HttpTypes.StoreOrder;
};

export const getGuestOrders = async (): Promise<GuestOrderRecord[]> => {
  try {
    const raw = await AsyncStorage.getItem(GUEST_ORDERS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as GuestOrderRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveGuestOrder = async ({
  order,
  phone,
  email,
}: {
  order: HttpTypes.StoreOrder;
  phone: string;
  email: string;
}) => {
  const existing = await getGuestOrders();
  const normalizedPhone = normalizePhoneNumber(phone);
  const normalizedEmail = (email || phoneToAccountEmail(phone)).toLowerCase();
  const record: GuestOrderRecord = {
    orderId: order.id,
    phone: normalizedPhone,
    email: normalizedEmail,
    createdAt: new Date().toISOString(),
    order,
  };

  const updated = [
    record,
    ...existing.filter(existingOrder => existingOrder.orderId !== order.id),
  ].slice(0, MAX_STORED_GUEST_ORDERS);

  await AsyncStorage.setItem(GUEST_ORDERS_KEY, JSON.stringify(updated));
};

export const removeGuestOrder = async (orderId: string) => {
  const existing = await getGuestOrders();
  const updated = existing.filter(order => order.orderId !== orderId);
  await AsyncStorage.setItem(GUEST_ORDERS_KEY, JSON.stringify(updated));
};

export const findGuestOrderById = async (
  orderId: string,
): Promise<HttpTypes.StoreOrder | undefined> => {
  const orders = await getGuestOrders();
  return orders.find(record => record.orderId === orderId)?.order;
};

export const getGuestOrdersForCustomer = async (
  customer: HttpTypes.StoreCustomer,
): Promise<GuestOrderRecord[]> => {
  const orders = await getGuestOrders();
  const customerPhone = customer.phone
    ? normalizePhoneNumber(customer.phone)
    : '';
  const customerEmail = customer.email?.toLowerCase() ?? '';

  return orders.filter(order => {
    if (customerEmail && order.email === customerEmail) {
      return true;
    }

    if (customerPhone && order.phone === customerPhone) {
      return true;
    }

    if (customerPhone && emailsMatchForPhone(customerEmail, customerPhone)) {
      return order.email === phoneToAccountEmail(customerPhone).toLowerCase();
    }

    return false;
  });
};

export const claimGuestOrdersForCustomer = async (
  customer: HttpTypes.StoreCustomer,
) => {
  const guestOrders = await getGuestOrdersForCustomer(customer);

  await Promise.all(
    guestOrders.map(async guestOrder => {
      try {
        await apiClient.store.order.requestTransfer(guestOrder.orderId, {
          description: 'Link guest order to account after sign in',
        });
      } catch {
        // Transfer may require email confirmation on some backends.
      }
    }),
  );
};

export const getGuestOrdersForCustomerDisplay = async (
  customer: HttpTypes.StoreCustomer,
): Promise<HttpTypes.StoreOrder[]> => {
  const guestRecords = await getGuestOrdersForCustomer(customer);
  return guestRecords.map(record => record.order);
};

export const mergeOrders = (
  accountOrders: HttpTypes.StoreOrder[],
  guestOrders: HttpTypes.StoreOrder[],
): HttpTypes.StoreOrder[] => {
  const seen = new Set(accountOrders.map(order => order.id));

  const mergedGuestOrders = guestOrders.filter(order => {
    if (seen.has(order.id)) {
      return false;
    }

    seen.add(order.id);
    return true;
  });

  return [...accountOrders, ...mergedGuestOrders].sort(
    (left, right) =>
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
  );
};

export const guestOrderMatchesPhone = (
  record: GuestOrderRecord,
  phone: string,
) => phonesMatch(record.phone, phone);
