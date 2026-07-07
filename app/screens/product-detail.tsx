import React, { PropsWithChildren, useMemo, useState } from 'react';
import {
  useNavigation,
  type StaticScreenProps,
} from '@react-navigation/native';
import { View, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useLocalization } from '@fluent/react';
import AnimatedCartButton from '@components/cart/animated-cart-button';
import apiClient from '@api/client';
import { useQuery } from '@tanstack/react-query';
import Loader from '@components/common/loader';
import ErrorUI from '@components/common/error-ui';
import ImageCarousel from '@components/product/image-carousel';
import Icon from '@react-native-vector-icons/ant-design';
import MaterialIcon from '@react-native-vector-icons/material-design-icons';
import Text from '@components/common/text';
import ProductPrice from '@components/product/product-price';
import Card from '@components/common/card';
import utils from '@utils/common';
import OptionSelect from '@components/product/option-select';
import { HttpTypes } from '@medusajs/types';
import { useColors } from '@styles/hooks';
import RoundedButton from '@components/common/rounded-button';
import { useRegion } from '@data/region-context';
import WishlistButton from '@components/product/wishlist-button';
import ShipOriginDeliveryInfo from '@components/product/ship-origin-delivery-info';

type Props = StaticScreenProps<{
  productId: string;
}>;

function ProductScreen({ route }: Props) {
  const { productId } = route.params;
  const { region } = useRegion();
  const { data, error, isPending } = useQuery({
    queryKey: ['product', productId],
    queryFn: () =>
      apiClient.store.product.retrieve(productId, {
        region_id: region?.id,
        fields:
          '*variants.inventory_quantity,+variants.origin_country,+variants.sku,+variants.material,+variants.weight,+variants.length,+variants.width,+variants.height,+variants.hs_code,+variants.mid_code,+metadata,+seller,+seller.name,+seller.phone,+seller.email,+seller.handle,+seller.logo,+seller.description,+seller.address.*',
      }),
  });

  if (isPending) {
    return <Loader />;
  } else if (error || !data?.product) {
    return <ErrorUI />;
  }

  const { product } = data;

  return <ProductContent product={product} />;
}

const getInitialOptions = (
  product: HttpTypes.StoreProduct,
): Record<string, string | undefined> => {
  if (!product.variants?.length || !product.options?.length) {
    return {};
  }
  const firstVariant =
    product.variants.find(v => {
      if (!v.manage_inventory) {
        return true;
      }
      if ((v as any).allow_backorder) {
        return true;
      }
      return ((v as any).inventory_quantity || 0) > 0;
    }) || product.variants[0];

  if (!firstVariant?.options) {
    return {};
  }
  return firstVariant.options.reduce(
    (acc: Record<string, string>, opt: any) => {
      acc[opt.option_id] = opt.value;
      return acc;
    },
    {},
  );
};

const getVariantImageIndex = (
  variant: HttpTypes.StoreProductVariant | undefined,
): number => {
  const key = (variant?.metadata as any)?.variant_image_key as
    | string
    | undefined;
  if (!key) {
    return 0;
  }
  // key format: "variant-{index}-{timestamp}-{random}"
  const parts = key.split('-');
  const idx = parseInt(parts[1], 10);
  return isNaN(idx) ? 0 : idx;
};

const hasProductAttributes = (
  product: HttpTypes.StoreProduct,
  variant?: HttpTypes.StoreProductVariant,
) => {
  const v = variant as any;
  return Boolean(
    v?.sku ||
      v?.material ||
      product.material ||
      v?.origin_country ||
      product.origin_country ||
      product.type?.value ||
      v?.weight ||
      product.weight ||
      (v?.length && v?.width && v?.height) ||
      (product.length && product.width && product.height) ||
      v?.hs_code ||
      v?.mid_code,
  );
};

