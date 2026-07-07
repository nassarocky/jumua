/**
 * Thin wrapper around the Mercur/Medusa "Vendor" API (`/vendor/*`).
 *
 * The official `@medusajs/js-sdk` package doesn't expose a `vendor`
 * namespace (it only ships `store`/`admin`), so all marketplace-specific
 * seller endpoints are called through the generic `client.fetch` method.
 *
 * Two important, easy-to-miss facts about this API (verified against a
 * live Mercur deployment, since the published API docs/OpenAPI spec were
 * out of date in a few places):
 *
 *  1. Vendor routes authenticate the **member** actor type
 *     (`/auth/member/emailpass`), not "seller". A member can belong to one
 *     or more sellers.
 *  2. Every vendor request (besides a handful of public routes) must carry
 *     an `x-seller-id` header identifying which seller the member is
 *     currently acting as. We keep track of the "current" seller id in
 *     memory here and inject it automatically.
 */
import vendorClient from './vendor-client';
import apiClient from './client';

export type VendorSellerMember = {
  id: string;
  name: string;
  email: string;
  bio?: string | null;
  phone?: string | null;
  photo?: string | null;
};

export type VendorSeller = {
  id: string;
  name: string;
  description?: string | null;
  handle: string;
  email?: string | null;
  phone?: string | null;
  photo?: string | null;
  currency_code: string;
  status: 'pending_approval' | 'open' | 'suspended' | 'terminated' | string;
  members?: VendorSellerMember[];
};

export type VendorSellerMembership = {
  id: string;
  seller_id: string;
  role_id: string;
  seller: VendorSeller;
};

export type VendorShippingProfile = {
  id: string;
  name: string;
  type: string;
};

export type VendorShippingOptionType = {
  label: string;
  description: string;
  code: string;
};

export type VendorShippingOption = {
  id: string;
  name: string;
  price_type: 'calculated' | 'flat';
  shipping_profile_id?: string;
  service_zone_id: string;
  provider_id?: string;
  type: VendorShippingOptionType;
  prices: Array<{ currency_code?: string; region_id?: string; amount: number }>;
};

export type VendorServiceZone = {
  id: string;
  name: string;
  fulfillment_set_id: string;
};

export type VendorFulfillmentSet = {
  id: string;
  name: string;
  type: string;
  service_zones?: VendorServiceZone[];
};

export type VendorStockLocation = {
  id: string;
  name: string;
  fulfillment_sets?: VendorFulfillmentSet[];
};

export type VendorFulfillmentProvider = {
  id: string;
  is_enabled?: boolean;
};

export type VendorRegion = {
  id: string;
  name: string;
  currency_code: string;
  countries?: Array<{ iso_2: string }>;
};

export type VendorProductImage = { id?: string; url: string };

export type VendorProductVariant = {
  id: string;
  title: string;
  thumbnail?: string | null;
  manage_inventory?: boolean;
  options?: Record<string, string>;
  // Standard Medusa variant fields used for customs/shipping details. These
  // aren't collected on the initial upload screen (to keep it quick) - a
  // seller can fill them in later from the edit-variant screen.
  sku?: string | null;
  material?: string | null;
  width?: number | null;
  length?: number | null;
  height?: number | null;
  weight?: number | null;
  mid_code?: string | null;
  hs_code?: string | null;
  origin_country?: string | null;
  inventory_items?: Array<{
    inventory_item_id: string;
  }>;
};

export type VendorProductCategory = {
  id: string;
  name: string;
};

export type VendorProduct = {
  id: string;
  title: string;
  handle: string;
  description?: string | null;
  status: 'draft' | 'proposed' | 'published' | 'rejected';
  thumbnail?: string | null;
  images?: VendorProductImage[];
  variants?: VendorProductVariant[];
  categories?: VendorProductCategory[];
};

export type VendorSalesChannel = {
  id: string;
  name: string;
  description?: string | null;
  is_disabled?: boolean;
};

export type VendorInventoryLocationLevel = {
  id: string;
  location_id: string;
  stocked_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
};

export type VendorInventoryItem = {
  id: string;
  title?: string | null;
  stocked_quantity?: number;
  location_levels?: VendorInventoryLocationLevel[];
};

