import type { VercelRequest, VercelResponse } from '@vercel/node';

const FASHN_BASE = 'https://api.fashn.ai/v1';

function cors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');          // при желании ограничьте доменом
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST,OPTIONS');
    res.status(405).json({ error: 'MethodNotAllowed', message: 'Use POST /api/tryon/run' });
    return;
  }

  const apiKey = process.env.FASHN_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'ServerMisconfig', message: 'FASHN_API_KEY is missing' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    const r = await fetch(`${FASHN_BASE}/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body,
    });

    // пробрасываем тело/статус как есть
    const text = await r.text();
    res.status(r.status).send(text);
  } catch (e: any) {
    res.status(502).json({ error: 'UpstreamError', message: e?.message || 'Fetch to FASHN failed' });
  }
}
