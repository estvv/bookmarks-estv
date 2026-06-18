import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import type { Bookmark, Folder, Tag, BookmarkWithTags } from '../types/index.js';

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

function attachTags(bookmark: Bookmark): BookmarkWithTags {
  const tags = db.prepare(`
    SELECT t.* FROM tags t
    JOIN bookmark_tags bt ON bt.tag_id = t.id
    WHERE bt.bookmark_id = ?
    ORDER BY t.name
  `).all(bookmark.id) as Tag[];
  return { ...bookmark, tags };
}

export interface BookmarkQuery {
  folderId?: number | null;
  search?: string;
  tagId?: number;
  isFavorite?: boolean;
  isRead?: boolean | null;
  sort?: 'created_desc' | 'created_asc' | 'title_asc' | 'title_desc' | 'updated_desc';
}

export function getBookmarks(query: BookmarkQuery = {}): BookmarkWithTags[] {
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

  if (query.tagId) {
    conditions.push('id IN (SELECT bookmark_id FROM bookmark_tags WHERE tag_id = ?)');
    params.push(query.tagId);
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
  return bookmarks.map(attachTags);
}

export function getBookmarkById(id: number): BookmarkWithTags | undefined {
  const bookmark = db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(id) as Bookmark | undefined;
  if (!bookmark) return undefined;
  return attachTags(bookmark);
}

export function getBookmarkByShareToken(token: string): BookmarkWithTags | undefined {
  const bookmark = db.prepare('SELECT * FROM bookmarks WHERE share_token = ? AND is_shared = 1').get(token) as Bookmark | undefined;
  if (!bookmark) return undefined;
  return attachTags(bookmark);
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
  tagIds?: number[];
}

export function createBookmark(input: CreateBookmarkInput): BookmarkWithTags {
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

  const id = result.lastInsertRowid as number;

  if (input.tagIds && input.tagIds.length > 0) {
    setBookmarkTags(id, input.tagIds);
  }

  return getBookmarkById(id)!;
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
}>): BookmarkWithTags | undefined {
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

export function setBookmarkTags(bookmarkId: number, tagIds: number[]): void {
  db.prepare('DELETE FROM bookmark_tags WHERE bookmark_id = ?').run(bookmarkId);
  const stmt = db.prepare('INSERT OR IGNORE INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)');
  for (const tagId of tagIds) {
    stmt.run(bookmarkId, tagId);
  }
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

export function getBookmarksByFolder(folderId: number): BookmarkWithTags[] {
  return getBookmarks({ folderId });
}

export function getBookmarksForExport(): BookmarkWithTags[] {
  const bookmarks = db.prepare('SELECT * FROM bookmarks ORDER BY folder_id, position').all() as Bookmark[];
  return bookmarks.map(attachTags);
}

export function importBookmark(input: CreateBookmarkInput): BookmarkWithTags {
  const existing = db.prepare('SELECT id FROM bookmarks WHERE url = ?').get(input.url) as { id: number } | undefined;
  if (existing) {
    if (input.tagIds && input.tagIds.length > 0) {
      const currentTags = db.prepare('SELECT tag_id FROM bookmark_tags WHERE bookmark_id = ?').all(existing.id) as { tag_id: number }[];
      const merged = Array.from(new Set([...currentTags.map(t => t.tag_id), ...input.tagIds]));
      setBookmarkTags(existing.id, merged);
    }
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

export function getTags(): Tag[] {
  return db.prepare('SELECT * FROM tags ORDER BY name COLLATE NOCASE').all() as Tag[];
}

export function getTagById(id: number): Tag | undefined {
  return db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as Tag | undefined;
}

export function getTagByName(name: string): Tag | undefined {
  return db.prepare('SELECT * FROM tags WHERE name = ? COLLATE NOCASE').get(name) as Tag | undefined;
}

export function createTag(name: string, color?: string): Tag {
  const stmt = db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)');
  const result = stmt.run(name, color || null);
  return db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid) as Tag;
}

export function updateTag(id: number, updates: Partial<Pick<Tag, 'name' | 'color'>>): Tag | undefined {
  const fields: string[] = [];
  const values: any[] = [];
  if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
  if (updates.color !== undefined) { fields.push('color = ?'); values.push(updates.color); }
  if (fields.length === 0) return getTagById(id);
  values.push(id);
  db.prepare(`UPDATE tags SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getTagById(id);
}

export function deleteTag(id: number): void {
  db.prepare('DELETE FROM tags WHERE id = ?').run(id);
}

export function getOrCreateTag(name: string, color?: string): Tag {
  const existing = getTagByName(name);
  if (existing) return existing;
  return createTag(name, color);
}

export function countBookmarksForTag(tagId: number): number {
  return (db.prepare('SELECT COUNT(*) as c FROM bookmark_tags WHERE tag_id = ?').get(tagId) as { c: number }).c;
}