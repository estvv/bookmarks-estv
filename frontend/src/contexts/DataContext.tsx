import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { bookmarksApi, foldersApi } from '../utils/api';
import type { Bookmark, Folder, SortOption } from '../types';

interface DataContextValue {
  bookmarks: Bookmark[];
  folders: Folder[];
  loading: boolean;
  refreshData: () => Promise<void>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeFolderId: number | null | undefined;
  setActiveFolderId: (id: number | null | undefined) => void;
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
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFolderId, setActiveFolderId] = useState<number | null | undefined>(undefined);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [sort, setSort] = useState<SortOption>('created_desc');

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    try {
      setLoading(true);
      const foldersData = await foldersApi.list();
      setFolders(foldersData || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      setFolders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadBookmarks = async () => {
      try {
        const data = await bookmarksApi.list({
          search: searchQuery || undefined,
          folderId: activeFolderId,
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
  }, [searchQuery, activeFolderId, showFavoritesOnly, showUnreadOnly, sort]);

  return (
    <DataContext.Provider value={{
      bookmarks,
      folders,
      loading,
      refreshData,
      searchQuery,
      setSearchQuery,
      activeFolderId,
      setActiveFolderId,
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