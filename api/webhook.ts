import type { VercelRequest, VercelResponse } from '@vercel/node';
import { grantEntitlement } from './_entitlements';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Mock webhook: accept any payload, confirm and grant entitlement
  const { chargeId = `mock-${Date.now()}` } = req.body || {};
  grantEntitlement(chargeId);
  return res.status(200).json({ status: 'confirmed', chargeId });
}