export type VendorOrderItem = {
  id: string;
  title: string;
  quantity: number;
  thumbnail?: string | null;
  unit_price?: number;
  total?: number;
  item_total?: number;
  subtotal?: number;
  requires_shipping?: boolean;
  detail?: {
    unit_price?: number;
    fulfilled_quantity?: number;
    shipped_quantity?: number;
    delivered_quantity?: number;
  };
  offer?: {
    prices?: Array<{ amount?: number; currency_code?: string }>;
  };
};

export type VendorOrderSummary = {
  total?: number;
  subtotal?: number;
  current_order_total?: number;
  original_order_total?: number;
  accounting_total?: number;
  transaction_total?: number;
  paid_total?: number;
  refunded_total?: number;
  ordered_total?: number;
  fulfilled_total?: number;
  pending_difference?: number;
};

export type VendorOrderFulfillment = {
  id: string;
  location_id?: string;
  provider_id?: string;
  packed_at?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  canceled_at?: string | null;
  created_at?: string;
  labels?: Array<{
    tracking_number?: string;
    tracking_url?: string;
    label_url?: string;
  }>;
};

export type VendorOrder = {
  id: string;
  display_id?: number;
  status?: string;
  fulfillment_status?: string;
  payment_status?: string;
  currency_code: string;
  total?: number;
  subtotal?: number;
  item_total?: number;
  shipping_total?: number;
  tax_total?: number;
  discount_total?: number;
  summary?: VendorOrderSummary;
  fulfillments?: VendorOrderFulfillment[];
  created_at: string;
  email?: string | null;
  customer?: { first_name?: string | null; last_name?: string | null } | null;
  shipping_address?: {
    first_name?: string | null;
    last_name?: string | null;
    address_1?: string | null;
    address_2?: string | null;
    city?: string | null;
    province?: string | null;
    postal_code?: string | null;
    country_code?: string | null;
    phone?: string | null;
  } | null;
  items?: VendorOrderItem[];
  item_subtotal?: number;
  payment_collections?: Array<{
    amount?: number;
    authorized_amount?: number;
    captured_amount?: number;
    refunded_amount?: number;
    status?: string;
  }>;
};

// ---- Current seller context -------------------------------------------------

let currentSellerId: string | undefined;

export const setCurrentSellerId = (sellerId: string | undefined) => {
  currentSellerId = sellerId;
};

export const getCurrentSellerId = () => currentSellerId;

const DEFAULT_TIMEOUT_MS = 20000;

/**
 * The Medusa SDK's fetch never times out on its own, so a flaky connection
 * (or a request the backend never responds to) leaves the caller awaiting
 * forever with the UI stuck on a loading spinner. We race every request
 * against an AbortController-driven timeout so failures surface as a normal
 * error instead of an infinite hang.
 */
const withTimeout = <T>(
  run: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return run(controller.signal).finally(() => clearTimeout(timer));
};

const request = <T>(
  path: string,
  options?: {
    method?: 'GET' | 'POST' | 'DELETE';
    body?: Record<string, any>;
    query?: Record<string, any>;
    headers?: Record<string, any>;
    timeoutMs?: number;
  },
): Promise<T> => {
  const headers = { ...options?.headers };
  if (currentSellerId && !headers['x-seller-id']) {
    headers['x-seller-id'] = currentSellerId;
  }
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options ?? {};
  return withTimeout(
    signal =>
      vendorClient.client.fetch<T>(path, { ...fetchOptions, headers, signal }),
    timeoutMs,
  ).catch(err => {
    if (err?.name === 'AbortError') {
      throw new Error(
        'The request timed out. Please check your connection and try again.',
      );
    }
    throw err;
  });
};

// ---- Auth -----------------------------------------------------------------
// Vendor/marketplace routes authenticate the "member" actor type.

export const registerMemberAuthIdentity = async (
  email: string,
  password: string,
): Promise<string> => {
  const token = await vendorClient.auth.register('member', 'emailpass', {
    email,
    password,
  });
  return token as string;
};

export const loginMember = async (email: string, password: string) => {
  return vendorClient.auth.login('member', 'emailpass', { email, password });
};

export const logoutSeller = async () => {
  await vendorClient.auth.logout();
  setCurrentSellerId(undefined);
};

// ---- Seller -----------------------------------------------------------------

