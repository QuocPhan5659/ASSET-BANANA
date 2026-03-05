import { Timestamp } from 'firebase/firestore';

export interface Folder {
  id: string;
  name: string;
  ownerId: string;
  parentId?: string | null;
  createdAt: Timestamp;
}

export interface Asset {
  id: string;
  name: string;
  type: 'image' | 'text' | 'file';
  content: string;
  storagePath?: string;
  size: number;
  mimeType: string;
  ownerId: string;
  folderId?: string | null;
  createdAt: Timestamp;
}
