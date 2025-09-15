export default async function handler(req: Request): Promise<Response> {
  console.log('API called:', req.method, req.url);
  
  // Preflight
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request');
    return new Response(null, { status: 204, headers: cors() as HeadersInit });
  }
  
  if (req.method !== 'POST') {
    console.log('Not POST method:', req.method);
    return new Response('Method Not Allowed', { status: 405, headers: cors() as HeadersInit });
  }

  const apiKey = process.env.FASHN_API_KEY;
  console.log('API key exists:', !!apiKey);
  
  if (!apiKey) {
    console.log('No API key');
    return new Response('Server misconfigured: FASHN_API_KEY is missing', {
      status: 500,
      headers: cors(),
    });
  }

  try {
    const body = await req.json();
    console.log('Request body received:', Object.keys(body));
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
    
    return new Response(text, {
      status: upstream.status,
      headers: {
        ...cors(),
        'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
        ...(upstream.headers.get('Retry-After') ? { 'Retry-After': upstream.headers.get('Retry-After')! } : {})
      },
    });
  } catch (e: any) {
    console.error('Error in API:', e);
    return new Response(`Upstream error: ${e?.message || 'unknown'}`, {
      status: 502,
      headers: cors(),
    });
  }
}