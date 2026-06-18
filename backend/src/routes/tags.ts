import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import {
  getTags, createTag, updateTag, deleteTag, getOrCreateTag, countBookmarksForTag
} from '../db/index.js';

const router = Router();

// Public: list tags
router.get('/', (req, res) => {
  const tags = getTags().map(t => ({
    ...t,
    bookmark_count: countBookmarksForTag(t.id)
  }));
  res.json({ success: true, data: tags });
});

// Auth required: create tag
router.post('/', authMiddleware, (req: AuthRequest, res) => {
  const { name, color } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Name required' });
  }
  const tag = createTag(name.trim(), color);
  res.json({ success: true, data: tag });
});

// Auth required: find or create
router.post('/find-or-create', authMiddleware, (req: AuthRequest, res) => {
  const { name, color } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Name required' });
  }
  const tag = getOrCreateTag(name.trim(), color);
  res.json({ success: true, data: tag });
});

// Auth required: update tag
router.put('/:id', authMiddleware, (req: AuthRequest, res) => {
  const { name, color } = req.body;
  const tag = updateTag(parseInt(req.params.id), { name, color });
  if (!tag) return res.status(404).json({ success: false, error: 'Tag not found' });
  res.json({ success: true, data: tag });
});

// Auth required: delete tag
router.delete('/:id', authMiddleware, (req: AuthRequest, res) => {
  deleteTag(parseInt(req.params.id));
  res.json({ success: true });
});

export default router;