const ProductContent = ({ product }: { product: HttpTypes.StoreProduct }) => {
  const { l10n } = useLocalization();
  const [options, setOptions] = useState<Record<string, string | undefined>>(
    () => getInitialOptions(product),
  );

  const isSingleVariant = useMemo(() => {
    return product.variants?.length === 1;
  }, [product.variants]);

  const optionsAsKeymap = (
    variantOptions: HttpTypes.StoreProductVariant['options'],
  ) => {
    return variantOptions?.reduce(
      (acc: Record<string, string>, varopt: any) => {
        acc[varopt.option_id] = varopt.value;
        return acc;
      },
      {},
    );
  };

  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return;
    }

    if (isSingleVariant) {
      return product.variants[0];
    }

    return product.variants.find(v => {
      const variantOptions = optionsAsKeymap(v.options);
      return utils.areEqualObjects(variantOptions, options);
    });
  }, [product.variants, options, isSingleVariant]);

  //check if the selected options produce a valid variant
  const isValidVariant = useMemo(() => {
    return selectedVariant?.id !== undefined;
  }, [selectedVariant?.id]);

  const hasSelectedAllOptions = useMemo(() => {
    return product.options?.every(option => options[option.id]);
  }, [product.options, options]);

  const inStock = useMemo(() => {
    // If we don't manage inventory, we can always add to cart
    if (selectedVariant && !selectedVariant.manage_inventory) {
      return true;
    }

    // If we allow back orders on the variant, we can add to cart
    if (selectedVariant?.allow_backorder) {
      return true;
    }

    // If there is inventory available, we can add to cart
    if (
      selectedVariant?.manage_inventory &&
      (selectedVariant?.inventory_quantity || 0) > 0
    ) {
      return true;
    }

    // Otherwise, we can't add to cart
    return false;
  }, [selectedVariant]);

  const setOptionValue = (optionId: string, value: string) => {
    setOptions(prev => ({
      ...prev,
      [optionId]: value,
    }));
  };

  return (
    <View className="flex-1 bg-background-secondary p-safe">
      <ScrollView className="flex-1">
        <View>
          <ImageCarousel
            data={product.images ?? []}
            activeIndex={getVariantImageIndex(selectedVariant)}
          />
          <View className="absolute w-full">
            <Header />
          </View>
        </View>
        <View className="p-4 -mt-8">
          <Card>
            <View className="flex-row justify-between items-start gap-2">
              <Text className="font-content-bold text-xl flex-1">{product.title}</Text>
              <WishlistButton product={product} />
            </View>
            <ShipOriginDeliveryInfo
              product={product}
              selectedVariant={selectedVariant}
            />
            <View className="mt-2">
              <RatingSummary />
            </View>
            <Text className="text-base opacity-80 mt-2">
              {product.description}
            </Text>
            <View className="mt-2">
              <ProductPrice product={product} variant={selectedVariant} />
            </View>
          </Card>
          {!isSingleVariant && (
            <View className="mt-4">
              <Card>
                <SelectVariant
                  product={product}
                  setOptionValue={setOptionValue}
                  options={options}
                />
              </Card>
            </View>
          )}
          <View className="mt-4">
            <Card>
              <SellerInfo product={product} />
            </Card>
          </View>
          {hasProductAttributes(product, selectedVariant) && (
            <View className="mt-4">
              <Card>
                <ProductAttributes product={product} variant={selectedVariant} />
              </Card>
            </View>
          )}
          <View className="mt-4">
            <Card>
              <Features />
            </Card>
          </View>
        </View>
      </ScrollView>
      <View className="border-t border-gray-200">
        <AnimatedCartButton
          productId={product.id}
          selectedVariantId={selectedVariant?.id}
          disabled={!isValidVariant || !inStock}
          inStock={inStock}
          hasSelectedAllOptions={hasSelectedAllOptions}
        />
      </View>
    </View>
  );
};

const Header = () => {
  const navigation = useNavigation();
  const goBack = () => {
    navigation.goBack();
  };
  return (
    <View className="flex-row justify-between items-center p-4">
      <RoundedButton onPress={goBack}>
        <Icon name="left" size={14} />
      </RoundedButton>
    </View>
  );
};

type SelectVariantProps = {
  product: HttpTypes.StoreProduct;
  setOptionValue: (optionId: string, value: string) => void;
  // isAdding: boolean;
  options: Record<string, string | undefined>;
};

const SelectVariant = ({
  product,
  setOptionValue,
  options,
}: SelectVariantProps) => {
  return (
    <View className="flex flex-col gap-y-4">
      {product.options?.map(option => (
        <View key={option.id}>
          <OptionSelect
            option={option}
            current={options[option.id]}
            updateOption={setOptionValue}
            title={option.title ?? ''}
            disabled={false}
          />
        </View>
      ))}
      <View />
    </View>
  );
};

type SellerData = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  handle?: string;
  logo?: string;
  description?: string;
};

