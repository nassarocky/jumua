import {
  isProductWishlisted,
  toggleWishlistId,
} from '../app/utils/wishlist';

describe('wishlist utils', () => {
  it('adds a product id when not wishlisted', () => {
    expect(toggleWishlistId(['prod_1'], 'prod_2')).toEqual(['prod_1', 'prod_2']);
  });

  it('removes a product id when already wishlisted', () => {
    expect(toggleWishlistId(['prod_1', 'prod_2'], 'prod_1')).toEqual(['prod_2']);
  });

  it('checks wishlist membership', () => {
    expect(isProductWishlisted(['prod_1'], 'prod_1')).toBe(true);
    expect(isProductWishlisted(['prod_1'], 'prod_2')).toBe(false);
  });
});
