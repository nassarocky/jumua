import { z } from 'zod';

export type CheckoutStep =
  | 'address'
  | 'delivery'
  | 'payment'
  | 'register'
  | 'review';

export const CHECKOUT_STEPS: {
  id: CheckoutStep;
  title: string;
  icon: 'environment' | 'inbox' | 'wallet' | 'idcard' | 'profile';
}[] = [
  { id: 'address', title: 'address', icon: 'environment' },
  { id: 'delivery', title: 'delivery', icon: 'inbox' },
  { id: 'payment', title: 'payment', icon: 'wallet' },
  { id: 'register', title: 'register', icon: 'idcard' },
  { id: 'review', title: 'review', icon: 'profile' },
];

// The register step only exists for guests: creating an account before
// placing the order guarantees the order is owned by that account from the
// start, instead of relying on fragile guest-order tracking after the fact.
export const getCheckoutSteps = (isGuest: boolean) =>
  isGuest ? CHECKOUT_STEPS : CHECKOUT_STEPS.filter(step => step.id !== 'register');

export type AddressFields = {
  first_name: string;
  last_name: string;
  address_1: string;
  city: string;
  country_code: string;
  phone: string;
};

export const DEFAULT_COUNTRY_CODE = 'tz';

export const addressSchema = z.object({
  first_name: z.string(),
  last_name: z.string(),
  address_1: z.string(),
  city: z.string(),
  country_code: z.string(),
  phone: z.string().min(1, 'phone-is-required'),
}) satisfies z.ZodType<AddressFields>;

export const createEmptyAddress = (): AddressFields => ({
  first_name: '',
  last_name: '',
  address_1: '',
  city: '',
  country_code: DEFAULT_COUNTRY_CODE,
  phone: '',
});

export const checkoutSchema = z.object({
  shipping_address: addressSchema,
  billing_address: addressSchema,
  use_same_billing: z.boolean(),
});

export type CheckoutFormData = z.infer<typeof checkoutSchema>;

export type PaymentProvider = {
  id: string;
  name: string;
  description?: string;
  is_installed: boolean;
};

export const PAYMENT_PROVIDER_DETAILS_MAP: Record<
  string,
  { name: string; hasExternalStep: boolean }
> = {
  pp_system_default: { name: 'Manual', hasExternalStep: false },
  pp_stripe_stripe: { name: 'Stripe', hasExternalStep: true },
};
