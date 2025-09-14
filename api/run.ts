import type { VercelRequest, VercelResponse } from '@vercel/node';

const FASHN_BASE = process.env.FASHN_BASE || 'https://api.fashn.ai/v1';
const API_KEY = process.env.FASHN_API_KEY!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  if (!API_KEY) return res.status(500).json({ error: 'ServerMisconfig', message: 'No API key configured' });

  try {
    const r = await fetch(`${FASHN_BASE}/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body ?? {})
    });

    // пробрасываем 429 с Retry-After, чтобы фронт мог подождать
    if (r.status === 429) {
      const retry = r.headers.get('Retry-After') ?? '15';
      res.setHeader('Retry-After', retry);
    }

    const text = await r.text();
    res.status(r.status).send(text);
  } catch (e: any) {
    res.status(500).json({ error: 'ProxyError', message: e?.message || 'Unknown error' });
  }
}