export type CreateSellerInput = {
  name: string;
  email: string;
  member_email: string;
  currency_code: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
};

export const createSeller = (input: CreateSellerInput) => {
  return request<{ seller: VendorSeller }>('/vendor/sellers', {
    method: 'POST',
    body: input,
  });
};

/**
 * Lists the sellers the currently authenticated member belongs to. This is
 * the one vendor route that doesn't require `x-seller-id` - it's how we
 * discover which seller id(s) to use in the first place.
 */
export const listMySellerMemberships = () => {
  return request<{ seller_members: VendorSellerMembership[]; count: number }>(
    '/vendor/sellers',
  );
};

export const getCurrentSeller = () => {
  return request<{ seller: VendorSeller }>('/vendor/sellers/me');
};

// ---- Shipping profiles -----------------------------------------------------

export const listShippingProfiles = () => {
  return request<{ shipping_profiles: VendorShippingProfile[] }>(
    '/vendor/shipping-profiles',
  );
};

export const createShippingProfile = (name: string, type = 'default') => {
  return request<{ shipping_profile: VendorShippingProfile }>(
    '/vendor/shipping-profiles',
    { method: 'POST', body: { name, type } },
  );
};

// ---- Shipping options -------------------------------------------------------

export const listShippingOptions = () => {
  return request<{ shipping_options: VendorShippingOption[] }>(
    '/vendor/shipping-options',
  );
};

export type CreateShippingOptionInput = {
  name: string;
  service_zone_id: string;
  shipping_profile_id: string;
  provider_id: string;
  price_type: 'flat' | 'calculated';
  prices: Array<{ currency_code: string; amount: number }>;
  type: VendorShippingOptionType;
};

export const createShippingOption = (input: CreateShippingOptionInput) => {
  return request<{ shipping_option: VendorShippingOption }>(
    '/vendor/shipping-options',
    { method: 'POST', body: input },
  );
};

// ---- Stock locations / fulfillment ------------------------------------------

export const listStockLocations = () => {
  return request<{ stock_locations: VendorStockLocation[] }>(
    '/vendor/stock-locations',
  );
};

export const createStockLocation = (name: string) => {
  return request<{ stock_location: VendorStockLocation }>(
    '/vendor/stock-locations',
    { method: 'POST', body: { name } },
  );
};

/** Fetches a stock location with its fulfillment sets (and their service
 * zones) expanded - the create/update endpoints don't return this relation
 * by default. */
export const getStockLocationWithFulfillment = (stockLocationId: string) => {
  return request<{ stock_location: VendorStockLocation }>(
    `/vendor/stock-locations/${stockLocationId}`,
    { query: { fields: '*fulfillment_sets,*fulfillment_sets.service_zones' } },
  );
};

export const createStockLocationFulfillmentSet = (
  stockLocationId: string,
  name: string,
  type = 'shipping',
) => {
  return request<{ stock_location: VendorStockLocation }>(
    `/vendor/stock-locations/${stockLocationId}/fulfillment-sets`,
    { method: 'POST', body: { name, type } },
  );
};

export const addStockLocationFulfillmentProviders = (
  stockLocationId: string,
  providerIds: string[],
) => {
  return request<{ stock_location: VendorStockLocation }>(
    `/vendor/stock-locations/${stockLocationId}/fulfillment-providers`,
    { method: 'POST', body: { add: providerIds } },
  );
};

export const listFulfillmentProviders = () => {
  return request<{ fulfillment_providers: VendorFulfillmentProvider[] }>(
    '/vendor/fulfillment-providers',
  );
};

export const createServiceZone = (
  fulfillmentSetId: string,
  name: string,
  geoZones?: Array<{ type: 'country'; country_code: string }>,
) => {
  return request<{ fulfillment_set: VendorFulfillmentSet }>(
    `/vendor/fulfillment-sets/${fulfillmentSetId}/service-zones`,
    { method: 'POST', body: { name, geo_zones: geoZones } },
  );
};

// ---- Regions -----------------------------------------------------------------

export const listVendorRegions = () => {
  return request<{ regions: VendorRegion[] }>('/vendor/regions');
};

// ---- Sales channels ----------------------------------------------------------

export const listSalesChannels = () => {
  return request<{ sales_channels: VendorSalesChannel[]; count: number }>(
    '/vendor/sales-channels',
  );
};

