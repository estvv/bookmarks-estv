import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { bookmarksApi, foldersApi, tagsApi } from '../utils/api';
import { isAuthenticated } from '../utils/auth';
import type { Bookmark, Folder, Tag, SortOption } from '../types';

interface DataContextValue {
  bookmarks: Bookmark[];
  folders: Folder[];
  tags: Tag[];
  loading: boolean;
  refreshData: () => Promise<void>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeFolderId: number | null | undefined;
  setActiveFolderId: (id: number | null | undefined) => void;
  activeTagId: number | null;
  setActiveTagId: (id: number | null) => void;
  showFavoritesOnly: boolean;
  setShowFavoritesOnly: (v: boolean) => void;
  showUnreadOnly: boolean;
  setShowUnreadOnly: (v: boolean) => void;
  sort: SortOption;
  setSort: (s: SortOption) => void;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFolderId, setActiveFolderId] = useState<number | null | undefined>(undefined);
  const [activeTagId, setActiveTagId] = useState<number | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [sort, setSort] = useState<SortOption>('created_desc');

  useEffect(() => {
    if (isAuthenticated()) {
      refreshData();
    } else {
      setLoading(false);
    }
  }, []);

  const refreshData = async () => {
    try {
      setLoading(true);
      const [foldersData, tagsData] = await Promise.all([
        foldersApi.list(),
        tagsApi.list()
      ]);
      setFolders(foldersData || []);
      setTags(tagsData || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      setFolders([]);
      setTags([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) return;
    let cancelled = false;

    const loadBookmarks = async () => {
      try {
        const data = await bookmarksApi.list({
          search: searchQuery || undefined,
          folderId: activeFolderId,
          tagId: activeTagId || undefined,
          favorite: showFavoritesOnly,
          unread: showUnreadOnly,
          sort,
        });
        if (!cancelled) setBookmarks(data || []);
      } catch (error) {
        console.error('Failed to load bookmarks:', error);
        if (!cancelled) setBookmarks([]);
      }
    };

    const t = setTimeout(loadBookmarks, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [searchQuery, activeFolderId, activeTagId, showFavoritesOnly, showUnreadOnly, sort]);

  return (
    <DataContext.Provider value={{
      bookmarks,
      folders,
      tags,
      loading,
      refreshData,
      searchQuery,
      setSearchQuery,
      activeFolderId,
      setActiveFolderId,
      activeTagId,
      setActiveTagId,
      showFavoritesOnly,
      setShowFavoritesOnly,
      showUnreadOnly,
      setShowUnreadOnly,
      sort,
      setSort,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
}