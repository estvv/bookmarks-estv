import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { foldersApi } from '../../utils/api';
import { isAuthenticated } from '../../utils/auth';
import { useData } from '../../contexts/DataContext';
import type { Folder } from '../../types';

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const authed = isAuthenticated();
  const {
    folders, tags, activeFolderId, setActiveFolderId,
    activeTagId, setActiveTagId, refreshData
  } = useData();

  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());

  const toggleFolder = (id: number) => {
    setExpandedFolders(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await foldersApi.create({ name: newFolderName.trim() });
      setNewFolderName('');
      setShowNewFolder(false);
      refreshData();
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
  };

  const handleDeleteFolder = async (id: number) => {
    if (!confirm('Delete this folder? All bookmarks inside will be permanently deleted.')) return;
    try {
      await foldersApi.delete(id);
      refreshData();
      if (activeFolderId === id) {
        setActiveFolderId(undefined);
        navigate('/');
      }
    } catch (err) {
      console.error('Failed to delete folder:', err);
    }
  };

  const handleShareFolder = async (id: number) => {
    try {
      const result = await foldersApi.share(id);
      const url = `${window.location.origin}/shared/folder/${result.share_token}`;
      await navigator.clipboard.writeText(url);
      alert('Share link copied to clipboard!');
      refreshData();
    } catch (err) {
      console.error(err);
      alert('Failed to create share link');
    }
  };

  const handleNewBookmarkInFolder = async (folderId: number) => {
    navigate(`/bookmark/new?folder=${folderId}`);
  };

  const formatName = (n: string, max = 22) => n.length > max ? n.substring(0, max) + '...' : n;

  const selectAll = () => {
    setActiveFolderId(undefined);
    setActiveTagId(null);
    navigate('/');
  };

  const selectFolder = (id: number) => {
    setActiveFolderId(id);
    setActiveTagId(null);
    navigate(`/folder/${id}`);
  };

  const selectTag = (id: number | null) => {
    setActiveTagId(id);
    if (id === null) {
      navigate('/');
    } else {
      navigate(`/tag/${id}`);
    }
  };

  const buildTree = (folders: Folder[], parentId: number | null): Folder[] =>
    folders.filter(f => (f.parent_id ?? null) === (parentId ?? null));

  const renderFolder = (folder: Folder, depth: number): React.ReactNode => {
    const children = buildTree(folders, folder.id);
    const isExpanded = expandedFolders.has(folder.id);
    const isActive = activeFolderId === folder.id;

    return (
      <div key={folder.id}>
        <div
          className={`flex items-center group px-3 py-2 rounded-lg transition-colors ${
            isActive ? 'bg-neutral-100' : 'hover:bg-neutral-50'
          }`}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          {children.length > 0 ? (
            <button
              onClick={() => toggleFolder(folder.id)}
              className="text-neutral-400 hover:text-neutral-600 mr-1.5"
            >
              <svg className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <div className="w-5" />
          )}

          <button
            onClick={() => selectFolder(folder.id)}
            className="flex items-center gap-2 flex-1 text-left min-w-0"
          >
            <svg className="w-4 h-4 text-neutral-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span className="flex-1 text-sm font-medium text-neutral-700 truncate">
              {formatName(folder.name)}
            </span>
            <span className="text-xs text-neutral-400 mr-1">
              {folder.bookmark_count ?? 0}
            </span>
          </button>

          {authed && (
            <div className="opacity-0 group-hover:opacity-100 flex items-center transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); handleNewBookmarkInFolder(folder.id); }}
                className="text-neutral-400 hover:text-neutral-600 mr-1"
                title="Add bookmark to folder"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleShareFolder(folder.id); }}
                className={`mr-1 ${folder.is_shared ? 'text-green-500 hover:text-green-700' : 'text-neutral-400 hover:text-neutral-600'}`}
                title={folder.is_shared ? 'Copy share link' : 'Share folder'}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                className="text-neutral-400 hover:text-red-600"
                title="Delete folder"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {isExpanded && children.length > 0 && (
          <div className="border-l border-neutral-200 ml-5">
            {children.map(c => renderFolder(c, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-72 border-r border-neutral-200 flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="p-3">
          <button
            onClick={selectAll}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-2 ${
              activeFolderId === undefined && !activeTagId
                ? 'bg-neutral-100 text-neutral-900'
                : 'text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            All bookmarks
          </button>

          <div className="flex items-center justify-between mb-2 px-3 mt-4">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Folders</span>
            {authed && (
              <button
                onClick={() => setShowNewFolder(true)}
                className="text-neutral-400 hover:text-neutral-600"
                title="Create new folder"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
          </div>

          {showNewFolder && (
            <div className="mb-3 px-3">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder();
                  if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName(''); }
                }}
                placeholder="Folder name..."
                className="w-full px-3 py-1.5 text-sm border border-neutral-200 rounded focus:outline-none focus:border-neutral-500"
                autoFocus
              />
            </div>
          )}

          {folders.length === 0 && !showNewFolder ? (
            <div className="px-3 py-2 text-sm text-neutral-400">No folders yet.</div>
          ) : (
            <div className="space-y-0.5">
              {buildTree(folders, null).map(f => renderFolder(f, 0))}
            </div>
          )}

          <div className="mt-6">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider px-3 mb-2 block">Tags</span>
            {tags.length === 0 ? (
              <div className="px-3 py-2 text-sm text-neutral-400">No tags yet.</div>
            ) : (
              <div className="flex flex-wrap gap-1.5 px-3">
                {tags.map(t => (
                  <button
                    key={t.id}
                    onClick={() => selectTag(activeTagId === t.id ? null : t.id)}
                    className={`px-2 py-1 text-xs font-medium rounded border transition-colors ${
                      activeTagId === t.id
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                    }`}
                    style={activeTagId !== t.id && t.color ? { color: t.color, borderColor: t.color } : undefined}
                  >
                    {t.name}
                    <span className="opacity-60 ml-1">{t.bookmark_count ?? 0}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}