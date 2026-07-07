import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from '@react-native-vector-icons/ant-design';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useLocalization } from '@fluent/react';
import { HttpTypes } from '@medusajs/types';
import Navbar from '@components/common/navbar';
import Text from '@components/common/text';
import Input from '@components/common/input';
import { ProductItem } from '@components/product/product-list';
import { PRODUCT_ORIGIN_FIELDS } from '@utils/ship-origin';
import apiClient from '@api/client';
import {
  getProductIdFromHit,
  isAlgoliaConfigured,
  searchAlgoliaProducts,
} from '@api/algolia';
import { useRegion } from '@data/region-context';
import { useSearchHistory } from '@data/use-search-history';
import { useColors } from '@styles/hooks';

const HITS_PER_PAGE = 12;
const MIN_QUERY_LENGTH = 2;

type SearchPage = {
  products: HttpTypes.StoreProduct[];
  page: number;
  nbPages: number;
};

const Search = () => {
  const { l10n } = useLocalization();
  const colors = useColors();
  const { region } = useRegion();
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const lastRecordedQueryRef = useRef('');
  const { frequentSearches, recordSearch, clearHistory } = useSearchHistory();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setQuery(searchInput.trim());
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    if (searchInput.trim() === '') {
      lastRecordedQueryRef.current = '';
    }
  }, [searchInput]);

  useEffect(() => {
    if (query.length < MIN_QUERY_LENGTH || query === lastRecordedQueryRef.current) {
      return;
    }

    recordSearch(query);
    lastRecordedQueryRef.current = query;
  }, [query, recordSearch]);

  const handleSelectFrequentSearch = (term: string) => {
    setSearchInput(term);
  };

  const canSearch = query.length >= MIN_QUERY_LENGTH && isAlgoliaConfigured;

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isRefetching,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['algolia-products', query, region?.id],
    initialPageParam: 0,
    enabled: canSearch,
    queryFn: async ({ pageParam }): Promise<SearchPage> => {
      const results = await searchAlgoliaProducts({
        query,
        page: pageParam,
        hitsPerPage: HITS_PER_PAGE,
      });

      const productIds = Array.from(
        new Set(results.hits.map(getProductIdFromHit).filter(Boolean)),
      );

      if (!productIds.length) {
        return {
          products: [],
          page: results.page,
          nbPages: results.nbPages,
        };
      }

      const { products } = await apiClient.store.product.list({
        id: productIds,
        fields: PRODUCT_ORIGIN_FIELDS,
        region_id: region?.id,
      } as HttpTypes.StoreProductListParams);

      const productsById = new Map(products.map(product => [product.id, product]));

      return {
        products: productIds
          .map(productId => productsById.get(productId))
          .filter(Boolean) as HttpTypes.StoreProduct[],
        page: results.page,
        nbPages: results.nbPages,
      };
    },
    getNextPageParam: lastPage =>
      lastPage.page + 1 < lastPage.nbPages ? lastPage.page + 1 : undefined,
  });

  const products = data?.pages.flatMap(page => page.products) ?? [];

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const renderFooter = () => {
    if (!isFetchingNextPage) {
      return null;
    }

    return (
      <View className="py-4">
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (!isAlgoliaConfigured) {
      return (
        <SearchMessage
          title={l10n.getString('search-is-not-configured')}
          message={l10n.getString('add-algolia-credentials-to-search')}
        />
      );
    }

    if (query.length < MIN_QUERY_LENGTH) {
      if (frequentSearches.length > 0) {
        return null;
      }

      return (
        <SearchMessage
          title={l10n.getString('search-products')}
          message={l10n.getString('type-to-search-products')}
        />
      );
    }

    if (isLoading) {
      return <ActivityIndicator size="small" color={colors.primary} />;
    }

    if (error) {
      return (
        <SearchMessage
          title={l10n.getString('search-failed')}
          message={l10n.getString('try-searching-again')}
        />
      );
    }

    return (
      <SearchMessage
        title={l10n.getString('no-products-found')}
        message={l10n.getString('try-a-different-search-term')}
      />
    );
  };

  return (
    <View className="flex-1 bg-background p-safe">
      <Navbar title={l10n.getString('search')} />
      <View className="px-5">
        <Input
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          placeholder={l10n.getString('search-products')}
          value={searchInput}
          onChangeText={setSearchInput}
          returnKeyType="search"
          className="pl-11"
        />
        <View className="absolute left-9 top-4">
          <Icon name="search" size={18} color={colors.contentSecondary} />
        </View>
      </View>
      {searchInput.trim().length === 0 && frequentSearches.length > 0 && (
        <FrequentSearches
          searches={frequentSearches}
          onSelect={handleSelectFrequentSearch}
          onClear={clearHistory}
        />
      )}
      <FlatList
        contentContainerClassName="gap-4 px-5 pb-10 flex-grow"
        columnWrapperClassName="gap-4"
        data={products}
        numColumns={2}
        keyExtractor={item => item.id ?? ''}
        renderItem={({ item }) => <ProductItem product={item} />}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        refreshing={isRefetching}
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
};

const FrequentSearches = ({
  searches,
  onSelect,
  onClear,
}: {
  searches: { term: string; count: number }[];
  onSelect: (term: string) => void;
  onClear: () => void;
}) => {
  const { l10n } = useLocalization();
  const colors = useColors();

  return (
    <View className="px-5 pt-4 pb-2">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-base font-content-bold">
          {l10n.getString('frequently-searched')}
        </Text>
        <TouchableOpacity onPress={onClear}>
          <Text className="text-sm text-primary">
            {l10n.getString('clear-search-history')}
          </Text>
        </TouchableOpacity>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {searches.map(entry => (
          <TouchableOpacity
            key={entry.term}
            onPress={() => onSelect(entry.term)}
            className="flex-row items-center gap-2 px-3 py-2 bg-background-secondary rounded-full border border-gray-200"
          >
            <Icon name="search" size={12} color={colors.contentSecondary} />
            <Text className="text-sm text-content">{entry.term}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const SearchMessage = ({
  title,
  message,
}: {
  title: string;
  message: string;
}) => (
  <View className="flex-1 items-center justify-center px-6">
    <Text className="text-lg font-content-bold text-center mb-2">{title}</Text>
    <Text className="text-content-secondary text-center">{message}</Text>
  </View>
);

export default Search;
