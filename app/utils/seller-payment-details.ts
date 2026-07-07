import { HttpTypes } from '@medusajs/types';

type SellerPaymentDetailsRecord = {
  id?: string;
  country_code?: string | null;
  holder_name?: string | null;
  bank_name?: string | null;
  iban?: string | null;
  bic?: string | null;
  routing_number?: string | null;
  account_number?: string | null;
};

type CartItemWithSeller = HttpTypes.StoreCartLineItem & {
  product?: {
    seller?: {
      id?: string;
      name?: string;
      payment_details?: SellerPaymentDetailsRecord | null;
    };
  };
};

export type SellerPaymentAccount = {
  id: string;
  sellerId: string;
  sellerName: string;
  holderName?: string;
  bankName?: string;
  accountNumber?: string;
  iban?: string;
  bic?: string;
  routingNumber?: string;
  countryCode?: string;
};

export type PaymentDetailRow = {
  labelKey:
    | 'account-holder'
    | 'bank-name'
    | 'account-number'
    | 'iban'
    | 'bic'
    | 'routing-number';
  value: string;
};

export const CART_SELLER_PAYMENT_FIELDS =
  '+items.product.seller.*,+items.product.seller.payment_details.*';

const hasDisplayablePaymentDetails = (
  details: SellerPaymentDetailsRecord,
): boolean => {
  return Boolean(
    details.holder_name ||
      details.bank_name ||
      details.account_number ||
      details.iban ||
      details.bic ||
      details.routing_number,
  );
};

export const extractSellerPaymentDetails = (
  cart: HttpTypes.StoreCart,
): SellerPaymentAccount[] => {
  const seenSellerIds = new Set<string>();
  const accounts: SellerPaymentAccount[] = [];

  for (const item of (cart.items ?? []) as CartItemWithSeller[]) {
    const seller = item.product?.seller;
    const details = seller?.payment_details;

    if (!seller?.id || !details || seenSellerIds.has(seller.id)) {
      continue;
    }

    if (!hasDisplayablePaymentDetails(details)) {
      continue;
    }

    seenSellerIds.add(seller.id);
    accounts.push({
      id: details.id || seller.id,
      sellerId: seller.id,
      sellerName: seller.name || seller.id,
      holderName: details.holder_name || undefined,
      bankName: details.bank_name || undefined,
      accountNumber: details.account_number || undefined,
      iban: details.iban || undefined,
      bic: details.bic || undefined,
      routingNumber: details.routing_number || undefined,
      countryCode: details.country_code || undefined,
    });
  }

  return accounts;
};

export const getPaymentDetailRows = (
  account: SellerPaymentAccount,
): PaymentDetailRow[] => {
  const rows: PaymentDetailRow[] = [];

  if (account.holderName) {
    rows.push({ labelKey: 'account-holder', value: account.holderName });
  }
  if (account.bankName) {
    rows.push({ labelKey: 'bank-name', value: account.bankName });
  }
  if (account.accountNumber) {
    rows.push({ labelKey: 'account-number', value: account.accountNumber });
  }
  if (account.iban) {
    rows.push({ labelKey: 'iban', value: account.iban });
  }
  if (account.bic) {
    rows.push({ labelKey: 'bic', value: account.bic });
  }
  if (account.routingNumber) {
    rows.push({ labelKey: 'routing-number', value: account.routingNumber });
  }

  return rows;
};
