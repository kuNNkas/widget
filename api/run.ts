// api/tryon/run.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const BASE = process.env.FASHN_BASE ?? 'https://api.fashn.ai/v1';
const KEY  = process.env.FASHN_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  if (!KEY) return res.status(500).json({ error: 'ConfigError', message: 'FASHN_API_KEY is missing' });

  try {
    const r = await fetch(`${BASE}/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body ?? {})
    });

    // пробрасываем лимит, чтобы фронт мог подождать
    const retry = r.headers.get('Retry-After');
    if (retry) res.setHeader('Retry-After', retry);

    const text = await r.text();
    res.status(r.status).send(text);
  } catch (e: any) {
    res.status(500).json({ error: 'ProxyError', message: e?.message || 'Failed to call FASHN /run' });
  }
}
