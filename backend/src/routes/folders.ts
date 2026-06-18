import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getFolders, createFolder, updateFolder, deleteFolder, getFolderDepth,
  generateFolderShareToken, disableFolderSharing, countBookmarksInFolder
} from '../db/index.js';

const router = Router();

// Public: list folders
router.get('/', (req, res) => {
  const folders = getFolders().map(f => ({
    ...f,
    bookmark_count: countBookmarksInFolder(f.id)
  }));
  res.json({ success: true, data: folders });
});

// Auth required: create folder
router.post('/', authMiddleware, (req, res) => {
  const { name, parent_id } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, error: 'Name required' });
  }

  if (parent_id) {
    const depth = getFolderDepth(parent_id);
    if (depth >= 2) {
      return res.status(400).json({
        success: false,
        error: 'Maximum folder depth exceeded (3 levels)'
      });
    }
  }

  const folder = createFolder(name, parent_id);
  res.json({ success: true, data: folder });
});

// Auth required: update folder
router.put('/:id', authMiddleware, (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, error: 'Name required' });
  }
  const folder = updateFolder(parseInt(req.params.id), name);
  res.json({ success: true, data: folder });
});

// Auth required: delete folder (cascade deletes bookmarks)
router.delete('/:id', authMiddleware, (req, res) => {
  deleteFolder(parseInt(req.params.id));
  res.json({ success: true });
});

// Auth required: share folder
router.post('/:id/share', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id);
  const token = generateFolderShareToken(id);
  res.json({ success: true, data: { share_token: token } });
});

// Auth required: disable sharing
router.delete('/:id/share', authMiddleware, (req, res) => {
  disableFolderSharing(parseInt(req.params.id));
  res.json({ success: true });
});

export default router;