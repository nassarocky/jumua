import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useLocalization } from '@fluent/react';
import Text from '@components/common/text';
import { useCart } from '@data/cart-context';
import { CommonActions, useNavigation } from '@react-navigation/native';
import Button from '@components/common/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Navbar from '@components/common/navbar';
import apiClient from '@api/client';
import {
  CheckoutFormData,
  checkoutSchema,
  AddressFields,
  getCheckoutSteps,
  PAYMENT_PROVIDER_DETAILS_MAP,
  createEmptyAddress,
  CheckoutStep,
  addressSchema,
  DEFAULT_COUNTRY_CODE,
} from '../types/checkout';
import CheckoutSteps from '@components/checkout/checkout-steps';
import AddressStep from '@components/checkout/steps/address-step';
import ShippingStep from '@components/checkout/steps/shipping-step';
import PaymentStep from '@components/checkout/steps/payment-step';
import ReviewStep from '@components/checkout/steps/review-step';
import RegisterForm from '@components/auth/register-form';
import { resolveCheckoutEmail } from '@utils/phone-auth';
import { saveGuestOrder } from '@utils/guest-orders';
import { extractOrdersFromCompleteResponse } from '@utils/order-response';
import {
  useCountries,
  useCurrentCheckoutStep,
  useActivePaymentSession,
} from '@data/hooks';
import { StoreCartAddress, StoreCustomerAddress } from '@medusajs/types';
import { useCustomer } from '@data/customer-context';
import { useQuery } from '@tanstack/react-query';
import utils from '@utils/common';

