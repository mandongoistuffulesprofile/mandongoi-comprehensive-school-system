export function normalizeKenyanPhone(input: string): string {
  let cleaned = input.replace(/[\s\-\(\)]/g, '');

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  }

  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '254' + cleaned.slice(1);
  }

  if (cleaned.startsWith('254') && cleaned.length === 12) {
    return cleaned;
  }

  if (cleaned.startsWith('7') && cleaned.length === 9) {
    return '254' + cleaned;
  }

  if (cleaned.startsWith('1') && cleaned.length === 9) {
    return '254' + cleaned;
  }

  throw new Error(`Invalid Kenyan phone number: ${input}. Expected 07xxxxxxxx or 254xxxxxxxx format.`);
}

export function validateSenderId(senderId: string): string {
  const trimmed = senderId.trim();
  if (trimmed.length > 11) {
    throw new Error(`Sender ID must be 11 characters or fewer. Got ${trimmed.length}.`);
  }
  if (!/^[a-zA-Z0-9\s]+$/.test(trimmed)) {
    throw new Error(`Sender ID must be alphanumeric. Got: ${trimmed}`);
  }
  return trimmed;
}

export function validatePhoneBatch(phones: string[]): string[] {
  return phones.map((p) => normalizeKenyanPhone(p));
}
