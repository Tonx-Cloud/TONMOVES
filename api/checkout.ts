import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Mock: Mercado Pago PIX charge
  const { amount = 19.9 } = req.body || {};
  const payload = {
    status: 'pending',
    pix: {
      amount,
      copy: '000201010212...',
      qr: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...',
    },
    chargeId: `mock-${Date.now()}`,
  };

  return res.status(200).json(payload);
}
