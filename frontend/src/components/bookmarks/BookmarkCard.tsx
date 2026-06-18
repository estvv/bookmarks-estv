import type { Bookmark } from '../../types';
import { useData } from '../../contexts/DataContext';

interface Props {
  bookmark: Bookmark;
  canEdit: boolean;
  onClick: () => void;
  onToggleFavorite: () => void;
  onToggleRead: () => void;
  onShare: () => void;
  onUnshare: () => void;
  onDelete: () => void;
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function formatDate(s: string): string {
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return d.toLocaleDateString();
}

export function BookmarkCard({ bookmark, canEdit, onClick, onToggleFavorite, onToggleRead, onShare, onUnshare, onDelete }: Props) {
  const { folders } = useData();
  const folder = folders.find(f => f.id === bookmark.folder_id);
  const isFav = !!bookmark.is_favorite;
  const isRead = !!bookmark.is_read;

  return (
    <div
      onClick={onClick}
      className="group border border-neutral-200 rounded-lg p-3 hover:bg-neutral-50 transition-colors cursor-pointer flex gap-3 items-start"
    >
      <div className="flex-shrink-0 w-8 h-8 rounded overflow-hidden bg-neutral-100 flex items-center justify-center">
        {bookmark.favicon ? (
          <img src={bookmark.favicon} alt="" className="w-5 h-5" onError={(e) => (e.currentTarget.style.display = 'none')} />
        ) : (
          <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium text-neutral-900 truncate flex-1">
            {bookmark.title}
            {!isRead && <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-blue-500 align-middle" title="Unread" />}
          </h3>
          <span className="text-xs text-neutral-400 flex-shrink-0">{formatDate(bookmark.created_at)}</span>
        </div>

        <div className="text-xs text-neutral-500 mt-0.5 truncate">{hostname(bookmark.url)}</div>

        {bookmark.description && (
          <p className="text-xs text-neutral-600 mt-1 line-clamp-2">{bookmark.description}</p>
        )}

        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {folder && (
            <span className="px-1.5 py-0.5 text-xs text-neutral-500 bg-neutral-100 rounded">
              {folder.name}
            </span>
          )}
          {(bookmark.tags || []).slice(0, 4).map(t => (
            <span
              key={t.id}
              className="px-1.5 py-0.5 text-xs rounded border"
              style={{
                color: t.color || '#525252',
                borderColor: t.color || '#e5e5e5',
              }}
            >
              #{t.name}
            </span>
          ))}
          {bookmark.tags.length > 4 && (
            <span className="text-xs text-neutral-400">+{bookmark.tags.length - 4}</span>
          )}
          {bookmark.is_shared && (
            <span className="px-1.5 py-0.5 text-xs text-green-600 bg-green-50 rounded" title="Publicly shared">
              Shared
            </span>
          )}
        </div>
      </div>

      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-1.5 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
          title="Open URL"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        {canEdit && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
              className={`p-1.5 rounded hover:bg-neutral-100 ${isFav ? 'text-yellow-500' : 'text-neutral-400 hover:text-neutral-700'}`}
              title={isFav ? 'Unfavorite' : 'Favorite'}
            >
              <svg className="w-4 h-4" fill={isFav ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.075 10.1c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleRead(); }}
              className="p-1.5 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              title={isRead ? 'Mark as unread' : 'Mark as read'}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
            {bookmark.is_shared ? (
              <button
                onClick={(e) => { e.stopPropagation(); onUnshare(); }}
                className="p-1.5 rounded text-green-500 hover:text-green-700 hover:bg-neutral-100"
                title="Copy share link / disable sharing"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onShare(); }}
                className="p-1.5 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
                title="Share publicly"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 rounded text-neutral-400 hover:text-red-600 hover:bg-neutral-100"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}