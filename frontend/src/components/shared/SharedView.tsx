import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { sharedApi } from '../../utils/api';

interface FolderData {
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
    created_at: string;
  }>;
  childFolders: Array<{ id: number; name: string; share_token: string | null; is_shared: number }>;
}

interface BookmarkData {
  type: 'bookmark';
  bookmark: {
    id: number;
    title: string;
    url: string;
    description: string;
    favicon: string | null;
    image: string | null;
    created_at: string;
  };
}

function hostname(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

function formatDate(s: string): string {
  try { return new Date(s).toLocaleDateString(); } catch { return s; }
}

export function SharedView({ kind }: { kind: 'folder' | 'bookmark' }) {
  const { token } = useParams();
  const [data, setData] = useState<FolderData | BookmarkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        setLoading(true);
        const d = kind === 'folder'
          ? await sharedApi.getFolder(token)
          : await sharedApi.getBookmark(token);
        setData(d);
      } catch (err: any) {
        setError(err.message || 'Not found');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, kind]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-neutral-400 text-sm">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Not found</h1>
          <p className="text-sm text-neutral-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  if (data.type === 'bookmark') {
    const b = data.bookmark;
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-2xl mx-auto px-6 py-16">
          <div className="text-xs text-neutral-400 uppercase tracking-wider mb-2">Shared bookmark</div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">{b.title}</h1>
          <div className="text-sm text-neutral-500 mb-4">
            <a href={b.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600">
              {hostname(b.url)}
            </a>
            <span className="mx-2 text-neutral-300">·</span>
            <span>{formatDate(b.created_at)}</span>
          </div>
          {b.favicon && (
            <img src={b.favicon} alt="" className="w-6 h-6 mb-4" onError={(e) => (e.currentTarget.style.display = 'none')} />
          )}
          {b.description && (
            <p className="text-sm text-neutral-700 mb-4 whitespace-pre-wrap">{b.description}</p>
          )}
          <div className="mt-6">
            <a
              href={b.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors"
            >
              Open link →
            </a>
          </div>
        </div>
      </div>
    );
  }

  const folder = data.folder;
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-xs text-neutral-400 uppercase tracking-wider mb-2">Shared folder</div>
        <h1 className="text-2xl font-bold text-neutral-900 mb-1">{folder.name}</h1>
        <p className="text-sm text-neutral-500 mb-6">{data.bookmarks.length} bookmark{data.bookmarks.length !== 1 ? 's' : ''}</p>

        {data.childFolders.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {data.childFolders.map(f => (
              f.is_shared && f.share_token ? (
                <a
                  key={f.id}
                  href={`/shared/folder/${f.share_token}`}
                  className="px-3 py-1.5 text-sm border border-neutral-200 rounded-lg hover:bg-neutral-50"
                >
                  📁 {f.name}
                </a>
              ) : null
            ))}
          </div>
        )}

        {data.bookmarks.length === 0 ? (
          <p className="text-sm text-neutral-400">No bookmarks in this folder.</p>
        ) : (
          <div className="space-y-2">
            {data.bookmarks.map(b => (
              <div key={b.id} className="border border-neutral-200 rounded-lg p-3 hover:bg-neutral-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded overflow-hidden bg-neutral-100 flex items-center justify-center">
                    {b.favicon ? (
                      <img src={b.favicon} alt="" className="w-5 h-5" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    ) : (
                      <span className="text-xs text-neutral-400">{hostname(b.url)[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <a href={b.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-neutral-900 hover:underline">
                      {b.title}
                    </a>
                    <div className="text-xs text-neutral-500 mt-0.5">{hostname(b.url)}</div>
                    {b.description && <p className="text-xs text-neutral-600 mt-1 line-clamp-2">{b.description}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}