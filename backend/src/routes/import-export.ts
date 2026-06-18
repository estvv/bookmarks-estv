import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import {
  getBookmarksForExport, getFolders, getTags, getOrCreateTag, importBookmark
} from '../db/index.js';
import type { BookmarkWithTags, Folder, Tag } from '../types/index.js';

const router = Router();
router.use(authMiddleware);

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatNetscapeDate(dateStr: string): number {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return Math.floor(Date.now() / 1000);
  return Math.floor(d.getTime() / 1000);
}

function buildFolderTree(folders: Folder[]): Map<number | null, Folder[]> {
  const tree = new Map<number | null, Folder[]>();
  for (const f of folders) {
    const key = f.parent_id ?? null;
    const list = tree.get(key) || [];
    list.push(f);
    tree.set(key, list);
  }
  return tree;
}

function renderFolderNetscape(
  folder: Folder,
  bookmarksByFolder: Map<number | null, BookmarkWithTags[]>,
  folderTree: Map<number | null, Folder[]>,
  depth: number
): string {
  const indent = '    '.repeat(depth);
  let out = `${indent}<DT><H3>${escapeHtml(folder.name)}</H3>\n`;
  out += `${indent}<DL><p>\n`;

  const bookmarks = bookmarksByFolder.get(folder.id) || [];
  for (const b of bookmarks) {
    const tags = (b.tags || []).map(t => t.name).join(',');
    const tagAttr = tags ? ` TAGS="${escapeHtml(tags)}"` : '';
    out += `${indent}    <DT><A HREF="${escapeHtml(b.url)}" ADD_DATE="${formatNetscapeDate(b.created_at)}"${tagAttr}>${escapeHtml(b.title)}</A>\n`;
    if (b.description) {
      out += `${indent}    <DD>${escapeHtml(b.description)}\n`;
    }
  }

  const children = folderTree.get(folder.id) || [];
  for (const child of children) {
    out += renderFolderNetscape(child, bookmarksByFolder, folderTree, depth + 1);
  }

  out += `${indent}</DL><p>\n`;
  return out;
}

router.get('/export', (req: AuthRequest, res) => {
  const format = (req.query.format as string) || 'json';

  const folders = getFolders();
  const tags = getTags();
  const bookmarks = getBookmarksForExport();

  if (format === 'json') {
    return res.json({
      success: true,
      data: {
        folders,
        tags,
        bookmarks: bookmarks.map(b => ({
          ...b,
          tagIds: (b.tags || []).map(t => t.id),
          tags: undefined
        }))
      }
    });
  }

  if (format === 'netscape' || format === 'html') {
    const bookmarksByFolder = new Map<number | null, BookmarkWithTags[]>();
    for (const b of bookmarks) {
      const key = b.folder_id ?? null;
      const list = bookmarksByFolder.get(key) || [];
      list.push(b);
      bookmarksByFolder.set(key, list);
    }

    const folderTree = buildFolderTree(folders);

    let html = '<!DOCTYPE NETSCAPE-Bookmark-file-1>\n';
    html += '<!--This is an automatically generated file. -->\n';
    html += '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n';
    html += '<TITLE>Bookmarks</TITLE>\n';
    html += '<H1>Bookmarks</H1>\n';
    html += '<DL><p>\n';

    const rootBookmarks = bookmarksByFolder.get(null) || [];
    for (const b of rootBookmarks) {
      const tagStr = (b.tags || []).map(t => t.name).join(',');
      const tagAttr = tagStr ? ` TAGS="${escapeHtml(tagStr)}"` : '';
      html += `    <DT><A HREF="${escapeHtml(b.url)}" ADD_DATE="${formatNetscapeDate(b.created_at)}"${tagAttr}>${escapeHtml(b.title)}</A>\n`;
      if (b.description) {
        html += `    <DD>${escapeHtml(b.description)}\n`;
      }
    }

    const rootFolders = folderTree.get(null) || [];
    for (const folder of rootFolders) {
      html += renderFolderNetscape(folder, bookmarksByFolder, folderTree, 1);
    }

    html += '</DL><p>\n';

    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    res.setHeader('Content-Disposition', 'attachment; filename="bookmarks.html"');
    return res.send(html);
  }

  return res.status(400).json({ success: false, error: 'Unknown format. Use json or netscape.' });
});

