const granted = new Set<string>();

export function grantEntitlement(chargeId: string) {
  if (chargeId) granted.add(chargeId);
}

export function hasEntitlement(chargeId: string): boolean {
  if (!chargeId) return false;
  return granted.has(chargeId);
}
