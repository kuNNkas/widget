import type { NextApiRequest, NextApiResponse } from 'next';

export const runtime = 'nodejs18.x';

const ORIGIN = process.env.ALLOWED_ORIGIN ?? '*';
const FASHN_BASE = 'https://api.fashn.ai/v1';

function cors(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('API called:', req.method, req.url);
  
  cors(res);
  
  // Preflight
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request');
    return res.status(204).end();
  }
  
  if (req.method !== 'POST') {
    console.log('Not POST method:', req.method);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.FASHN_API_KEY;
  console.log('API key exists:', !!apiKey);
  
  if (!apiKey) {
    console.log('No API key');
    return res.status(500).json({ error: 'Server misconfigured: FASHN_API_KEY is missing' });
  }

  try {
    const body = req.body;
    console.log('Request body received:', Object.keys(body || {}));
    console.log('Making upstream request to:', `${FASHN_BASE}/run`);

    const upstream = await fetch(`${FASHN_BASE}/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('Upstream status:', upstream.status);
    const text = await upstream.text();
    console.log('Upstream response length:', text.length);

    // Передаем Retry-After если есть
    if (upstream.headers.get('Retry-After')) {
      res.setHeader('Retry-After', upstream.headers.get('Retry-After')!);
    }

    // Пытаемся парсить как JSON, если не получается - отдаем как text
    try {
      const jsonData = JSON.parse(text);
      return res.status(upstream.status).json(jsonData);
    } catch {
      return res.status(upstream.status).send(text);
    }
    
  } catch (e: any) {
    console.error('Error in API:', e);
    return res.status(502).json({ error: `Upstream error: ${e?.message || 'unknown'}` });
  }
}