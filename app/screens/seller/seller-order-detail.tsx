import React, { useMemo, useState } from 'react';
import { View, ScrollView, Image, Alert } from 'react-native';
import { useLocalization } from '@fluent/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import Text from '@components/common/text';
import Navbar from '@components/common/navbar';
import Card from '@components/common/card';
import Loader from '@components/common/loader';
import ErrorUI from '@components/common/error-ui';
import Button from '@components/common/button';
import Input from '@components/common/input';
import MaterialIcon from '@react-native-vector-icons/material-design-icons';
import { useColors } from '@styles/hooks';
import {
  completeVendorOrder,
  createVendorOrderFulfillment,
  createVendorOrderShipment,
  getVendorOrder,
  listStockLocations,
  markVendorFulfillmentDelivered,
} from '@api/vendor-api';
import { convertToLocale } from '@utils/product-price';
import { formatImageUrl } from '@utils/image-url';
import OrderStatusBadge from '@components/seller/order-status-badge';
import {
  canFulfillOrder,
  getDeliverableFulfillment,
  getShippableFulfillment,
  getUnfulfilledItems,
  getUnfulfilledQuantity,
  formatVendorOrderAmount,
  getVendorItemLineTotal,
  getVendorItemUnitPrice,
  getVendorOrderSubtotal,
  normalizeAmount,
} from '@utils/vendor-order';

type SellerOrderDetailProps = {
  route: {
    params: {
      orderId: string;
    };
  };
};

