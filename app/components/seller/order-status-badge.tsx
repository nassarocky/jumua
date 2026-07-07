import React from 'react';
import { View } from 'react-native';
import { useLocalization } from '@fluent/react';
import Text from '@components/common/text';
import { getFulfillmentStatus, type FulfillmentStatus } from '@utils/order';
import { fulfillmentStatusStyles } from '@utils/vendor-order';

type OrderStatusBadgeProps = {
  fulfillmentStatus?: string | null;
  paymentStatus?: string | null;
};

const OrderStatusBadge = ({
  fulfillmentStatus,
  paymentStatus,
}: OrderStatusBadgeProps) => {
  const { l10n } = useLocalization();
  const statusKey = fulfillmentStatus
    ? getFulfillmentStatus(fulfillmentStatus as FulfillmentStatus)
    : 'not-fulfilled';
  const styles =
    fulfillmentStatusStyles[fulfillmentStatus ?? 'not_fulfilled'] ??
    fulfillmentStatusStyles.not_fulfilled;

  return (
    <View className="flex-row flex-wrap gap-2">
      <View className={`px-2.5 py-1 rounded-full ${styles.bg}`}>
        <Text className={`text-xs font-content-bold ${styles.text}`}>
          {l10n.getString(statusKey)}
        </Text>
      </View>
      {paymentStatus ? (
        <View className="px-2.5 py-1 rounded-full bg-background-secondary border border-gray-200">
          <Text className="text-xs opacity-70 capitalize">
            {paymentStatus.replace(/_/g, ' ')}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

export default OrderStatusBadge;
