import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider } from './contexts/DataContext';
import { LoginPage } from './components/auth/LoginPage';
import { MainLayout } from './components/layout/MainLayout';
import { BookmarkListView } from './components/bookmarks/BookmarkListView';
import { BookmarkDetail } from './components/bookmarks/BookmarkDetail';
import { SharedView } from './components/shared/SharedView';

function App() {
  return (
    <BrowserRouter>
      <DataProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/shared/folder/:token" element={<SharedView kind="folder" />} />
          <Route path="/shared/bookmark/:token" element={<SharedView kind="bookmark" />} />
          <Route path="/bookmark/:id" element={<MainLayout><BookmarkDetail /></MainLayout>} />
          <Route path="/*" element={<MainLayout><BookmarkListView /></MainLayout>} />
        </Routes>
      </DataProvider>
    </BrowserRouter>
  );
}

export default App;