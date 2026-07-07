/**
 * Unit tests for product units sold parsing logic.
 *
 * Usage: node scripts/test-product-units-sold.mjs
 */

const getProductUnitsSold = product => {
  const metadata = product.metadata;
  const raw = product.units_sold ?? metadata?.units_sold;
  if (raw == null || raw === '') {
    return null;
  }

  const parsed =
    typeof raw === 'number' ? raw : Number.parseInt(String(raw).trim(), 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
};

const tests = [
  { product: { units_sold: 5 }, expected: 5 },
  { product: { units_sold: 1 }, expected: 1 },
  { product: { units_sold: '39' }, expected: 39 },
  { product: { units_sold: undefined, metadata: { units_sold: 2 } }, expected: 2 },
  { product: { units_sold: 0 }, expected: null },
  { product: { units_sold: undefined }, expected: null },
  { product: { units_sold: null }, expected: null },
  { product: { units_sold: '' }, expected: null },
  { product: { units_sold: 'abc' }, expected: null },
];

let failed = 0;

for (const [index, test] of tests.entries()) {
  const actual = getProductUnitsSold(test.product);
  if (actual !== test.expected) {
    failed += 1;
    console.error(
      `Test ${index + 1} failed: expected ${test.expected}, got ${actual}`,
    );
  }
}

if (failed > 0) {
  console.error(`${failed} test(s) failed`);
  process.exit(1);
}

console.log(`All ${tests.length} tests passed.`);
