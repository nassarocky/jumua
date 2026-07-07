import React from 'react';
import { View } from 'react-native';
import { useLocalization } from '@fluent/react';
import { getProductPrice } from '@utils/product-price';
import { getProductShipOrigin } from '@utils/ship-origin';
import { HttpTypes } from '@medusajs/types';
import Text from '@components/common/text';

export default function ProductPrice({
  product,
  variant,
}: {
  product: HttpTypes.StoreProduct;
  variant?: HttpTypes.StoreProductVariant;
}) {
  const { l10n } = useLocalization();
  const { cheapestPrice, variantPrice } = getProductPrice({
    product,
    variantId: variant?.id,
  });

  const selectedPrice = variant ? variantPrice : cheapestPrice;
  const isInternational = getProductShipOrigin(product, { selectedVariant: variant })
    .origin === 'cn';

  if (!selectedPrice) {
    return <View className="w-32 h-7 bg-gray-100" />;
  }

  return (
    <View className="flex flex-col">
      <Text className="font-content-bold text-lg">
        {selectedPrice.calculated_price}
      </Text>

      {selectedPrice.price_type === 'sale' && (
        <>
          <Text className="text-gray-600">
            <Text>Original: </Text>
            <Text
              className="line-through"
              testID="original-product-price"
              accessibilityValue={{
                text: selectedPrice.original_price_number.toString(),
              }}
            >
              {selectedPrice.original_price}
            </Text>
          </Text>
          <Text className="text-primary">
            -{selectedPrice.percentage_diff}%
          </Text>
        </>
      )}
      {isInternational && (
        <Text className="text-xs text-content opacity-60 mt-1">
          {l10n.getString('price-includes-shipping-and-tax')}
        </Text>
      )}
    </View>
  );
}
