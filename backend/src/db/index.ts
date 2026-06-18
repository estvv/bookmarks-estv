import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import type { Bookmark, Folder, BookmarkWithFolder } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/bookmarks.db');

const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

export function initDatabase() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);
  console.log('Database initialized');
}

function attachFolder(bookmark: Bookmark): BookmarkWithFolder {
  let folder: Folder | null = null;
  if (bookmark.folder_id) {
    folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(bookmark.folder_id) as Folder | undefined || null;
  }
  return { ...bookmark, folder };
}

export interface BookmarkQuery {
  folderId?: number | null;
  search?: string;
  isFavorite?: boolean;
  isRead?: boolean | null;
  sort?: 'created_desc' | 'created_asc' | 'title_asc' | 'title_desc' | 'updated_desc';
}

export function getBookmarks(query: BookmarkQuery = {}): BookmarkWithFolder[] {
  const conditions: string[] = [];
  const params: any[] = [];

  if (query.folderId !== undefined) {
    if (query.folderId === null) {
      conditions.push('folder_id IS NULL');
    } else {
      conditions.push('folder_id = ?');
      params.push(query.folderId);
    }
  }

  if (query.search) {
    conditions.push('(title LIKE ? OR description LIKE ? OR url LIKE ?)');
    const term = `%${query.search}%`;
    params.push(term, term, term);
  }

  if (query.isFavorite) {
    conditions.push('is_favorite = 1');
  }

  if (query.isRead === true) {
    conditions.push('is_read = 1');
  } else if (query.isRead === false) {
    conditions.push('is_read = 0');
  }

  let sql = 'SELECT * FROM bookmarks';
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  switch (query.sort) {
    case 'created_asc': sql += ' ORDER BY created_at ASC'; break;
    case 'title_asc': sql += ' ORDER BY title COLLATE NOCASE ASC'; break;
    case 'title_desc': sql += ' ORDER BY title COLLATE NOCASE DESC'; break;
    case 'updated_desc': sql += ' ORDER BY updated_at DESC'; break;
    default: sql += ' ORDER BY is_favorite DESC, created_at DESC';
  }

  const bookmarks = db.prepare(sql).all(...params) as Bookmark[];
  return bookmarks.map(attachFolder);
}

export function getBookmarkById(id: number): BookmarkWithFolder | undefined {
  const bookmark = db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(id) as Bookmark | undefined;
  if (!bookmark) return undefined;
  return attachFolder(bookmark);
}

export function getBookmarkByShareToken(token: string): BookmarkWithFolder | undefined {
  const bookmark = db.prepare('SELECT * FROM bookmarks WHERE share_token = ? AND is_shared = 1').get(token) as Bookmark | undefined;
  if (!bookmark) return undefined;
  return attachFolder(bookmark);
}

export interface CreateBookmarkInput {
  url: string;
  title?: string;
  description?: string;
  favicon?: string | null;
  image?: string | null;
  folder_id?: number | null;
  is_favorite?: boolean;
  is_read?: boolean;
}

export function createBookmark(input: CreateBookmarkInput): BookmarkWithFolder {
  if (!input.url) throw new Error('URL required');

  const folderBookmarks = getBookmarks({ folderId: input.folder_id ?? undefined });
  const maxPosition = folderBookmarks.length > 0 ? Math.max(...folderBookmarks.map(b => b.position || 0)) : -1;

  const stmt = db.prepare(`
    INSERT INTO bookmarks (url, title, description, favicon, image, folder_id, is_favorite, is_read, position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    input.url,
    input.title || input.url,
    input.description || '',
    input.favicon || null,
    input.image || null,
    input.folder_id ?? null,
    input.is_favorite ? 1 : 0,
    input.is_read ? 1 : 0,
    maxPosition + 1
  );

  return getBookmarkById(result.lastInsertRowid as number)!;
}

export function updateBookmark(id: number, updates: Partial<{
  url: string;
  title: string;
  description: string;
  favicon: string | null;
  image: string | null;
  folder_id: number | null;
  is_favorite: boolean;
  is_read: boolean;
  position: number;
}>): BookmarkWithFolder | undefined {
  const fields: string[] = [];
  const values: any[] = [];

  const map: Record<string, (v: any) => [string, any]> = {
    url: (v) => ['url = ?', v],
    title: (v) => ['title = ?', v],
    description: (v) => ['description = ?', v],
    favicon: (v) => ['favicon = ?', v],
    image: (v) => ['image = ?', v],
    folder_id: (v) => ['folder_id = ?', v ?? null],
    is_favorite: (v) => ['is_favorite = ?', v ? 1 : 0],
    is_read: (v) => ['is_read = ?', v ? 1 : 0],
    position: (v) => ['position = ?', v],
  };

  for (const [key, value] of Object.entries(updates)) {
    if (key in map && value !== undefined) {
      const [clause, val] = map[key](value);
      fields.push(clause);
      values.push(val);
    }
  }

  if (fields.length === 0) return getBookmarkById(id);

  values.push(id);
  db.prepare(`UPDATE bookmarks SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);

  return getBookmarkById(id);
}

