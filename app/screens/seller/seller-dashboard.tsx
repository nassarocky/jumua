import React, { useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useLocalization } from '@fluent/react';
import { useQuery } from '@tanstack/react-query';
import Text from '@components/common/text';
import Navbar from '@components/common/navbar';
import Button from '@components/common/button';
import Loader from '@components/common/loader';
import MaterialIcon from '@react-native-vector-icons/material-design-icons';
import { useColors } from '@styles/hooks';
import { useNavigation } from '@react-navigation/native';
import { useSeller } from '@data/seller-context';
import {
  listVendorOrders,
  listVendorProducts,
} from '@api/vendor-api';
import { convertToLocale } from '@utils/product-price';
import {
  getVendorOrderTotal,
  isPendingFulfillment,
} from '@utils/vendor-order';
import SellerOrderCard from '@components/seller/seller-order-card';

type QuickAction = {
  icon: string;
  label: string;
  onPress: () => void;
  primary?: boolean;
};

const SellerDashboard = () => {
  const { l10n } = useLocalization();
  const navigation = useNavigation();
  const colors = useColors();
  const { seller, isSellerLoading, logout } = useSeller();

  const {
    data: ordersData,
    isLoading: ordersLoading,
    error: ordersError,
    refetch: refetchOrders,
    isRefetching,
  } = useQuery({
    queryKey: ['vendor-orders', seller?.id, 'dashboard'],
    queryFn: () => listVendorOrders({ limit: 20 }),
    enabled: !!seller,
    retry: 1,
  });

  const {
    data: productsData,
    error: productsError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ['vendor-products', seller?.id, 'count'],
    queryFn: () => listVendorProducts({ limit: 1, offset: 0 }),
    enabled: !!seller,
    retry: 1,
  });

  const orders = ordersData?.orders ?? [];
  const pendingCount = useMemo(
    () => orders.filter(o => isPendingFulfillment(o.fulfillment_status)).length,
    [orders],
  );
  const revenueTotal = useMemo(
    () =>
      orders.reduce(
        (sum, order) => sum + (getVendorOrderTotal(order) ?? 0),
        0,
      ),
    [orders],
  );
  const recentOrders = orders.slice(0, 3);
  const currencyCode = seller?.currency_code ?? orders[0]?.currency_code ?? 'tzs';

  if (isSellerLoading) {
    return <Loader />;
  }

  const backToShopping = () => navigation.navigate('Main');

  const BackToShoppingButton = (
    <TouchableOpacity
      onPress={backToShopping}
      accessibilityLabel={l10n.getString('back-to-shopping')}
      className="flex-row items-center gap-1 p-2"
    >
      <MaterialIcon name="cart-outline" size={18} color={colors.primary} />
      <Text className="text-primary text-xs font-content-bold" numberOfLines={1}>
        {l10n.getString('shop')}
      </Text>
    </TouchableOpacity>
  );

  if (!seller) {
    return (
      <View className="flex-1 bg-background p-safe">
        <Navbar
          title={l10n.getString('seller-dashboard')}
          showBackButton={false}
          rightElement={BackToShoppingButton}
        />
        <View className="flex-1 justify-center items-center p-4 gap-4">
          <View className="w-20 h-20 rounded-3xl bg-primary/10 items-center justify-center mb-2">
            <MaterialIcon name="store-outline" size={36} color={colors.primary} />
          </View>
          <Text className="text-lg text-content text-center">
            {l10n.getString('sign-in-to-manage-your-store')}
          </Text>
          <Button
            title={l10n.getString('seller-sign-in')}
            onPress={() => navigation.navigate('SellerLogin')}
          />
          <TouchableOpacity onPress={() => navigation.navigate('BecomeSeller')}>
            <Text className="text-base text-center text-primary">
              {l10n.getString('dont-have-a-seller-account')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleLogout = async () => {
    await logout();
    navigation.navigate('Main');
  };

  const quickActions: QuickAction[] = [
    {
      icon: 'plus-box-outline',
      label: l10n.getString('upload-product'),
      onPress: () => navigation.navigate('UploadProduct'),
      primary: true,
    },
    {
      icon: 'package-variant-closed',
      label: l10n.getString('your-products'),
      onPress: () => navigation.navigate('SellerProducts'),
    },
    {
      icon: 'clipboard-text-outline',
      label: l10n.getString('seller-orders'),
      onPress: () => navigation.navigate('SellerOrders'),
    },
    {
      icon: 'truck-delivery-outline',
      label: l10n.getString('pending-fulfillment'),
      onPress: () => navigation.navigate('SellerOrders'),
    },
  ];

  return (
    <View className="flex-1 bg-background-secondary p-safe">
      <Navbar
        title={l10n.getString('seller-dashboard')}
        showBackButton={false}
        rightElement={BackToShoppingButton}
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 gap-5 pb-8"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              refetchOrders();
              refetchProducts();
            }}
          />
        }
      >
        <View className="bg-primary rounded-3xl p-5">
          <View className="flex-row items-center justify-between">
            <Text
              type="display"
              className="text-content-secondary text-2xl flex-1 pr-3"
              numberOfLines={1}
            >
              {seller.name}
            </Text>
            <TouchableOpacity
              onPress={handleLogout}
              className="w-10 h-10 rounded-full bg-white/15 items-center justify-center"
            >
              <MaterialIcon
                name="logout"
                size={18}
                color={colors.contentSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1 bg-background rounded-2xl p-4 border border-gray-100 elevation-lg">
            <MaterialIcon name="package-variant" size={22} color={colors.primary} />
            <Text className="text-2xl font-content-bold mt-3">
              {productsError ? '-' : (productsData?.count ?? 0)}
            </Text>
            <Text className="text-xs opacity-60 mt-1">
              {l10n.getString('your-products')}
            </Text>
          </View>
          <View className="flex-1 bg-background rounded-2xl p-4 border border-gray-100 elevation-lg">
            <MaterialIcon name="clock-outline" size={22} color={colors.primary} />
            <Text className="text-2xl font-content-bold mt-3">
              {pendingCount}
            </Text>
            <Text className="text-xs opacity-60 mt-1">
              {l10n.getString('pending-fulfillment')}
            </Text>
          </View>
          <View className="flex-1 bg-background rounded-2xl p-4 border border-gray-100 elevation-lg">
            <MaterialIcon name="cash-multiple" size={22} color={colors.primary} />
            <Text className="text-sm font-content-bold mt-3" numberOfLines={1}>
              {revenueTotal > 0
                ? convertToLocale({
                    amount: revenueTotal,
                    currency_code: currencyCode,
                  })
                : '-'}
            </Text>
            <Text className="text-xs opacity-60 mt-1">
              {l10n.getString('recent-revenue')}
            </Text>
          </View>
        </View>

        <View>
          <Text className="font-content-bold text-base mb-3">
            {l10n.getString('quick-actions')}
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {quickActions.map(action => (
              <TouchableOpacity
                key={action.label}
                className={`w-[47%] rounded-2xl p-4 border ${
                  action.primary
                    ? 'bg-primary border-primary'
                    : 'bg-background border-gray-100 elevation-lg'
                }`}
                onPress={action.onPress}
              >
                <View
                  className={`w-10 h-10 rounded-xl items-center justify-center mb-3 ${
                    action.primary ? 'bg-white/15' : 'bg-primary/10'
                  }`}
                >
                  <MaterialIcon
                    name={action.icon as any}
                    size={22}
                    color={
                      action.primary ? colors.contentSecondary : colors.primary
                    }
                  />
                </View>
                <Text
                  className={`font-content-bold ${
                    action.primary ? 'text-content-secondary' : 'text-content'
                  }`}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="font-content-bold text-base">
              {l10n.getString('recent-orders')}
            </Text>
            {orders.length > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate('SellerOrders')}>
                <Text className="text-primary text-sm font-content-bold">
                  {l10n.getString('view-all')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {ordersLoading ? (
            <Loader />
          ) : ordersError ? (
            <View className="bg-background rounded-2xl p-6 items-center border border-gray-100 gap-3">
              <Text className="opacity-60 text-center">
                {l10n.getString('something-went-wrong')}
              </Text>
              <TouchableOpacity onPress={() => refetchOrders()}>
                <Text className="text-primary font-content-bold">Retry</Text>
              </TouchableOpacity>
            </View>
          ) : recentOrders.length === 0 ? (
            <View className="bg-background rounded-2xl p-6 items-center border border-gray-100">
              <MaterialIcon
                name="clipboard-text-outline"
                size={36}
                color={colors.content}
              />
              <Text className="opacity-60 text-center mt-3">
                {l10n.getString('no-orders-yet-seller')}
              </Text>
            </View>
          ) : (
            recentOrders.map(order => (
              <SellerOrderCard
                key={order.id}
                order={order}
                onPress={() =>
                  navigation.navigate('SellerOrderDetail', { orderId: order.id })
                }
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default SellerDashboard;
