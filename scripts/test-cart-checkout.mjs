/**
 * Unit tests for cart checkout helpers.
 *
 * Usage: node scripts/test-cart-checkout.mjs
 */

const cartHasCheckoutState = cart =>
  Boolean(
    cart?.shipping_methods?.length ||
      cart?.payment_collection?.payment_sessions?.length,
  );

const isCartCompleted = cart => Boolean(cart?.completed_at);

const tests = [
  {
    name: 'empty cart has no checkout state',
    cart: { items: [] },
    expectCheckout: false,
    expectCompleted: false,
  },
  {
    name: 'shipping method marks checkout state',
    cart: { shipping_methods: [{ id: 'sm_1' }] },
    expectCheckout: true,
    expectCompleted: false,
  },
  {
    name: 'payment session marks checkout state',
    cart: {
      payment_collection: { payment_sessions: [{ id: 'ps_1' }] },
    },
    expectCheckout: true,
    expectCompleted: false,
  },
  {
    name: 'completed cart is detected',
    cart: { completed_at: '2026-01-01T00:00:00.000Z' },
    expectCheckout: false,
    expectCompleted: true,
  },
];

let failed = 0;

for (const test of tests) {
  const checkout = cartHasCheckoutState(test.cart);
  const completed = isCartCompleted(test.cart);

  if (checkout !== test.expectCheckout || completed !== test.expectCompleted) {
    failed += 1;
    console.error(
      `FAIL: ${test.name} (checkout=${checkout}, completed=${completed})`,
    );
  }
}

if (failed > 0) {
  console.error(`${failed} test(s) failed`);
  process.exit(1);
}

console.log(`All ${tests.length} tests passed.`);
