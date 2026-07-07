import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalization } from '@fluent/react';
import Text from '@components/common/text';
import { useColors } from '@styles/hooks';
import { useQuery } from '@tanstack/react-query';
import { HttpTypes } from '@medusajs/types';
import apiClient from '@api/client';
import { convertToLocale } from '@utils/product-price';
import { normalizeShippingOptions } from '@utils/shipping-options';
import { useCart } from '@data/cart-context';

type ShippingStepProps = {
  cart: HttpTypes.StoreCart;
  onAutoAdvance?: () => void;
};

const ShippingStep = ({ cart, onAutoAdvance }: ShippingStepProps) => {
  const { l10n } = useLocalization();
  const colors = useColors();
  const [calculatedPricesMap, setCalculatedPricesMap] = useState<
    Record<string, number>
  >({});
  const { setShippingMethod } = useCart();
  const [selectedMethodId, setSelectedMethodId] = useState(
    cart?.shipping_methods?.[0]?.shipping_option_id || null,
  );
  const [updatingOptionId, setUpdatingOptionId] = useState<string | null>(null);
  const [isCalculatingPrices, setIsCalculatingPrices] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAutoSelecting, setIsAutoSelecting] = useState(false);
  const hasAutoAdvancedRef = useRef(false);

  useEffect(() => {
    setSelectedMethodId(
      cart?.shipping_methods?.[0]?.shipping_option_id || null,
    );
    hasAutoAdvancedRef.current = false;
  }, [cart?.id, cart?.shipping_methods?.[0]?.shipping_option_id]);

  const {
    data: shippingOptions,
    isLoading: isLoadingShippingOptions,
    isError: isShippingOptionsError,
  } = useQuery({
    queryKey: ['shipping-options', cart?.id],
    queryFn: async () => {
      if (!cart?.id) {
        throw new Error(l10n.getString('no-cart-id'));
      }
      const { shipping_options } =
        await apiClient.store.fulfillment.listCartOptions({
          cart_id: cart.id,
        });
      return normalizeShippingOptions(shipping_options);
    },
    enabled: !!cart?.id,
  });

  // Calculate prices for shipping options
  useEffect(() => {
    if (!cart?.id || !shippingOptions?.length) {
      return;
    }

    setIsCalculatingPrices(true);
    const calculatedOptions = shippingOptions.filter(
      sm => sm.price_type === 'calculated',
    );

    if (calculatedOptions.length) {
      Promise.all(
        calculatedOptions.map(option =>
          apiClient.store.fulfillment
            .calculate(option.id, {
              cart_id: cart.id,
            })
            .then(({ shipping_option }) => ({
              id: shipping_option.id,
              amount: shipping_option.amount,
            })),
        ),
      )
        .then(results => {
          const pricesMap: Record<string, number> = {};
          results.forEach(result => {
            if (result.id && result.amount) {
              pricesMap[result.id] = result.amount;
            }
          });
          setCalculatedPricesMap(pricesMap);
        })
        .catch((err: Error) => {
          console.error('Failed to calculate shipping prices:', err);
        })
        .finally(() => {
          setIsCalculatingPrices(false);
        });
    } else {
      setIsCalculatingPrices(false);
    }
  }, [cart?.id, shippingOptions]);

  const handleShippingMethodSelect = async (id: string) => {
    if (!cart?.id) {
      return;
    }

    if (selectedMethodId === id) {
      return;
    }

    setError(null);
    setUpdatingOptionId(id);

    try {
      await setShippingMethod(id);
      setSelectedMethodId(id);
    } catch (err) {
      setError(l10n.getString('failed-to-update-shipping-method'));
      console.error(err);
    } finally {
      setUpdatingOptionId(null);
    }
  };

  const isOptionReady = (option: HttpTypes.StoreCartShippingOption) => {
    if (option.price_type !== 'calculated') {
      return true;
    }
    return calculatedPricesMap[option.id] !== undefined;
  };

  // Auto-select and advance when there is only one shipping option
  useEffect(() => {
    if (
      hasAutoAdvancedRef.current ||
      isLoadingShippingOptions ||
      !shippingOptions?.length ||
      shippingOptions.length !== 1 ||
      isCalculatingPrices
    ) {
      return;
    }

    const option = shippingOptions[0];
    if (!isOptionReady(option)) {
      return;
    }

    const alreadySelected =
      cart?.shipping_methods?.some(
        method => method.shipping_option_id === option.id,
      ) ?? false;

    hasAutoAdvancedRef.current = true;
    setIsAutoSelecting(true);

    const autoSelect = async () => {
      try {
        if (!alreadySelected) {
          await setShippingMethod(option.id);
          setSelectedMethodId(option.id);
        }
        onAutoAdvance?.();
      } catch (err) {
        hasAutoAdvancedRef.current = false;
        setError(l10n.getString('failed-to-update-shipping-method'));
        console.error(err);
      } finally {
        setIsAutoSelecting(false);
      }
    };

    autoSelect();
  }, [
    shippingOptions,
    isLoadingShippingOptions,
    isCalculatingPrices,
    calculatedPricesMap,
    cart?.shipping_methods,
    setShippingMethod,
    onAutoAdvance,
    l10n,
  ]);

  if (isLoadingShippingOptions) {
    return (
      <View className="flex-1 items-center justify-center py-8">
        <ActivityIndicator size="small" color={colors.primary} />
        <Text className="text-gray-500 mt-3">
          {l10n.getString('loading-shipping-options')}...
        </Text>
      </View>
    );
  }

  if (isShippingOptionsError) {
    return (
      <View className="flex-1 items-center justify-center py-8">
        <Text className="text-red-500 text-center">
          {l10n.getString('failed-to-update-shipping-method')}
        </Text>
      </View>
    );
  }

  if (!shippingOptions?.length) {
    return (
      <View className="flex-1 items-center justify-center py-8">
        <Text className="text-gray-500 text-center">
          {l10n.getString('no-shipping-options-available')}
        </Text>
      </View>
    );
  }

  if (shippingOptions.length === 1 && isAutoSelecting) {
    return (
      <View className="flex-1 items-center justify-center py-8">
        <ActivityIndicator size="small" color={colors.primary} />
        <Text className="text-gray-500 mt-3">
          {l10n.getString('loading-shipping-options')}...
        </Text>
      </View>
    );
  }

  return (
    <View className="space-y-6">
      <Text className="text-2xl mb-4">
        {l10n.getString('select-shipping-method')}
      </Text>
      {error && (
        <Text className="text-red-500 mb-4" testID="shipping-error">
          {error}
        </Text>
      )}
      <View className="gap-4">
        {shippingOptions.map(option => {
          const isCalculated = option.price_type === 'calculated';
          const amount = isCalculated
            ? calculatedPricesMap[option.id]
            : option.amount;
          const isUpdating = updatingOptionId === option.id;
          const isSelected =
            selectedMethodId === option.id ||
            cart.shipping_methods?.some(
              method => method.shipping_option_id === option.id,
            );

          return (
            <TouchableOpacity
              key={option.id}
              onPress={() => handleShippingMethodSelect(option.id)}
              disabled={isUpdating || (isCalculated && isCalculatingPrices)}
              className={`p-4 border rounded-lg flex-row justify-between items-center ${
                isSelected ? 'border-primary' : 'border-gray-200'
              }`}
            >
              <View className="flex-row items-center flex-1">
                <View
                  className={`h-6 w-6 rounded-full border-2 items-center justify-center ${
                    isSelected ? 'border-primary' : 'border-gray-300'
                  }`}
                >
                  {isSelected ? (
                    <View className="h-3 w-3 rounded-full bg-primary" />
                  ) : null}
                </View>
                <Text className="ml-2 flex-1">{option.name}</Text>
              </View>
              {isUpdating ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text>
                  {isCalculated && isCalculatingPrices
                    ? `${l10n.getString('calculating')}...`
                    : amount !== undefined
                    ? convertToLocale({
                        amount,
                        currency_code: cart.currency_code,
                      })
                    : '-'}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default ShippingStep;
