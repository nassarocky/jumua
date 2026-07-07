import React from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import { useLocalization } from '@fluent/react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import Text from '@components/common/text';
import MaterialIcon from '@react-native-vector-icons/material-design-icons';
import { useColors } from '@styles/hooks';
import { formatImageUrl } from '@utils/image-url';
import type { VendorOrder } from '@api/vendor-api';
import { formatVendorOrderAmount } from '@utils/vendor-order';
import OrderStatusBadge from '@components/seller/order-status-badge';

dayjs.extend(relativeTime);

const MAX_THUMBNAILS = 4;

type SellerOrderCardProps = {
  order: VendorOrder;
  onPress: () => void;
};

const SellerOrderCard = ({ order, onPress }: SellerOrderCardProps) => {
  const { l10n } = useLocalization();
  const colors = useColors();
  const itemsToShow = order.items?.slice(0, MAX_THUMBNAILS) ?? [];
  const remaining = (order.items?.length ?? 0) - itemsToShow.length;
  const itemCount =
    order.items?.reduce((sum, item) => sum + (item.quantity ?? 0), 0) ?? 0;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      className="bg-background rounded-2xl p-4 mb-3 border border-gray-100 elevation-lg"
      onPress={onPress}
    >
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1 pr-3">
          <Text className="font-content-bold text-base">
            {l10n.getString('order-with-id', {
              id: order.display_id ?? '-',
            })}
          </Text>
          <Text className="text-xs opacity-50 mt-0.5">
            {dayjs(order.created_at).fromNow()} ·{' '}
            {l10n.getString('order-items-count', { count: itemCount })}
          </Text>
        </View>
        <Text className="font-content-bold text-base text-primary">
          {formatVendorOrderAmount(order)}
        </Text>
      </View>

      <View className="mb-3">
        <OrderStatusBadge
          fulfillmentStatus={order.fulfillment_status}
          paymentStatus={order.payment_status}
        />
      </View>

      <View className="flex-row items-center justify-between">
        <View className="flex-row gap-2">
          {itemsToShow.map(orderItem => (
            <View
              key={orderItem.id}
              className="w-11 h-11 rounded-xl bg-gray-100 overflow-hidden border border-gray-100"
            >
              {orderItem.thumbnail ? (
                <Image
                  source={{ uri: formatImageUrl(orderItem.thumbnail) }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-full h-full items-center justify-center">
                  <MaterialIcon
                    name="image-outline"
                    size={18}
                    color={colors.content}
                  />
                </View>
              )}
            </View>
          ))}
          {remaining > 0 && (
            <View className="w-11 h-11 rounded-xl bg-gray-100 items-center justify-center border border-gray-100">
              <Text className="text-xs opacity-60">+{remaining}</Text>
            </View>
          )}
        </View>
        <MaterialIcon name="chevron-right" size={22} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );
};

export default SellerOrderCard;
