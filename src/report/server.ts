import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { extname, join, normalize } from 'node:path';

const PUBLIC_DIR = fileURLToPath(new URL('../../public/', import.meta.url));
const RESULTS_DIR = fileURLToPath(new URL('../../results/', import.meta.url));
const PORT = Number(process.env.PORT ?? 5173);

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

/**
 * Dependency-free static server for the dashboard. Serves `public/` plus the
 * generated `results/*.json`. Deliberately tiny — the dashboard is the point,
 * not the server.
 */
const server = createServer(async (req, res) => {
  const url = (req.url ?? '/').split('?')[0]!;

  try {
    if (url.startsWith('/results/')) {
      const file = join(RESULTS_DIR, safeSuffix(url, '/results/'));
      return await send(res, file);
    }
    const rel = url === '/' ? 'index.html' : safeSuffix(url, '/');
    return await send(res, join(PUBLIC_DIR, rel));
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not found');
  }
});

/** Strip the route prefix and block path traversal. */
function safeSuffix(url: string, prefix: string): string {
  const suffix = decodeURIComponent(url.slice(prefix.length));
  const cleaned = normalize(suffix).replace(/^(\.\.[/\\])+/, '');
  if (cleaned.includes('..')) throw new Error('traversal');
  return cleaned;
}

async function send(
  res: import('node:http').ServerResponse,
  file: string,
): Promise<void> {
  if (!existsSync(file)) throw new Error('missing');
  const body = await readFile(file);
  res.writeHead(200, {
    'content-type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream',
  });
  res.end(body);
}

server.listen(PORT, () => {
  console.log(`evalkit dashboard → http://localhost:${PORT}`);
});
