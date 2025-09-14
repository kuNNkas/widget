import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import PQueue from 'p-queue';

const app = express();
app.use(express.json({ limit: '25mb' }));
app.use(cors({ origin: 'http://localhost:5173' }));

const FASHN_BASE = 'https://api.fashn.ai/v1';
const KEY = process.env.FASHN_API_KEY;
if (!KEY) {
  console.error('FASHN_API_KEY is not set in .env');
  process.exit(1);
}

// Гасим конкурентные /run, чтобы меньше ловить 429 у провайдера
const q = new PQueue({ concurrency: 1, interval: 1000, intervalCap: 1 });

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/api/tryon/run', async (req, res) => {
  try {
    const result = await q.add(async () => {
      const r = await fetch(`${FASHN_BASE}/run`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(req.body)
      });

      if (r.status === 429) {
        const retry = Number(r.headers.get('Retry-After')) || 15;
        return res.status(429).json({ error: 'RateLimitExceeded', message: `Retry after ${retry}s` });
      }
      const text = await r.text();
      return res.status(r.status).send(text);
    });
    return result;
  } catch (e: any) {
    return res.status(500).json({ error: 'InternalServerError', message: e?.message || String(e) });
  }
});

app.get('/api/tryon/status/:id', async (req, res) => {
  try {
    const r = await fetch(`${FASHN_BASE}/predictions/${req.params.id}`, {
      headers: { 'Authorization': `Bearer ${KEY}` }
    });
    const text = await r.text();
    return res.status(r.status).send(text);
  } catch (e: any) {
    return res.status(500).json({ error: 'InternalServerError', message: e?.message || String(e) });
  }
});

const PORT = Number(process.env.PORT) || 8787;
app.listen(PORT, () => console.log(`TryOn proxy listening on http://localhost:${PORT}`));
