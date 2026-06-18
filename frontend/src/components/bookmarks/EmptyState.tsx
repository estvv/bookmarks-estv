export function EmptyState() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <svg className="w-12 h-12 mx-auto text-neutral-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        <p className="text-sm text-neutral-400">No bookmarks yet. Click + Add to save your first link.</p>
      </div>
    </div>
  );
}