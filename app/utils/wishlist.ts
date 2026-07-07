export const WISHLIST_STORAGE_KEY = 'wishlist_product_ids';

export const toggleWishlistId = (
  productIds: string[],
  productId: string,
): string[] => {
  if (productIds.includes(productId)) {
    return productIds.filter(id => id !== productId);
  }
  return [...productIds, productId];
};

export const isProductWishlisted = (
  productIds: string[],
  productId: string,
): boolean => productIds.includes(productId);
