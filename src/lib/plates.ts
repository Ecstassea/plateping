export function normalizePlate(input: string): string {
  return input.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function displayPlate(normalized: string): string {
  const match = normalized.match(/^([A-Z]{3})(\d{3,4})$/);
  if (match) {
    return `${match[1]} ${match[2]}`;
  }
  return normalized;
}

export function isPlausiblePlate(normalized: string): boolean {
  return /^[A-Z0-9]{4,10}$/.test(normalized);
}

export const ROBOT_OFFENCE = "Traffic light / robot camera listing";
export const ESTIMATED_FINE = "USD 15–30 deposit (verify with ZRP)";
export const ZRP_REPORT =
  "Report to ZRP National Traffic at Mkushi Academy, or call 0242 703631 / WhatsApp 0712 800 197. Pay only at a police station. Never pay a fine through this app.";
