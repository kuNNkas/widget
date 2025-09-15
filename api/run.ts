export const config = { runtime: 'edge' };

const ORIGIN = process.env.ALLOWED_ORIGIN ?? '*';
const FASHN_BASE = 'https://api.fashn.ai/v1';

function cors(extra: HeadersInit = {}) {
  return {
    'Access-Control-Allow-Origin': ORIGIN,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With',
    'Access-Control-Max-Age': '86400',
    ...extra,
  };
}

export default async function handler(req: Request): Promise<Response> {
  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors() as HeadersInit });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: cors() as HeadersInit });
  }

  const apiKey = process.env.FASHN_API_KEY;
  if (!apiKey) {
    return new Response('Server misconfigured: FASHN_API_KEY is missing', {
      status: 500,
      headers: cors(),
    });
  }

  try {
    const body = await req.json();

    const upstream = await fetch(`${FASHN_BASE}/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Пробрасываем ответ как есть, но с CORS
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        ...cors(),
        'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
        'Retry-After': upstream.headers.get('Retry-After') || '',
      },
    });
  } catch (e: any) {
    return new Response(`Upstream error: ${e?.message || 'unknown'}`, {
      status: 502,
      headers: cors(),
    });
  }
}
