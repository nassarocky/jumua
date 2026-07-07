/**
 * Zero-configuration shipping setup for sellers.
 *
 * To keep "Upload Product" a one-screen flow, we never ask the seller to
 * pick a shipping profile or configure shipping options. Instead:
 *
 *  1. We reuse (or create) the seller's default Shipping Profile - Mercur
 *     automatically assigns a seller's own default shipping profile to
 *     every product they create.
 *  2. We reuse (or create) a single flat-rate, 0-amount Shipping Option
 *     named "No Delivery" (grouped under a shipping option type called
 *     "No Shipping"). This option requires a stock location, fulfillment
 *     set and service zone to exist, which we also create on first use.
 *
 * Every step first checks whether the resource already exists before
 * creating it, so this is safe to call before every product upload -
 * after the first successful run it's just a couple of cheap GET requests.
 */
import {
  addStockLocationFulfillmentProviders,
  createServiceZone,
  createShippingOption,
  createShippingProfile,
  createStockLocation,
  createStockLocationFulfillmentSet,
  getStockLocationWithFulfillment,
  listFulfillmentProviders,
  listShippingOptions,
  listShippingProfiles,
  listStockLocations,
  listVendorRegions,
  type VendorFulfillmentSet,
  type VendorShippingOption,
  type VendorShippingProfile,
  type VendorStockLocation,
} from '@api/vendor-api';

export const NO_DELIVERY_OPTION_NAME = 'No Delivery';
export const NO_SHIPPING_TYPE_CODE = 'no-shipping';

const getOrCreateDefaultShippingProfile =
  async (): Promise<VendorShippingProfile> => {
    const { shipping_profiles } = await listShippingProfiles();
    const existingDefault = shipping_profiles.find(p => p.type === 'default');
    if (existingDefault) {
      return existingDefault;
    }
    if (shipping_profiles.length > 0) {
      return shipping_profiles[0];
    }

    const { shipping_profile } = await createShippingProfile(
      'Default Shipping',
      'default',
    );
    return shipping_profile;
  };

const getOrCreateStockLocation = async (
  sellerName: string,
): Promise<VendorStockLocation> => {
  const { stock_locations } = await listStockLocations();
  if (stock_locations.length > 0) {
    return stock_locations[0];
  }

  const { stock_location } = await createStockLocation(
    `${sellerName} Warehouse`.trim() || 'Default Warehouse',
  );
  return stock_location;
};

const getOrCreateFulfillmentSet = async (
  location: VendorStockLocation,
): Promise<VendorFulfillmentSet> => {
  // The list/create stock-location endpoints don't expand `fulfillment_sets`
  // by default, so always check via a dedicated fetch that requests the
  // relation explicitly before deciding whether we need to create one.
  const { stock_location } = await getStockLocationWithFulfillment(
    location.id,
  );
  const existing = stock_location.fulfillment_sets?.find(
    set => set.type === 'shipping',
  );
  if (existing) {
    return existing;
  }

  await createStockLocationFulfillmentSet(
    location.id,
    'Default fulfillment',
    'shipping',
  );

  const refreshed = await getStockLocationWithFulfillment(location.id);
  const fulfillmentSet = refreshed.stock_location.fulfillment_sets?.find(
    set => set.type === 'shipping',
  );
  if (!fulfillmentSet) {
    throw new Error('Failed to create a fulfillment set for the seller.');
  }
  return fulfillmentSet;
};

const getAllRegionCodes = async () => {
  try {
    const { regions } = await listVendorRegions();
    const currencyCodes = new Set<string>();
    const countryCodes = new Set<string>();

    regions.forEach(region => {
      if (region.currency_code) {
        currencyCodes.add(region.currency_code.toLowerCase());
      }
      region.countries?.forEach(country => {
        if (country.iso_2) {
          countryCodes.add(country.iso_2.toLowerCase());
        }
      });
    });

    return {
      currencyCodes: Array.from(currencyCodes),
      countryCodes: Array.from(countryCodes),
    };
  } catch {
    return { currencyCodes: [], countryCodes: [] };
  }
};

