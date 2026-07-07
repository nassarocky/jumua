import { HttpTypes } from '@medusajs/types';

export type ProductWithUnitsSold = HttpTypes.StoreProduct & {
  units_sold?: number | string | null;
};

export const getProductUnitsSold = (
  product: ProductWithUnitsSold,
): number | null => {
  const metadata = product.metadata as Record<string, unknown> | null | undefined;
  const raw = product.units_sold ?? metadata?.units_sold;
  if (raw == null || raw === '') {
    return null;
  }

  const parsed =
    typeof raw === 'number' ? raw : Number.parseInt(String(raw).trim(), 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
};
