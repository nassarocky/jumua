import { HttpTypes } from '@medusajs/types';

export type ShipOrigin = 'cn' | 'tz';

export type ShipOriginInfo = {
  origin: ShipOrigin;
  flag: string;
  code: string;
  countryName: string;
  minDays: number;
  maxDays: number;
};

type ProductWithOrigin = HttpTypes.StoreProduct;

export type GetProductShipOriginOptions = {
  selectedVariant?: HttpTypes.StoreProductVariant | null;
};

const SHIP_ORIGIN_MAP: Record<ShipOrigin, Omit<ShipOriginInfo, 'origin'>> = {
  cn: {
    flag: '🇨🇳',
    code: 'CN',
    countryName: 'China',
    minDays: 25,
    maxDays: 35,
  },
  tz: {
    flag: '🇹🇿',
    code: 'TZ',
    countryName: 'Tanzania',
    minDays: 0,
    maxDays: 0,
  },
};

export const PRODUCT_ORIGIN_FIELDS =
  '*variants.calculated_price,+variants.origin_country,+metadata,+units_sold';

const CHINA_VALUES = new Set(['cn', 'chn', 'china', 'prc']);
const TANZANIA_VALUES = new Set(['tz', 'tza', 'tanzania']);

const normalizeCountryValue = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return normalized || null;
};

const resolveFromCountryValue = (value: unknown): ShipOrigin | null => {
  const normalized = normalizeCountryValue(value);
  if (!normalized) {
    return null;
  }
  if (CHINA_VALUES.has(normalized)) {
    return 'cn';
  }
  if (TANZANIA_VALUES.has(normalized)) {
    return 'tz';
  }
  return null;
};

const toShipOriginInfo = (origin: ShipOrigin): ShipOriginInfo => ({
  origin,
  ...SHIP_ORIGIN_MAP[origin],
});

const readMetadataOrigin = (
  metadata: Record<string, unknown> | null | undefined,
): ShipOrigin | null => {
  if (!metadata) {
    return null;
  }

  const directKeys = [
    'ship_from',
    'shipping_origin',
    'fulfillment_country',
    'stock_country',
    'warehouse_country',
  ];

  for (const key of directKeys) {
    const resolved = resolveFromCountryValue(metadata[key]);
    if (resolved) {
      return resolved;
    }
  }

  if (metadata.ships_from_china === true || metadata.ships_from_china === 'true') {
    return 'cn';
  }
  if (metadata.ships_from_china === false || metadata.ships_from_china === 'false') {
    return 'tz';
  }
  if (metadata.local_stock === true || metadata.local_stock === 'true') {
    return 'tz';
  }

  return null;
};

const readVariantOrigin = (
  variant?: HttpTypes.StoreProductVariant | null,
): ShipOrigin | null => {
  if (!variant) {
    return null;
  }
  return resolveFromCountryValue(variant.origin_country);
};

const readAnyVariantOrigin = (
  variants?: HttpTypes.StoreProductVariant[] | null,
): ShipOrigin | null => {
  for (const variant of variants ?? []) {
    const origin = readVariantOrigin(variant);
    if (origin) {
      return origin;
    }
  }
  return null;
};

export const getProductShipOrigin = (
  product: ProductWithOrigin,
  options?: GetProductShipOriginOptions,
): ShipOriginInfo => {
  const productOrigin = resolveFromCountryValue(product.origin_country);
  if (productOrigin) {
    return toShipOriginInfo(productOrigin);
  }

  const metadataOrigin = readMetadataOrigin(
    product.metadata as Record<string, unknown> | null | undefined,
  );
  if (metadataOrigin) {
    return toShipOriginInfo(metadataOrigin);
  }

  const selectedVariantOrigin = readVariantOrigin(options?.selectedVariant);
  if (selectedVariantOrigin) {
    return toShipOriginInfo(selectedVariantOrigin);
  }

  const anyVariantOrigin = readAnyVariantOrigin(product.variants);
  if (anyVariantOrigin) {
    return toShipOriginInfo(anyVariantOrigin);
  }

  return toShipOriginInfo('cn');
};

export const formatDeliveryEstimate = (
  info: ShipOriginInfo,
): { range: string; noteKey: 'china-shipping-note' | 'local-shipping-note' } => {
  if (info.origin === 'tz') {
    return {
      range: '0',
      noteKey: 'local-shipping-note',
    };
  }
  return {
    range: `${info.minDays}-${info.maxDays}`,
    noteKey: 'china-shipping-note',
  };
};

export type DeliveryEstimateMessages = {
  estimate: 'same-day-delivery' | 'delivery-estimate-days';
  estimateArgs?: { days: string };
  note: 'china-shipping-note' | 'local-shipping-note';
};

export const getDeliveryEstimateMessages = (
  info: ShipOriginInfo,
): DeliveryEstimateMessages => {
  if (info.origin === 'tz') {
    return {
      estimate: 'same-day-delivery',
      note: 'local-shipping-note',
    };
  }
  return {
    estimate: 'delivery-estimate-days',
    estimateArgs: { days: `${info.minDays}-${info.maxDays}` },
    note: 'china-shipping-note',
  };
};
