import type { VercelRequest, VercelResponse } from '@vercel/node';
import { hasEntitlement } from './_entitlements';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { chargeId } = req.query;
  const pro = hasEntitlement(typeof chargeId === 'string' ? chargeId : '');
  return res.status(200).json({ plan: pro ? 'pro' : 'free', entitlement: pro ? 'single-render' : null });
}