const SellerInfo = ({ product }: { product: HttpTypes.StoreProduct }) => {
  const { l10n } = useLocalization();
  const colors = useColors();

  const seller: SellerData | undefined = (product as any).seller;

  if (!seller) {
    return null;
  }

  const phone = seller.phone || null;
  const email = seller.email || null;
  const whatsapp = phone;

  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-full bg-primary items-center justify-center">
          <MaterialIcon name="store" size={20} color={colors.contentSecondary} />
        </View>
        <View className="flex-1">
          <Text className="font-content-bold text-base">{seller.name}</Text>
          {seller.description ? (
            <Text className="text-xs opacity-60" numberOfLines={1}>{seller.description}</Text>
          ) : (
            <Text className="text-xs opacity-50">{l10n.getString('official-store')}</Text>
          )}
        </View>
      </View>

      <View className="gap-2 pl-1">
        {phone && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => Linking.openURL(`tel:${phone}`)}
            className="flex-row items-center gap-3"
          >
            <View className="w-8 h-8 rounded-full bg-background-secondary items-center justify-center">
              <MaterialIcon name="phone" size={16} color={colors.primary} />
            </View>
            <View>
              <Text className="text-xs opacity-50">{l10n.getString('seller-phone')}</Text>
              <Text className="text-sm font-content-bold">{phone}</Text>
            </View>
          </TouchableOpacity>
        )}

        {whatsapp && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => Linking.openURL(`https://wa.me/${whatsapp.replace(/\D/g, '')}`)}
            className="flex-row items-center gap-3"
          >
            <View className="w-8 h-8 rounded-full bg-background-secondary items-center justify-center">
              <MaterialIcon name="whatsapp" size={16} color="#25D366" />
            </View>
            <View>
              <Text className="text-xs opacity-50">WhatsApp</Text>
              <Text className="text-sm font-content-bold">{whatsapp}</Text>
            </View>
          </TouchableOpacity>
        )}

        {email && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => Linking.openURL(`mailto:${email}`)}
            className="flex-row items-center gap-3"
          >
            <View className="w-8 h-8 rounded-full bg-background-secondary items-center justify-center">
              <MaterialIcon name="email-outline" size={16} color={colors.primary} />
            </View>
            <View>
              <Text className="text-xs opacity-50">{l10n.getString('seller-email')}</Text>
              <Text className="text-sm font-content-bold">{email}</Text>
            </View>
          </TouchableOpacity>
        )}

        {!phone && !email && (
          <View className="flex-row items-center gap-3">
            <View className="w-8 h-8 rounded-full bg-background-secondary items-center justify-center">
              <MaterialIcon name="phone" size={16} color={colors.primary} />
            </View>
            <View>
              <Text className="text-xs opacity-50">{l10n.getString('seller-phone')}</Text>
              <Text className="text-sm opacity-40">{l10n.getString('contact-not-available')}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const ProductAttributes = ({
  product,
  variant,
}: {
  product: any;
  variant?: any;
}) => {
  const { l10n } = useLocalization();

  // Sellers now enter most of these details per-variant (see the "Edit
  // Variant" screen), so we prefer the currently selected variant's value
  // and only fall back to the product-level field for anything the variant
  // doesn't have set.
  const material = variant?.material || product.material;
  const originCountry = variant?.origin_country || product.origin_country;
  const weight = variant?.weight || product.weight;
  const length = variant?.length || product.length;
  const width = variant?.width || product.width;
  const height = variant?.height || product.height;
  const hasDimensions = Boolean(length && width && height);

  const leftColumn = [
    variant?.sku && {
      label: l10n.getString('sku'),
      value: variant.sku,
    },
    material && {
      label: l10n.getString('material'),
      value: material,
    },
    originCountry && {
      label: l10n.getString('country-of-origin'),
      value: originCountry,
    },
    product.type?.value && {
      label: l10n.getString('type'),
      value: product.type.value,
    },
  ].filter(Boolean) as { label: string; value: string }[];

  const rightColumn = [
    weight && {
      label: l10n.getString('weight'),
      value: `${weight} g`,
    },
    hasDimensions && {
      label: l10n.getString('dimensions'),
      value: `${length}L x ${width}W x ${height}H`,
    },
    variant?.hs_code && {
      label: l10n.getString('hs-code'),
      value: variant.hs_code,
    },
    variant?.mid_code && {
      label: l10n.getString('mid-code'),
      value: variant.mid_code,
    },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <View>
      <Text className="text-xl mb-6 opacity-75">
        {l10n.getString('product-information')}
      </Text>
      <View className="flex flex-row justify-between gap-x-8">
        <View className="flex flex-col flex-1 gap-y-4">
          {leftColumn.map(({ label, value }) => (
            <View key={label}>
              <Text className="font-semibold opacity-75">{label}</Text>
              <Text>{value}</Text>
            </View>
          ))}
        </View>
        {rightColumn.length > 0 && (
          <View className="flex flex-col flex-1 gap-y-4">
            {rightColumn.map(({ label, value }) => (
              <View key={label}>
                <Text className="font-semibold opacity-75">{label}</Text>
                <Text>{value}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const Features = () => {
  const { l10n } = useLocalization();
  const colors = useColors();
  return (
    <View className="flex-row gap-2">
      <FeatureWrapper>
        <Icon name="swap" size={30} color={colors.content} />
        <Text className="text-sm font-content-bold">
          {l10n.getString('days-return', { count: 7 })}
        </Text>
      </FeatureWrapper>
      <FeatureWrapper>
        <Icon name="dingding" size={30} color={colors.content} />
        <Text className="text-sm font-content-bold">
          {l10n.getString('fast-delivery')}
        </Text>
      </FeatureWrapper>
    </View>
  );
};

const FeatureWrapper = ({ children }: PropsWithChildren<{}>) => {
  return (
    <View className="flex-1 bg-background-secondary gap-2 rounded-lg p-2 justify-center items-center opacity-80">
      {children}
    </View>
  );
};

const RatingSummary = () => {
  const colors = useColors();
  return (
    <View className="flex-row items-center gap-1">
      <View className="flex-row items-center px-1 py-[1] bg-green-500 rounded-md">
        <Icon name="star" size={16} color={colors.contentSecondary} />
        <Text className="text-base text-content-secondary opacity-80 ml-1">
          4.5
        </Text>
      </View>
      <Text className="text-sm opacity-50">(102)</Text>
    </View>
  );
};

export default ProductScreen;
