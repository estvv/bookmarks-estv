import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import {
  getTags, createTag, updateTag, deleteTag, getOrCreateTag, countBookmarksForTag
} from '../db/index.js';

const router = Router();

router.use(authMiddleware);

router.get('/', (req: AuthRequest, res) => {
  const tags = getTags().map(t => ({
    ...t,
    bookmark_count: countBookmarksForTag(t.id)
  }));
  res.json({ success: true, data: tags });
});

router.post('/', (req: AuthRequest, res) => {
  const { name, color } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Name required' });
  }
  const tag = createTag(name.trim(), color);
  res.json({ success: true, data: tag });
});

router.post('/find-or-create', (req: AuthRequest, res) => {
  const { name, color } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Name required' });
  }
  const tag = getOrCreateTag(name.trim(), color);
  res.json({ success: true, data: tag });
});

router.put('/:id', (req: AuthRequest, res) => {
  const { name, color } = req.body;
  const tag = updateTag(parseInt(req.params.id), { name, color });
  if (!tag) return res.status(404).json({ success: false, error: 'Tag not found' });
  res.json({ success: true, data: tag });
});

router.delete('/:id', (req: AuthRequest, res) => {
  deleteTag(parseInt(req.params.id));
  res.json({ success: true });
});

export default router;