const SellerOrderDetail = ({ route }: SellerOrderDetailProps) => {
  const { l10n } = useLocalization();
  const colors = useColors();
  const queryClient = useQueryClient();
  const { orderId } = route.params;
  const [trackingNumber, setTrackingNumber] = useState('');

  const { data, isPending, error } = useQuery({
    queryKey: ['vendor-order', orderId],
    queryFn: () => getVendorOrder(orderId),
  });

  const { data: stockData } = useQuery({
    queryKey: ['vendor-stock-locations'],
    queryFn: listStockLocations,
  });

  const order = data?.order;
  const stockLocationId = stockData?.stock_locations?.[0]?.id;
  const unfulfilledItems = useMemo(
    () => (order ? getUnfulfilledItems(order) : []),
    [order],
  );
  const shippableFulfillment = order ? getShippableFulfillment(order) : undefined;
  const deliverableFulfillment = order
    ? getDeliverableFulfillment(order)
    : undefined;

  const invalidateOrder = () => {
    queryClient.invalidateQueries({ queryKey: ['vendor-order', orderId] });
    queryClient.invalidateQueries({ queryKey: ['vendor-orders'] });
  };

  const showError = (err: unknown) => {
    const message =
      err instanceof Error ? err.message : l10n.getString('something-went-wrong');
    Alert.alert(l10n.getString('failed-to-save'), message);
  };

  const fulfillMutation = useMutation({
    mutationFn: async () => {
      if (!order || !stockLocationId) {
        throw new Error(l10n.getString('stock-location-required'));
      }
      const items = unfulfilledItems.map(item => ({
        id: item.id,
        quantity: getUnfulfilledQuantity(item),
      }));
      const requiresShipping = items.some(
        item =>
          order.items?.find(line => line.id === item.id)?.requires_shipping !==
          false,
      );
      return createVendorOrderFulfillment(orderId, {
        items,
        requires_shipping: requiresShipping,
        location_id: stockLocationId,
      });
    },
    onSuccess: () => {
      invalidateOrder();
      Alert.alert(
        l10n.getString('fulfillment-created'),
        l10n.getString('fulfillment-created-description'),
      );
    },
    onError: showError,
  });

  const shipMutation = useMutation({
    mutationFn: async () => {
      if (!order) {
        throw new Error(l10n.getString('order-not-found'));
      }

      const tracking = trackingNumber.trim();
      const labels = tracking
        ? [
            {
              tracking_number: tracking,
              tracking_url: `https://track.example.com/${tracking}`,
              label_url: 'https://example.com/label',
            },
          ]
        : undefined;

      let fulfillmentId = shippableFulfillment?.id;
      let shipmentItems = (order.items ?? []).map(item => ({
        id: item.id,
        quantity: item.quantity ?? 1,
      }));

      if (!fulfillmentId) {
        if (!stockLocationId) {
          throw new Error(l10n.getString('stock-location-required'));
        }
        const itemsToFulfill = unfulfilledItems.map(item => ({
          id: item.id,
          quantity: getUnfulfilledQuantity(item),
        }));
        if (itemsToFulfill.length === 0) {
          throw new Error(l10n.getString('nothing-to-ship'));
        }
        const requiresShipping = itemsToFulfill.some(
          line =>
            order.items?.find(entry => entry.id === line.id)?.requires_shipping !==
            false,
        );
        const { fulfillment } = await createVendorOrderFulfillment(orderId, {
          items: itemsToFulfill,
          requires_shipping: requiresShipping,
          location_id: stockLocationId,
        });
        fulfillmentId = fulfillment.id;
        shipmentItems = itemsToFulfill;
      }

      return createVendorOrderShipment(orderId, fulfillmentId, {
        items: shipmentItems,
        labels,
      });
    },
    onSuccess: () => {
      invalidateOrder();
      setTrackingNumber('');
      Alert.alert(
        l10n.getString('order-shipped'),
        l10n.getString('order-shipped-description'),
      );
    },
    onError: showError,
  });

  const deliverMutation = useMutation({
    mutationFn: async () => {
      if (!deliverableFulfillment) {
        throw new Error(l10n.getString('nothing-to-deliver'));
      }
      return markVendorFulfillmentDelivered(orderId, deliverableFulfillment.id);
    },
    onSuccess: () => {
      invalidateOrder();
      Alert.alert(
        l10n.getString('order-delivered'),
        l10n.getString('order-delivered-description'),
      );
    },
    onError: showError,
  });

  const completeMutation = useMutation({
    mutationFn: () => completeVendorOrder(orderId),
    onSuccess: () => {
      invalidateOrder();
      Alert.alert(
        l10n.getString('order-completed'),
        l10n.getString('order-completed-description'),
      );
    },
    onError: showError,
  });

  const isBusy =
    fulfillMutation.isPending ||
    shipMutation.isPending ||
    deliverMutation.isPending ||
    completeMutation.isPending;

  if (isPending) {
    return (
      <View className="flex-1 bg-background">
        <Navbar title={l10n.getString('order-details')} />
        <Loader />
      </View>
    );
  }

  if (error || !order) {
    return (
      <View className="flex-1 bg-background">
        <Navbar title={l10n.getString('order-details')} />
        <ErrorUI />
      </View>
    );
  }

  const showFulfillButton = canFulfillOrder(order) && !!stockLocationId;
  const showShipButton = !!shippableFulfillment || showFulfillButton;
  const showDeliverButton = !!deliverableFulfillment;
  const showCompleteButton =
    order.status !== 'completed' &&
    ['fulfilled', 'shipped', 'delivered', 'partially_delivered'].includes(
      order.fulfillment_status ?? '',
    );

  return (
    <View className="flex-1 bg-background-secondary p-safe">
      <Navbar title={l10n.getString('order-details')} />
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-4 pb-28">
        <View className="bg-background rounded-2xl p-4 border border-gray-100 elevation-lg">
          <View className="flex-row justify-between items-start mb-3">
            <View className="flex-1">
              <Text className="text-xl font-content-bold">
                {l10n.getString('order-with-id', {
                  id: order.display_id ?? '-',
                })}
              </Text>
              <Text className="opacity-60 text-sm mt-1">
                {l10n.getString('placed-on', {
                  datetime: dayjs(order.created_at).format('MMMM D, YYYY h:mm A'),
                })}
              </Text>
            </View>
            <Text className="font-content-bold text-lg text-primary">
              {formatVendorOrderAmount(order)}
            </Text>
          </View>
          <OrderStatusBadge
            fulfillmentStatus={order.fulfillment_status}
            paymentStatus={order.payment_status}
          />
        </View>

        {(showFulfillButton || showShipButton || showDeliverButton) && (
          <View className="bg-background rounded-2xl p-4 border border-gray-100 elevation-lg gap-3">
            <View className="flex-row items-center gap-2">
              <MaterialIcon name="truck-delivery-outline" size={20} color={colors.primary} />
              <Text className="font-content-bold text-base">
                {l10n.getString('fulfillment-actions')}
              </Text>
            </View>

            {unfulfilledItems.length > 0 && (
              <View className="bg-background-secondary rounded-xl p-3 gap-2">
                <Text className="text-sm font-content-bold">
                  {l10n.getString('unfulfilled-items')}
                </Text>
                {unfulfilledItems.map(item => (
                  <View key={item.id} className="flex-row justify-between">
                    <Text className="flex-1 text-sm" numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text className="text-sm opacity-60">
                      x{getUnfulfilledQuantity(item)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {(showShipButton || shippableFulfillment) && (
              <Input
                label={l10n.getString('tracking-number-optional')}
                value={trackingNumber}
                onChangeText={setTrackingNumber}
                placeholder={l10n.getString('tracking-number-placeholder')}
              />
            )}

            {!stockLocationId && showFulfillButton && (
              <Text className="text-sm text-amber-700">
                {l10n.getString('stock-location-required')}
              </Text>
            )}

            {showFulfillButton && !shippableFulfillment && (
              <Button
                title={l10n.getString('create-fulfillment')}
                onPress={() => fulfillMutation.mutate()}
                loading={fulfillMutation.isPending}
                disabled={isBusy}
              />
            )}

            {showShipButton && (
              <Button
                title={l10n.getString('mark-as-shipped')}
                onPress={() => shipMutation.mutate()}
                loading={shipMutation.isPending}
                disabled={isBusy}
              />
            )}

            {showDeliverButton && (
              <Button
                title={l10n.getString('mark-as-delivered')}
                variant="secondary"
                onPress={() => deliverMutation.mutate()}
                loading={deliverMutation.isPending}
                disabled={isBusy}
              />
            )}
          </View>
        )}

        {order.fulfillments && order.fulfillments.length > 0 && (
          <Card>
            <Text className="font-content-bold mb-3">
              {l10n.getString('fulfillments')}
            </Text>
            {order.fulfillments.map(fulfillment => (
              <View
                key={fulfillment.id}
                className="py-3 border-b border-gray-100 last:border-b-0 gap-1"
              >
                <Text className="text-sm font-content-bold">
                  #{fulfillment.id.slice(-8)}
                </Text>
                {fulfillment.packed_at && (
                  <Text className="text-xs opacity-60">
                    {l10n.getString('packed-at')}:{' '}
                    {dayjs(fulfillment.packed_at).format('MMM D, YYYY h:mm A')}
                  </Text>
                )}
                {fulfillment.shipped_at && (
                  <Text className="text-xs opacity-60">
                    {l10n.getString('shipped-at')}:{' '}
                    {dayjs(fulfillment.shipped_at).format('MMM D, YYYY h:mm A')}
                  </Text>
                )}
                {fulfillment.delivered_at && (
                  <Text className="text-xs opacity-60">
                    {l10n.getString('delivered-at')}:{' '}
                    {dayjs(fulfillment.delivered_at).format('MMM D, YYYY h:mm A')}
                  </Text>
                )}
                {fulfillment.labels?.[0]?.tracking_number && (
                  <Text className="text-xs text-primary">
                    {l10n.getString('tracking')}:{' '}
                    {fulfillment.labels[0].tracking_number}
                  </Text>
                )}
              </View>
            ))}
          </Card>
        )}

        <Card>
          <Text className="font-content-bold mb-3">
            {l10n.getString('order-items')}
          </Text>
          {order.items?.map(item => (
            <View
              key={item.id}
              className="flex-row items-center py-3 border-b border-gray-100 last:border-b-0"
            >
              <View className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden">
                {item.thumbnail ? (
                  <Image
                    source={{ uri: formatImageUrl(item.thumbnail) }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-full h-full items-center justify-center">
                    <MaterialIcon
                      name="image-outline"
                      size={20}
                      color={colors.content}
                    />
                  </View>
                )}
              </View>
              <View className="flex-1 ml-3">
                <Text numberOfLines={2} className="font-content-bold">
                  {item.title}
                </Text>
                <Text className="text-sm opacity-60 mt-0.5">
                  {item.quantity}x{' '}
                  {convertToLocale({
                    amount: getVendorItemUnitPrice(item, order.currency_code),
                    currency_code: order.currency_code,
                  })}
                </Text>
                {getUnfulfilledQuantity(item) > 0 && (
                  <Text className="text-xs text-amber-700 mt-1">
                    {l10n.getString('items-remaining', {
                      count: getUnfulfilledQuantity(item),
                    })}
                  </Text>
                )}
              </View>
              <Text className="font-content-bold">
                {convertToLocale({
                  amount: getVendorItemLineTotal(item, order.currency_code),
                  currency_code: order.currency_code,
                })}
              </Text>
            </View>
          ))}
        </Card>

        {order.shipping_address && (
          <Card>
            <View className="flex-row justify-between gap-4">
              <View className="flex-1 gap-1">
                <Text className="opacity-60 mb-1">
                  {l10n.getString('shipping-address')}
                </Text>
                <Text>
                  {order.shipping_address.first_name}{' '}
                  {order.shipping_address.last_name}
                </Text>
                <Text>{order.shipping_address.address_1}</Text>
                <Text>{order.shipping_address.city}</Text>
                {order.shipping_address.phone && (
                  <Text>{order.shipping_address.phone}</Text>
                )}
              </View>
              <View className="flex-1 gap-1">
                <Text className="opacity-60 mb-1">
                  {l10n.getString('contact')}
                </Text>
                <Text>{order.email}</Text>
              </View>
            </View>
          </Card>
        )}

        <Card>
          <Text className="font-content-bold mb-3">
            {l10n.getString('order-summary')}
          </Text>
          {getVendorOrderSubtotal(order) != null && (
            <View className="flex-row justify-between mb-2">
              <Text className="opacity-60">{l10n.getString('subtotal')}</Text>
              <Text>
                {convertToLocale({
                  amount: getVendorOrderSubtotal(order)!,
                  currency_code: order.currency_code,
                })}
              </Text>
            </View>
          )}
          {normalizeAmount(order.shipping_total) != null && (
            <View className="flex-row justify-between mb-2">
              <Text className="opacity-60">{l10n.getString('shipping')}</Text>
              <Text>
                {convertToLocale({
                  amount: normalizeAmount(order.shipping_total)!,
                  currency_code: order.currency_code,
                })}
              </Text>
            </View>
          )}
          <View className="flex-row justify-between mt-2 pt-2 border-t border-gray-100">
            <Text className="font-content-bold text-lg">
              {l10n.getString('total')}
            </Text>
            <Text className="font-content-bold text-lg text-primary">
              {formatVendorOrderAmount(order)}
            </Text>
          </View>
        </Card>
      </ScrollView>

      {showCompleteButton && (
        <View className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t border-gray-100">
          <Button
            title={l10n.getString('complete-order')}
            onPress={() => completeMutation.mutate()}
            loading={completeMutation.isPending}
            disabled={isBusy}
          />
        </View>
      )}
    </View>
  );
};

export default SellerOrderDetail;
