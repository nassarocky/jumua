import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { HttpTypes } from '@medusajs/types';
import { useRegion } from './region-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '@api/client';
import {
  CART_FIELDS,
  cartHasCheckoutState,
  cloneCartWithoutCheckoutState,
  isCartCompleted,
} from '@utils/cart-checkout';

const CART_KEY = 'cart_id';

type AddressFields = {
  first_name: string;
  last_name: string;
  address_1: string;
  city: string;
  country_code: string;
  phone: string;
};

type CartUpdateData = Partial<{
  email: string;
  shipping_address: AddressFields;
  billing_address: AddressFields;
  region_id: string;
}>;

type CartContextType = {
  cart?: HttpTypes.StoreCart;
  setCart: React.Dispatch<
    React.SetStateAction<HttpTypes.StoreCart | undefined>
  >;
  resetCart: () => Promise<void>;
  addToCart: (variantId: string, quantity: number) => Promise<void>;
  updateLineItem: (lineItemId: string, quantity: number) => Promise<void>;
  updateCart: (data: CartUpdateData) => Promise<HttpTypes.StoreCart>;
  linkCartToCustomer: () => Promise<void>;
  setShippingMethod: (shippingMethodId: string) => Promise<HttpTypes.StoreCart>;
  applyPromoCode: (code: string) => Promise<boolean>;
  removePromoCode: (code: string) => Promise<void>;
};

const CartContext = createContext<CartContextType | null>(null);

type CartProviderProps = {
  children: React.ReactNode;
};

