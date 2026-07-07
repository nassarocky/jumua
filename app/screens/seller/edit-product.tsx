import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalization } from '@fluent/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import Text from '@components/common/text';
import Input from '@components/common/input';
import Dropdown from '@components/common/dropdown';
import Button from '@components/common/button';
import Navbar from '@components/common/navbar';
import Card from '@components/common/card';
import Loader from '@components/common/loader';
import ErrorUI from '@components/common/error-ui';
import MaterialIcon from '@react-native-vector-icons/material-design-icons';
import { useColors } from '@styles/hooks';
import {
  getVendorProduct,
  listProductCategories,
  updateVendorProduct,
  type VendorProductVariant,
} from '@api/vendor-api';

type EditProductProps = {
  route: {
    params: {
      productId: string;
    };
  };
};

const EditProduct = ({ route }: EditProductProps) => {
  const { productId } = route.params;
  const { l10n } = useLocalization();
  const navigation = useNavigation();
  const colors = useColors();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const { data, isPending, error } = useQuery({
    queryKey: ['vendor-product', productId],
    queryFn: () => getVendorProduct(productId),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['product-categories'],
    queryFn: listProductCategories,
    staleTime: 5 * 60 * 1000,
  });

  const product = data?.product;

  useEffect(() => {
    if (!product) {
      return;
    }
    setTitle(product.title ?? '');
    setDescription(product.description ?? '');
    setCategoryId(product.categories?.[0]?.id);
  }, [product]);

  const onSave = async () => {
    try {
      setSaving(true);
      await updateVendorProduct(productId, {
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        categories: categoryId ? [{ id: categoryId }] : [],
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['vendor-product', productId] }),
        queryClient.invalidateQueries({ queryKey: ['vendor-products'] }),
      ]);
      Alert.alert(
        l10n.getString('product-updated'),
        l10n.getString('product-updated-description'),
      );
    } catch (err) {
      Alert.alert(
        l10n.getString('failed-to-save'),
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setSaving(false);
    }
  };

  if (isPending) {
    return (
      <View className="flex-1 bg-background">
        <Navbar title={l10n.getString('edit-product')} />
        <Loader />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View className="flex-1 bg-background">
        <Navbar title={l10n.getString('edit-product')} />
        <ErrorUI />
      </View>
    );
  }

  const renderVariant = (variant: VendorProductVariant) => {
    const detailBits = [
      variant.sku ? `SKU: ${variant.sku}` : null,
      variant.origin_country ? `Origin: ${variant.origin_country}` : null,
    ].filter(Boolean);

    return (
      <TouchableOpacity
        key={variant.id}
        onPress={() =>
          navigation.navigate('EditVariant', {
            productId,
            variantId: variant.id,
          })
        }
        className="flex-row items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
      >
        <View className="flex-1 pr-3">
          <Text className="font-content-bold">{variant.title}</Text>
          {detailBits.length > 0 ? (
            <Text className="text-xs opacity-60 mt-0.5">
              {detailBits.join(' \u2022 ')}
            </Text>
          ) : null}
        </View>
        <MaterialIcon
          name="chevron-right"
          size={20}
          color={colors.content}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-background p-safe">
      <Navbar title={l10n.getString('edit-product')} />
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="p-4 gap-4">
          <Card>
            <Text className="font-content-bold text-base mb-3">
              {l10n.getString('product-info')}
            </Text>
            <Input
              label={l10n.getString('product-title')}
              value={title}
              onChangeText={setTitle}
              containerClassName="mb-3"
            />
            <Input
              label={l10n.getString('description')}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="h-28"
              containerClassName="mb-3"
            />
            <Dropdown
              label={l10n.getString('category-optional')}
              data={categories}
              labelField="name"
              valueField="id"
              value={categoryId}
              placeholder={l10n.getString('select-category')}
              onChange={item => setCategoryId(item.id)}
              containerClassName="mb-0"
            />
          </Card>

          <Card>
            <Text className="font-content-bold text-base mb-1">
              {l10n.getString('variants')}
            </Text>
            <Text className="opacity-60 text-xs mb-2">
              {l10n.getString('tap-a-variant-to-edit-details')}
            </Text>
            {(product.variants ?? []).map(renderVariant)}
          </Card>

          <Button
            onPress={onSave}
            loading={saving}
            title={saving ? l10n.getString('saving') : l10n.getString('save-changes')}
          />
        </View>
      </ScrollView>
    </View>
  );
};

export default EditProduct;
