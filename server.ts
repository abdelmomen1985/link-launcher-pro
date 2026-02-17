import 'dotenv/config';
import { Context, Hono } from 'hono';
import { cors } from 'hono/cors';
import { createClient } from '@libsql/client';
import { extname } from 'node:path';

const dbUrl =
  process.env.TURSO_DATABASE_URL ??
  process.env.DATABASE_URL ??
  process.env.LIBSQL_URL;

const authToken =
  process.env.TURSO_AUTH_TOKEN ??
  process.env.DATABASE_AUTH_TOKEN ??
  process.env.LIBSQL_AUTH_TOKEN ??
  process.env.TURSO_TOKEN;

const db = dbUrl && authToken
  ? createClient({
      url: dbUrl,
      authToken,
    })
  : null;

if (!db) {
  console.error(
    '[startup] Database not configured. Expected TURSO_DATABASE_URL + TURSO_AUTH_TOKEN (or DATABASE_URL + DATABASE_AUTH_TOKEN / LIBSQL_URL + LIBSQL_AUTH_TOKEN).',
  );
}

if (db) {
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
}

const app = new Hono();

app.use('/api/*', cors());

app.get('/api/health', (c) => c.json({ ok: true, dbConfigured: Boolean(db) }));

const requireDb = (c: Context) => {
  if (db) return null;
  return c.json(
    {
      error:
        'Database is not configured. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in service environment variables.',
    },
    503,
  );
};

app.get('/api/history', async (c) => {
  const dbMissing = requireDb(c);
  if (dbMissing) return dbMissing;

  const rs = await db!.execute(`
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
  const dbMissing = requireDb(c);
  if (dbMissing) return dbMissing;

  const body = (await c.req.json().catch(() => null)) as
    | { urls?: string[]; fullText?: string }
    | null;
  const urls = Array.isArray(body?.urls)
    ? body.urls.filter((u) => typeof u === 'string')
    : [];
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

  await db!.execute({
    sql: `
      INSERT INTO history_entries (id, timestamp, url_count, preview, full_text)
      VALUES (?, ?, ?, ?, ?)
    `,
    args: [
      item.id,
      item.timestamp,
      item.urlCount,
      JSON.stringify(item.preview),
      item.fullText,
    ],
  });

  return c.json({ item });
});

app.delete('/api/history', async (c) => {
  const dbMissing = requireDb(c);
  if (dbMissing) return dbMissing;

  await db!.execute('DELETE FROM history_entries');
  return c.body(null, 204);
});

app.post('/api/shares', async (c) => {
  const dbMissing = requireDb(c);
  if (dbMissing) return dbMissing;

  const body = (await c.req.json().catch(() => null)) as { urls?: string[] } | null;
  const urls = Array.isArray(body?.urls)
    ? body.urls.filter((u) => typeof u === 'string')
    : [];

  if (urls.length === 0) {
    return c.json({ error: 'Invalid payload' }, 400);
  }

  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 12);

  await db!.execute({
    sql: 'INSERT INTO shares (id, urls, created_at) VALUES (?, ?, ?)',
    args: [id, JSON.stringify(urls), Date.now()],
  });

  return c.json({ id });
});

app.get('/api/shares/:id', async (c) => {
  const dbMissing = requireDb(c);
  if (dbMissing) return dbMissing;

  const id = c.req.param('id');
  const rs = await db!.execute({
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

app.get('*', async (c) => {
  const reqPath = c.req.path;
  const normalizedPath = reqPath === '/' ? '/index.html' : reqPath;
  const filePath = `./dist${normalizedPath}`;

  try {
    const file = Bun.file(filePath);
    if (await file.exists()) {
      const extension = extname(normalizedPath).slice(1);
      if (extension) {
        const isHtml = extension === 'html';
        return new Response(file, {
          headers: {
            'Content-Type': file.type || undefined,
            'Cache-Control': isHtml
              ? 'no-cache'
              : 'public, max-age=31536000, immutable',
          },
        });
      }
      return new Response(file);
    }
  } catch {
    // Fall through to index.html for client-side routes
  }

  const index = Bun.file('./dist/index.html');
  if (!(await index.exists())) {
    return c.text('Build artifacts not found. Run `bun run build` first.', 500);
  }

  return new Response(index);
});

const port = Number(process.env.PORT ?? process.env.API_PORT ?? 8787);

Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`Hono API running on http://localhost:${port}`);
