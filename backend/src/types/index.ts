export interface Folder {
  id: number;
  name: string;
  parent_id: number | null;
  share_token: string | null;
  is_shared: number;
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
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string | null;
  created_at: string;
}

export interface BookmarkWithTags extends Bookmark {
  tags: Tag[];
}

export interface AuthRequest extends Request {
  userId?: string;
}