import { Router } from 'express';
import {
  getFolderByShareToken, getBookmarksByFolder, getChildFolders,
  getBookmarkByShareToken
} from '../db/index.js';

const router = Router();

router.get('/folder/:token', (req, res) => {
  const folder = getFolderByShareToken(req.params.token);
  if (!folder) {
    return res.status(404).json({ success: false, error: 'Shared folder not found' });
  }

  const bookmarks = getBookmarksByFolder(folder.id).map(b => ({
    id: b.id,
    title: b.title,
    url: b.url,
    description: b.description,
    favicon: b.favicon,
    image: b.image,
    position: b.position,
    created_at: b.created_at
  }));

  const childFolders = getChildFolders(folder.id).map(f => ({
    id: f.id,
    name: f.name,
    share_token: f.share_token,
    is_shared: f.is_shared
  }));

  return res.json({
    success: true,
    data: {
      type: 'folder',
      folder: { id: folder.id, name: folder.name },
      bookmarks,
      childFolders
    }
  });
});

router.get('/bookmark/:token', (req, res) => {
  const bookmark = getBookmarkByShareToken(req.params.token);
  if (!bookmark) {
    return res.status(404).json({ success: false, error: 'Shared bookmark not found' });
  }
  return res.json({
    success: true,
    data: {
      type: 'bookmark',
      bookmark: {
        id: bookmark.id,
        title: bookmark.title,
        url: bookmark.url,
        description: bookmark.description,
        favicon: bookmark.favicon,
        image: bookmark.image,
        created_at: bookmark.created_at
      }
    }
  });
});

export default router;