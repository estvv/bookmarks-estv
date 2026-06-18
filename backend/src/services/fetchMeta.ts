import https from 'https';
import http from 'http';
import { URL } from 'url';

export interface PageMeta {
  title: string | null;
  description: string | null;
  favicon: string | null;
  image: string | null;
}

const FETCH_TIMEOUT = 8000;
const MAX_BYTES = 1024 * 1024;
const USER_AGENT = 'Mozilla/5.0 (compatible; bookmarks-estv/1.0; +https://estv.fr)';

function fetchUrl(rawUrl: string): Promise<{ html: string; finalUrl: string; contentType: string }> {
  return new Promise((resolve, reject) => {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      return reject(new Error('Invalid URL'));
    }

    if (!['http:', 'https:'].includes(url.protocol)) {
      return reject(new Error('Unsupported protocol'));
    }

    const lib = url.protocol === 'https:' ? https : http;

    const req = lib.get(url.toString(), {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: FETCH_TIMEOUT,
    }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, url).toString();
        res.resume();
        return resolve(fetchUrl(redirectUrl));
      }

      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }

      const contentType = res.headers['content-type'] || '';
      if (!contentType.toLowerCase().includes('html')) {
        res.resume();
        return reject(new Error('Not an HTML page'));
      }

      const chunks: Buffer[] = [];
      let received = 0;
      let truncated = false;

      res.on('data', (chunk: Buffer) => {
        received += chunk.length;
        if (received > MAX_BYTES) {
          if (!truncated) {
            truncated = true;
            res.destroy();
          }
          return;
        }
        chunks.push(chunk);
      });

      res.on('end', () => {
        resolve({
          html: Buffer.concat(chunks).toString('utf-8'),
          finalUrl: url.toString(),
          contentType,
        });
      });

      res.on('error', reject);
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error('Request timeout'));
    });
  });
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function extractMetaTag(html: string, names: string[]): string | null {
  for (const name of names) {
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']*)["']`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${name}["']`, 'i'),
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const value = decodeEntities(match[1]);
        if (value) return value;
      }
    }
  }
  return null;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (match && match[1]) {
    const title = decodeEntities(match[1].replace(/\s+/g, ' '));
    return title || null;
  }
  return null;
}

function extractDescription(html: string): string | null {
  return (
    extractMetaTag(html, ['description', 'og:description', 'twitter:description']) ||
    null
  );
}

function extractImage(html: string, baseUrl: string): string | null {
  const raw =
    extractMetaTag(html, ['og:image', 'twitter:image', 'og:image:secure_url']) ||
    null;
  if (!raw) return null;
  try {
    return new URL(raw, baseUrl).toString();
  } catch {
    return raw;
  }
}

function extractFavicon(html: string, baseUrl: string): string | null {
  const linkMatch = html.match(
    /<link[^>]+rel=["'](icon|shortcut icon|apple-touch-icon)["'][^>]+href=["']([^"']*)["']/i
  );
  if (linkMatch && linkMatch[2]) {
    try {
      return new URL(linkMatch[2], baseUrl).toString();
    } catch {
      return linkMatch[2];
    }
  }

  const hrefMatch = html.match(/<link[^>]+href=["']([^"']*\.(?:ico|png|svg))["']/i);
  if (hrefMatch && hrefMatch[1]) {
    try {
      return new URL(hrefMatch[1], baseUrl).toString();
    } catch {
      return hrefMatch[1];
    }
  }

  try {
    return new URL('/favicon.ico', baseUrl).toString();
  } catch {
    return null;
  }
}

export async function fetchMeta(rawUrl: string): Promise<PageMeta> {
  const { html, finalUrl } = await fetchUrl(rawUrl);

  return {
    title: extractTitle(html),
    description: extractDescription(html),
    favicon: extractFavicon(html, finalUrl),
    image: extractImage(html, finalUrl),
  };
}