function parseNetscape(html: string): { url: string; title: string; description?: string; tags?: string; folderPath: string[] }[] {
  const results: { url: string; title: string; description?: string; tags?: string; folderPath: string[] }[] = [];

  const lines = html.split(/\r?\n/);
  let folderStack: string[] = [];
  let currentFolderDepth = 0;

  const dlRegex = /<DL>/i;
  const dlEndRegex = /<\/DL>/i;
  const h3Regex = /<DT><H3[^>]*>([\s\S]*?)<\/H3>/i;
  const aRegex = /<DT><A\s+HREF="([^"]*)"[^>]*>([\s\S]*?)<\/A>/i;
  const ddRegex = /<DD>(.*)/i;

  let pendingDescription: string | undefined;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (dlRegex.test(line)) {
      currentFolderDepth++;
      continue;
    }
    if (dlEndRegex.test(line)) {
      currentFolderDepth = Math.max(0, currentFolderDepth - 1);
      if (folderStack.length > currentFolderDepth) {
        folderStack = folderStack.slice(0, currentFolderDepth);
      }
      continue;
    }

    const h3 = line.match(h3Regex);
    if (h3) {
      folderStack = folderStack.slice(0, currentFolderDepth - 1);
      folderStack.push(h3[1].trim());
      folderStack = folderStack.slice(0, currentFolderDepth);
      continue;
    }

    const a = line.match(aRegex);
    if (a) {
      const url = a[1];
      const title = a[2].trim();
      const tagMatch = line.match(/TAGS="([^"]*)"/i);
      const tags = tagMatch ? tagMatch[1] : undefined;
      pendingDescription = undefined;
      results.push({
        url,
        title: title || url,
        tags,
        folderPath: [...folderStack]
      });
      continue;
    }

    const dd = line.match(ddRegex);
    if (dd && results.length > 0) {
      const last = results[results.length - 1];
      last.description = dd[1].trim();
      continue;
    }
  }

  return results;
}

function ensureFolder(path: string[], createFolder: (name: string, parentId?: number) => any, getFolderByNameChild: (name: string, parentId: number | null) => any): number | null {
  let parentId: number | null = null;
  for (const name of path) {
    let folder = getFolderByNameChild(name, parentId);
    if (!folder) {
      folder = createFolder(name, parentId || undefined);
    }
    parentId = folder.id;
  }
  return parentId;
}

router.post('/import', async (req: AuthRequest, res) => {
  const { format, data } = req.body;

  if (!data) {
    return res.status(400).json({ success: false, error: 'data required' });
  }

  let imported = 0;
  let skipped = 0;

  try {
    if (format === 'netscape' || format === 'html' || (typeof data === 'string' && data.includes('<!DOCTYPE NETSCAPE'))) {
      const items = parseNetscape(typeof data === 'string' ? data : String(data));

      const { createFolder, getFolders, getFolderById } = await import('../db/index.js');

      const allFolders = getFolders();
      const findChild = (name: string, parentId: number | null) =>
        allFolders.find(f => f.name === name && (f.parent_id ?? null) === (parentId ?? null));

      for (const item of items) {
        if (!item.url) { skipped++; continue; }

        let folderId: number | null = null;
        if (item.folderPath.length > 0) {
          let parentId: number | null = null;
          for (const name of item.folderPath) {
            let folder = findChild(name, parentId);
            if (!folder) {
              folder = createFolder(name, parentId || undefined);
              allFolders.push(folder);
            }
            parentId = folder.id;
          }
          folderId = parentId;
        }

        const tagIds: number[] = [];
        if (item.tags) {
          for (const tagName of item.tags.split(',').map(s => s.trim()).filter(Boolean)) {
            tagIds.push(getOrCreateTag(tagName).id);
          }
        }

        importBookmark({
          url: item.url,
          title: item.title,
          description: item.description,
          folder_id: folderId,
          tagIds
        });
        imported++;
      }
    } else if (format === 'json' || (typeof data === 'object' && !Array.isArray(data))) {
      const payload = typeof data === 'string' ? JSON.parse(data) : data;
      const folders: any[] = payload.folders || [];
      const tags: any[] = payload.tags || [];
      const bookmarks: any[] = payload.bookmarks || [];

      const { createFolder, getFolderById } = await import('../db/index.js');

      const folderIdMap = new Map<number, number>();
      const oldToNewFolder = (oldId: number): number | null => {
        if (!oldId) return null;
        if (folderIdMap.has(oldId)) return folderIdMap.get(oldId)!;
        return null;
      };

      const ordered = [...folders].sort((a, b) => (a.parent_id ?? 0) - (b.parent_id ?? 0));
      for (const f of ordered) {
        const newFolder = createFolder(f.name, f.parent_id ? oldToNewFolder(f.parent_id) || undefined : undefined);
        folderIdMap.set(f.id, newFolder.id);
      }

      const tagIdMap = new Map<number, number>();
      for (const t of tags) {
        const newTag = getOrCreateTag(t.name, t.color);
        tagIdMap.set(t.id, newTag.id);
      }

      for (const b of bookmarks) {
        const tagIds = (b.tagIds || []).map((id: number) => tagIdMap.get(id)).filter(Boolean) as number[];
        importBookmark({
          url: b.url,
          title: b.title,
          description: b.description,
          favicon: b.favicon,
          image: b.image,
          folder_id: b.folder_id ? oldToNewFolder(b.folder_id) : null,
          is_favorite: !!b.is_favorite,
          is_read: !!b.is_read,
          tagIds
        });
        imported++;
      }
    } else {
      return res.status(400).json({ success: false, error: 'Unknown import format. Use json or netscape.' });
    }

    return res.json({ success: true, data: { imported, skipped } });
  } catch (err: any) {
    console.error('Import error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Import failed' });
  }
});

export default router;