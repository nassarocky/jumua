import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  Keyboard,
  Image,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useLocalization } from '@fluent/react';
import Text from '@components/common/text';
import Input from '@components/common/input';
import Dropdown from '@components/common/dropdown';
import Button from '@components/common/button';
import Navbar from '@components/common/navbar';
import Card from '@components/common/card';
import MaterialIcon from '@react-native-vector-icons/material-design-icons';
import { useColors } from '@styles/hooks';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import {
  launchCamera,
  launchImageLibrary,
  type Asset,
  type ImagePickerResponse,
} from 'react-native-image-picker';
import { useSeller } from '@data/seller-context';
import { useRegion } from '@data/region-context';
import {
  createVendorProduct,
  getVendorProduct,
  listProductCategories,
  resolveDefaultSalesChannelId,
  setInventoryLocationLevel,
  updateVendorProductVariantThumbnails,
  uploadVendorImages,
} from '@api/vendor-api';
import { ensureNoDeliveryShippingOption } from '@utils/seller-shipping';

const MAX_IMAGES = 5;
// Sellers on this marketplace are locally based, so every new variant is
// assumed to ship from Tanzania unless a seller edits it later on the
// edit-variant screen.
const DEFAULT_ORIGIN_COUNTRY = 'TZ';

const uploadProductSchema = z.object({
  title: z.string().min(1, 'product-title-is-required'),
  description: z.string().optional(),
  price: z
    .string()
    .min(1, 'price-is-required')
    .refine(value => !Number.isNaN(Number(value)) && Number(value) > 0, {
      message: 'invalid-price',
    }),
});

type UploadProductSchema = z.infer<typeof uploadProductSchema>;

type ProductOptionDraft = {
  id: string;
  title: string;
  valuesText: string;
};

type VariantOverride = {
  price: string;
  quantity: string;
  sku?: string;
  imageIndex?: number;
};

type VariantCombo = {
  key: string;
  title: string;
  optionValues: Record<string, string>;
};

const cartesianProduct = (lists: string[][]): string[][] =>
  lists.reduce<string[][]>(
    (acc, values) => acc.flatMap(combo => values.map(value => [...combo, value])),
    [[]],
  );

const DEFAULT_VARIANT_KEY = 'default';

