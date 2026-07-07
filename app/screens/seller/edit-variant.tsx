import React, { useEffect, useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { useLocalization } from '@fluent/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import Text from '@components/common/text';
import Input from '@components/common/input';
import Button from '@components/common/button';
import Navbar from '@components/common/navbar';
import Card from '@components/common/card';
import Loader from '@components/common/loader';
import ErrorUI from '@components/common/error-ui';
import {
  getVendorProduct,
  updateVendorProductVariant,
} from '@api/vendor-api';

type EditVariantProps = {
  route: {
    params: {
      productId: string;
      variantId: string;
    };
  };
};

const DEFAULT_ORIGIN_COUNTRY = 'TZ';

const toNumberOrUndefined = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const EditVariant = ({ route }: EditVariantProps) => {
  const { productId, variantId } = route.params;
  const { l10n } = useLocalization();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const [sku, setSku] = useState('');
  const [material, setMaterial] = useState('');
  const [width, setWidth] = useState('');
  const [length, setLength] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [hsCode, setHsCode] = useState('');
  const [midCode, setMidCode] = useState('');
  const [originCountry, setOriginCountry] = useState(DEFAULT_ORIGIN_COUNTRY);
  const [saving, setSaving] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const { data, isPending, error } = useQuery({
    queryKey: ['vendor-product', productId],
    queryFn: () => getVendorProduct(productId),
  });

  const variant = data?.product.variants?.find(v => v.id === variantId);

  useEffect(() => {
    if (!variant || loadedOnce) {
      return;
    }
    setSku(variant.sku ?? '');
    setMaterial(variant.material ?? '');
    setWidth(variant.width != null ? String(variant.width) : '');
    setLength(variant.length != null ? String(variant.length) : '');
    setHeight(variant.height != null ? String(variant.height) : '');
    setWeight(variant.weight != null ? String(variant.weight) : '');
    setHsCode(variant.hs_code ?? '');
    setMidCode(variant.mid_code ?? '');
    setOriginCountry(variant.origin_country || DEFAULT_ORIGIN_COUNTRY);
    setLoadedOnce(true);
  }, [variant, loadedOnce]);

  const onSave = async () => {
    try {
      setSaving(true);
      await updateVendorProductVariant(productId, variantId, {
        sku: sku.trim() || null,
        material: material.trim() || null,
        width: toNumberOrUndefined(width) ?? null,
        length: toNumberOrUndefined(length) ?? null,
        height: toNumberOrUndefined(height) ?? null,
        weight: toNumberOrUndefined(weight) ?? null,
        hs_code: hsCode.trim() || null,
        mid_code: midCode.trim() || null,
        origin_country: originCountry.trim().toUpperCase() || DEFAULT_ORIGIN_COUNTRY,
      });
      await queryClient.invalidateQueries({
        queryKey: ['vendor-product', productId],
      });
      Alert.alert(
        l10n.getString('variant-updated'),
        l10n.getString('variant-updated-description'),
        [{ text: l10n.getString('ok'), onPress: () => navigation.goBack() }],
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
        <Navbar title={l10n.getString('edit-variant')} />
        <Loader />
      </View>
    );
  }

  if (error || !variant) {
    return (
      <View className="flex-1 bg-background">
        <Navbar title={l10n.getString('edit-variant')} />
        <ErrorUI />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background p-safe">
      <Navbar title={variant.title || l10n.getString('edit-variant')} />
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="p-4 gap-4">
          <Card>
            <Input
              label={l10n.getString('sku-optional')}
              placeholder={l10n.getString('sku-placeholder')}
              autoCapitalize="characters"
              value={sku}
              onChangeText={setSku}
              containerClassName="mb-0"
            />
          </Card>

          <Card>
            <Input
              label={l10n.getString('material-optional')}
              placeholder={l10n.getString('material-placeholder')}
              value={material}
              onChangeText={setMaterial}
              containerClassName="mb-0"
            />
          </Card>

          <Card>
            <Text className="font-content-bold text-base mb-3">
              {l10n.getString('dimensions-optional')}
            </Text>
            <View className="flex-row gap-2">
              <Input
                containerClassName="mb-0 flex-1"
                label={l10n.getString('width')}
                placeholder="0"
                keyboardType="decimal-pad"
                value={width}
                onChangeText={setWidth}
              />
              <Input
                containerClassName="mb-0 flex-1"
                label={l10n.getString('length')}
                placeholder="0"
                keyboardType="decimal-pad"
                value={length}
                onChangeText={setLength}
              />
            </View>
            <View className="flex-row gap-2 mt-3">
              <Input
                containerClassName="mb-0 flex-1"
                label={l10n.getString('height')}
                placeholder="0"
                keyboardType="decimal-pad"
                value={height}
                onChangeText={setHeight}
              />
              <Input
                containerClassName="mb-0 flex-1"
                label={l10n.getString('weight')}
                placeholder="0"
                keyboardType="decimal-pad"
                value={weight}
                onChangeText={setWeight}
              />
            </View>
          </Card>

          <Card>
            <Text className="font-content-bold text-base mb-3">
              {l10n.getString('customs-details-optional')}
            </Text>
            <Input
              label={l10n.getString('hs-code-optional')}
              value={hsCode}
              onChangeText={setHsCode}
              containerClassName="mb-3"
            />
            <Input
              label={l10n.getString('mid-code-optional')}
              value={midCode}
              onChangeText={setMidCode}
              containerClassName="mb-3"
            />
            <Input
              label={l10n.getString('country-of-origin')}
              placeholder={DEFAULT_ORIGIN_COUNTRY}
              autoCapitalize="characters"
              maxLength={2}
              value={originCountry}
              onChangeText={text => setOriginCountry(text.toUpperCase())}
              containerClassName="mb-1"
            />
            <Text className="text-xs opacity-60">
              {l10n.getString('country-of-origin-help')}
            </Text>
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

export default EditVariant;