/**
 * Every product needs at least one sales channel to be purchasable. Rather
 * than making the seller pick one, we silently attach the marketplace's
 * default channel (falling back to whichever channel comes first) so
 * products actually show up for customers without an extra step.
 */
export const resolveDefaultSalesChannelId = async (): Promise<
  string | undefined
> => {
  const { sales_channels } = await listSalesChannels();
  const enabled = sales_channels.filter(channel => !channel.is_disabled);
  const byName = enabled.find(
    channel => channel.name.toLowerCase() === 'default sales channel',
  );
  return (byName ?? enabled[0] ?? sales_channels[0])?.id;
};

// ---- Product categories -----------------------------------------------------
// Categories are a marketplace-wide taxonomy, not seller-specific, so we
// reuse the public Store API to list them instead of a vendor-only route.

export const listProductCategories = async (): Promise<
  VendorProductCategory[]
> => {
  const { product_categories } = await apiClient.store.category.list({
    limit: 100,
    fields: 'id,name',
  });
  return product_categories.map(category => ({
    id: category.id,
    name: category.name,
  }));
};

// ---- Products -----------------------------------------------------------------

export type CreateVendorProductInput = {
  title: string;
  description?: string;
  status: 'draft' | 'proposed';
  images?: Array<{ url: string }>;
  thumbnail?: string;
  // The vendor create-product endpoint rejects an unknown `sales_channel_id`
  // field name - it has to be the `sales_channels` relation array.
  sales_channels?: Array<{ id: string }>;
  categories?: Array<{ id: string }>;
  // Note: the Vendor Create Product API doesn't accept a shipping_profile_id -
  // Mercur automatically assigns the seller's own default shipping profile
  // to every product they create.
  options: Array<{ title: string; values: string[] }>;
  variants: Array<{
    title: string;
    options: Record<string, string>;
    prices: Array<{ currency_code: string; amount: number }>;
    // We default this to `false` so a seller never has to think about
    // stock locations/quantities just to list a product - the item is
    // simply always available. Sellers who do want inventory tracking can
    // turn it on and set a quantity right from the upload screen.
    manage_inventory?: boolean;
    sku?: string;
    // Customs/shipping origin - defaults to Tanzania for every variant since
    // this marketplace's sellers are locally based. Editable later per
    // variant from the edit-variant screen.
    origin_country?: string;
  }>;
};

export const createVendorProduct = (input: CreateVendorProductInput) => {
  return request<{ product: VendorProduct }>('/vendor/products', {
    method: 'POST',
    body: input,
  });
};

export const getVendorProduct = (
  productId: string,
  fields = '*variants,*variants.inventory_items,*categories',
) => {
  return request<{ product: VendorProduct }>(
    `/vendor/products/${productId}`,
    { query: { fields } },
  );
};

/**
 * Applies partial updates to one or more of a product's variants WITHOUT
 * deleting the ones you don't mention.
 *
 * `POST /vendor/products/:id` treats whatever `variants` array you send as
 * the *complete, authoritative* list for the product - any existing variant
 * whose id isn't included gets silently hard-deleted. To safely patch just
 * a subset of variants (e.g. one variant's thumbnail or customs details),
 * we first fetch every current variant id and pass the untouched ones
 * through unmodified (just their `id`) alongside the ones we're actually
 * changing, so nothing gets dropped.
 */
export const updateVendorProductVariants = async (
  productId: string,
  updates: Array<{ id: string } & Record<string, unknown>>,
): Promise<{ product: VendorProduct }> => {
  const { product } = await getVendorProduct(productId, '*variants');
  const updatesById = new Map(updates.map(update => [update.id, update]));
  const variants = (product.variants ?? []).map(
    variant => updatesById.get(variant.id) ?? { id: variant.id },
  );
  return request<{ product: VendorProduct }>(`/vendor/products/${productId}`, {
    method: 'POST',
    body: { variants },
  });
};

/**
 * The create-product endpoint doesn't accept a `thumbnail` on individual
 * variants (it 400s), so per-variant images are assigned in a follow-up
 * update call once the variants (and their ids) actually exist.
 */
export const updateVendorProductVariantThumbnails = (
  productId: string,
  variants: Array<{ id: string; thumbnail: string }>,
) => updateVendorProductVariants(productId, variants);

