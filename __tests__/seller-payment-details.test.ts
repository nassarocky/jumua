import {
  extractSellerPaymentDetails,
  getPaymentDetailRows,
} from '../app/utils/seller-payment-details';

describe('extractSellerPaymentDetails', () => {
  it('returns unique seller payment accounts from cart items', () => {
    const cart = {
      items: [
        {
          id: 'item-1',
          product: {
            seller: {
              id: 'sel_1',
              name: 'Shop A',
              payment_details: {
                id: 'pay_1',
                holder_name: 'John Doe',
                account_number: '1234567890',
              },
            },
          },
        },
        {
          id: 'item-2',
          product: {
            seller: {
              id: 'sel_1',
              name: 'Shop A',
              payment_details: {
                id: 'pay_1',
                holder_name: 'John Doe',
                account_number: '1234567890',
              },
            },
          },
        },
        {
          id: 'item-3',
          product: {
            seller: {
              id: 'sel_2',
              name: 'Shop B',
              payment_details: {
                id: 'pay_2',
                holder_name: 'Jane Doe',
                bank_name: 'NMB Bank',
                account_number: '9876543210',
              },
            },
          },
        },
      ],
    } as any;

    const accounts = extractSellerPaymentDetails(cart);

    expect(accounts).toHaveLength(2);
    expect(accounts[0].sellerName).toBe('Shop A');
    expect(accounts[0].accountNumber).toBe('1234567890');
    expect(accounts[1].bankName).toBe('NMB Bank');
  });

  it('skips sellers without displayable payment details', () => {
    const cart = {
      items: [
        {
          id: 'item-1',
          product: {
            seller: {
              id: 'sel_1',
              name: 'Shop A',
              payment_details: {
                id: 'pay_1',
              },
            },
          },
        },
      ],
    } as any;

    expect(extractSellerPaymentDetails(cart)).toHaveLength(0);
  });
});

describe('getPaymentDetailRows', () => {
  it('returns only populated payment detail rows', () => {
    const rows = getPaymentDetailRows({
      id: 'pay_1',
      sellerId: 'sel_1',
      sellerName: 'Shop A',
      holderName: 'John Doe',
      accountNumber: '1234567890',
    });

    expect(rows).toEqual([
      { labelKey: 'account-holder', value: 'John Doe' },
      { labelKey: 'account-number', value: '1234567890' },
    ]);
  });
});
