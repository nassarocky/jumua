import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalization } from '@fluent/react';
import { useNavigation } from '@react-navigation/native';
import MaterialIcon from '@react-native-vector-icons/material-design-icons';
import Navbar from '@components/common/navbar';
import Text from '@components/common/text';
import Button from '@components/common/button';
import Loader from '@components/common/loader';
import ErrorUI from '@components/common/error-ui';
import { ProductItem } from '@components/product/product-list';
import apiClient from '@api/client';
import { useWishlist } from '@data/wishlist-context';
import { useRegion } from '@data/region-context';
import { useColors } from '@styles/hooks';

const WishlistScreen = () => {
  const { l10n } = useLocalization();
  const colors = useColors();
  const navigation = useNavigation();
  const { productIds } = useWishlist();
  const { region } = useRegion();

  const {
    data: products,
    isPending,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['wishlist-products', productIds, region?.id],
    queryFn: async () => {
      if (!productIds.length) {
        return [];
      }

      const { products: fetchedProducts } = await apiClient.store.product.list({
        id: productIds,
        limit: productIds.length,
        fields: '*variants.calculated_price',
        region_id: region?.id,
      });

      const productMap = new Map(
        fetchedProducts.map(product => [product.id, product]),
      );

      return productIds
        .map(id => productMap.get(id))
        .filter((product): product is NonNullable<typeof product> =>
          Boolean(product),
        );
    },
    enabled: productIds.length > 0,
  });

  if (productIds.length === 0) {
    return (
      <View className="flex-1 bg-background p-safe">
        <Navbar title={l10n.getString('liked-products')} />
        <View className="flex-1 items-center justify-center px-8">
          <MaterialIcon name="heart-outline" size={64} color={colors.primary} />
          <Text className="text-lg font-content-bold text-center mt-4">
            {l10n.getString('no-liked-products')}
          </Text>
          <Text className="text-base text-center opacity-60 mt-2 mb-6">
            {l10n.getString('tap-heart-to-save-products')}
          </Text>
          <Button
            variant="primary"
            title={l10n.getString('continue-shopping')}
            onPress={() => navigation.goBack()}
          />
        </View>
      </View>
    );
  }

  if (isPending) {
    return (
      <View className="flex-1 bg-background p-safe">
        <Navbar title={l10n.getString('liked-products')} />
        <Loader />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-background p-safe">
        <Navbar title={l10n.getString('liked-products')} />
        <ErrorUI />
      </View>
    );
  }

  const wishlistProducts = products ?? [];

  return (
    <View className="flex-1 bg-background p-safe">
      <Navbar title={l10n.getString('liked-products')} />
      <FlatList
        className="flex-1 mt-4"
        contentContainerClassName="gap-4 px-5 pb-10"
        columnWrapperClassName="gap-4"
        data={wishlistProducts}
        numColumns={2}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <ProductItem product={item} />}
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text className="text-center opacity-60">
              {l10n.getString('no-liked-products')}
            </Text>
          </View>
        }
        refreshing={isRefetching}
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            refreshing={isRefetching}
            onRefresh={refetch}
          />
        }
        ListFooterComponent={
          isRefetching ? (
            <View className="py-4">
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
      />
    </View>
  );
};

export default WishlistScreen;
