import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { bookmarksApi } from '../../utils/api';
import { isAuthenticated } from '../../utils/auth';
import type { Bookmark } from '../../types';
import { BookmarkCard } from './BookmarkCard';
import { BookmarkForm } from './BookmarkForm';

export function BookmarkListView() {
  const { bookmarks, folders, refreshData, activeFolderId } = useData();
  const navigate = useNavigate();
  const authed = isAuthenticated();
  const [showAddForm, setShowAddForm] = useState(false);

  const activeFolder = folders.find(f => f.id === activeFolderId);

  let title = 'All bookmarks';
  if (activeFolder) title = activeFolder.name;

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this bookmark?')) return;
    try {
      await bookmarksApi.delete(id);
      refreshData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete bookmark');
    }
  };

  const handleToggleFavorite = async (b: Bookmark) => {
    try {
      await bookmarksApi.update(b.id, { is_favorite: !b.is_favorite });
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleRead = async (b: Bookmark) => {
    try {
      await bookmarksApi.update(b.id, { is_read: !b.is_read });
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleShare = async (b: Bookmark) => {
    try {
      if (b.is_shared && b.share_token) {
        await navigator.clipboard.writeText(`${window.location.origin}/shared/bookmark/${b.share_token}`);
        alert('Share link copied to clipboard!');
        return;
      }
      const result = await bookmarksApi.share(b.id);
      const url = `${window.location.origin}/shared/bookmark/${result.share_token}`;
      await navigator.clipboard.writeText(url);
      alert('Share link copied to clipboard!');
      refreshData();
    } catch (err) {
      console.error(err);
      alert('Failed to share bookmark');
    }
  };

  const handleUnshare = async (b: Bookmark) => {
    if (!confirm('Disable public sharing for this bookmark?')) return;
    try {
      await bookmarksApi.unshare(b.id);
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">{title}</h1>
          <p className="text-xs text-neutral-400 mt-0.5">{bookmarks.length} bookmark{bookmarks.length !== 1 ? 's' : ''}</p>
        </div>
        {authed && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors"
          >
            + Add bookmark
          </button>
        )}
      </div>

      {showAddForm && authed && (
        <BookmarkForm
          folders={folders}
          defaultFolderId={typeof activeFolderId === 'number' ? activeFolderId : undefined}
          onClose={() => setShowAddForm(false)}
          onSaved={() => {
            setShowAddForm(false);
            refreshData();
          }}
        />
      )}

      {bookmarks.length === 0 ? (
        <div className="text-center py-12 text-sm text-neutral-400">No bookmarks found.</div>
      ) : (
        <div className="space-y-2">
          {bookmarks.map(b => (
            <BookmarkCard
              key={b.id}
              bookmark={b}
              canEdit={authed}
              onClick={() => navigate(`/bookmark/${b.id}`)}
              onToggleFavorite={() => handleToggleFavorite(b)}
              onToggleRead={() => handleToggleRead(b)}
              onShare={() => handleShare(b)}
              onUnshare={() => handleUnshare(b)}
              onDelete={() => handleDelete(b.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}