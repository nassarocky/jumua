import React from 'react';
import { View, FlatList, Image, TouchableOpacity } from 'react-native';
import { useLocalization } from '@fluent/react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import Text from '@components/common/text';
import Navbar from '@components/common/navbar';
import Card from '@components/common/card';
import Loader from '@components/common/loader';
import ErrorUI from '@components/common/error-ui';
import MaterialIcon from '@react-native-vector-icons/material-design-icons';
import { useColors } from '@styles/hooks';
import { useSeller } from '@data/seller-context';
import { listVendorProducts, type VendorProduct } from '@api/vendor-api';
import { formatImageUrl } from '@utils/image-url';

const LIMIT = 20;

const statusStyles: Record<
  VendorProduct['status'],
  { badge: string; text: string; icon: string; iconColor: string }
> = {
  draft: {
    badge: 'bg-gray-200',
    text: 'text-gray-700',
    icon: 'file-outline',
    iconColor: '#374151',
  },
  proposed: {
    badge: 'bg-amber-100',
    text: 'text-amber-700',
    icon: 'clock-outline',
    iconColor: '#B45309',
  },
  published: {
    badge: 'bg-green-100',
    text: 'text-green-700',
    icon: 'check-circle-outline',
    iconColor: '#15803D',
  },
  rejected: {
    badge: 'bg-red-100',
    text: 'text-red-700',
    icon: 'close-circle-outline',
    iconColor: '#B91C1C',
  },
};

const SellerProducts = () => {
  const { l10n } = useLocalization();
  const colors = useColors();
  const navigation = useNavigation();
  const { seller } = useSeller();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['vendor-products', seller?.id],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      listVendorProducts({ limit: LIMIT, offset: pageParam }),
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.products.length < LIMIT) {
        return undefined;
      }
      return pages.length * LIMIT;
    },
    enabled: !!seller,
  });

  const products = data?.pages.flatMap(page => page.products) ?? [];

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  if (!seller) {
    return (
      <View className="flex-1 bg-background p-safe">
        <Navbar title={l10n.getString('your-products')} />
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
        <Navbar title={l10n.getString('your-products')} />
        <Loader />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-background">
        <Navbar title={l10n.getString('your-products')} />
        <ErrorUI />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background p-safe">
      <Navbar title={l10n.getString('your-products')} />
      <FlatList
        data={products}
        keyExtractor={item => item.id}
        contentContainerClassName="p-4 gap-3"
        refreshing={isRefetching}
        onRefresh={refetch}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="py-4">
              <Loader />
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const style = statusStyles[item.status] ?? statusStyles.draft;
          return (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('EditProduct', { productId: item.id })
              }
              activeOpacity={0.7}
            >
              <Card>
                <View className="flex-row items-center gap-3">
                  <View className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 justify-center items-center">
                    {item.thumbnail ? (
                      <Image
                        source={{ uri: formatImageUrl(item.thumbnail) }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <MaterialIcon
                        name="image-outline"
                        size={22}
                        color={colors.content}
                      />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text numberOfLines={1} className="font-content-bold">
                      {item.title}
                    </Text>
                    <Text className="text-xs opacity-50 mt-0.5">
                      {(item.variants?.length ?? 0) > 1
                        ? l10n.getString('variant-count', {
                            count: String(item.variants!.length),
                          })
                        : null}
                    </Text>
                    <View
                      className={`flex-row items-center gap-1 self-start mt-1.5 px-2 py-0.5 rounded-full ${style.badge}`}
                    >
                      <MaterialIcon
                        name={style.icon as any}
                        size={12}
                        color={style.iconColor}
                      />
                      <Text className={`text-xs ${style.text}`}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                  <MaterialIcon
                    name="chevron-right"
                    size={20}
                    color={colors.content}
                  />
                </View>
              </Card>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View className="items-center mt-10 gap-2">
            <MaterialIcon
              name="package-variant"
              size={40}
              color={colors.content}
            />
            <Text className="opacity-60 text-center">
              {l10n.getString('no-products-yet')}
            </Text>
          </View>
        }
      />
    </View>
  );
};

export default SellerProducts;
