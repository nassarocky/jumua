import React from 'react';
import { View } from 'react-native';
import { useLocalization } from '@fluent/react';
import Text from '@components/common/text';
import { HttpTypes } from '@medusajs/types';
import ShipOriginBadge from '@components/product/ship-origin-badge';
import {
  getDeliveryEstimateMessages,
  getProductShipOrigin,
} from '@utils/ship-origin';

type ShipOriginDeliveryInfoProps = {
  product: HttpTypes.StoreProduct;
  selectedVariant?: HttpTypes.StoreProductVariant | null;
};

const ShipOriginDeliveryInfo = ({
  product,
  selectedVariant,
}: ShipOriginDeliveryInfoProps) => {
  const { l10n } = useLocalization();
  const info = getProductShipOrigin(product, { selectedVariant });
  const messages = getDeliveryEstimateMessages(info);

  return (
    <View className="mt-2 p-3 bg-background-secondary rounded-lg gap-2">
      <View className="flex-row items-center gap-2">
        <ShipOriginBadge
          product={product}
          selectedVariant={selectedVariant}
          size="md"
        />
        <Text className="text-sm font-content-bold text-content flex-1">
          {l10n.getString('ships-from-country', { country: info.countryName })}
        </Text>
      </View>
      <Text className="text-base font-content-bold text-primary">
        {messages.estimateArgs
          ? l10n.getString(messages.estimate, messages.estimateArgs)
          : l10n.getString(messages.estimate)}
      </Text>
      <Text className="text-sm text-content opacity-70">
        {l10n.getString(messages.note)}
      </Text>
    </View>
  );
};

export default ShipOriginDeliveryInfo;
