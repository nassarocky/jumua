import Medusa from '@medusajs/js-sdk';
import { PUBLISHABLE_API_KEY } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiUrl } from './client';

// Vendor/marketplace routes authenticate their own actor type ("member"),
// separate from the storefront customer. We use a dedicated SDK instance +
// token storage key so a person can be signed in as a customer and a seller
// (member) at the same time without either session overwriting the other.
export const SELLER_AUTH_TOKEN_KEY = 'seller_auth_token';

const publishableKey = PUBLISHABLE_API_KEY || '';

const vendorClient = new Medusa({
  baseUrl: apiUrl,
  publishableKey: publishableKey,
  auth: {
    type: 'jwt',
    jwtTokenStorageMethod: 'custom',
    jwtTokenStorageKey: SELLER_AUTH_TOKEN_KEY,
    storage: AsyncStorage,
  },
});

export default vendorClient;