const UploadProduct = () => {
  const { l10n } = useLocalization();
  const navigation = useNavigation();
  const colors = useColors();
  const { seller } = useSeller();
  const { region } = useRegion();

  const [images, setImages] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState('');
  const [options, setOptions] = useState<ProductOptionDraft[]>([]);
  const [trackInventory, setTrackInventory] = useState(false);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [variantOverrides, setVariantOverrides] = useState<
    Record<string, VariantOverride>
  >({});

  const { data: categories = [] } = useQuery({
    queryKey: ['product-categories'],
    queryFn: listProductCategories,
    staleTime: 5 * 60 * 1000,
  });

  const {
    control,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: { errors },
  } = useForm<UploadProductSchema>({
    resolver: zodResolver(uploadProductSchema),
    defaultValues: { title: '', description: '', price: '' },
  });

  const parsedOptions = useMemo(
    () =>
      options
        .map(option => ({
          title: option.title.trim(),
          values: Array.from(
            new Set(
              option.valuesText
                .split(',')
                .map(value => value.trim())
                .filter(Boolean),
            ),
          ),
        }))
        .filter(option => option.title.length > 0 && option.values.length > 0),
    [options],
  );

  const variantCombos = useMemo<VariantCombo[]>(() => {
    if (parsedOptions.length === 0) {
      return [
        {
          key: DEFAULT_VARIANT_KEY,
          title: 'Default',
          optionValues: { Default: 'Default' },
        },
      ];
    }
    const combos = cartesianProduct(parsedOptions.map(option => option.values));
    return combos.map(combo => {
      const optionValues: Record<string, string> = {};
      parsedOptions.forEach((option, index) => {
        optionValues[option.title] = combo[index];
      });
      return {
        key: combo.join(' / '),
        title: combo.join(' / '),
        optionValues,
      };
    });
  }, [parsedOptions]);

  // Keep per-variant price/quantity/image overrides in sync as options are
  // added, edited or removed - preserving what's already been entered for
  // combinations that still exist.
  useEffect(() => {
    setVariantOverrides(prev => {
      const next: Record<string, VariantOverride> = {};
      variantCombos.forEach(combo => {
        next[combo.key] = prev[combo.key] ?? { price: '', quantity: '0' };
      });
      return next;
    });
  }, [variantCombos]);

  const addOption = () => {
    setOptions(prev => [
      ...prev,
      { id: `${Date.now()}-${prev.length}`, title: '', valuesText: '' },
    ]);
  };

  const updateOption = (id: string, patch: Partial<ProductOptionDraft>) => {
    setOptions(prev =>
      prev.map(option => (option.id === id ? { ...option, ...patch } : option)),
    );
  };

  const removeOption = (id: string) => {
    setOptions(prev => prev.filter(option => option.id !== id));
  };

  const updateVariantOverride = (key: string, patch: Partial<VariantOverride>) => {
    setVariantOverrides(prev => ({
      ...prev,
      [key]: { ...(prev[key] ?? { price: '', quantity: '0' }), ...patch },
    }));
  };

  const handlePickerResponse = (response: ImagePickerResponse) => {
    if (response.didCancel) {
      return;
    }
    if (response.errorCode) {
      Alert.alert(
        l10n.getString('failed-to-upload-product'),
        response.errorMessage || response.errorCode,
      );
      return;
    }
    const assets = response.assets ?? [];
    setImages(prev => [...prev, ...assets].slice(0, MAX_IMAGES));
  };

  const takePhoto = () => {
    launchCamera(
      { mediaType: 'photo', quality: 0.8, saveToPhotos: true },
      handlePickerResponse,
    );
  };

  const pickFromLibrary = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        selectionLimit: Math.max(MAX_IMAGES - images.length, 1),
        quality: 0.8,
      },
      handlePickerResponse,
    );
  };

  const pickImages = () => {
    Alert.alert(
      l10n.getString('add-photo'),
      undefined,
      [
        { text: l10n.getString('take-photo'), onPress: takePhoto },
        { text: l10n.getString('choose-from-library'), onPress: pickFromLibrary },
        { text: l10n.getString('cancel'), style: 'cancel' },
      ],
      { cancelable: true },
    );
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    // Any variant pointing at this (or a later) photo needs to drop/shift
    // its reference so we never send a stale index.
    setVariantOverrides(prev => {
      const next: Record<string, VariantOverride> = {};
      Object.entries(prev).forEach(([key, override]) => {
        if (override.imageIndex === undefined) {
          next[key] = override;
        } else if (override.imageIndex === index) {
          next[key] = { ...override, imageIndex: undefined };
        } else if (override.imageIndex > index) {
          next[key] = { ...override, imageIndex: override.imageIndex - 1 };
        } else {
          next[key] = override;
        }
      });
      return next;
    });
  };

  const onSubmit = async (data: UploadProductSchema) => {
    if (!seller) {
      return;
    }

    try {
      Keyboard.dismiss();
      setLoading(true);

      // Mercur automatically assigns a seller's own default shipping
      // profile to products they create, so we only need to make sure a
      // free "No Delivery" shipping option exists on that profile - we
      // never ask the seller to pick a profile or shipping option.
      setStage(l10n.getString('setting-up-shipping'));
      const { stockLocationId } = await ensureNoDeliveryShippingOption(
        seller.name,
      );

      const validImages = images.filter(asset => !!asset.uri);
      let uploadedImages: Array<{ url: string }> = [];
      if (validImages.length > 0) {
        setStage(l10n.getString('uploading-images'));
        const { files } = await uploadVendorImages(
          validImages.map((asset, index) => ({
            uri: asset.uri as string,
            name: asset.fileName || `product-${Date.now()}-${index}.jpg`,
            type: asset.type || 'image/jpeg',
          })),
        );
        uploadedImages = files.map(file => ({ url: file.url }));
      }

      setStage(l10n.getString('creating-product'));
      const currencyCode = region?.currency_code || 'usd';
      const basePrice = Number(data.price);

      const optionsPayload =
        parsedOptions.length > 0
          ? parsedOptions.map(option => ({
              title: option.title,
              values: option.values,
            }))
          : [{ title: 'Default', values: ['Default'] }];

      const variantsPayload = variantCombos.map(combo => {
        const override = variantOverrides[combo.key];
        const price = override?.price?.trim()
          ? Number(override.price)
          : basePrice;
        return {
          title: combo.title,
          options: combo.optionValues,
          prices: [{ currency_code: currencyCode, amount: price }],
          manage_inventory: trackInventory,
          sku: override?.sku?.trim() || undefined,
          origin_country: DEFAULT_ORIGIN_COUNTRY,
        };
      });

      // Every product needs a sales channel to be purchasable - we attach
      // the marketplace's default one automatically so sellers never have
      // to think about it.
      const salesChannelId = await resolveDefaultSalesChannelId().catch(
        () => undefined,
      );

      const { product } = await createVendorProduct({
        title: data.title,
        description: data.description,
        status: 'proposed',
        thumbnail: uploadedImages[0]?.url,
        images: uploadedImages,
        sales_channels: salesChannelId ? [{ id: salesChannelId }] : undefined,
        categories: categoryId ? [{ id: categoryId }] : undefined,
        options: optionsPayload,
        variants: variantsPayload,
      });

      // Assign whichever product photo each variant was tagged with. The
      // create endpoint doesn't accept a variant thumbnail directly, so
      // this happens in a follow-up call once we know the real variant ids.
      if (uploadedImages.length > 0) {
        const thumbnailUpdates = variantCombos
          .map(combo => {
            const imageIndex = variantOverrides[combo.key]?.imageIndex;
            if (imageIndex === undefined || !uploadedImages[imageIndex]) {
              return null;
            }
            const createdVariant = product.variants?.find(
              v => v.title === combo.title,
            );
            if (!createdVariant) {
              return null;
            }
            return {
              id: createdVariant.id,
              thumbnail: uploadedImages[imageIndex].url,
            };
          })
          .filter((v): v is { id: string; thumbnail: string } => !!v);

        if (thumbnailUpdates.length > 0) {
          await updateVendorProductVariantThumbnails(
            product.id,
            thumbnailUpdates,
          );
        }
      }

      // Set an initial stock quantity per variant, if the seller chose to
      // track inventory for this product.
      if (trackInventory) {
        setStage(l10n.getString('setting-up-inventory'));
        const { product: withInventory } = await getVendorProduct(product.id);
        await Promise.all(
          variantCombos.map(async combo => {
            const quantity = Number(
              variantOverrides[combo.key]?.quantity || 0,
            );
            const createdVariant = withInventory.variants?.find(
              v => v.title === combo.title,
            );
            const inventoryItemId =
              createdVariant?.inventory_items?.[0]?.inventory_item_id;
            if (inventoryItemId) {
              await setInventoryLocationLevel(
                inventoryItemId,
                stockLocationId,
                quantity,
              );
            }
          }),
        );
      }

      Alert.alert(
        l10n.getString('product-submitted'),
        l10n.getString('product-submitted-description'),
        [
          {
            text: l10n.getString('ok'),
            onPress: () => {
              reset();
              setImages([]);
              setOptions([]);
              setTrackInventory(false);
              setCategoryId(undefined);
              setVariantOverrides({});
              navigation.navigate('SellerDashboard');
            },
          },
        ],
      );
    } catch (err) {
      setFormError('root', {
        type: 'manual',
        message:
          err instanceof Error
            ? err.message
            : l10n.getString('failed-to-upload-product'),
      });
    } finally {
      setLoading(false);
      setStage('');
    }
  };

  const hasVariants = parsedOptions.length > 0;

  return (
    <View className="flex-1 bg-background p-safe">
      <Navbar title={l10n.getString('upload-product')} />

      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="p-4 gap-4">
          {errors.root && (
            <Text className="text-red-500 text-center">
              {errors.root.message}
            </Text>
          )}

          <Card>
            <Text className="font-content-bold text-base mb-3">
              {l10n.getString('product-photos')}
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {images.map((asset, index) => (
                <View key={asset.uri ?? index} className="relative">
                  <Image
                    source={{ uri: asset.uri }}
                    className="w-20 h-20 rounded-lg"
                  />
                  <TouchableOpacity
                    onPress={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-background rounded-full elevation-sm"
                  >
                    <MaterialIcon
                      name="close-circle"
                      size={22}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                </View>
              ))}
              {images.length < MAX_IMAGES && (
                <TouchableOpacity
                  onPress={pickImages}
                  className="w-20 h-20 rounded-lg border border-dashed border-gray-300 justify-center items-center"
                >
                  <MaterialIcon
                    name="camera-plus-outline"
                    size={26}
                    color={colors.content}
                  />
                </TouchableOpacity>
              )}
            </View>
          </Card>

          <Card>
            <Controller
              control={control}
              name="title"
              render={({ field: { onChange, value } }) => (
                <Input
                  label={l10n.getString('product-title')}
                  placeholder={l10n.getString('enter-product-title')}
                  value={value}
                  onChangeText={onChange}
                  error={
                    errors.title?.message
                      ? l10n.getString(errors.title.message)
                      : undefined
                  }
                  containerClassName="mb-3"
                />
              )}
            />

            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, value } }) => (
                <Input
                  label={l10n.getString('description')}
                  placeholder={l10n.getString('enter-product-description')}
                  value={value}
                  onChangeText={onChange}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  className="h-28"
                  containerClassName="mb-3"
                />
              )}
            />

            <Controller
              control={control}
              name="price"
              render={({ field: { onChange, value } }) => (
                <Input
                  label={`${l10n.getString(
                    hasVariants ? 'base-price' : 'price',
                  )} (${region?.currency_code?.toUpperCase() || ''})`}
                  placeholder="0.00"
                  value={value}
                  onChangeText={onChange}
                  keyboardType="decimal-pad"
                  error={
                    errors.price?.message
                      ? l10n.getString(errors.price.message)
                      : undefined
                  }
                  containerClassName={hasVariants ? 'mb-0' : 'mb-3'}
                />
              )}
            />

            {!hasVariants && (
              <Input
                label={l10n.getString('sku-optional')}
                placeholder={l10n.getString('sku-placeholder')}
                autoCapitalize="characters"
                value={variantOverrides[DEFAULT_VARIANT_KEY]?.sku ?? ''}
                onChangeText={text =>
                  updateVariantOverride(DEFAULT_VARIANT_KEY, { sku: text })
                }
                containerClassName="mb-3"
              />
            )}

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
              {l10n.getString('product-options')}
            </Text>
            <Text className="opacity-60 text-xs mb-3">
              {l10n.getString('product-options-description')}
            </Text>

            {options.map(option => (
              <View key={option.id} className="flex-row gap-2 mb-3">
                <Input
                  containerClassName="mb-0 flex-1"
                  placeholder={l10n.getString('option-name-placeholder')}
                  value={option.title}
                  onChangeText={text => updateOption(option.id, { title: text })}
                />
                <Input
                  containerClassName="mb-0"
                  className="w-40"
                  placeholder={l10n.getString('option-values-placeholder')}
                  value={option.valuesText}
                  onChangeText={text =>
                    updateOption(option.id, { valuesText: text })
                  }
                />
                <TouchableOpacity
                  onPress={() => removeOption(option.id)}
                  className="justify-center px-1"
                >
                  <MaterialIcon
                    name="close-circle-outline"
                    size={22}
                    color={colors.content}
                  />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              onPress={addOption}
              className="flex-row items-center gap-1 self-start mt-1"
            >
              <MaterialIcon
                name="plus-circle-outline"
                size={18}
                color={colors.primary}
              />
              <Text className="text-primary font-content-bold">
                {l10n.getString('add-option')}
              </Text>
            </TouchableOpacity>
          </Card>

          <Card>
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="font-content-bold">
                  {l10n.getString('track-inventory')}
                </Text>
                <Text className="opacity-60 text-xs mt-1">
                  {l10n.getString('track-inventory-description')}
                </Text>
              </View>
              <Switch
                value={trackInventory}
                onValueChange={setTrackInventory}
                trackColor={{ true: colors.primary }}
              />
            </View>

            {trackInventory && !hasVariants && (
              <Input
                label={l10n.getString('quantity')}
                keyboardType="number-pad"
                value={variantOverrides[DEFAULT_VARIANT_KEY]?.quantity ?? '0'}
                onChangeText={text =>
                  updateVariantOverride(DEFAULT_VARIANT_KEY, {
                    quantity: text,
                  })
                }
                containerClassName="mt-3 mb-0"
              />
            )}
          </Card>

          {hasVariants && (
            <Card>
              <View className="flex-row items-center justify-between mb-1">
                <Text className="font-content-bold text-base">
                  {l10n.getString('variants')}
                </Text>
                <View className="bg-primary/10 px-2 py-0.5 rounded-full">
                  <Text className="text-primary text-xs font-content-bold">
                    {variantCombos.length}
                  </Text>
                </View>
              </View>
              <Text className="opacity-60 text-xs mb-3">
                {l10n.getString('variants-description')}
              </Text>

              {variantCombos.map((combo, index) => {
                const override = variantOverrides[combo.key] ?? {
                  price: '',
                  quantity: '0',
                };
                return (
                  <View
                    key={combo.key}
                    className={`pb-4 mb-4 ${
                      index < variantCombos.length - 1
                        ? 'border-b border-gray-100'
                        : ''
                    }`}
                  >
                    <Text className="font-content-bold mb-2">
                      {combo.title}
                    </Text>
                    <View className="flex-row gap-2">
                      <Input
                        containerClassName="mb-0 flex-1"
                        label={l10n.getString('price')}
                        placeholder="0.00"
                        keyboardType="decimal-pad"
                        value={override.price}
                        onChangeText={text =>
                          updateVariantOverride(combo.key, { price: text })
                        }
                      />
                      {trackInventory && (
                        <Input
                          containerClassName="mb-0 flex-1"
                          label={l10n.getString('quantity')}
                          keyboardType="number-pad"
                          value={override.quantity}
                          onChangeText={text =>
                            updateVariantOverride(combo.key, {
                              quantity: text,
                            })
                          }
                        />
                      )}
                    </View>

                    <Input
                      containerClassName="mb-0 mt-2"
                      label={l10n.getString('sku-optional')}
                      placeholder={l10n.getString('sku-placeholder')}
                      autoCapitalize="characters"
                      value={override.sku ?? ''}
                      onChangeText={text =>
                        updateVariantOverride(combo.key, { sku: text })
                      }
                    />

                    {images.length > 0 && (
                      <View className="mt-3">
                        <Text className="text-xs opacity-60 mb-2">
                          {l10n.getString('variant-image')}
                        </Text>
                        <View className="flex-row gap-2">
                          {images.map((asset, imgIndex) => {
                            const selected = override.imageIndex === imgIndex;
                            return (
                              <TouchableOpacity
                                key={asset.uri ?? imgIndex}
                                onPress={() =>
                                  updateVariantOverride(combo.key, {
                                    imageIndex: selected
                                      ? undefined
                                      : imgIndex,
                                  })
                                }
                                className={`w-12 h-12 rounded-lg overflow-hidden border-2 ${
                                  selected
                                    ? 'border-primary'
                                    : 'border-transparent'
                                }`}
                              >
                                <Image
                                  source={{ uri: asset.uri }}
                                  className="w-full h-full"
                                />
                                {selected && (
                                  <View className="absolute inset-0 bg-black/20 items-center justify-center">
                                    <MaterialIcon
                                      name="check-circle"
                                      size={18}
                                      color="#fff"
                                    />
                                  </View>
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </Card>
          )}

          <Text className="opacity-50 text-xs -mt-2">
            {l10n.getString('no-delivery-note')}
          </Text>

          <Button
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            title={loading ? stage || l10n.getString('submitting') : l10n.getString('submit-product')}
          />
        </View>
      </ScrollView>
    </View>
  );
};

export default UploadProduct;
