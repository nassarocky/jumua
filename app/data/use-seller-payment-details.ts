import { useQuery } from '@tanstack/react-query';
import apiClient from '@api/client';
import {
  CART_SELLER_PAYMENT_FIELDS,
  extractSellerPaymentDetails,
} from '@utils/seller-payment-details';

export const useSellerPaymentDetails = (
  cartId?: string,
  enabled = true,
) => {
  return useQuery({
    queryKey: ['seller-payment-details', cartId],
    queryFn: async () => {
      if (!cartId) {
        return [];
      }

      const { cart } = await apiClient.store.cart.retrieve(cartId, {
        fields: CART_SELLER_PAYMENT_FIELDS,
      });

      return extractSellerPaymentDetails(cart);
    },
    enabled: !!cartId && enabled,
  });
};
