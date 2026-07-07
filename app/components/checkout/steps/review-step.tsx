import React from 'react';
import { View } from 'react-native';
import Text from '@components/common/text';
import { HttpTypes } from '@medusajs/types';
import { useLocalization } from '@fluent/react';
import CartContent from '@components/cart/cart-content';
import ManualPaymentDetails from '@components/checkout/manual-payment-details';
import { useSellerPaymentDetails } from '@data/use-seller-payment-details';
import { PAYMENT_PROVIDER_DETAILS_MAP } from '../../../types/checkout';

type ReviewStepProps = {
  cart: HttpTypes.StoreCart;
};

const ReviewStep = ({ cart }: ReviewStepProps) => {
  const { l10n } = useLocalization();
  // Find the selected shipping option
  const selectedShippingMethod = cart.shipping_methods?.at(-1);

  const selectedPaymentMethodId =
    cart.payment_collection?.payment_sessions?.find(
      (paymentSession: any) => paymentSession.status === 'pending',
    )?.provider_id || '';

  const isManualPayment = selectedPaymentMethodId === 'pp_system_default';
  const { data: paymentAccounts, isLoading: isLoadingPaymentAccounts } =
    useSellerPaymentDetails(cart.id, isManualPayment);

  return (
    <View>
      <CartContent cart={cart} mode="checkout" />
      <View className="mt-6 gap-4">
        {/* Selected Shipping Method */}
        <View className="p-4 bg-background-secondary rounded-lg">
          <Text className="font-content-bold mb-2 text-content">
            {l10n.getString('shipping-method')}
          </Text>
          <Text className="text-content">
            {selectedShippingMethod?.name ||
              selectedShippingMethod?.id ||
              l10n.getString('no-shipping-method-selected')}
          </Text>
        </View>

        {/* Selected Payment Method */}
        <View className="p-4 bg-background-secondary rounded-lg">
          <Text className="font-content-bold mb-2 text-content">
            {l10n.getString('payment-method')}
          </Text>
          <Text className="text-content">
            {selectedPaymentMethodId
              ? PAYMENT_PROVIDER_DETAILS_MAP[selectedPaymentMethodId]?.name ||
                selectedPaymentMethodId
              : l10n.getString('no-payment-method-selected')}
          </Text>
          {isManualPayment && (
            <View className="mt-4 pt-4 border-t border-gray-200">
              <ManualPaymentDetails
                accounts={paymentAccounts ?? []}
                isLoading={isLoadingPaymentAccounts}
              />
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default ReviewStep;