export const CartProvider = ({ children }: CartProviderProps) => {
  const [cart, setCart] = useState<HttpTypes.StoreCart>();
  const { region } = useRegion();
  const initializingRef = useRef(false);

  const retrieveCart = useCallback(async (cartId: string) => {
    const { cart: dataCart } = await apiClient.store.cart.retrieve(cartId, {
      fields: CART_FIELDS,
    });
    return dataCart;
  }, []);

  const createFreshCart = useCallback(
    async (regionId: string) => {
      const { cart: newCart } = await apiClient.store.cart.create({
        region_id: regionId,
      });
      await AsyncStorage.setItem(CART_KEY, newCart.id);
      setCart(newCart);
      return newCart;
    },
    [],
  );

  const refreshCart = useCallback(
    async (cartId: string) => {
      try {
        const dataCart = await retrieveCart(cartId);

        if (isCartCompleted(dataCart)) {
          await AsyncStorage.removeItem(CART_KEY);
          if (region?.id) {
            return createFreshCart(region.id);
          }
          setCart(undefined);
          return undefined;
        }

        setCart(dataCart);
        return dataCart;
      } catch (err) {
        console.log('Failed to refresh cart:', err);
        await AsyncStorage.removeItem(CART_KEY);
        if (region?.id) {
          return createFreshCart(region.id);
        }
        setCart(undefined);
        return undefined;
      }
    },
    [createFreshCart, region?.id, retrieveCart],
  );

  const invalidateCheckoutState = useCallback(
    async (currentCart: HttpTypes.StoreCart) => {
      if (!cartHasCheckoutState(currentCart)) {
        setCart(currentCart);
        return currentCart;
      }

      const freshCart = await cloneCartWithoutCheckoutState({
        cart: currentCart,
        createCart: async ({ region_id }) => {
          const { cart: createdCart } = await apiClient.store.cart.create({
            region_id,
          });
          return createdCart;
        },
        addLineItem: async (cartId, input) => {
          const { cart: updatedCart } = await apiClient.store.cart.createLineItem(
            cartId,
            input,
            { fields: CART_FIELDS },
          );
          return updatedCart;
        },
        retrieveCart,
      });

      await AsyncStorage.setItem(CART_KEY, freshCart.id);
      setCart(freshCart);
      return freshCart;
    },
    [retrieveCart],
  );

  const resetCart = useCallback(async () => {
    await AsyncStorage.removeItem(CART_KEY);

    if (!region?.id) {
      setCart(undefined);
      return;
    }

    initializingRef.current = true;
    try {
      await createFreshCart(region.id);
    } finally {
      initializingRef.current = false;
    }
  }, [createFreshCart, region?.id]);

  const updateCart = useCallback(
    async (data: CartUpdateData) => {
      if (!cart?.id) {
        throw new Error('No cart found');
      }

      const { cart: updatedCart } = await apiClient.store.cart.update(
        cart.id,
        data,
        {
          fields: CART_FIELDS,
        },
      );
      setCart(updatedCart);
      return updatedCart;
    },
    [cart?.id],
  );

  const updateCartRegion = useCallback(
    async (regionId: string) => {
      try {
        await updateCart({
          region_id: regionId,
        });
      } catch (err) {
        console.log('Failed to update cart region:', err);
        await resetCart();
      }
    },
    [resetCart, updateCart],
  );

  const initializeCart = useCallback(async () => {
    if (!region?.id || initializingRef.current) {
      return;
    }

    initializingRef.current = true;

    try {
      const storedCartId = await AsyncStorage.getItem(CART_KEY);

      if (storedCartId) {
        try {
          const dataCart = await retrieveCart(storedCartId);

          if (isCartCompleted(dataCart)) {
            await AsyncStorage.removeItem(CART_KEY);
            await createFreshCart(region.id);
            return;
          }

          if (dataCart.region_id !== region.id) {
            await updateCartRegion(region.id);
            return;
          }

          setCart(dataCart);
          return;
        } catch (err) {
          console.log('Stored cart unavailable, creating a new one:', err);
          await AsyncStorage.removeItem(CART_KEY);
        }
      }

      await createFreshCart(region.id);
    } finally {
      initializingRef.current = false;
    }
  }, [createFreshCart, region?.id, retrieveCart, updateCartRegion]);

  useEffect(() => {
    if (!region?.id) {
      return;
    }

    if (cart) {
      if (cart.region_id !== region.id) {
        updateCartRegion(region.id);
      }
      return;
    }

    initializeCart();
  }, [cart, initializeCart, region, updateCartRegion]);

  const addToCart = async (variantId: string, quantity: number) => {
    if (!cart?.id) {
      return;
    }

    try {
      await apiClient.store.cart.createLineItem(
        cart.id,
        {
          variant_id: variantId,
          quantity,
        },
        { fields: CART_FIELDS },
      );

      const refreshedCart = await refreshCart(cart.id);
      if (refreshedCart) {
        await invalidateCheckoutState(refreshedCart);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const updateLineItem = async (lineItemId: string, quantity: number) => {
    if (!cart?.id) {
      return;
    }

    try {
      if (quantity === 0) {
        await apiClient.store.cart.deleteLineItem(cart.id, lineItemId);
        const refreshedCart = await refreshCart(cart.id);

        if (!refreshedCart?.items?.length) {
          await resetCart();
          return;
        }

        await invalidateCheckoutState(refreshedCart);
        return;
      }

      await apiClient.store.cart.updateLineItem(
        cart.id,
        lineItemId,
        { quantity },
        { fields: CART_FIELDS },
      );

      const refreshedCart = await refreshCart(cart.id);
      if (refreshedCart) {
        await invalidateCheckoutState(refreshedCart);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const linkCartToCustomer = async () => {
    const { cart: dataCart } = await apiClient.store.cart.transferCart(
      cart?.id || '',
      { fields: CART_FIELDS },
    );
    setCart(dataCart);
  };

  const setShippingMethod = async (shippingMethodId: string) => {
    const { cart: updatedCart } = await apiClient.store.cart.addShippingMethod(
      cart?.id || '',
      {
        option_id: shippingMethodId,
      },
      {
        fields: CART_FIELDS,
      },
    );
    setCart(updatedCart);
    return updatedCart;
  };

  const applyPromoCode = async (code: string): Promise<boolean> => {
    if (!cart?.id) {
      throw new Error('No cart found');
    }

    try {
      const existingCodes =
        cart.promotions
          ?.filter(p => !p.is_automatic && p.code)
          .map(p => p.code!) || [];

      const { cart: updatedCart } = await apiClient.store.cart.update(
        cart.id,
        {
          promo_codes: [...existingCodes, code],
        },
        { fields: CART_FIELDS },
      );
      setCart(updatedCart);
      const updatedCartPromoCodes = updatedCart.promotions
        ?.filter(p => p.code)
        .map(p => p.code);
      if (updatedCartPromoCodes?.includes(code)) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const removePromoCode = async (code: string) => {
    if (!cart?.id) {
      throw new Error('No cart found');
    }

    const existingCodes =
      cart.promotions
        ?.filter(p => !p.is_automatic && p.code !== code)
        .map(p => p.code!) || [];

    const { cart: updatedCart } = await apiClient.store.cart.update(
      cart.id,
      {
        promo_codes: existingCodes,
      },
      { fields: CART_FIELDS },
    );
    setCart(updatedCart);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        setCart,
        resetCart,
        addToCart,
        updateLineItem,
        updateCart,
        linkCartToCustomer,
        setShippingMethod,
        applyPromoCode,
        removePromoCode,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }

  return context;
};

export type { AddressFields, CartUpdateData };