export function deleteBookmark(id: number): void {
  db.prepare('DELETE FROM bookmarks WHERE id = ?').run(id);
}

export function generateBookmarkShareToken(id: number): string {
  const token = uuidv4();
  db.prepare('UPDATE bookmarks SET share_token = ?, is_shared = 1 WHERE id = ?').run(token, id);
  return token;
}

export function disableBookmarkSharing(id: number): void {
  db.prepare('UPDATE bookmarks SET share_token = NULL, is_shared = 0 WHERE id = ?').run(id);
}

export function updateBookmarkPosition(id: number, position: number): void {
  db.prepare('UPDATE bookmarks SET position = ? WHERE id = ?').run(position, id);
}

export function countBookmarks(): number {
  return (db.prepare('SELECT COUNT(*) as c FROM bookmarks').get() as { c: number }).c;
}

export function getBookmarksByFolder(folderId: number): BookmarkWithFolder[] {
  return getBookmarks({ folderId });
}

export function getBookmarksForExport(): BookmarkWithFolder[] {
  const bookmarks = db.prepare('SELECT * FROM bookmarks ORDER BY folder_id, position').all() as Bookmark[];
  return bookmarks.map(attachFolder);
}

export function importBookmark(input: CreateBookmarkInput): BookmarkWithFolder {
  const existing = db.prepare('SELECT id FROM bookmarks WHERE url = ?').get(input.url) as { id: number } | undefined;
  if (existing) {
    return getBookmarkById(existing.id)!;
  }
  return createBookmark(input);
}

export function getFolders(): Folder[] {
  return db.prepare('SELECT * FROM folders ORDER BY name').all() as Folder[];
}

export function createFolder(name: string, parentId?: number): Folder {
  const stmt = db.prepare('INSERT INTO folders (name, parent_id) VALUES (?, ?)');
  const result = stmt.run(name, parentId || null);
  return db.prepare('SELECT * FROM folders WHERE id = ?').get(result.lastInsertRowid) as Folder;
}

export function getFolderById(id: number): Folder | undefined {
  return db.prepare('SELECT * FROM folders WHERE id = ?').get(id) as Folder | undefined;
}

export function updateFolder(id: number, name: string): Folder {
  db.prepare('UPDATE folders SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(name, id);
  return getFolderById(id)!;
}

export function deleteFolder(id: number): void {
  db.prepare('DELETE FROM folders WHERE id = ?').run(id);
}

export function getFolderDepth(folderId: number): number {
  let depth = 0;
  let currentId: number | null = folderId;
  while (currentId && depth < 10) {
    const parent = db.prepare('SELECT parent_id FROM folders WHERE id = ?').get(currentId) as { parent_id: number | null } | undefined;
    if (parent && parent.parent_id) {
      currentId = parent.parent_id;
      depth++;
    } else {
      break;
    }
  }
  return depth;
}

export function generateFolderShareToken(id: number): string {
  const token = uuidv4();
  db.prepare('UPDATE folders SET share_token = ?, is_shared = 1 WHERE id = ?').run(token, id);
  return token;
}

export function disableFolderSharing(id: number): void {
  db.prepare('UPDATE folders SET share_token = NULL, is_shared = 0 WHERE id = ?').run(id);
}

export function getFolderByShareToken(token: string): Folder | undefined {
  return db.prepare('SELECT * FROM folders WHERE share_token = ? AND is_shared = 1').get(token) as Folder | undefined;
}

export function getChildFolders(parentId: number): Folder[] {
  return db.prepare('SELECT * FROM folders WHERE parent_id = ? ORDER BY name').all(parentId) as Folder[];
}

export function countBookmarksInFolder(folderId: number): number {
  return (db.prepare('SELECT COUNT(*) as c FROM bookmarks WHERE folder_id = ?').get(folderId) as { c: number }).c;
}