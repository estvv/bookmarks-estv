import { useState, useEffect } from 'react';
import { bookmarksApi } from '../../utils/api';
import type { Folder, PageMeta } from '../../types';

interface Props {
  folders: Folder[];
  defaultFolderId?: number;
  onClose: () => void;
  onSaved: () => void;
}

export function BookmarkForm({ folders, defaultFolderId, onClose, onSaved }: Props) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [folderId, setFolderId] = useState<number | null>(defaultFolderId ?? null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isRead, setIsRead] = useState(false);
  const [fetchMeta, setFetchMeta] = useState(true);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!url.trim() || !fetchMeta) return;
    const t = setTimeout(async () => {
      try {
        setFetchingMeta(true);
        const m = await bookmarksApi.fetchMeta(url.trim());
        setMeta(m);
        if (!title && m.title) setTitle(m.title);
        if (!description && m.description) setDescription(m.description);
      } catch {
        setMeta(null);
      } finally {
        setFetchingMeta(false);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [url, fetchMeta]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('URL is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await bookmarksApi.create({
        url: url.trim(),
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        favicon: meta?.favicon ?? undefined,
        image: meta?.image ?? undefined,
        folder_id: folderId,
        is_favorite: isFavorite,
        is_read: isRead,
        fetch_meta: fetchMeta,
      });
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save bookmark');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-neutral-200 rounded-lg p-4 mb-4 bg-neutral-50">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">URL *</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/article"
            className="w-full px-3 py-2 border border-neutral-200 rounded text-sm focus:outline-none focus:border-neutral-500 bg-white"
            autoFocus
            required
          />
          {fetchingMeta && (
            <p className="text-xs text-neutral-400 mt-1">Fetching metadata...</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Auto-fetched from page"
              className="w-full px-3 py-2 border border-neutral-200 rounded text-sm focus:outline-none focus:border-neutral-500 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Folder</label>
            <select
              value={folderId ?? ''}
              onChange={(e) => setFolderId(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 border border-neutral-200 rounded text-sm focus:outline-none focus:border-neutral-500 bg-white"
            >
              <option value="">No folder</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Description / notes</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Auto-fetched from page, or write your own notes"
            rows={3}
            className="w-full px-3 py-2 border border-neutral-200 rounded text-sm focus:outline-none focus:border-neutral-500 bg-white resize-none"
          />
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-neutral-600 cursor-pointer">
            <input type="checkbox" checked={isFavorite} onChange={(e) => setIsFavorite(e.target.checked)} />
            Favorite
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral-600 cursor-pointer">
            <input type="checkbox" checked={isRead} onChange={(e) => setIsRead(e.target.checked)} />
            Already read
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral-600 cursor-pointer ml-auto">
            <input type="checkbox" checked={fetchMeta} onChange={(e) => setFetchMeta(e.target.checked)} />
            Auto-fetch metadata
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 border border-neutral-200 rounded-lg hover:bg-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !url.trim()}
            className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save bookmark'}
          </button>
        </div>
      </form>
    </div>
  );
}