const Checkout = () => {
  const { l10n } = useLocalization();
  const { cart, setCart, updateCart, resetCart } = useCart();
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const countries = useCountries();
  const currentStep = useCurrentCheckoutStep();
  const activeSession = useActivePaymentSession();
  const [selectedPaymentProviderId, setSelectedPaymentProviderId] = useState(
    activeSession?.provider_id,
  );

  const [activeStep, setActiveStep] = useState(currentStep);
  const previousCartIdRef = useRef(cart?.id);

  useEffect(() => {
    if (previousCartIdRef.current && cart?.id !== previousCartIdRef.current) {
      setActiveStep(currentStep);
      setSelectedPaymentProviderId(undefined);
    }
    previousCartIdRef.current = cart?.id;
  }, [cart?.id, currentStep]);

  const normalizeAddress = (address: AddressFields): AddressFields => ({
    ...address,
    country_code: address.country_code || DEFAULT_COUNTRY_CODE,
  });

  const getAddressFromCart = (
    cartAddress?: StoreCartAddress,
  ): AddressFields => {
    if (!cartAddress) {
      return createEmptyAddress();
    }
    const result = addressSchema.safeParse(cartAddress);
    return normalizeAddress(
      result.success ? result.data : createEmptyAddress(),
    );
  };

  const defaultValues: CheckoutFormData = {
    shipping_address: getAddressFromCart(cart?.shipping_address),
    billing_address: getAddressFromCart(cart?.billing_address),
    use_same_billing:
      cart?.billing_address && cart?.shipping_address
        ? utils.areEqualObjects(
            addressSchema.safeParse(cart.billing_address),
            addressSchema.safeParse(cart.shipping_address),
          )
        : true,
  };

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues,
  });

  const { customer } = useCustomer();
  const effectiveSteps = getCheckoutSteps(!customer);
  const { data: customerAddresses } = useQuery({
    queryKey: ['address-list'],
    queryFn: async () => {
      const { addresses } = await apiClient.store.customer.listAddress();
      return addresses;
    },
    enabled: !!customer,
  });

  const hasPrefilledRef = useRef(false);

  useEffect(() => {
    if (hasPrefilledRef.current) {
      return;
    }
    if (!customerAddresses || customerAddresses.length === 0) {
      return;
    }

    // Don't override an address the user already entered for this cart
    const cartHasAddress = Boolean(cart?.shipping_address?.address_1);
    if (cartHasAddress) {
      hasPrefilledRef.current = true;
      return;
    }

    const mapAddress = (
      address: StoreCustomerAddress,
    ): AddressFields =>
      normalizeAddress({
        first_name: address.first_name || '',
        last_name: address.last_name || '',
        address_1: address.address_1 || '',
        city: address.city || '',
        country_code: address.country_code || DEFAULT_COUNTRY_CODE,
        phone: address.phone || '',
      });

    const defaultShipping =
      customerAddresses.find(a => a.is_default_shipping) ??
      customerAddresses[0];
    const defaultBilling =
      customerAddresses.find(a => a.is_default_billing) ?? defaultShipping;

    const mappedShipping = mapAddress(defaultShipping);
    const mappedBilling = mapAddress(defaultBilling);

    form.reset({
      ...form.getValues(),
      shipping_address: mappedShipping,
      billing_address: mappedBilling,
      use_same_billing: utils.areEqualObjects(mappedShipping, mappedBilling),
    });

    hasPrefilledRef.current = true;
  }, [customerAddresses, cart?.shipping_address?.address_1, customer, form]);

  useEffect(() => {
    if (!cart?.items?.length) {
      navigation.goBack();
    }
  }, [cart?.items?.length, navigation]);

  // Check if cart is empty
  const isEmptyCart = !cart?.items || cart.items.length === 0;

  if (isEmptyCart) {
    return null;
  }

  const renderStep = () => {
    switch (activeStep) {
      case 'address':
        return (
          <AddressStep
            form={form}
            isLoading={isLoading}
            countries={countries}
          />
        );
      case 'delivery':
        return (
          <ShippingStep
            cart={cart}
            onAutoAdvance={() => setActiveStep('payment')}
          />
        );
      case 'payment':
        return (
          <PaymentStep
            cart={cart}
            selectedProviderId={selectedPaymentProviderId}
            onSelectProvider={setSelectedPaymentProviderId}
          />
        );
      case 'register':
        return (
          <View>
            <Text className="text-base text-content text-center mb-6 px-2">
              {l10n.getString('create-account-to-continue-checkout')}
            </Text>
            <RegisterForm
              defaultPhone={form.getValues('shipping_address.phone')}
              onSuccess={() => setActiveStep('review')}
              footer={
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('SignIn', { redirectTo: 'Checkout' })
                  }
                >
                  <Text className="text-center text-primary">
                    {l10n.getString('already-have-an-account')}
                  </Text>
                </TouchableOpacity>
              }
            />
          </View>
        );
      case 'review':
        return <ReviewStep cart={cart} />;
      default:
        return null;
    }
  };

  const handleStepPress = (step: CheckoutStep) => {
    const currentStepIndex = effectiveSteps.findIndex(s => s.id === activeStep);
    const targetStepIndex = effectiveSteps.findIndex(s => s.id === step);

    if (targetStepIndex < currentStepIndex) {
      setActiveStep(step);
    }
  };

  const handleAddressSubmit = async () => {
    const useSameBilling = form.getValues('use_same_billing');
    const validateFields: (keyof CheckoutFormData)[] = ['shipping_address'];
    if (!useSameBilling) {
      validateFields.push('billing_address');
    }
    const isValid = await form.trigger(validateFields);
    if (!isValid) {
      return;
    }

    const { shipping_address, billing_address, use_same_billing } =
      form.getValues();

    const email = resolveCheckoutEmail({
      phone: shipping_address.phone,
      customerEmail: customer?.email,
      cartEmail: cart?.email,
    });

    if (!email) {
      throw new Error(l10n.getString('phone-is-required'));
    }

    const payload = {
      email,
      shipping_address: normalizeAddress(shipping_address),
      billing_address: normalizeAddress(
        use_same_billing ? shipping_address : billing_address,
      ),
    };

    await updateCart(payload);

    setActiveStep('delivery');
  };

  const handleDeliverySubmit = () => {
    if (!cart?.shipping_methods?.[0]?.shipping_option_id) {
      throw new Error(l10n.getString('no-shipping-method-selected'));
    }
    setActiveStep('payment');
  };

  const handlePaymentSubmit = async () => {
    if (!selectedPaymentProviderId) {
      throw new Error(l10n.getString('please-select-a-payment-method'));
    }
    if (!cart) {
      throw new Error(l10n.getString('no-cart-found'));
    }

    const { payment_collection } =
      await apiClient.store.payment.initiatePaymentSession(cart, {
        provider_id: selectedPaymentProviderId,
      });
    if (payment_collection) {
      setCart(prev => (prev ? { ...prev, payment_collection } : prev));
    }
    // Guests must create an account before the order is placed so it's
    // owned by that account from the start.
    setActiveStep(customer ? 'review' : 'register');
  };

  const handleOrderComplete = async () => {
    if (!cart?.id) {
      throw new Error(l10n.getString('no-cart-found'));
    }

    const selectedProvider = selectedPaymentProviderId
      ? PAYMENT_PROVIDER_DETAILS_MAP[selectedPaymentProviderId]
      : null;

    if (selectedProvider?.hasExternalStep) {
      switch (selectedPaymentProviderId) {
        case 'pp_stripe_stripe':
          // TODO: Implement Stripe payment flow
          break;
        default:
          throw new Error(l10n.getString('payment-provider-not-supported'));
      }
    } else {
      let response: { type: string; error?: { message?: string } };
      try {
        response = (await apiClient.store.cart.complete(cart.id)) as {
          type: string;
          error?: { message?: string };
        };
      } catch (err) {
        // If the cart was already completed by a prior attempt (e.g. a
        // false failure retried by the user), the backend rejects a second
        // completion attempt. Treat that as success rather than surfacing a
        // scary error for an order that already exists.
        const message = err instanceof Error ? err.message : '';
        const cartAlreadyCompleted =
          /multiple links between .order. and .payment./i.test(message) ||
          /is already completed/i.test(message);
        if (cartAlreadyCompleted) {
          await resetCart();
          navigation.dispatch(
            CommonActions.reset({
              index: 1,
              routes: [{ name: 'Main' }, { name: 'Orders' }],
            }),
          );
          return;
        }
        throw err;
      }

      if (response.type === 'cart') {
        throw new Error(
          response.error?.message || l10n.getString('failed-to-complete-order'),
        );
      }

      // At this point the backend has confirmed the order was placed
      // (response.type is not "cart"). The multi-seller response wraps
      // orders under a custom `order_group` shape that isn't part of the
      // standard Medusa SDK types, so we scan the response for anything
      // order-shaped instead of guessing field names. If we can't find any
      // embedded order data, the order still went through — we just won't
      // have a local copy to show immediately.
      const placedOrders = extractOrdersFromCompleteResponse(response);

      const checkoutPhone = cart.shipping_address?.phone ?? '';
      const checkoutEmail = resolveCheckoutEmail({
        phone: checkoutPhone,
        customerEmail: customer?.email,
        cartEmail: cart.email,
      });

      if (placedOrders.length > 0) {
        await Promise.all(
          placedOrders.map(order =>
            saveGuestOrder({
              order,
              phone: checkoutPhone,
              email: checkoutEmail,
            }),
          ),
        );
      }

      await resetCart();

      if (placedOrders.length === 1) {
        navigation.dispatch(
          CommonActions.reset({
            index: 1,
            routes: [
              { name: 'Main' },
              {
                name: 'OrderDetail',
                params: {
                  orderId: placedOrders[0].id,
                  order: placedOrders[0],
                },
              },
            ],
          }),
        );
        return;
      }

      navigation.dispatch(
        CommonActions.reset({
          index: 1,
          routes: [
            { name: 'Main' },
            {
              name: 'Orders',
              params: checkoutPhone ? { phone: checkoutPhone } : undefined,
            },
          ],
        }),
      );
    }
  };

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      switch (activeStep) {
        case 'address':
          await handleAddressSubmit();
          break;
        case 'delivery':
          handleDeliverySubmit();
          break;
        case 'payment':
          await handlePaymentSubmit();
          break;
        case 'register':
          // The register step has its own submit button (RegisterForm);
          // the shared bottom CTA is hidden for this step.
          break;
        case 'review':
          await handleOrderComplete();
          break;
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert(
        l10n.getString('error'),
        error instanceof Error
          ? error.message
          : l10n.getString('an-error-occurred'),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getReviewStepCtaText = () => {
    const selectedProvider =
      PAYMENT_PROVIDER_DETAILS_MAP[selectedPaymentProviderId ?? ''];

    if (selectedProvider?.hasExternalStep) {
      return l10n.getString('pay-using-provider', {
        provider: selectedProvider.name,
      });
    }
    return l10n.getString('place-order');
  };

  const getCtaText = () => {
    switch (activeStep) {
      case 'address':
        return l10n.getString('continue-to-delivery');
      case 'delivery':
        return l10n.getString('continue-to-payment');
      case 'payment':
        return customer
          ? l10n.getString('review-order')
          : l10n.getString('continue');
      case 'review':
        return getReviewStepCtaText();
      default:
        return l10n.getString('continue');
    }
  };

  return (
    <View className="flex-1 bg-background p-safe">
      <View className="flex-1">
        <View className="mb-4">
          <Navbar title={l10n.getString('checkout')} />
        </View>
        <CheckoutSteps
          currentStep={activeStep}
          onStepPress={handleStepPress}
          steps={effectiveSteps}
        />
        <ScrollView className="flex-1 px-4" contentContainerClassName="pb-4">
          {renderStep()}
        </ScrollView>
      </View>
      {activeStep !== 'register' && (
        <View className="p-4 bg-background-secondary border-t border-gray-200">
          <Button
            variant="primary"
            title={getCtaText()}
            onPress={handleContinue}
            loading={isLoading}
          />
        </View>
      )}
    </View>
  );
};

export default Checkout;
