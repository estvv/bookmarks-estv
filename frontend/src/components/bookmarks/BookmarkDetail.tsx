import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { bookmarksApi, tagsApi, ioApi } from '../../utils/api';
import { useData } from '../../contexts/DataContext';
import type { Bookmark, Tag } from '../../types';

export function BookmarkDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { folders, tags, refreshData } = useData();
  const isNew = id === 'new';

  const [bookmark, setBookmark] = useState<Bookmark | null>(null);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [folderId, setFolderId] = useState<number | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isRead, setIsRead] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    if (isNew) {
      const folderFromQuery = searchParams.get('folder');
      setFolderId(folderFromQuery ? parseInt(folderFromQuery) : null);
      return;
    }
    const load = async () => {
      try {
        const b = await bookmarksApi.get(parseInt(id!));
        setBookmark(b);
        setUrl(b.url);
        setTitle(b.title);
        setDescription(b.description || '');
        setFolderId(b.folder_id);
        setSelectedTagIds((b.tags || []).map(t => t.id));
        setIsFavorite(!!b.is_favorite);
        setIsRead(!!b.is_read);
      } catch (err) {
        console.error(err);
        navigate('/');
      }
    };
    load();
  }, [id]);

  const toggleTag = (tagId: number) => {
    setSelectedTagIds(prev => prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]);
  };

  const handleAddNewTag = async () => {
    const name = newTag.trim();
    if (!name) return;
    try {
      const tag = await tagsApi.findOrCreate(name);
      if (!selectedTagIds.includes(tag.id)) setSelectedTagIds(prev => [...prev, tag.id]);
      setNewTag('');
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    if (!url.trim()) {
      setError('URL is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (isNew) {
        const created = await bookmarksApi.create({
          url: url.trim(),
          title: title.trim() || undefined,
          description: description.trim() || undefined,
          folder_id: folderId,
          is_favorite: isFavorite,
          is_read: isRead,
          tagIds: selectedTagIds,
        });
        refreshData();
        navigate(`/bookmark/${created.id}`);
      } else if (bookmark) {
        const updated = await bookmarksApi.update(bookmark.id, {
          url: url.trim(),
          title: title.trim(),
          description: description.trim(),
          folder_id: folderId,
          is_favorite: isFavorite,
          is_read: isRead,
          tagIds: selectedTagIds,
        });
        setBookmark(updated);
        refreshData();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!bookmark) return;
    if (!confirm('Delete this bookmark?')) return;
    try {
      await bookmarksApi.delete(bookmark.id);
      refreshData();
      navigate('/');
    } catch (err) {
      console.error(err);
    }
  };

  const handleShare = async () => {
    if (!bookmark) return;
    try {
      if (bookmark.is_shared && bookmark.share_token) {
        await navigator.clipboard.writeText(`${window.location.origin}/shared/bookmark/${bookmark.share_token}`);
        alert('Share link copied!');
        return;
      }
      const result = await bookmarksApi.share(bookmark.id);
      await navigator.clipboard.writeText(`${window.location.origin}/shared/bookmark/${result.share_token}`);
      alert('Share link copied!');
      refreshData();
      setBookmark(await bookmarksApi.get(bookmark.id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-neutral-900">
          {isNew ? 'New bookmark' : 'Edit bookmark'}
        </h1>
        <div className="flex gap-2">
          {bookmark?.is_shared && (
            <button
              onClick={handleShare}
              className="px-3 py-2 text-sm text-green-600 border border-green-200 rounded-lg hover:bg-green-50"
            >
              Copy share link
            </button>
          )}
          <button
            onClick={() => navigate(-1)}
            className="px-3 py-2 text-sm text-neutral-600 hover:text-neutral-900 border border-neutral-200 rounded-lg hover:bg-neutral-50"
          >
            Back
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">URL *</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full px-3 py-2 border border-neutral-200 rounded text-sm focus:outline-none focus:border-neutral-500"
            autoFocus={isNew}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded text-sm focus:outline-none focus:border-neutral-500"
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
            rows={5}
            className="w-full px-3 py-2 border border-neutral-200 rounded text-sm focus:outline-none focus:border-neutral-500 resize-y"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Tags</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleTag(t.id)}
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  selectedTagIds.includes(t.id)
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'text-neutral-600 border-neutral-200 hover:bg-neutral-100 bg-white'
                }`}
                style={!selectedTagIds.includes(t.id) && t.color ? { color: t.color, borderColor: t.color } : undefined}
              >
                #{t.name}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleAddNewTag(); }
              }}
              placeholder="New tag name..."
              className="flex-1 px-3 py-1.5 border border-neutral-200 rounded text-sm focus:outline-none focus:border-neutral-500"
            />
            <button
              type="button"
              onClick={handleAddNewTag}
              className="px-3 py-1.5 text-sm border border-neutral-200 rounded hover:bg-neutral-100"
            >
              Add tag
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm text-neutral-600 cursor-pointer">
            <input type="checkbox" checked={isFavorite} onChange={(e) => setIsFavorite(e.target.checked)} />
            Favorite
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral-600 cursor-pointer">
            <input type="checkbox" checked={isRead} onChange={(e) => setIsRead(e.target.checked)} />
            Already read
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
          <div className="flex gap-2">
            {!isNew && bookmark && (
              <>
                <button
                  onClick={handleShare}
                  className="px-3 py-2 text-sm text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-50"
                >
                  {bookmark.is_shared ? 'Copy share link' : 'Share publicly'}
                </button>
                <button
                  onClick={handleDelete}
                  className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                >
                  Delete
                </button>
              </>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !url.trim()}
            className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : isNew ? 'Create bookmark' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}