export const PHONE_EMAIL_DOMAIN = '@jumua.co.tz';

export const normalizePhoneNumber = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');

  if (digits.startsWith('255') && digits.length >= 12) {
    return `0${digits.slice(3)}`;
  }

  if (digits.length === 9 && !digits.startsWith('0')) {
    return `0${digits}`;
  }

  return digits;
};

export const phoneToAccountEmail = (phone: string): string => {
  const normalized = normalizePhoneNumber(phone);
  return `${normalized}${PHONE_EMAIL_DOMAIN}`;
};

export const isValidPhoneNumber = (phone: string): boolean => {
  const normalized = normalizePhoneNumber(phone);
  return normalized.length >= 9;
};

export const resolveCheckoutEmail = ({
  phone,
  customerEmail,
  cartEmail,
}: {
  phone: string;
  customerEmail?: string | null;
  cartEmail?: string | null;
}): string => {
  if (customerEmail) {
    return customerEmail;
  }
  if (cartEmail) {
    return cartEmail;
  }
  if (isValidPhoneNumber(phone)) {
    return phoneToAccountEmail(phone);
  }
  return '';
};

export const phonesMatch = (left: string, right: string): boolean =>
  normalizePhoneNumber(left) === normalizePhoneNumber(right);

export const emailsMatchForPhone = (
  email: string | null | undefined,
  phone: string,
): boolean => {
  if (!email) {
    return false;
  }

  return email.toLowerCase() === phoneToAccountEmail(phone).toLowerCase();
};
