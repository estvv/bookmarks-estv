export interface Folder {
  id: number;
  name: string;
  parent_id: number | null;
  share_token: string | null;
  is_shared: number;
  bookmark_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Bookmark {
  id: number;
  url: string;
  title: string;
  description: string;
  favicon: string | null;
  image: string | null;
  folder_id: number | null;
  is_favorite: number;
  is_read: number;
  position: number;
  share_token: string | null;
  is_shared: number;
  tags: Tag[];
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string | null;
  bookmark_count?: number;
  created_at: string;
}

export type SortOption = 'created_desc' | 'created_asc' | 'title_asc' | 'title_desc' | 'updated_desc';

export interface PageMeta {
  title: string | null;
  description: string | null;
  favicon: string | null;
  image: string | null;
}