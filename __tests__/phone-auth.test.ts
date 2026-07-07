import {
  isValidPhoneNumber,
  normalizePhoneNumber,
  phoneToAccountEmail,
  phonesMatch,
  resolveCheckoutEmail,
} from '../app/utils/phone-auth';

describe('phone auth utils', () => {
  it('converts phone to account email', () => {
    expect(phoneToAccountEmail('0758422100')).toBe('0758422100@jumua.co.tz');
    expect(phoneToAccountEmail('758422100')).toBe('0758422100@jumua.co.tz');
    expect(phoneToAccountEmail('+255 758 422 100')).toBe('0758422100@jumua.co.tz');
  });

  it('validates phone numbers', () => {
    expect(isValidPhoneNumber('0758422100')).toBe(true);
    expect(isValidPhoneNumber('123')).toBe(false);
  });

  it('resolves checkout email from phone when no account email exists', () => {
    expect(
      resolveCheckoutEmail({
        phone: '0765908208',
      }),
    ).toBe('0765908208@jumua.co.tz');
  });

  it('prefers customer email over generated phone email', () => {
    expect(
      resolveCheckoutEmail({
        phone: '0765908208',
        customerEmail: 'user@example.com',
      }),
    ).toBe('user@example.com');
  });

  it('normalizes Tanzania phone numbers consistently', () => {
    expect(normalizePhoneNumber('076-590-8208')).toBe('0765908208');
    expect(normalizePhoneNumber('765908208')).toBe('0765908208');
    expect(normalizePhoneNumber('255765908208')).toBe('0765908208');
  });

  it('matches equivalent phone formats', () => {
    expect(phonesMatch('0758422100', '758422100')).toBe(true);
    expect(phonesMatch('+255758422100', '0758422100')).toBe(true);
  });
});