export const listVendorProducts = (query?: { limit?: number; offset?: number }) => {
  return request<{ products: VendorProduct[]; count: number }>(
    '/vendor/products',
    { query },
  );
};

export type UpdateVendorProductInput = {
  title?: string;
  description?: string;
  categories?: Array<{ id: string }>;
};

export const updateVendorProduct = (
  productId: string,
  input: UpdateVendorProductInput,
) => {
  return request<{ product: VendorProduct }>(`/vendor/products/${productId}`, {
    method: 'POST',
    body: input,
  });
};

export type UpdateVendorProductVariantInput = {
  sku?: string | null;
  material?: string | null;
  width?: number | null;
  length?: number | null;
  height?: number | null;
  weight?: number | null;
  mid_code?: string | null;
  hs_code?: string | null;
  origin_country?: string | null;
};

export const updateVendorProductVariant = (
  productId: string,
  variantId: string,
  patch: UpdateVendorProductVariantInput,
) => updateVendorProductVariants(productId, [{ id: variantId, ...patch }]);

// ---- Inventory -----------------------------------------------------------------

export const setInventoryLocationLevel = (
  inventoryItemId: string,
  locationId: string,
  stockedQuantity: number,
) => {
  return request<{ inventory_item: VendorInventoryItem }>(
    `/vendor/inventory-items/${inventoryItemId}/location-levels`,
    {
      method: 'POST',
      body: { location_id: locationId, stocked_quantity: stockedQuantity },
    },
  );
};

// ---- Uploads -----------------------------------------------------------------

export type LocalFile = {
  uri: string;
  name: string;
  type: string;
};

export const uploadVendorImages = async (
  files: LocalFile[],
): Promise<{ files: Array<{ id: string; url: string }> }> => {
  const form = new FormData();
  files.forEach(file => {
    // React Native's FormData accepts { uri, name, type } file descriptors.
    form.append('files', file as unknown as Blob);
  });

  return request('/vendor/uploads', {
    method: 'POST',
    headers: {
      'content-type': null,
    },
    body: form as unknown as Record<string, any>,
    // Multiple photos take longer to read off disk and upload than a plain
    // JSON call, so give this one more headroom before we give up.
    timeoutMs: 60000,
  });
};

// ---- Orders -----------------------------------------------------------------
// Use backend defaults (`summary.*`, `items.*`, etc.). Custom `fields=` broke
// list/retrieve on production and stripped totals when it did respond.

export const listVendorOrders = (query?: {
  limit?: number;
  offset?: number;
  fulfillment_status?: string;
}) => {
  return request<{ orders: VendorOrder[]; count: number }>('/vendor/orders', {
    query: { order: '-created_at', ...query },
  });
};

export const getVendorOrder = (orderId: string) => {
  return request<{ order: VendorOrder }>(`/vendor/orders/${orderId}`);
};

export const createVendorOrderFulfillment = (
  orderId: string,
  input: {
    items: Array<{ id: string; quantity: number }>;
    requires_shipping: boolean;
    location_id: string;
  },
) => {
  return request<{ fulfillment: VendorOrderFulfillment }>(
    `/vendor/orders/${orderId}/fulfillments`,
    { method: 'POST', body: input },
  );
};

export const createVendorOrderShipment = (
  orderId: string,
  fulfillmentId: string,
  input: {
    items: Array<{ id: string; quantity: number }>;
    labels?: Array<{
      tracking_number: string;
      tracking_url: string;
      label_url: string;
    }>;
  },
) => {
  return request<{ order: VendorOrder }>(
    `/vendor/orders/${orderId}/fulfillments/${fulfillmentId}/shipments`,
    { method: 'POST', body: input },
  );
};

export const markVendorFulfillmentDelivered = (
  orderId: string,
  fulfillmentId: string,
) => {
  return request<{ order: VendorOrder }>(
    `/vendor/orders/${orderId}/fulfillments/${fulfillmentId}/mark-as-delivered`,
    { method: 'POST' },
  );
};

export const completeVendorOrder = (orderId: string) => {
  return request<{ order: VendorOrder }>(`/vendor/orders/${orderId}/complete`, {
    method: 'POST',
  });
};
