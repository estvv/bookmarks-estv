import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../utils/auth';
import { useData } from '../../contexts/DataContext';
import type { SortOption } from '../../types';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'created_desc', label: 'Newest' },
  { value: 'created_asc', label: 'Oldest' },
  { value: 'title_asc', label: 'Title A-Z' },
  { value: 'title_desc', label: 'Title Z-A' },
  { value: 'updated_desc', label: 'Recently updated' },
];

export function Header() {
  const navigate = useNavigate();
  const {
    searchQuery, setSearchQuery,
    sort, setSort,
    showFavoritesOnly, setShowFavoritesOnly,
    showUnreadOnly, setShowUnreadOnly,
  } = useData();
  const [showAdd, setShowAdd] = useState(false);

  return (
    <header className="h-16 border-b border-neutral-200 flex items-center px-6 gap-4">
      <div className="flex-1 flex items-center gap-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search bookmarks..."
          className="flex-1 max-w-md px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-500 transition-colors"
        />

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-neutral-500 transition-colors bg-white"
          title="Sort"
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <button
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
            showFavoritesOnly
              ? 'bg-neutral-900 text-white border-neutral-900'
              : 'text-neutral-600 hover:text-neutral-900 border-neutral-200 hover:bg-neutral-50'
          }`}
          title="Show favorites only"
        >
          ★
        </button>

        <button
          onClick={() => setShowUnreadOnly(!showUnreadOnly)}
          className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
            showUnreadOnly
              ? 'bg-neutral-900 text-white border-neutral-900'
              : 'text-neutral-600 hover:text-neutral-900 border-neutral-200 hover:bg-neutral-50'
          }`}
          title="Show unread only"
        >
          Unread
        </button>
      </div>

      <button
        onClick={() => navigate('/bookmark/new')}
        className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors"
      >
        + Add
      </button>

      <button
        onClick={() => { logout(); navigate('/login'); }}
        className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg transition-colors"
      >
        Logout
      </button>
    </header>
  );
}