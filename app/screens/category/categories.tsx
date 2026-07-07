import React, { useMemo, useState } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { useLocalization } from '@fluent/react';
import Navbar from '@components/common/navbar';
import Text from '@components/common/text';
import { useColors } from '@styles/hooks';
import apiClient from '@api/client';
import Icon from '@react-native-vector-icons/ant-design';
import MaterialIcon from '@react-native-vector-icons/material-design-icons';
import { StoreProductCategory } from '@medusajs/types';
import Loader from '@components/common/loader';
import ErrorUI from '@components/common/error-ui';

const ACCENT_COLORS = [
  '#DC2626',
  '#EA580C',
  '#CA8A04',
  '#16A34A',
  '#2563EB',
  '#9333EA',
  '#0891B2',
  '#DB2777',
];

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const getCategoryAccent = (category: StoreProductCategory) =>
  ACCENT_COLORS[hashString(category.handle || category.name) % ACCENT_COLORS.length];

const getCategoryIcon = (category: StoreProductCategory): string => {
  const key = `${category.handle ?? ''} ${category.name}`.toLowerCase();

  if (key.includes('shirt') || key.includes('tee')) {
    return 'tshirt-crew-outline';
  }
  if (key.includes('sweat') || key.includes('hood')) {
    return 'hoodie-outline';
  }
  if (key.includes('short')) {
    return 'human-male-height-variant';
  }
  if (key.includes('pant') || key.includes('trouser')) {
    return 'human-male-height';
  }
  if (key.includes('access') || key.includes('watch')) {
    return 'watch-variant';
  }
  if (key.includes('shoe') || key.includes('foot')) {
    return 'shoe-formal';
  }
  if (key.includes('bag')) {
    return 'bag-personal-outline';
  }
  if (
    key.includes('electron') ||
    key.includes('phone') ||
    key.includes('mobile')
  ) {
    return 'cellphone';
  }
  if (key.includes('home') || key.includes('kitchen')) {
    return 'home-outline';
  }
  if (key.includes('beauty') || key.includes('cosmetic')) {
    return 'face-woman-outline';
  }

  return 'tag-outline';
};

const formatCategoryName = (name: string) =>
  name
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

type CategoryCardProps = {
  category: StoreProductCategory;
  onPress: () => void;
};

const CategoryCard = ({ category, onPress }: CategoryCardProps) => {
  const { l10n } = useLocalization();
  const colors = useColors();
  const accent = getCategoryAccent(category);
  const iconName = getCategoryIcon(category);
  const subcategoryCount = category.category_children?.length ?? 0;
  const displayName = formatCategoryName(category.name);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className="flex-1 max-w-[50%]"
    >
      <View className="bg-background-secondary rounded-2xl p-4 min-h-[148px] justify-between elevation-sm">
        <View className="flex-row items-start justify-between">
          <View
            className="w-12 h-12 rounded-2xl items-center justify-center"
            style={{ backgroundColor: `${accent}18` }}
          >
            <MaterialIcon name={iconName as any} size={24} color={accent} />
          </View>
          <View className="w-8 h-8 rounded-full bg-background items-center justify-center">
            <Icon name="right" size={14} color={colors.primary} />
          </View>
        </View>

        <View className="mt-4 gap-1">
          <Text className="text-base font-content-bold text-content" numberOfLines={2}>
            {displayName}
          </Text>
          {category.description ? (
            <Text className="text-xs text-content opacity-60" numberOfLines={2}>
              {category.description}
            </Text>
          ) : subcategoryCount > 0 ? (
            <Text className="text-xs text-content opacity-60">
              {l10n.getString('subcategories-count', { count: subcategoryCount })}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function Categories() {
  const { l10n } = useLocalization();
  const colors = useColors();
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['categories'],
    queryFn: () =>
      apiClient.store.category.list({
        include_descendants_tree: true,
      }),
  });

  const categories = useMemo(() => {
    const items = [...(data?.product_categories ?? [])].sort(
      (a, b) => (a.rank ?? 0) - (b.rank ?? 0),
    );

    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return items;
    }

    return items.filter(category => {
      const haystack = `${category.name} ${category.description ?? ''} ${category.handle ?? ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [data?.product_categories, searchQuery]);

  if (isLoading) {
    return <Loader />;
  }

  if (error) {
    return <ErrorUI />;
  }

  const renderHeader = () => (
    <View className="px-5 pb-4 gap-4">
      <View className="gap-1">
        <Text className="text-2xl font-content-bold text-content">
          {l10n.getString('browse-by-category')}
        </Text>
        <Text className="text-sm text-content opacity-60">
          {l10n.getString('categories-subtitle')}
        </Text>
      </View>

      <View className="flex-row items-center bg-background-secondary rounded-xl px-4 h-11 gap-3">
        <Icon name="search" size={16} color="#9ca3af" />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={l10n.getString('search-categories')}
          placeholderTextColor="#9ca3af"
          className="flex-1 text-base text-content py-0"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {categories.length > 0 && (
        <Text className="text-xs font-content-bold text-content opacity-50 uppercase tracking-wide">
          {l10n.getString('categories-count', { count: categories.length })}
        </Text>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <View className="w-20 h-20 rounded-3xl bg-primary/10 items-center justify-center mb-4">
        <MaterialIcon name="shape-outline" size={36} color={colors.primary} />
      </View>
      <Text className="text-lg font-content-bold text-content text-center mb-2">
        {searchQuery.trim()
          ? l10n.getString('no-categories-match')
          : l10n.getString('no-categories-found')}
      </Text>
      {searchQuery.trim() ? (
        <Text className="text-sm text-content opacity-60 text-center">
          {l10n.getString('try-different-category-search')}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View className="flex-1 bg-background p-safe">
      <Navbar title={l10n.getString('categories')} showBackButton={false} />
      <FlatList
        data={categories}
        numColumns={2}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        columnWrapperClassName="gap-4 px-5"
        contentContainerClassName="pb-10 gap-4"
        renderItem={({ item }) => (
          <CategoryCard
            category={item}
            onPress={() =>
              navigation.navigate('CategoryDetail', { categoryId: item.id })
            }
          />
        )}
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            refreshing={isRefetching}
            onRefresh={refetch}
          />
        }
      />
    </View>
  );
}
