export function normalizeCustomerEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidCustomerEmail(value: string) {
  return /^\S+@\S+\.\S+$/.test(normalizeCustomerEmail(value));
}

export function isValidCustomerOtp(value: string) {
  return /^\d{6}$/.test(value.trim());
}
