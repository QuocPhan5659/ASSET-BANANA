import { Asset, Folder } from '../types';

const ASSETS_KEY = 'assethub_assets';
const FOLDERS_KEY = 'assethub_folders';

export const localService = {
  getAssets: (): Asset[] => {
    try {
      const data = localStorage.getItem(ASSETS_KEY);
      if (data && data !== 'undefined') return JSON.parse(data);
    } catch (e) {
      console.error("Failed to parse assets from localStorage", e);
    }
    return [];
  },
  
  saveAssets: (assets: Asset[]) => {
    localStorage.setItem(ASSETS_KEY, JSON.stringify(assets));
  },
  
  getFolders: (): Folder[] => {
    try {
      const data = localStorage.getItem(FOLDERS_KEY);
      if (data && data !== 'undefined') return JSON.parse(data);
    } catch (e) {
      console.error("Failed to parse folders from localStorage", e);
    }
    return [];
  },
  
  saveFolders: (folders: Folder[]) => {
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
  },

  addAsset: (asset: Omit<Asset, 'id'>): Asset => {
    const assets = localService.getAssets();
    const newAsset = { ...asset, id: Math.random().toString(36).substr(2, 9) };
    localService.saveAssets([...assets, newAsset]);
    return newAsset;
  },

  deleteAsset: (id: string) => {
    const assets = localService.getAssets();
    localService.saveAssets(assets.filter(a => a.id !== id));
  },

  updateAsset: (id: string, updates: Partial<Asset>) => {
    const assets = localService.getAssets();
    localService.saveAssets(assets.map(a => a.id === id ? { ...a, ...updates } : a));
  },

  addFolder: (folder: Omit<Folder, 'id'>): Folder => {
    const folders = localService.getFolders();
    const newFolder = { ...folder, id: Math.random().toString(36).substr(2, 9) };
    localService.saveFolders([...folders, newFolder]);
    return newFolder;
  },

  deleteFolder: (id: string) => {
    const folders = localService.getFolders();
    localService.saveFolders(folders.filter(f => f.id !== id));
    // Also clear folderId from assets
    const assets = localService.getAssets();
    localService.saveAssets(assets.map(a => a.folderId === id ? { ...a, folderId: null } : a));
  }
};
