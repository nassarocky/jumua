/**
 * Quick sanity checks for vendor order amount parsing.
 * Run: node scripts/test-vendor-order-amounts.mjs
 */

const normalizeAmount = value => {
  if (value == null) return undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (typeof value === 'object') {
    const record = value;
    if (typeof record.toJSON === 'function') {
      const jsonValue = record.toJSON();
      if (jsonValue !== value) return normalizeAmount(jsonValue);
    }
    if (typeof record.toNumber === 'function') {
      const parsed = record.toNumber();
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    if ('numeric' in record) return normalizeAmount(record.numeric);
    if ('amount' in record) return normalizeAmount(record.amount);
    if ('value' in record) return normalizeAmount(record.value);
    if (record.raw && typeof record.raw === 'object') {
      return normalizeAmount(record.raw.value);
    }
  }
  return undefined;
};

const tests = [
  ['number', 5000, 5000],
  ['string', '7500', 7500],
  ['numeric object', { numeric: 4200 }, 4200],
  ['raw value object', { value: '9900' }, 9900],
  ['nested raw summary', { raw: { value: '12000' } }, 12000],
  ['toJSON object', { toJSON: () => 8800 }, 8800],
];

let failed = 0;
for (const [name, input, expected] of tests) {
  const actual = normalizeAmount(input);
  if (actual !== expected) {
    console.error(`FAIL ${name}: expected ${expected}, got ${actual}`);
    failed += 1;
  } else {
    console.log(`PASS ${name}`);
  }
}

process.exit(failed === 0 ? 0 : 1);
