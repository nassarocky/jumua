import React from 'react';
import { useLocalization } from '@fluent/react';
import { HttpTypes } from '@medusajs/types';
import Text from '@components/common/text';
import { getProductUnitsSold } from '@utils/product-units-sold';

type UnitsSoldLabelProps = {
  product: HttpTypes.StoreProduct;
};

const UnitsSoldLabel = ({ product }: UnitsSoldLabelProps) => {
  const { l10n } = useLocalization();
  const unitsSold = getProductUnitsSold(product);

  if (unitsSold === null) {
    return null;
  }

  return (
    <Text className="text-xs text-content opacity-60 mt-0.5">
      {l10n.getString('units-sold', { count: unitsSold })}
    </Text>
  );
};

export default UnitsSoldLabel;
