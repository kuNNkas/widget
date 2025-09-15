import type { VercelRequest, VercelResponse } from '@vercel/node';

const FASHN_BASE = 'https://api.fashn.ai/v1';

function cors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');          // при желании ограничьте доменом
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET,OPTIONS');
    res.status(405).json({ error: 'MethodNotAllowed', message: 'Use GET /api/tryon/status/:id' });
    return;
  }

  const apiKey = process.env.FASHN_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'ServerMisconfig', message: 'FASHN_API_KEY is missing' });
    return;
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: 'BadRequest', message: 'status id is required' });
    return;
  }

  try {
    // у FASHN корректный статус-эндпоинт — /predictions/:id
    const r = await fetch(`${FASHN_BASE}/predictions/${id}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    const text = await r.text();
    res.status(r.status).send(text);
  } catch (e: any) {
    res.status(502).json({ error: 'UpstreamError', message: e?.message || 'Fetch to FASHN failed' });
  }
}
