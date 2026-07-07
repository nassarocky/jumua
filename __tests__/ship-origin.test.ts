import {
  getDeliveryEstimateMessages,
  getProductShipOrigin,
} from '../app/utils/ship-origin';

describe('getProductShipOrigin', () => {
  it('uses product origin_country first', () => {
    const info = getProductShipOrigin({
      origin_country: 'tz',
      metadata: { ship_from: 'cn' },
      variants: [{ origin_country: 'cn' }],
    } as any);

    expect(info.origin).toBe('tz');
  });

  it('uses product metadata when product origin is empty', () => {
    const info = getProductShipOrigin({
      origin_country: null,
      metadata: { ship_from: 'cn' },
    } as any);

    expect(info.origin).toBe('cn');
  });

  it('uses selected variant origin on product detail', () => {
    const info = getProductShipOrigin(
      {
        origin_country: null,
        metadata: null,
        variants: [
          { id: 'v1', origin_country: 'cn' },
          { id: 'v2', origin_country: 'tz' },
        ],
      } as any,
      { selectedVariant: { id: 'v2', origin_country: 'tz' } as any },
    );

    expect(info.origin).toBe('tz');
  });

  it('uses any variant origin on product cards', () => {
    const info = getProductShipOrigin({
      origin_country: null,
      metadata: null,
      variants: [
        { origin_country: null },
        { origin_country: 'tz' },
      ],
    } as any);

    expect(info.origin).toBe('tz');
    expect(info.code).toBe('TZ');
  });

  it('defaults to china when no origin data exists', () => {
    const info = getProductShipOrigin({
      origin_country: null,
      metadata: null,
      variants: [{ origin_country: null }],
    } as any);

    expect(info.origin).toBe('cn');
    expect(info.minDays).toBe(25);
    expect(info.maxDays).toBe(35);
  });

  it('returns same-day delivery messaging for tanzania', () => {
    const info = getProductShipOrigin({
      variants: [{ origin_country: 'tz' }],
    } as any);

    expect(info.origin).toBe('tz');
    expect(getDeliveryEstimateMessages(info).estimate).toBe('same-day-delivery');
  });
});
