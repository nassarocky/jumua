/**
 * Inspect live vendor order amounts from jumua.co.tz.
 *
 * Usage (PowerShell):
 *   $env:SELLER_EMAIL="you@example.com"
 *   $env:SELLER_PASSWORD="your-password"
 *   node scripts/debug-vendor-orders.mjs
 */
const API = process.env.MEDUSA_BACKEND_URL || 'https://jumua.co.tz';
const PUBLISHABLE_KEY =
  process.env.PUBLISHABLE_API_KEY ||
  'pk_04d1573087be32a5c0bdbf1a2cd94209288923148bf94f60470f18b4c272e84e';
const EMAIL = process.env.SELLER_EMAIL;
const PASSWORD = process.env.SELLER_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('Set SELLER_EMAIL and SELLER_PASSWORD env vars first.');
  process.exit(1);
}

const json = async (url, options = {}) => {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-publishable-api-key': PUBLISHABLE_KEY,
      ...(options.headers || {}),
    },
  });
  const body = await res.text();
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    data = body;
  }
  if (!res.ok) {
    throw new Error(`${res.status} ${url}\n${body}`);
  }
  return data;
};

const main = async () => {
  const auth = await json(`${API}/auth/member/emailpass`, {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const token = auth.token;
  if (!token) {
    throw new Error('Login succeeded but no token returned.');
  }

  const memberships = await json(`${API}/vendor/sellers/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const sellerId = memberships.seller_members?.[0]?.seller_id;
  if (!sellerId) {
    throw new Error('No seller membership found for this account.');
  }

  const fields =
    '+total,+item_total,+shipping_total,+subtotal,+fulfillment_status,+payment_status';
  const { orders } = await json(
    `${API}/vendor/orders?limit=1&order=-created_at&fields=${encodeURIComponent(fields)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-seller-id': sellerId,
      },
    },
  );

  const order = orders?.[0];
  if (!order) {
    console.log('No orders returned.');
    return;
  }

  console.log('Order id:', order.id);
  console.log('currency_code:', order.currency_code);
  console.log('total:', order.total);
  console.log('item_total:', order.item_total);
  console.log('shipping_total:', order.shipping_total);
  console.log('summary:', JSON.stringify(order.summary, null, 2));
  console.log(
    'payment_collections:',
    JSON.stringify(order.payment_collections, null, 2),
  );
  console.log(
    'first item:',
    JSON.stringify(
      {
        title: order.items?.[0]?.title,
        quantity: order.items?.[0]?.quantity,
        unit_price: order.items?.[0]?.unit_price,
        total: order.items?.[0]?.total,
        item_total: order.items?.[0]?.item_total,
        offer_prices: order.items?.[0]?.offer?.prices,
      },
      null,
      2,
    ),
  );
};

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
