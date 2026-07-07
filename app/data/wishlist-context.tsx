import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isProductWishlisted,
  toggleWishlistId,
  WISHLIST_STORAGE_KEY,
} from '@utils/wishlist';

type WishlistContextType = {
  productIds: string[];
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (productId: string) => Promise<void>;
};

const WishlistContext = createContext<WishlistContextType | null>(null);

type WishlistProviderProps = {
  children: React.ReactNode;
};

export const WishlistProvider = ({ children }: WishlistProviderProps) => {
  const [productIds, setProductIds] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(WISHLIST_STORAGE_KEY)
      .then(stored => {
        if (!stored) {
          return;
        }
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setProductIds(parsed.filter((id): id is string => typeof id === 'string'));
          }
        } catch {
          setProductIds([]);
        }
      })
      .finally(() => {
        setIsHydrated(true);
      });
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    AsyncStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(productIds));
  }, [productIds, isHydrated]);

  const isWishlisted = useCallback(
    (productId: string) => isProductWishlisted(productIds, productId),
    [productIds],
  );

  const toggleWishlist = useCallback(async (productId: string) => {
    setProductIds(current => toggleWishlistId(current, productId));
  }, []);

  return (
    <WishlistContext.Provider
      value={{
        productIds,
        isWishlisted,
        toggleWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);

  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }

  return context;
};
