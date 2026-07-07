import React, { useMemo, useState } from 'react';
import { View, FlatList, TouchableOpacity } from 'react-native';
import { useLocalization } from '@fluent/react';
import { useQuery } from '@tanstack/react-query';
import Text from '@components/common/text';
import Navbar from '@components/common/navbar';
import Loader from '@components/common/loader';
import ErrorUI from '@components/common/error-ui';
import MaterialIcon from '@react-native-vector-icons/material-design-icons';
import { useColors } from '@styles/hooks';
import { useNavigation } from '@react-navigation/native';
import { useSeller } from '@data/seller-context';
import { listVendorOrders } from '@api/vendor-api';
import { isPendingFulfillment } from '@utils/vendor-order';
import SellerOrderCard from '@components/seller/seller-order-card';

type OrderFilter = 'all' | 'pending' | 'shipped';

const SellerOrders = () => {
  const { l10n } = useLocalization();
  const navigation = useNavigation();
  const colors = useColors();
  const { seller } = useSeller();
  const [filter, setFilter] = useState<OrderFilter>('all');

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['vendor-orders', seller?.id],
    queryFn: () => listVendorOrders({ limit: 50 }),
    enabled: !!seller,
  });

  const orders = data?.orders ?? [];

  const filteredOrders = useMemo(() => {
    if (filter === 'pending') {
      return orders.filter(o => isPendingFulfillment(o.fulfillment_status));
    }
    if (filter === 'shipped') {
      return orders.filter(o =>
        ['shipped', 'partially_shipped', 'partially_delivered', 'delivered'].includes(
          o.fulfillment_status ?? '',
        ),
      );
    }
    return orders;
  }, [filter, orders]);

  const filters: Array<{ id: OrderFilter; label: string }> = [
    { id: 'all', label: l10n.getString('all-orders') },
    { id: 'pending', label: l10n.getString('pending-fulfillment') },
    { id: 'shipped', label: l10n.getString('shipped-orders') },
  ];

  if (!seller) {
    return (
      <View className="flex-1 bg-background p-safe">
        <Navbar title={l10n.getString('seller-orders')} />
        <View className="flex-1 items-center justify-center p-4">
          <Text className="opacity-60 text-center">
            {l10n.getString('sign-in-to-manage-your-store')}
          </Text>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 bg-background">
        <Navbar title={l10n.getString('seller-orders')} />
        <Loader />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-background">
        <Navbar title={l10n.getString('seller-orders')} />
        <ErrorUI />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-secondary p-safe">
      <Navbar title={l10n.getString('seller-orders')} />

      <View className="px-4 pt-3 pb-1">
        <View className="flex-row gap-2">
          {filters.map(item => {
            const active = filter === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => setFilter(item.id)}
                className={`px-4 py-2 rounded-full border ${
                  active
                    ? 'bg-primary border-primary'
                    : 'bg-background border-gray-200'
                }`}
              >
                <Text
                  className={`text-sm font-content-bold ${
                    active ? 'text-content-secondary' : 'text-content'
                  }`}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <SellerOrderCard
            order={item}
            onPress={() =>
              navigation.navigate('SellerOrderDetail', { orderId: item.id })
            }
          />
        )}
        contentContainerClassName="p-4 pt-2"
        refreshing={isRefetching}
        onRefresh={refetch}
        ListEmptyComponent={
          <View className="items-center mt-10 gap-3 bg-background rounded-2xl p-8 border border-gray-100">
            <MaterialIcon
              name="clipboard-text-outline"
              size={40}
              color={colors.content}
            />
            <Text className="opacity-60 text-center">
              {filter === 'all'
                ? l10n.getString('no-orders-yet-seller')
                : l10n.getString('no-orders-for-filter')}
            </Text>
          </View>
        }
      />
    </View>
  );
};

export default SellerOrders;
