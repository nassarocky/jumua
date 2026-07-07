import {
  ALGOLIA_APP_ID,
  ALGOLIA_PRODUCTS_INDEX,
  ALGOLIA_SEARCH_KEY,
} from '@env';

const appId = ALGOLIA_APP_ID;
const searchKey = ALGOLIA_SEARCH_KEY;
const productsIndex = ALGOLIA_PRODUCTS_INDEX || 'products';

export type AlgoliaProductHit = {
  objectID: string;
  id?: string;
  product_id?: string;
  title?: string;
  handle?: string;
  thumbnail?: string;
};

export type AlgoliaProductSearchResponse = {
  hits: AlgoliaProductHit[];
  page: number;
  nbPages: number;
};

type SearchProductsParams = {
  query: string;
  page?: number;
  hitsPerPage?: number;
};

export const isAlgoliaConfigured = Boolean(appId && searchKey && productsIndex);

export const getProductIdFromHit = (hit: AlgoliaProductHit) =>
  hit.product_id || hit.id || hit.objectID;

export const searchAlgoliaProducts = async ({
  query,
  page = 0,
  hitsPerPage = 12,
}: SearchProductsParams): Promise<AlgoliaProductSearchResponse> => {
  if (!isAlgoliaConfigured) {
    throw new Error('Algolia is not configured');
  }

  const response = await fetch(
    `https://${appId}-dsn.algolia.net/1/indexes/${encodeURIComponent(
      productsIndex,
    )}/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Algolia-API-Key': searchKey,
        'X-Algolia-Application-Id': appId,
      },
      body: JSON.stringify({
        query,
        page,
        hitsPerPage,
      }),
    },
  );

  if (!response.ok) {
    throw new Error('Failed to search products');
  }

  return response.json();
};
