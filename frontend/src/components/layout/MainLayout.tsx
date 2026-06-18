import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useData } from '../../contexts/DataContext';
import { EmptyState } from '../bookmarks/EmptyState';

interface MainLayoutProps {
  children?: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { loading } = useData();

  return (
    <div className="h-screen flex flex-col bg-white">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full text-neutral-400 text-sm">
              Loading...
            </div>
          ) : (
            children || <EmptyState />
          )}
        </main>
      </div>
    </div>
  );
}