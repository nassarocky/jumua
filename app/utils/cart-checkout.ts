import { HttpTypes } from '@medusajs/types';

export const CART_FIELDS =
  '*items,*items.variant,+shipping_methods.name,+payment_collection.payment_sessions';

export const cartHasCheckoutState = (
  cart?: HttpTypes.StoreCart | null,
): boolean =>
  Boolean(
    cart?.shipping_methods?.length ||
      cart?.payment_collection?.payment_sessions?.length,
  );

export const isCartCompleted = (cart?: HttpTypes.StoreCart | null): boolean =>
  Boolean(cart?.completed_at);

type CloneCartParams = {
  cart: HttpTypes.StoreCart;
  createCart: (input: { region_id: string }) => Promise<HttpTypes.StoreCart>;
  addLineItem: (
    cartId: string,
    input: { variant_id: string; quantity: number },
  ) => Promise<HttpTypes.StoreCart>;
  retrieveCart: (cartId: string) => Promise<HttpTypes.StoreCart>;
};

export const cloneCartWithoutCheckoutState = async ({
  cart,
  createCart,
  addLineItem,
  retrieveCart,
}: CloneCartParams): Promise<HttpTypes.StoreCart> => {
  const items = cart.items ?? [];
  const freshCart = await createCart({ region_id: cart.region_id });

  for (const item of items) {
    if (!item.variant_id || item.quantity < 1) {
      continue;
    }

    await addLineItem(freshCart.id, {
      variant_id: item.variant_id,
      quantity: item.quantity,
    });
  }

  return retrieveCart(freshCart.id);
};
