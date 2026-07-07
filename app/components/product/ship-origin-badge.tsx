import React from 'react';
import { View } from 'react-native';
import Text from '@components/common/text';
import { HttpTypes } from '@medusajs/types';
import { getProductShipOrigin } from '@utils/ship-origin';

type ShipOriginBadgeProps = {
  product: HttpTypes.StoreProduct;
  selectedVariant?: HttpTypes.StoreProductVariant | null;
  size?: 'sm' | 'md';
};

const ShipOriginBadge = ({
  product,
  selectedVariant,
  size = 'sm',
}: ShipOriginBadgeProps) => {
  const info = getProductShipOrigin(product, { selectedVariant });

  const isSmall = size === 'sm';
  const containerClass = isSmall
    ? 'px-1.5 py-0.5 rounded-md'
    : 'px-2.5 py-1 rounded-lg';
  const textClass = isSmall ? 'text-[10px]' : 'text-xs';
  const flagClass = isSmall ? 'text-xs' : 'text-sm';

  return (
    <View
      className={`flex-row items-center gap-1 bg-black/70 ${containerClass}`}
    >
      <Text className={flagClass}>{info.flag}</Text>
      <Text className={`${textClass} font-content-bold text-white`}>
        {info.code}
      </Text>
    </View>
  );
};

export default ShipOriginBadge;
