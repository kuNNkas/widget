import type { NextApiRequest, NextApiResponse } from 'next';

export const runtime = 'nodejs18.x';

const ORIGIN = process.env.ALLOWED_ORIGIN ?? '*';
const FASHN_BASE = 'https://api.fashn.ai/v1';

function cors(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Status API called:', req.method, req.url);
  
  cors(res);
  
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request');
    return res.status(204).end();
  }
  
  if (req.method !== 'GET') {
    console.log('Not GET method:', req.method);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.FASHN_API_KEY;
  console.log('API key exists:', !!apiKey);
  
  if (!apiKey) {
    console.log('No API key');
    return res.status(500).json({ error: 'Server misconfigured: FASHN_API_KEY is missing' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    console.log('Missing or invalid id:', id);
    return res.status(400).json({ error: 'Missing query param "id"' });
  }

  try {
    console.log('Checking status for prediction:', id);
    console.log('Making request to:', `${FASHN_BASE}/predictions/${id}`);

    const upstream = await fetch(`${FASHN_BASE}/predictions/${id}`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${apiKey}`, 
        'Accept': 'application/json' 
      },
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
    console.error('Error in status API:', e);
    return res.status(502).json({ error: `Upstream error: ${e?.message || 'unknown'}` });
  }
}