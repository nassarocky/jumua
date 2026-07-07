import React from 'react';
import MaterialIcon from '@react-native-vector-icons/material-design-icons';
import { TouchableOpacity } from 'react-native';
import { useColors } from '@styles/hooks';
import { StoreProduct } from '@medusajs/types';
import { useWishlist } from '@data/wishlist-context';

type WishlistButtonProps = {
  product: StoreProduct;
  containerClassName?: string;
  iconColor?: string;
  bgColor?: string;
};

const WishlistButton = ({
  product,
  containerClassName,
  bgColor,
  iconColor,
}: WishlistButtonProps) => {
  const colors = useColors();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const wishlisted = isWishlisted(product.id);

  const handlePress = () => {
    toggleWishlist(product.id);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      className={`w-8 h-8 rounded-full justify-center items-center ${containerClassName ?? ''}`}
      style={{ backgroundColor: bgColor ?? 'rgba(0,0,0,0.5)' }}
    >
      <MaterialIcon
        name={wishlisted ? 'heart' : 'heart-outline'}
        size={14}
        color={wishlisted ? '#ef4444' : (iconColor ?? colors.contentSecondary)}
      />
    </TouchableOpacity>
  );
};

export default WishlistButton;
