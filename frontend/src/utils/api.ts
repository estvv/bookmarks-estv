const API_BASE = import.meta.env.VITE_API_URL || '/api';
import type { Bookmark, Folder, Tag, PageMeta, SortOption } from '../types';

// Public request: no auth token attached, no redirect on 401. Used for reads.
async function publicRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options?.headers as Record<string, string>,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.data;
}

// Authenticated request: attaches Bearer token, surfaces auth errors to caller.
// Does NOT auto-redirect — callers decide how to handle 401 (e.g. prompt login).
async function authRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options?.headers as Record<string, string>,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    const err = new Error('Authentication required');
    (err as any).status = 401;
    throw err;
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.data;
}

// Backwards-compat alias used by older callers; treats 401 as redirect-worthy.
async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    return await authRequest(endpoint, options);
  } catch (err: any) {
    if (err?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    throw err;
  }
}

export interface BookmarkListParams {
  search?: string;
  folderId?: number | null;
  tagId?: number;
  favorite?: boolean;
  unread?: boolean;
  read?: boolean;
  sort?: SortOption;
}

function buildQuery(params: BookmarkListParams): string {
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  if (params.folderId !== undefined) {
    q.set('folder_id', params.folderId === null ? 'null' : String(params.folderId));
  }
  if (params.tagId) q.set('tag_id', String(params.tagId));
  if (params.favorite) q.set('favorite', '1');
  if (params.unread) q.set('unread', '1');
  if (params.read) q.set('read', '1');
  if (params.sort) q.set('sort', params.sort);
  const s = q.toString();
  return s ? `?${s}` : '';
}

export const bookmarksApi = {
  // Public reads
  list: (params: BookmarkListParams = {}): Promise<Bookmark[]> =>
    publicRequest(`/bookmarks${buildQuery(params)}`),

  get: (id: number): Promise<Bookmark> => publicRequest(`/bookmarks/${id}`),

  // Auth required
  create: (bookmark: {
    url: string;
    title?: string;
    description?: string;
    favicon?: string | null;
    image?: string | null;
    folder_id?: number | null;
    is_favorite?: boolean;
    is_read?: boolean;
    tagIds?: number[];
    fetch_meta?: boolean;
  }): Promise<Bookmark> =>
    authRequest('/bookmarks', { method: 'POST', body: JSON.stringify(bookmark) }),

  fetchMeta: (url: string): Promise<PageMeta> =>
    authRequest('/bookmarks/fetch-meta', { method: 'POST', body: JSON.stringify({ url }) }),

  update: (id: number, updates: Partial<{
    url: string;
    title: string;
    description: string;
    favicon: string | null;
    image: string | null;
    folder_id: number | null;
    is_favorite: boolean;
    is_read: boolean;
    tagIds: number[];
  }>): Promise<Bookmark> =>
    authRequest(`/bookmarks/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),

  delete: (id: number): Promise<void> => authRequest(`/bookmarks/${id}`, { method: 'DELETE' }),

  setTags: (id: number, tagIds: number[]): Promise<Bookmark> =>
    authRequest(`/bookmarks/${id}/tags`, { method: 'POST', body: JSON.stringify({ tagIds }) }),

  share: (id: number): Promise<{ share_token: string }> =>
    authRequest(`/bookmarks/${id}/share`, { method: 'POST' }),

  unshare: (id: number): Promise<void> =>
    authRequest(`/bookmarks/${id}/share`, { method: 'DELETE' }),

  reorder: (bookmarkIds: number[]): Promise<void> =>
    authRequest('/bookmarks/reorder', { method: 'POST', body: JSON.stringify({ bookmarkIds }) }),
};

export const foldersApi = {
  // Public read
  list: (): Promise<Folder[]> => publicRequest('/folders'),

  // Auth required
  create: (folder: { name: string; parent_id?: number }): Promise<Folder> =>
    authRequest('/folders', { method: 'POST', body: JSON.stringify(folder) }),
  update: (id: number, name: string): Promise<Folder> =>
    authRequest(`/folders/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
  delete: (id: number): Promise<void> => authRequest(`/folders/${id}`, { method: 'DELETE' }),
  share: (id: number): Promise<{ share_token: string }> => authRequest(`/folders/${id}/share`, { method: 'POST' }),
  unshare: (id: number): Promise<void> => authRequest(`/folders/${id}/share`, { method: 'DELETE' }),
};

export const tagsApi = {
  // Public read
  list: (): Promise<Tag[]> => publicRequest('/tags'),

  // Auth required
  create: (tag: { name: string; color?: string }): Promise<Tag> =>
    authRequest('/tags', { method: 'POST', body: JSON.stringify(tag) }),
  findOrCreate: (name: string, color?: string): Promise<Tag> =>
    authRequest('/tags/find-or-create', { method: 'POST', body: JSON.stringify({ name, color }) }),
  update: (id: number, updates: { name?: string; color?: string }): Promise<Tag> =>
    authRequest(`/tags/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
  delete: (id: number): Promise<void> => authRequest(`/tags/${id}`, { method: 'DELETE' }),
};

export const ioApi = {
  // Public read
  exportJson: (): Promise<{ folders: Folder[]; tags: Tag[]; bookmarks: any[] }> =>
    publicRequest('/io/export?format=json'),
  exportNetscape: async (): Promise<string> => {
    const response = await fetch(`${API_BASE}/io/export?format=netscape`);
    if (!response.ok) throw new Error('Export failed');
    return await response.text();
  },
  // Auth required
  import: (format: 'json' | 'netscape', data: string | object): Promise<{ imported: number; skipped: number }> =>
    authRequest('/io/import', { method: 'POST', body: JSON.stringify({ format, data }) }),
};

export const sharedApi = {
  getFolder: (token: string): Promise<{
    type: 'folder';
    folder: { id: number; name: string };
    bookmarks: Array<{
      id: number;
      title: string;
      url: string;
      description: string;
      favicon: string | null;
      image: string | null;
      position: number;
      tags: Array<{ id: number; name: string; color: string | null }>;
      created_at: string;
    }>;
    childFolders: Array<{ id: number; name: string; share_token: string | null; is_shared: number }>;
  }> => publicRequest(`/shared/folder/${token}`),

  getBookmark: (token: string): Promise<{
    type: 'bookmark';
    bookmark: {
      id: number;
      title: string;
      url: string;
      description: string;
      favicon: string | null;
      image: string | null;
      tags: Array<{ id: number; name: string; color: string | null }>;
      created_at: string;
    };
  }> => publicRequest(`/shared/bookmark/${token}`),
};