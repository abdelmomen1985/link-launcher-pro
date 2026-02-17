import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createClient } from '@libsql/client';

const dbUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!dbUrl || !authToken) {
  throw new Error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN');
}

const db = createClient({
  url: dbUrl,
  authToken,
});

await db.execute(`
  CREATE TABLE IF NOT EXISTS history_entries (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    url_count INTEGER NOT NULL,
    preview TEXT NOT NULL,
    full_text TEXT NOT NULL
  )
`);

await db.execute(`
  CREATE TABLE IF NOT EXISTS shares (
    id TEXT PRIMARY KEY,
    urls TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )
`);

const app = new Hono();

app.use('/api/*', cors());

app.get('/api/health', (c) => c.json({ ok: true }));

app.get('/api/history', async (c) => {
  const rs = await db.execute(`
    SELECT id, timestamp, url_count, preview, full_text
    FROM history_entries
    ORDER BY timestamp DESC
    LIMIT 20
  `);

  const history = rs.rows.map((row) => ({
    id: String(row.id),
    timestamp: Number(row.timestamp),
    urlCount: Number(row.url_count),
    preview: (() => {
      try {
        const parsed = JSON.parse(String(row.preview));
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })(),
    fullText: String(row.full_text),
  }));

  return c.json({ history });
});

app.post('/api/history', async (c) => {
  const body = await c.req.json().catch(() => null) as { urls?: string[]; fullText?: string } | null;
  const urls = Array.isArray(body?.urls) ? body!.urls.filter((u) => typeof u === 'string') : [];
  const fullText = typeof body?.fullText === 'string' ? body.fullText : '';

  if (urls.length === 0 || !fullText) {
    return c.json({ error: 'Invalid payload' }, 400);
  }

  const item = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    urlCount: urls.length,
    preview: urls.slice(0, 3),
    fullText,
  };

  await db.execute({
    sql: `
      INSERT INTO history_entries (id, timestamp, url_count, preview, full_text)
      VALUES (?, ?, ?, ?, ?)
    `,
    args: [item.id, item.timestamp, item.urlCount, JSON.stringify(item.preview), item.fullText],
  });

  return c.json({ item });
});

app.delete('/api/history', async (c) => {
  await db.execute('DELETE FROM history_entries');
  return c.body(null, 204);
});

app.post('/api/shares', async (c) => {
  const body = await c.req.json().catch(() => null) as { urls?: string[] } | null;
  const urls = Array.isArray(body?.urls) ? body!.urls.filter((u) => typeof u === 'string') : [];

  if (urls.length === 0) {
    return c.json({ error: 'Invalid payload' }, 400);
  }

  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 12);

  await db.execute({
    sql: 'INSERT INTO shares (id, urls, created_at) VALUES (?, ?, ?)',
    args: [id, JSON.stringify(urls), Date.now()],
  });

  return c.json({ id });
});

app.get('/api/shares/:id', async (c) => {
  const id = c.req.param('id');
  const rs = await db.execute({
    sql: 'SELECT urls FROM shares WHERE id = ? LIMIT 1',
    args: [id],
  });

  const row = rs.rows[0];
  if (!row) {
    return c.json({ error: 'Not found' }, 404);
  }

  let urls: string[] = [];
  try {
    const parsed = JSON.parse(String(row.urls));
    if (Array.isArray(parsed)) {
      urls = parsed.filter((u) => typeof u === 'string');
    }
  } catch {
    urls = [];
  }

  return c.json({ urls });
});

const port = Number(process.env.API_PORT ?? 8787);

Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`Hono API running on http://localhost:${port}`);
