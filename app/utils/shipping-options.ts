import { HttpTypes } from '@medusajs/types';

type ShippingOption = HttpTypes.StoreCartShippingOptionWithServiceZone;

type GroupedShippingOptions = Record<string, ShippingOption[]>;

export const normalizeShippingOptions = (
  shippingOptions: unknown,
): ShippingOption[] => {
  if (!shippingOptions) {
    return [];
  }

  if (Array.isArray(shippingOptions)) {
    return shippingOptions;
  }

  if (typeof shippingOptions === 'object') {
    return Object.values(shippingOptions as GroupedShippingOptions).flat();
  }

  return [];
};
