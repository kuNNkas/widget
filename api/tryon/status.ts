export const runtime = 'edge';

const ORIGIN = process.env.ALLOWED_ORIGIN ?? '*';
const FASHN_BASE = 'https://api.fashn.ai/v1';

function cors(extra: HeadersInit = {}) {
  return {
    'Access-Control-Allow-Origin': ORIGIN,
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With',
    'Access-Control-Max-Age': '86400',
    ...extra,
  };
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors() as HeadersInit });
  }
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405, headers: cors() as HeadersInit });
  }

  const apiKey = process.env.FASHN_API_KEY;
  if (!apiKey) {
    return new Response('Server misconfigured: FASHN_API_KEY is missing', {
      status: 500,
      headers: cors(),
    });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) {
    return new Response('Missing query param "id"', { status: 400, headers: cors() });
  }

  try {
    const upstream = await fetch(`${FASHN_BASE}/predictions/${id}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' },
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        ...cors(),
        'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
        ...(upstream.headers.get('Retry-After') ? { 'Retry-After': upstream.headers.get('Retry-After')! } : {})
      },
    });
  } catch (e: any) {
    return new Response(`Upstream error: ${e?.message || 'unknown'}`, {
      status: 502,
      headers: cors(),
    });
  }
}
