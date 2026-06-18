import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { validateContent } from '../middleware/contentLimit.js';
import {
  getBookmarks, getBookmarkById, createBookmark, updateBookmark, deleteBookmark,
  setBookmarkTags, generateBookmarkShareToken, disableBookmarkSharing,
  updateBookmarkPosition, BookmarkQuery
} from '../db/index.js';
import { fetchMeta } from '../services/fetchMeta.js';

const router = Router();

function parseQuery(req: AuthRequest): BookmarkQuery {
  const q = req.query;
  const query: BookmarkQuery = {};

  if (q.folder_id !== undefined) {
    const v = q.folder_id === 'null' ? null : parseInt(q.folder_id as string);
    query.folderId = Number.isNaN(v as number) ? undefined : v;
  }

  if (q.search) query.search = (q.search as string).trim() || undefined;
  if (q.tag_id) query.tagId = parseInt(q.tag_id as string);
  if (q.favorite === '1' || q.favorite === 'true') query.isFavorite = true;
  if (q.unread === '1' || q.unread === 'true') query.isRead = false;
  if (q.read === '1' || q.read === 'true') query.isRead = true;

  const allowedSorts = ['created_desc', 'created_asc', 'title_asc', 'title_desc', 'updated_desc'] as const;
  if (q.sort && (allowedSorts as readonly string[]).includes(q.sort as string)) {
    query.sort = q.sort as BookmarkQuery['sort'];
  }

  return query;
}

// Public: list bookmarks (with filters)
router.get('/', (req: AuthRequest, res) => {
  const bookmarks = getBookmarks(parseQuery(req));
  res.json({ success: true, data: bookmarks });
});

// Public: get single bookmark
router.get('/:id', (req: AuthRequest, res) => {
  const bookmark = getBookmarkById(parseInt(req.params.id));
  if (!bookmark) return res.status(404).json({ success: false, error: 'Bookmark not found' });
  res.json({ success: true, data: bookmark });
});

// Auth required: fetch metadata for a URL (preview before save)
router.post('/fetch-meta', authMiddleware, async (req: AuthRequest, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ success: false, error: 'URL required' });
  try {
    const meta = await fetchMeta(url);
    res.json({ success: true, data: meta });
  } catch (err: any) {
    res.status(502).json({ success: false, error: err?.message || 'Failed to fetch metadata' });
  }
});

// Auth required: create bookmark
router.post('/', authMiddleware, validateContent, async (req: AuthRequest, res) => {
  const { url, title, description, folder_id, is_favorite, is_read, tagIds, fetch_meta } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, error: 'URL required' });
  }

  let favicon: string | null = null;
  let image: string | null = null;
  let resolvedTitle = title;
  let resolvedDescription = description || '';

  if (fetch_meta !== false) {
    try {
      const meta = await fetchMeta(url);
      favicon = meta.favicon;
      image = meta.image;
      if (!resolvedTitle && meta.title) resolvedTitle = meta.title;
      if (!resolvedDescription && meta.description) resolvedDescription = meta.description;
    } catch (err) {
      console.error('fetchMeta failed for', url, err);
    }
  }

  if (!resolvedTitle) resolvedTitle = url;

  const bookmark = createBookmark({
    url,
    title: resolvedTitle,
    description: resolvedDescription,
    favicon,
    image,
    folder_id: folder_id ?? null,
    is_favorite,
    is_read,
    tagIds
  });

  res.json({ success: true, data: bookmark });
});

// Auth required: update bookmark
router.put('/:id', authMiddleware, validateContent, (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  const { tagIds, ...updates } = req.body;

  const bookmark = updateBookmark(id, updates);
  if (!bookmark) return res.status(404).json({ success: false, error: 'Bookmark not found' });

  if (tagIds !== undefined && Array.isArray(tagIds)) {
    setBookmarkTags(id, tagIds);
  }

  res.json({ success: true, data: getBookmarkById(id) });
});

// Auth required: delete bookmark
router.delete('/:id', authMiddleware, (req: AuthRequest, res) => {
  deleteBookmark(parseInt(req.params.id));
  res.json({ success: true });
});

// Auth required: set tags
router.post('/:id/tags', authMiddleware, (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  const { tagIds } = req.body;
  if (!Array.isArray(tagIds)) {
    return res.status(400).json({ success: false, error: 'tagIds must be an array' });
  }
  setBookmarkTags(id, tagIds);
  res.json({ success: true, data: getBookmarkById(id) });
});

// Auth required: share bookmark
router.post('/:id/share', authMiddleware, (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  const token = generateBookmarkShareToken(id);
  res.json({ success: true, data: { share_token: token } });
});

// Auth required: disable sharing
router.delete('/:id/share', authMiddleware, (req: AuthRequest, res) => {
  disableBookmarkSharing(parseInt(req.params.id));
  res.json({ success: true });
});

// Auth required: reorder
router.post('/reorder', authMiddleware, (req: AuthRequest, res) => {
  const { bookmarkIds } = req.body;
  if (!Array.isArray(bookmarkIds)) {
    return res.status(400).json({ success: false, error: 'bookmarkIds must be an array' });
  }
  bookmarkIds.forEach((id: number, index: number) => updateBookmarkPosition(id, index));
  res.json({ success: true });
});

export default router;