const getOrCreateServiceZone = async (
  fulfillmentSet: VendorFulfillmentSet,
  countryCodes: string[],
) => {
  if (fulfillmentSet.service_zones && fulfillmentSet.service_zones.length > 0) {
    return fulfillmentSet.service_zones[0];
  }

  const geoZones = countryCodes.map(country_code => ({
    type: 'country' as const,
    country_code,
  }));

  const { fulfillment_set } = await createServiceZone(
    fulfillmentSet.id,
    'Everywhere',
    geoZones.length > 0 ? geoZones : undefined,
  );

  const zone = fulfillment_set.service_zones?.[0];
  if (!zone) {
    throw new Error('Failed to create a service zone for the seller.');
  }
  return zone;
};

const pickFulfillmentProviderId = async (): Promise<string | undefined> => {
  const { fulfillment_providers } = await listFulfillmentProviders();
  if (!fulfillment_providers.length) {
    return undefined;
  }
  const manual = fulfillment_providers.find(p => p.id.includes('manual'));
  return (manual ?? fulfillment_providers[0]).id;
};

export type EnsureNoDeliveryResult = {
  shippingProfile: VendorShippingProfile;
  shippingOption: VendorShippingOption;
  stockLocationId: string;
};

/**
 * Ensures the seller has a default shipping profile and a 0-cost
 * "No Delivery" shipping option ready to use, creating any missing
 * infrastructure (stock location, fulfillment set, service zone) along
 * the way. Safe to call every time before uploading a product.
 */
export const ensureNoDeliveryShippingOption = async (
  sellerName: string,
): Promise<EnsureNoDeliveryResult> => {
  const shippingProfile = await getOrCreateDefaultShippingProfile();

  const { shipping_options } = await listShippingOptions();
  const existing = shipping_options.find(
    option =>
      option.name === NO_DELIVERY_OPTION_NAME ||
      option.type?.code === NO_SHIPPING_TYPE_CODE,
  );
  const stockLocation = await getOrCreateStockLocation(sellerName);
  if (existing) {
    return {
      shippingProfile,
      shippingOption: existing,
      stockLocationId: stockLocation.id,
    };
  }

  const fulfillmentSet = await getOrCreateFulfillmentSet(stockLocation);
  const { currencyCodes, countryCodes } = await getAllRegionCodes();
  await getOrCreateServiceZone(fulfillmentSet, countryCodes);
  // Re-fetch so the service zone we just ensured is reflected before we
  // create the shipping option against it.
  const refreshedLocation = await getStockLocationWithFulfillment(
    stockLocation.id,
  );
  const refreshedSet = refreshedLocation.stock_location.fulfillment_sets?.find(
    set => set.id === fulfillmentSet.id,
  );
  const serviceZone = refreshedSet?.service_zones?.[0];
  if (!serviceZone) {
    throw new Error('Failed to resolve a service zone for the seller.');
  }

  let providerId = await pickFulfillmentProviderId();
  if (!providerId) {
    throw new Error(
      'No fulfillment provider is configured for this marketplace yet. Ask the marketplace admin to enable one.',
    );
  }

  try {
    await addStockLocationFulfillmentProviders(stockLocation.id, [
      providerId,
    ]);
  } catch {
    // Provider may already be linked to this location - safe to continue.
  }

  const prices = (currencyCodes.length > 0 ? currencyCodes : ['usd']).map(
    currency_code => ({ currency_code, amount: 0 }),
  );

  const { shipping_option } = await createShippingOption({
    name: NO_DELIVERY_OPTION_NAME,
    service_zone_id: serviceZone.id,
    shipping_profile_id: shippingProfile.id,
    provider_id: providerId,
    price_type: 'flat',
    prices,
    type: {
      label: 'No Shipping',
      description:
        'No delivery included - buyer arranges pickup or delivery directly with the seller.',
      code: NO_SHIPPING_TYPE_CODE,
    },
  });

  return {
    shippingProfile,
    shippingOption: shipping_option,
    stockLocationId: stockLocation.id,
  };
};
