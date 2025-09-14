// api/tryon/status.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const BASE = process.env.FASHN_BASE ?? 'https://api.fashn.ai/v1';
const KEY  = process.env.FASHN_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');
  if (!KEY) return res.status(500).json({ error: 'ConfigError', message: 'FASHN_API_KEY is missing' });

  const id = String(req.query.id || '').trim();
  if (!id) return res.status(400).json({ error: 'BadRequest', message: 'Missing id' });

  try {
    const r = await fetch(`${BASE}/predictions/${id}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${KEY}` }
    });

    const retry = r.headers.get('Retry-After');
    if (retry) res.setHeader('Retry-After', retry);

    const text = await r.text();
    res.status(r.status).send(text);
  } catch (e: any) {
    res.status(500).json({ error: 'ProxyError', message: e?.message || 'Failed to call FASHN /predictions/:id' });
  }
}
