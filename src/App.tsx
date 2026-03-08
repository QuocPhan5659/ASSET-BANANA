import React, { useState, useEffect, useCallback, useRef, Component } from 'react';
import { 
  auth, 
} from './firebase';
import { 
  User, 
} from 'firebase/auth';
import { 
  Timestamp,
} from 'firebase/firestore';
import { localService } from './services/localService';
import { io } from 'socket.io-client';
import { 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  Trash2, 
  LogOut, 
  Plus, 
  X, 
  Download,
  Eye,
  File as FileIcon,
  Search,
  Grid,
  List as ListIcon,
  Loader2,
  ChevronRight,
  ChevronDown,
  Folder as FolderIcon,
  FolderPlus,
  ArrowLeft,
  Edit2,
  Copy,
  Mail,
  Lock,
  User as UserIcon,
  Check,
  AlertCircle,
  Cloud,
  CloudUpload,
  RefreshCw
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import imageCompression from 'browser-image-compression';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Safe date conversion for both Firebase and LocalStorage
const safeToDate = (date: any): Date => {
  if (!date) return new Date();
  if (typeof date.toDate === 'function') return date.toDate();
  if (date instanceof Date) return date;
  if (typeof date === 'string' || typeof date === 'number') return new Date(date);
  if (date.seconds !== undefined) return new Date(date.seconds * 1000);
  return new Date();
};

const ADMIN_PASSWORD = 'qvp5659QuocViPhan1234';
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwChR5AgYhQI_49nvkY1N-WVggatMXEQeN8YJA-nEczbYUpKGa2p2f_FxzkANw2RQ1x/exec";
const TARGET_DRIVE_FOLDER_ID = "1MlLf6hr-H4VzIQThltwhAgQJVbLKjRB3";

const getFolderPath = (folderId: string | null, allFolders: Folder[]): string[] => {
  if (!folderId) return [];
  const folder = allFolders.find(f => f.id === folderId);
  if (!folder) return [];
  return [...getFolderPath(folder.parentId || null, allFolders), folder.name];
};

// Helper to check if we are running in a static/serverless environment
const isStaticEnv = () => {
  return window.location.hostname.includes('github.io') || 
         window.location.hostname.includes('vercel.app') ||
         window.location.hostname.includes('netlify.app') ||
         window.location.protocol === 'file:' ||
         window.location.hostname === '' ||
         window.location.port === '5173' || // Vite default dev port often used for static testing
         !window.location.hostname.includes('run.app'); // AI Studio default
};

// --- Types ---
interface Folder {
  id: string;
  name: string;
  ownerId: string;
  parentId?: string | null;
  createdAt: Timestamp;
}

interface Asset {
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

// --- Components ---

const Login = ({ onLogin, onDemoMode }: { onLogin: (password: string) => void; onDemoMode: () => void }) => {
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    // Artificial delay for feel
    setTimeout(() => {
      if (password === ADMIN_PASSWORD) {
        onLogin(password);
      } else {
        setError("Mật khẩu không chính xác. Vui lòng thử lại.");
      }
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f4] p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[32px] shadow-sm border border-zinc-200 p-8 sm:p-12 text-center"
      >
        <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-8">
          <Upload className="text-white w-8 h-8" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 mb-3">AssetHub</h1>
        <p className="text-zinc-500 mb-8">Nhập mật khẩu quản trị để tiếp tục.</p>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-left flex items-start gap-3">
            <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
            <p className="text-xs text-red-600 font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mb-8">
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="password" 
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm outline-none focus:border-zinc-900 transition-all"
            />
          </div>
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-medium hover:bg-zinc-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Đăng nhập Quản trị"}
          </button>
        </form>

        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-4 text-zinc-400 font-bold tracking-widest">Hoặc</span>
          </div>
        </div>

        <button 
          onClick={onDemoMode}
          disabled={isLoading}
          className="w-full py-4 bg-zinc-100 text-zinc-900 rounded-2xl font-medium hover:bg-zinc-200 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
          Tiếp tục với tư cách Khách
        </button>
      </motion.div>
    </div>
  );
};

const AssetCard = ({ 
  asset, 
  onDelete, 
  onPreview, 
  onRename,
  viewMode = 'grid',
  isAdmin = false,
  onSync
}: { 
  asset: Asset; 
  onDelete: (asset: Asset) => void | Promise<void>; 
  onPreview: (asset: Asset) => void; 
  onRename: (asset: Asset) => void;
  viewMode?: 'grid' | 'list';
  isAdmin?: boolean;
  onSync?: (asset: Asset) => void;
}) => {
  const [isCopying, setIsCopying] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const dragRef = useRef(false);
  const isText = asset.type === 'text' || asset.mimeType.includes('text') || asset.name.endsWith('.txt') || asset.name.endsWith('.md');

  const getDisplayUrl = (url: string) => {
    if (!url) return '';
    
    // Handle Google Drive links for direct display in static mode
    if (url.includes('drive.google.com')) {
      let fileId = '';
      const match = url.match(/\/file\/d\/([^\/]+)/) || url.match(/id=([^\&]+)/);
      if (match && match[1]) {
        fileId = match[1];
        return `https://drive.google.com/uc?export=view&id=${fileId}`;
      }
    }

    if (url.startsWith('http')) {
      if (isStaticEnv()) return url;
      return `/api/proxy-content?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  const handleDragStart = (e: React.DragEvent) => {
    dragRef.current = true;
    const url = asset.content;
    
    // If it's a base64 string, it can be very large and cause freezes in dataTransfer
    const isBase64 = url.startsWith('data:');
    
    try {
      // NEVER set full base64 in uri-list, it's the main cause of freezes
      if (!isBase64) { 
        e.dataTransfer.setData('text/plain', url);
        e.dataTransfer.setData('text/uri-list', url);
      } else {
        // For base64, only set the name to prevent browser freeze
        e.dataTransfer.setData('text/plain', asset.name);
      }
    } catch (err) {
      console.warn('Drag data transfer failed');
    }
    
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => {
    // Small timeout to prevent the click event from firing immediately after drag
    setTimeout(() => {
      dragRef.current = false;
    }, 100);
  };

  const handleClick = () => {
    if (dragRef.current) return;
    onPreview(asset);
  };

  const handleCopyContent = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCopying(true);
    try {
      let text = '';
      if (asset.content.startsWith('http')) {
        const response = await fetch(`/api/proxy-content?url=${encodeURIComponent(asset.content)}`);
        if (!response.ok) throw new Error('Failed to fetch via proxy');
        text = await response.text();
      } else {
        text = asset.content;
      }
      await navigator.clipboard.writeText(text);
      setTimeout(() => setIsCopying(false), 2000);
    } catch (err) {
      console.error('Failed to copy content:', err);
      setIsCopying(false);
    }
  };

  const handleSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSyncing || !onSync) return;
    setIsSyncing(true);
    try {
      await onSync(asset);
    } finally {
      setIsSyncing(false);
    }
  };

  if (viewMode === 'list') {
    return (
      <motion.div 
        draggable="true"
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="group flex items-center justify-between p-3 bg-white hover:bg-zinc-50 border-b border-zinc-100 transition-colors cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {asset.type === 'image' ? (
              <img src={getDisplayUrl(asset.content)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" draggable="false" />
            ) : (
              <FileIcon size={10} className="text-zinc-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[10px] font-medium text-zinc-900 truncate">{asset.name}</h3>
            <p className="text-[8px] text-zinc-500 uppercase tracking-wider">
              {format(safeToDate(asset.createdAt), 'MMM d')} • {(asset.size / 1024).toFixed(0)} KB
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {isText && (
            <button 
              onClick={handleCopyContent} 
              className={cn(
                "p-1 rounded-lg transition-colors",
                isCopying ? "bg-emerald-100 text-emerald-600" : "hover:bg-zinc-200 text-zinc-600"
              )}
              title="Copy content"
            >
              {isCopying ? <Check size={10} /> : <Copy size={10} />}
            </button>
          )}
          {isAdmin && (
            <>
              <button 
                onClick={handleSync}
                disabled={isSyncing}
                className={cn(
                  "p-1 rounded-lg transition-colors",
                  isSyncing ? "text-emerald-500 animate-pulse" : "hover:bg-zinc-200 text-zinc-600"
                )}
                title="Sync to Google Drive"
              >
                <CloudUpload size={10} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onRename(asset); }} 
                className="p-1 hover:bg-zinc-200 rounded-lg text-zinc-600 transition-colors"
                title="Rename"
              >
                <Edit2 size={10} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(asset); }} 
                className="p-1 hover:bg-red-100 rounded-lg text-red-600 transition-colors"
                title="Delete"
              >
                <Trash2 size={10} />
              </button>
            </>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      draggable="true"
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative bg-white rounded-xl border border-zinc-200 overflow-hidden hover:shadow-md transition-all h-full flex flex-col cursor-grab active:cursor-grabbing select-none"
    >
      <div className="aspect-square bg-zinc-50 flex items-center justify-center relative overflow-hidden">
        {asset.type === 'image' ? (
          <img 
            src={getDisplayUrl(asset.content)} 
            alt={asset.name} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            draggable="false"
          />
        ) : asset.type === 'text' ? (
          <div className="flex flex-col items-center gap-1">
            <FileText size={16} className="text-zinc-300" />
            <span className="text-[7px] font-mono text-zinc-400 uppercase tracking-widest">Text</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <FileIcon size={16} className="text-zinc-300" />
            <span className="text-[7px] font-mono text-zinc-400 uppercase tracking-widest">File</span>
          </div>
        )}
        
        <div className="absolute top-1 right-1 flex flex-col gap-0.5">
          {isText && (
            <button 
              onClick={handleCopyContent} 
              className={cn(
                "p-1 rounded-md shadow-sm backdrop-blur-md transition-colors",
                isCopying ? "bg-emerald-500 text-white" : "bg-white/80 hover:bg-white text-zinc-600"
              )}
              title="Copy content"
            >
              {isCopying ? <Check size={10} /> : <Copy size={10} />}
            </button>
          )}
          {isAdmin && (
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              className={cn(
                "p-1 rounded-md shadow-sm backdrop-blur-md transition-colors",
                isSyncing ? "bg-emerald-500 text-white animate-pulse" : "bg-white/80 hover:bg-white text-zinc-600"
              )}
              title="Sync to Google Drive"
            >
              <CloudUpload size={10} />
            </button>
          )}
        </div>
      </div>
      
      <div className="p-1.5 flex-1 flex flex-col">
        <div className="flex items-center gap-1 mb-0.5">
          <h3 className="text-[9px] font-medium text-zinc-900 truncate leading-tight flex-1">{asset.name}</h3>
          {isAdmin && (
            <div className="flex items-center gap-0.5">
              <button 
                onClick={(e) => { e.stopPropagation(); onRename(asset); }}
                className="p-0.5 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-900 rounded transition-colors"
                title="Rename"
              >
                <Edit2 size={8} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(asset); }}
                className="p-0.5 hover:bg-red-50 text-zinc-400 hover:text-red-600 rounded transition-colors"
                title="Delete"
              >
                <Trash2 size={8} />
              </button>
            </div>
          )}
        </div>
        <p className="text-[7px] text-zinc-500 uppercase tracking-wider">
          {format(safeToDate(asset.createdAt), 'MMM d')} • {(asset.size / 1024).toFixed(0)} KB
        </p>
      </div>
    </motion.div>
  );
};

const RenameModal = ({ isOpen, onClose, onRename, initialName, title }: { isOpen: boolean; onClose: () => void; onRename: (newName: string) => Promise<void>; initialName: string; title: string }) => {
  const [name, setName] = useState(initialName);
  const [isRenaming, setIsRenaming] = useState(false);

  useEffect(() => {
    if (isOpen) setName(initialName);
  }, [isOpen, initialName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name === initialName) return;
    setIsRenaming(true);
    try {
      await onRename(name);
      onClose();
    } finally {
      setIsRenaming(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">{title}</h2>
            <form onSubmit={handleSubmit}>
              <input 
                autoFocus
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-100 border-transparent focus:bg-white focus:border-zinc-300 rounded-lg text-xs transition-all outline-none mb-4"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={onClose} className="px-4 py-2 text-zinc-600 text-xs font-medium hover:bg-zinc-100 rounded-lg transition-colors">Cancel</button>
                <button 
                  type="submit" 
                  disabled={isRenaming || !name.trim() || name === initialName}
                  className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-xs font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
                >
                  {isRenaming ? 'Renaming...' : 'Rename'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const DeleteModal = ({ isOpen, onClose, onDelete, title, message }: { isOpen: boolean; onClose: () => void; onDelete: () => Promise<void>; title: string; message: string }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
            <h2 className="text-lg font-semibold text-zinc-900 mb-2">{title}</h2>
            <p className="text-xs text-zinc-500 mb-6">{message}</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-zinc-600 text-xs font-medium hover:bg-zinc-100 rounded-lg transition-colors">Cancel</button>
              <button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const CreateFolderModal = ({ isOpen, onClose, onCreate, parentFolderName }: { isOpen: boolean; onClose: () => void; onCreate: (name: string) => Promise<void>; parentFolderName?: string }) => {
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      await onCreate(name);
      setName('');
      onClose();
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
            <h2 className="text-lg font-semibold text-zinc-900 mb-1.5">New Folder</h2>
            {parentFolderName && <p className="text-[10px] text-zinc-500 mb-4">Creating inside: <span className="font-semibold">{parentFolderName}</span></p>}
            <form onSubmit={handleSubmit}>
              <input 
                autoFocus
                type="text" 
                placeholder="Folder name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-100 border-transparent focus:bg-white focus:border-zinc-300 rounded-lg text-xs transition-all outline-none mb-4"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={onClose} className="px-4 py-2 text-zinc-600 text-xs font-medium hover:bg-zinc-100 rounded-lg transition-colors">Cancel</button>
                <button 
                  type="submit" 
                  disabled={isCreating || !name.trim()}
                  className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-xs font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create Folder'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const UploadModal = ({ 
  isOpen, 
  onClose, 
  onUpload,
  uploadingFiles 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onUpload: (files: File[]) => Promise<void>;
  uploadingFiles: UploadingFile[];
}) => {
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsUploading(true);
    try {
      await onUpload(acceptedFiles);
      // We don't wait for all uploads to finish before allowing interaction
    } finally {
      setIsUploading(false);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'text/*': ['.txt', '.md', '.csv'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/zip': ['.zip'],
      'application/x-zip-compressed': ['.zip']
    },
    maxSize: 50 * 1024 * 1024 // Increased to 50MB
  } as any);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl p-8 overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Upload Assets</h2>
                <p className="text-sm text-zinc-500 mt-1">Select multiple files to upload in parallel</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div 
              {...getRootProps()} 
              className={cn(
                "border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer mb-6",
                isDragActive ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:border-zinc-400",
                isUploading && "opacity-50"
              )}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center">
                  <Upload className="text-zinc-600" />
                </div>
                <div>
                  <p className="text-zinc-900 font-medium">Drag & drop files here</p>
                  <p className="text-zinc-500 text-sm mt-1">Images, PDFs, Docs, Zip (max 50MB)</p>
                </div>
              </div>
            </div>

            {uploadingFiles.length > 0 && (
              <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Uploading ({uploadingFiles.length})</p>
                {uploadingFiles.map(file => (
                  <div key={file.id} className="bg-zinc-50 rounded-xl p-4 border border-zinc-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                          <FileIcon size={14} className="text-zinc-400" />
                        </div>
                        <span className="text-sm font-medium text-zinc-700 truncate">{file.name}</span>
                      </div>
                      <span className="text-xs font-mono text-zinc-500">{Math.round(file.progress)}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${file.progress}%` }}
                        className={cn(
                          "h-full transition-all duration-300",
                          file.status === 'error' ? "bg-red-500" : "bg-zinc-900"
                        )}
                      />
                    </div>
                    {file.status === 'error' && (
                      <p className="text-[10px] text-red-500 mt-1 font-medium">{file.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8 flex justify-end gap-3">
              <button 
                onClick={onClose}
                className="px-6 py-2.5 text-zinc-600 font-medium hover:bg-zinc-100 rounded-xl transition-colors"
              >
                {uploadingFiles.length > 0 ? 'Close' : 'Cancel'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const PreviewModal = ({ asset, onClose, onRename, onDelete, isAdmin }: { asset: Asset | null; onClose: () => void; onRename: (a: Asset) => void; onDelete: (a: Asset) => void; isAdmin: boolean }) => {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);

  useEffect(() => {
    if (asset && asset.type === 'text') {
      setLoadingText(true);
      const fetchUrl = asset.content.startsWith('http') 
        ? `/api/proxy-content?url=${encodeURIComponent(asset.content)}`
        : asset.content;
        
      fetch(fetchUrl)
        .then(res => res.text())
        .then(text => {
          setTextContent(text);
          setLoadingText(false);
        })
        .catch(() => setLoadingText(false));
    } else {
      setTextContent(null);
    }
  }, [asset]);

  const getDisplayUrl = (url: string) => {
    if (!url) return '';
    
    // Handle Google Drive links for direct display in static mode
    if (url.includes('drive.google.com')) {
      let fileId = '';
      const match = url.match(/\/file\/d\/([^\/]+)/) || url.match(/id=([^\&]+)/);
      if (match && match[1]) {
        fileId = match[1];
        return `https://drive.google.com/uc?export=view&id=${fileId}`;
      }
    }

    if (url.startsWith('http')) {
      if (isStaticEnv()) return url;
      return `/api/proxy-content?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  if (!asset) return null;

  const isText = asset.type === 'text' || asset.mimeType.includes('text') || asset.name.endsWith('.txt') || asset.name.endsWith('.md');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-3xl bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center">
                {asset.type === 'image' ? <ImageIcon size={16} /> : <FileText size={16} />}
              </div>
              <div>
                <h2 className="text-base font-semibold text-zinc-900 leading-tight">{asset.name}</h2>
                <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                  {asset.mimeType} • {(asset.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <>
                  <button 
                    onClick={() => { onRename(asset); onClose(); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-zinc-100 rounded-xl transition-colors text-zinc-600 text-xs font-medium"
                  >
                    <Edit2 size={14} />
                    Rename
                  </button>
                  <button 
                    onClick={() => { onDelete(asset); onClose(); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-red-50 rounded-xl transition-colors text-red-600 text-xs font-medium"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </>
              )}
              <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-600">
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-zinc-50 p-6 flex items-center justify-center">
            {asset.type === 'image' ? (
              <img 
                src={getDisplayUrl(asset.content)} 
                alt={asset.name} 
                className="max-w-full max-h-full object-contain shadow-lg rounded-lg"
                referrerPolicy="no-referrer"
              />
            ) : isText ? (
              <div className="w-full max-w-xl bg-white p-8 rounded-xl shadow-sm border border-zinc-200 min-h-[300px]">
                {loadingText ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="animate-spin text-zinc-300" />
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap font-mono text-xs text-zinc-800 leading-relaxed">
                    {textContent}
                  </pre>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-zinc-400">
                <FileIcon size={48} />
                <p className="text-[10px] text-zinc-500 font-medium">No preview available for this file type</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const FolderItem = ({ 
  folder, 
  folders, 
  selectedFolderId, 
  onSelect, 
  onDelete, 
  onRename,
  onSync,
  level = 0,
  isAdmin = false
}: { 
  folder: Folder; 
  folders: Folder[]; 
  selectedFolderId: string | null; 
  onSelect: (id: string) => void; 
  onDelete: (e: React.MouseEvent, id: string) => void;
  onRename: (e: React.MouseEvent, folder: Folder) => void;
  onSync: (e: React.MouseEvent, id: string) => void;
  level?: number;
  isAdmin?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const subFolders = folders
    .filter(f => f.parentId === folder.id)
    .sort((a, b) => a.name.localeCompare(b.name));
  
  const isSelected = selectedFolderId === folder.id;

  return (
    <div>
      <div 
        onClick={() => {
          onSelect(folder.id);
          setIsOpen(!isOpen);
        }}
        className={cn(
          "group flex items-center justify-between px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all cursor-pointer",
          isSelected ? "bg-zinc-900 text-white shadow-md" : "text-zinc-600 hover:bg-zinc-100"
        )}
        style={{ paddingLeft: `${level * 10 + 12}px` }}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          {subFolders.length > 0 ? (
            isOpen ? <ChevronDown size={10} className="flex-shrink-0" /> : <ChevronRight size={10} className="flex-shrink-0" />
          ) : (
            <div className="w-[10px]" />
          )}
          <FolderIcon size={12} className={isSelected ? "text-white" : "text-zinc-400"} />
          <span className="whitespace-nowrap">{folder.name}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isAdmin && (
            <>
              <button 
                onClick={async (e) => {
                  e.stopPropagation();
                  setIsSyncing(true);
                  try {
                    await onSync(e, folder.id);
                  } finally {
                    setIsSyncing(false);
                  }
                }}
                disabled={isSyncing}
                className={cn(
                  "p-1 rounded text-zinc-400 transition-colors",
                  isSyncing ? "text-emerald-500 animate-pulse" : "hover:bg-zinc-200 hover:text-zinc-900"
                )}
                title="Sync to Google Drive"
              >
                <CloudUpload size={10} />
              </button>
              <button 
                onClick={(e) => onRename(e, folder)}
                className="p-1 hover:bg-zinc-200 rounded text-zinc-400 hover:text-zinc-900 transition-colors"
                title="Rename"
              >
                <Edit2 size={10} />
              </button>
              <button 
                onClick={(e) => onDelete(e, folder.id)}
                className="p-1 hover:bg-red-50 rounded text-zinc-400 hover:text-red-500 transition-colors"
                title="Delete"
              >
                <Trash2 size={10} />
              </button>
            </>
          )}
        </div>
      </div>
      
      {isOpen && subFolders.length > 0 && (
        <div className="mt-1">
          {subFolders.map(sub => {
            const Item = FolderItem as any;
            return (
              <Item 
                key={sub.id} 
                folder={sub} 
                folders={folders} 
                selectedFolderId={selectedFolderId} 
                onSelect={onSelect} 
                onDelete={onDelete}
                onRename={onRename}
                onSync={onSync}
                level={level + 1}
                isAdmin={isAdmin}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

interface UploadingFile {
  id: string;
  name: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

const Dashboard = ({ user, isDemo = false, isAdmin = false, onLoginClick, onLogout }: { user: User | { uid: string; photoURL?: string; displayName?: string; email?: string }; isDemo?: boolean; isAdmin?: boolean; onLoginClick?: () => void; onLogout?: () => void }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [renameItem, setRenameItem] = useState<{ id: string; name: string; type: 'asset' | 'folder' } | null>(null);
  const [deleteItem, setDeleteItem] = useState<{ id: string; name: string; type: 'asset' | 'folder'; asset?: Asset } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [gridSize, setGridSize] = useState(4); // 1 to 5, default 4 (Large/3 columns)
  const [isSyncing, setIsSyncing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [driveStatus, setDriveStatus] = useState<{ connected: boolean; folderId: string } | null>(null);

  useEffect(() => {
    fetch('/api/drive-status')
      .then(res => {
        if (!res.ok) throw new Error('Backend not available');
        return res.json();
      })
      .then(data => setDriveStatus(data))
      .catch(() => {
        // Fallback for static/serverless mode
        setDriveStatus({ 
          connected: !!GOOGLE_SCRIPT_URL, 
          folderId: TARGET_DRIVE_FOLDER_ID 
        });
      });
  }, []);

  const handleImportFromDrive = async () => {
    if (isImporting) return;
    setIsImporting(true);
    try {
      let data;
      let isServerless = false;

      try {
        const res = await fetch('/api/drive-list');
        if (!res.ok) throw new Error('Backend not available');
        data = await res.json();
      } catch (e) {
        console.log('Backend not available, trying direct Drive access...');
        isServerless = true;
        const res = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'cors',
          body: JSON.stringify({ action: "listAll", targetDriveFolderId: TARGET_DRIVE_FOLDER_ID }),
          headers: { "Content-Type": "text/plain;charset=utf-8" }, // Use text/plain to avoid preflight issues with some CORS configs
        });
        data = await res.json();
      }
      
      if (data && data.folders && data.files) {
        if (isServerless || isStaticEnv()) {
          // Save to local storage directly
          localService.saveFolders(data.folders);
          localService.saveAssets(data.files);
          setFolders(data.folders);
          setAssets(data.files);
          alert(`Đã tải thành công ${data.folders.length} thư mục và ${data.files.length} file từ Google Drive về trình duyệt!`);
        } else {
          // Save to backend
          const importRes = await fetch('/api/import-from-drive', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          const importData = await importRes.json();
          if (importData.success) {
            alert(`Đã nhập thành công ${data.folders.length} thư mục và ${data.files.length} file từ Google Drive!`);
            // Refresh data from backend
            const assetsRes = await fetch('/api/assets');
            const foldersRes = await fetch('/api/folders');
            setAssets(await assetsRes.json());
            setFolders(await foldersRes.json());
          }
        }
      } else {
        alert('Không tìm thấy dữ liệu trên Drive hoặc Script gặp lỗi.');
      }
    } catch (error) {
      console.error('Import from Drive failed:', error);
      alert('Lỗi khi lấy dữ liệu từ Drive. Vui lòng kiểm tra kết nối internet hoặc cấu hình Script.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await fetch('/api/sync-all', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('Đã bắt đầu đồng bộ toàn bộ dữ liệu lên Google Drive!');
      } else {
        alert('Đồng bộ thất bại: ' + (data.error || 'Lỗi không xác định'));
      }
    } catch (error) {
      console.error('Manual sync failed:', error);
      alert('Đồng bộ thất bại. Vui lòng kiểm tra console.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncAsset = async (asset: Asset) => {
    if (isDemo) {
      alert('Tính năng đồng bộ Google Drive chỉ khả dụng ở chế độ Quản trị.');
      return;
    }
    try {
      try {
        const res = await fetch(`/api/sync-asset/${asset.id}`, { method: 'POST' });
        if (!res.ok) throw new Error('Backend not available');
        const data = await res.json();
        if (!data.success) {
          alert('Đồng bộ file thất bại: ' + (data.error || 'Lỗi không xác định'));
        }
      } catch (e) {
        console.log("Backend sync failed, trying direct Drive sync...");
        const path = getFolderPath(asset.folderId || null, folders);
        const res = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'cors',
          body: JSON.stringify({
            action: "uploadFile",
            id: asset.id,
            name: asset.name,
            type: asset.type,
            content: asset.content,
            size: asset.size,
            mimeType: asset.mimeType,
            ownerId: asset.ownerId,
            folderId: asset.folderId,
            path,
            targetDriveFolderId: TARGET_DRIVE_FOLDER_ID,
            timestamp: new Date().toISOString()
          }),
          headers: { "Content-Type": "text/plain;charset=utf-8" },
        });
        const data = await res.json();
        if (data.success) {
          // Success
        } else {
          alert('Đồng bộ trực tiếp thất bại. Vui lòng kiểm tra Script.');
        }
      }
    } catch (error) {
      console.error('Asset sync failed:', error);
      alert('Đồng bộ file thất bại. Vui lòng kiểm tra console.');
    }
  };

  const handleSyncFolder = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (isDemo) {
      alert('Tính năng đồng bộ Google Drive chỉ khả dụng ở chế độ Quản trị.');
      return;
    }
    const folder = folders.find(f => f.id === id);
    if (!folder) return;

    try {
      try {
        const res = await fetch(`/api/sync-folder/${id}`, { method: 'POST' });
        if (!res.ok) throw new Error('Backend not available');
        const data = await res.json();
        if (!data.success) {
          alert('Đồng bộ thư mục thất bại: ' + (data.error || 'Lỗi không xác định'));
        }
      } catch (err) {
        console.log("Backend sync failed, trying direct Drive sync...");
        const path = getFolderPath(folder.parentId || null, folders);
        const res = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'cors',
          body: JSON.stringify({
            action: "createFolder",
            id: folder.id,
            name: folder.name,
            parentId: folder.parentId,
            path,
            targetDriveFolderId: TARGET_DRIVE_FOLDER_ID,
            timestamp: new Date().toISOString()
          }),
          headers: { "Content-Type": "text/plain;charset=utf-8" },
        });
        const data = await res.json();
        if (data.success) {
          // Success
        } else {
          alert('Đồng bộ trực tiếp thất bại. Vui lòng kiểm tra Script.');
        }
      }
    } catch (error) {
      console.error('Folder sync failed:', error);
      alert('Đồng bộ thư mục thất bại. Vui lòng kiểm tra console.');
    }
  };

  const handleUpload = async (files: File[]) => {
    const newUploadingFiles = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      name: file.name,
      progress: 0,
      status: 'uploading' as const
    }));

    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

    // Process uploads
    files.forEach(async (file, index) => {
      const uploadId = newUploadingFiles[index].id;
      console.log(`Starting upload for ${file.name} (${uploadId})`);
      
      try {
        let contentUrl = '';
        let storagePath = '';
        let fileToUpload = file;

        // 1. Compression step (0-10%)
        // Skip compression for PNG files to preserve metadata (PNG info)
        if (file.type.startsWith('image/') && file.type !== 'image/png' && file.size > 200 * 1024) {
          setUploadingFiles(prev => prev.map(f => 
            f.id === uploadId ? { ...f, progress: 5 } : f
          ));
          
          try {
            const options = {
              maxSizeMB: 0.4,
              maxWidthOrHeight: 1280,
              useWebWorker: true
            };
            fileToUpload = await imageCompression(file, options) as File;
            console.log(`Compression complete for ${file.name}`);
          } catch (compressionError) {
            console.warn("Compression failed, uploading original:", compressionError);
          }
        }
        
        setUploadingFiles(prev => prev.map(f => 
          f.id === uploadId ? { ...f, progress: 10 } : f
        ));

        if (isDemo) {
          // Demo mode: Store in LocalStorage as Base64
          contentUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsDataURL(fileToUpload);
          });
          storagePath = 'local-storage';
        } else {
          try {
            // Local API Upload
            const formData = new FormData();
            formData.append('file', fileToUpload);

            const response = await fetch('/api/upload', {
              method: 'POST',
              body: formData
            });

            if (!response.ok) throw new Error('Backend not available');
            
            const uploadResult = await response.json();
            contentUrl = uploadResult.url;
            storagePath = uploadResult.isCloudinary ? `cloudinary/${uploadResult.filename}` : `uploads/${uploadResult.filename}`;
          } catch (e) {
            console.log("Backend upload failed, using serverless mode (Base64)");
            contentUrl = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => reject(new Error("Failed to read file"));
              reader.readAsDataURL(fileToUpload);
            });
            storagePath = 'serverless-storage';
          }
        }

        // 3. Metadata step (90-100%)
        setUploadingFiles(prev => prev.map(f => 
          f.id === uploadId ? { ...f, progress: 95 } : f
        ));

        const isTextFile = file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.csv');
        const assetData = {
          id: Math.random().toString(36).substring(7),
          name: file.name,
          type: file.type.startsWith('image/') ? 'image' : (isTextFile ? 'text' : 'file') as any,
          content: contentUrl,
          storagePath,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          ownerId: user.uid,
          folderId: selectedFolderId || null,
        };

        if (isDemo) {
          localService.addAsset(assetData as any);
          setAssets(localService.getAssets());
        } else {
          try {
            const res = await fetch('/api/assets', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(assetData)
            });
            if (!res.ok) throw new Error('Backend not available');
            
            // Refresh
            const refreshRes = await fetch('/api/assets');
            const data = await refreshRes.json();
            setAssets(data);
          } catch (e) {
            console.log("Backend save asset failed, using local storage");
            localService.addAsset(assetData as any);
            setAssets(localService.getAssets());
          }
        }

        setUploadingFiles(prev => prev.map(f => 
          f.id === uploadId ? { ...f, status: 'completed', progress: 100 } : f
        ));

        // Remove from list after a delay
        setTimeout(() => {
          setUploadingFiles(prev => prev.filter(f => f.id !== uploadId));
        }, 3000);

      } catch (error: any) {
        console.error("Upload error for", file.name, ":", error);
        setUploadingFiles(prev => prev.map(f => 
          f.id === uploadId ? { ...f, status: 'error', error: error.message || 'Upload failed' } : f
        ));
      }
    });
  };

  // Fetch Folders
  useEffect(() => {
    if (isDemo) {
      setFolders(localService.getFolders());
      return;
    }

    if (!user?.uid) return;

    const fetchFolders = async () => {
      try {
        const res = await fetch('/api/folders');
        if (!res.ok) throw new Error('Backend not available');
        const data = await res.json();
        setFolders(data);
      } catch (error) {
        console.log("Backend folders failed, using local storage");
        setFolders(localService.getFolders());
      }
    };

    fetchFolders();
    
    if (!isDemo) {
      const socket = io();
      socket.on("data:updated", fetchFolders);
      return () => {
        socket.off("data:updated", fetchFolders);
        socket.disconnect();
      };
    }
  }, [user?.uid, isDemo]);

  // Fetch Assets
  useEffect(() => {
    if (isDemo) {
      setAssets(localService.getAssets());
      setLoading(false);
      return;
    }

    if (!user?.uid) return;

    const fetchAssets = async () => {
      try {
        const res = await fetch('/api/assets');
        if (!res.ok) throw new Error('Backend not available');
        const data = await res.json();
        setAssets(data);
        setLoading(false);
      } catch (error) {
        console.log("Backend assets failed, using local storage");
        setAssets(localService.getAssets());
        setLoading(false);
      }
    };

    fetchAssets();
    
    if (!isDemo) {
      const socket = io();
      socket.on("data:updated", fetchAssets);
      return () => {
        socket.off("data:updated", fetchAssets);
        socket.disconnect();
      };
    }
  }, [user?.uid, isDemo]);

  useEffect(() => {
    const preventDefault = (e: DragEvent) => {
      if (e.dataTransfer) {
        // Only prevent if it's not our own drag
      }
    };
    window.addEventListener('dragover', preventDefault);
    window.addEventListener('drop', preventDefault);
    return () => {
      window.removeEventListener('dragover', preventDefault);
      window.removeEventListener('drop', preventDefault);
    };
  }, []);

  const handleCreateFolder = async (name: string) => {
    try {
      const folderData = {
        id: Math.random().toString(36).substring(7),
        name,
        ownerId: user.uid,
        parentId: selectedFolderId || null,
      };

      if (isDemo) {
        localService.addFolder(folderData as any);
        setFolders(localService.getFolders());
      } else {
        try {
          const res = await fetch('/api/folders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(folderData)
          });
          if (!res.ok) throw new Error('Backend not available');
          
          // Trigger immediate refresh
          const refreshRes = await fetch('/api/folders');
          const data = await refreshRes.json();
          setFolders(data);
        } catch (e) {
          console.log("Backend create folder failed, using local storage");
          localService.addFolder(folderData as any);
          setFolders(localService.getFolders());
          
          // In serverless mode, we should also try to sync this folder to Drive if possible
          // But for now, let's just keep it local and rely on manual sync if needed
        }
      }
    } catch (error) {
      console.error("Error creating folder:", error);
    }
  };

  const handleDelete = async (asset: Asset) => {
    setDeleteItem({ id: asset.id, name: asset.name, type: 'asset', asset });
  };

  const handleDeleteFolder = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const folder = folders.find(f => f.id === id);
    if (folder) {
      setDeleteItem({ id, name: folder.name, type: 'folder' });
    }
  };

  const executeDelete = async () => {
    if (!deleteItem) return;
    try {
      if (deleteItem.type === 'asset' && deleteItem.asset) {
        const asset = deleteItem.asset;
        if (isDemo) {
          localService.deleteAsset(asset.id);
          setAssets(localService.getAssets());
        } else {
          try {
            const res = await fetch(`/api/assets/${asset.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Backend not available');
            // Refresh
            const refreshRes = await fetch('/api/assets');
            const data = await refreshRes.json();
            setAssets(data);
          } catch (e) {
            console.log("Backend delete asset failed, using local storage");
            localService.deleteAsset(asset.id);
            setAssets(localService.getAssets());
          }
        }
      } else if (deleteItem.type === 'folder') {
        const id = deleteItem.id;
        if (isDemo) {
          localService.deleteFolder(id);
          setFolders(localService.getFolders());
          setAssets(localService.getAssets());
        } else {
          try {
            const res = await fetch(`/api/folders/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Backend not available');
            // Refresh
            const resF = await fetch('/api/folders');
            const dataF = await resF.json();
            setFolders(dataF);
            const resA = await fetch('/api/assets');
            const dataA = await resA.json();
            setAssets(dataA);
          } catch (e) {
            console.log("Backend delete folder failed, using local storage");
            localService.deleteFolder(id);
            setFolders(localService.getFolders());
            setAssets(localService.getAssets());
          }
        }
        if (selectedFolderId === id) setSelectedFolderId(null);
      }
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const handleRename = async (newName: string) => {
    if (!renameItem) return;
    try {
      if (isDemo) {
        if (renameItem.type === 'asset') {
          localService.updateAsset(renameItem.id, { name: newName });
          setAssets(localService.getAssets());
        } else {
          const folders = localService.getFolders();
          localService.saveFolders(folders.map(f => f.id === renameItem.id ? { ...f, name: newName } : f));
          setFolders(localService.getFolders());
        }
      } else {
        try {
          const endpoint = renameItem.type === 'asset' ? 'assets' : 'folders';
          const res = await fetch(`/api/${endpoint}/${renameItem.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName })
          });
          if (!res.ok) throw new Error('Backend not available');
          
          // Refresh
          if (renameItem.type === 'asset') {
            const refreshRes = await fetch('/api/assets');
            const data = await refreshRes.json();
            setAssets(data);
          } else {
            const refreshRes = await fetch('/api/folders');
            const data = await refreshRes.json();
            setFolders(data);
          }
        } catch (e) {
          console.log("Backend rename failed, using local storage");
          if (renameItem.type === 'asset') {
            localService.updateAsset(renameItem.id, { name: newName });
            setAssets(localService.getAssets());
          } else {
            const folders = localService.getFolders();
            localService.saveFolders(folders.map(f => f.id === renameItem.id ? { ...f, name: newName } : f));
            setFolders(localService.getFolders());
          }
        }
      }
    } catch (error) {
      console.error("Error renaming:", error);
    }
  };

  // Alphabetical Sorting
  const sortedFolders = [...folders].sort((a, b) => a.name.localeCompare(b.name));
  const sortedAssets = [...assets].sort((a, b) => a.name.localeCompare(b.name));

  const filteredAssets = sortedAssets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = selectedFolderId ? asset.folderId === selectedFolderId : !asset.folderId;
    return matchesSearch && matchesFolder;
  });

  const rootFolders = sortedFolders.filter(f => !f.parentId);

  const selectedFolderName = selectedFolderId 
    ? folders.find(f => f.id === selectedFolderId)?.name 
    : 'All Assets';

  return (
    <div className="h-screen flex flex-col bg-[#f5f5f4] text-zinc-900 font-sans overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-6 py-2 flex-shrink-0">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 bg-zinc-900 rounded-lg flex items-center justify-center cursor-pointer"
              onClick={onLoginClick}
            >
              <Upload className="text-white w-2 h-2" />
            </div>
            <h1 className="text-[12px] font-semibold tracking-tight hidden sm:block">AssetHub</h1>
          </div>

          <div className="flex items-center gap-2">
            <div className={cn(
              "px-1.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-widest flex items-center gap-1",
              isAdmin ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-zinc-100 text-zinc-500 border-zinc-200"
            )}>
              {isAdmin ? "Admin" : "Public"}
            </div>
            {driveStatus?.connected && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-[8px] font-bold uppercase tracking-wider">
                <Cloud size={8} />
                <span>Drive Synced</span>
              </div>
            )}
          </div>

          <div className="flex-1 max-w-[100px] relative">
            <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 text-zinc-400" size={10} />
            <input 
              type="text" 
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-6 pr-1.5 py-0.5 bg-zinc-100 border-transparent focus:bg-white focus:border-zinc-300 rounded-lg text-[10px] transition-all outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {isAdmin && (
              <button 
                onClick={handleManualSync}
                disabled={isSyncing}
                className={cn(
                  "hidden md:flex items-center justify-center p-1 rounded-lg transition-all shadow-sm",
                  isSyncing ? "bg-zinc-100 text-zinc-400" : "bg-white text-zinc-900 hover:bg-zinc-50 border border-zinc-200"
                )}
                title="Đồng bộ lên Drive"
              >
                <Download size={12} className={cn(isSyncing && "animate-bounce")} />
              </button>
            )}
            {isAdmin && (
              <button 
                onClick={handleImportFromDrive}
                disabled={isImporting}
                className={cn(
                  "hidden md:flex items-center justify-center p-1 rounded-lg transition-all shadow-sm",
                  isImporting ? "bg-zinc-100 text-zinc-400" : "bg-white text-zinc-900 hover:bg-zinc-50 border border-zinc-200"
                )}
                title="Lấy dữ liệu từ Drive"
              >
                <RefreshCw size={12} className={cn(isImporting && "animate-spin")} />
              </button>
            )}
            {isAdmin && (
              <button 
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.multiple = true;
                  input.onchange = (e) => {
                    const files = Array.from((e.target as HTMLInputElement).files || []);
                    if (files.length > 0) handleUpload(files);
                  };
                  input.click();
                }}
                className="hidden md:flex items-center justify-center p-1 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-all shadow-sm"
              >
                <Plus size={12} />
              </button>
            )}
            {user.uid !== 'public_user' ? (
              <button onClick={() => onLogout?.()} className="p-0.5 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Logout">
                <LogOut size={12} />
              </button>
            ) : (
              <button onClick={onLoginClick} className="p-0.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-all" title="Login">
                <UserIcon size={12} />
              </button>
            )}
            <div className="flex items-center gap-1 pl-1 border-l border-zinc-200">
              <div className="hidden lg:block text-right">
                <p className="text-[9px] font-bold text-zinc-900 truncate max-w-[120px]">{user.displayName || (isAdmin ? 'Admin' : 'Guest')}</p>
                <p className="text-[7px] text-zinc-400 truncate max-w-[120px]">{isAdmin ? user.email : 'Read-only'}</p>
              </div>
              <img 
                src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email || 'U'}&background=18181b&color=fff`} 
                alt={user.displayName || 'User'} 
                className="w-6 h-6 rounded-full border border-zinc-200 object-cover" 
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 flex overflow-hidden max-w-7xl mx-auto w-full">
        {/* Left Column - Folders */}
        <aside className="w-56 bg-white border-r border-zinc-200 flex flex-col flex-shrink-0">
          <div className="p-1.5 flex items-center justify-between">
            <h2 className="text-[8px] font-bold uppercase tracking-widest text-zinc-400">Folders</h2>
            {isAdmin && (
              <button 
                onClick={() => setIsFolderModalOpen(true)}
                className="p-1.5 hover:bg-zinc-100 rounded-xl transition-all text-zinc-900 border border-zinc-200 shadow-sm"
                title="New Folder"
              >
                <FolderPlus size={14} />
              </button>
            )}
          </div>
          
          <nav className="flex-1 overflow-y-auto px-2 pb-6 space-y-1">
            <button 
              onClick={() => setSelectedFolderId(null)}
              className={cn(
                "w-full flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-all",
                !selectedFolderId ? "bg-zinc-900 text-white shadow-md" : "text-zinc-600 hover:bg-zinc-100"
              )}
            >
              <Grid size={14} />
              Root Assets
            </button>
            
            {rootFolders.map(folder => {
              const Item = FolderItem as any;
              return (
                <Item 
                  key={folder.id} 
                  folder={folder} 
                  folders={sortedFolders} 
                  selectedFolderId={selectedFolderId} 
                  onSelect={setSelectedFolderId} 
                  onDelete={handleDeleteFolder}
                  onRename={(e: React.MouseEvent, f: Folder) => {
                    e.stopPropagation();
                    setRenameItem({ id: f.id, name: f.name, type: 'folder' });
                  }}
                  onSync={handleSyncFolder}
                  isAdmin={isAdmin}
                />
              );
            })}
          </nav>

          <div className="p-4 border-t border-zinc-100">
            <div className="bg-zinc-50 rounded-xl p-3">
              <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">Storage</p>
              <div className="h-1 bg-zinc-200 rounded-full overflow-hidden">
                <div className="h-full bg-zinc-900 w-1/5" />
              </div>
              <p className="text-[9px] text-zinc-500 mt-1.5 font-medium truncate">
                Local Server Storage
              </p>
            </div>
          </div>
        </aside>

        {/* Right Column - Assets */}
        <main className="flex-1 flex flex-col bg-[#f5f5f4] overflow-hidden relative">
          <div className="p-3 flex-shrink-0 flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-zinc-400 mb-0.5">
                {selectedFolderId && (
                  <button onClick={() => setSelectedFolderId(null)} className="hover:text-zinc-900 transition-colors">
                    <ArrowLeft size={10} />
                  </button>
                )}
                <span className="text-[8px] font-bold uppercase tracking-widest">Library</span>
              </div>
              <h2 className="text-base font-semibold tracking-tight text-zinc-900 mb-0">{selectedFolderName}</h2>
              <p className="text-[9px] text-zinc-500 font-medium">
                {filteredAssets.length} {filteredAssets.length === 1 ? 'asset' : 'assets'} in this view
              </p>
            </div>

            {/* View Controls */}
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-1 rounded-lg transition-all",
                    viewMode === 'grid' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                  )}
                >
                  <Grid size={14} />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-1 rounded-lg transition-all",
                    viewMode === 'list' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                  )}
                >
                  <ListIcon size={14} />
                </button>
              </div>

              {viewMode === 'grid' && (
                <div className="hidden md:flex items-center gap-2">
                  <button onClick={() => setGridSize(Math.max(1, gridSize - 1))} className="text-zinc-400 hover:text-zinc-600">
                    <Search size={10} className="scale-90" />
                  </button>
                  <input 
                    type="range" 
                    min="1" 
                    max="5" 
                    step="1"
                    value={gridSize}
                    onChange={(e) => setGridSize(parseInt(e.target.value))}
                    className="w-16 h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900"
                  />
                  <button onClick={() => setGridSize(Math.min(5, gridSize + 1))} className="text-zinc-400 hover:text-zinc-600">
                    <Search size={14} />
                  </button>
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest w-10">
                    {gridSize === 1 ? 'Tiny' : gridSize === 2 ? 'Small' : gridSize === 3 ? 'Medium' : gridSize === 4 ? 'Large' : 'Huge'}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {isAdmin && (
                <>
                  <button 
                    onClick={() => setIsFolderModalOpen(true)}
                    className="flex items-center justify-center p-2 bg-white border border-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-50 transition-all"
                    title="New Subfolder"
                  >
                    <FolderPlus size={14} />
                  </button>
                  <button 
                    onClick={() => setIsUploadModalOpen(true)}
                    className="flex items-center justify-center p-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-all shadow-sm hover:shadow-md"
                    title="Upload"
                  >
                    <Plus size={14} />
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 pb-12">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <Loader2 className="w-10 h-10 text-zinc-300 animate-spin" />
                <p className="text-zinc-400 font-medium">Loading your library...</p>
              </div>
            ) : filteredAssets.length > 0 ? (
              <div className={cn(
                viewMode === 'grid' 
                  ? "grid gap-6" 
                  : "flex flex-col bg-white rounded-2xl border border-zinc-200 overflow-hidden"
              )}
              style={viewMode === 'grid' ? {
                gridTemplateColumns: `repeat(${gridSize === 1 ? 6 : gridSize === 2 ? 5 : gridSize === 3 ? 4 : gridSize === 4 ? 3 : 2}, minmax(0, 1fr))`
              } : {}}
              >
                <AnimatePresence mode="popLayout">
                  {/* Uploading placeholders */}
                  {uploadingFiles.map(file => (
                    <motion.div 
                      key={file.id} 
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className={cn(
                        "bg-white rounded-3xl border border-zinc-200 p-4 flex flex-col gap-3",
                        viewMode === 'list' && "flex-row items-center h-16"
                      )}
                    >
                      <div className={cn(
                        "bg-zinc-100 rounded-2xl flex items-center justify-center relative overflow-hidden",
                        viewMode === 'grid' ? "aspect-video" : "w-10 h-10 flex-shrink-0"
                      )}>
                        <Loader2 className="w-5 h-5 text-zinc-300 animate-spin z-10" />
                        <motion.div 
                          className="absolute bottom-0 left-0 h-1 bg-zinc-900/10" 
                          initial={{ width: 0 }}
                          animate={{ width: `${file.progress}%` }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate text-zinc-400">{file.name}</p>
                        {viewMode === 'grid' && (
                          <div className="mt-2 h-1 bg-zinc-100 rounded-full overflow-hidden">
                            <motion.div 
                              className="h-full bg-zinc-900" 
                              initial={{ width: 0 }}
                              animate={{ width: `${file.progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}

                  {filteredAssets.map((asset: any) => {
                    const Card = AssetCard as any;
                    return (
                      <Card 
                        key={asset.id} 
                        asset={asset} 
                        viewMode={viewMode}
                        onDelete={handleDelete}
                        onPreview={setPreviewAsset}
                        onRename={(a: Asset) => setRenameItem({ id: a.id, name: a.name, type: 'asset' })}
                        onSync={handleSyncAsset}
                        isAdmin={isAdmin}
                      />
                    );
                  })}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="w-20 h-20 bg-zinc-100 rounded-[32px] flex items-center justify-center mb-6">
                  <FileIcon className="text-zinc-300 w-10 h-10" />
                </div>
                <h3 className="text-xl font-semibold text-zinc-900 mb-2">No assets found</h3>
                <p className="text-zinc-500 max-w-xs mx-auto mb-8">
                  {searchQuery ? "We couldn't find any assets matching your search." : "This folder is empty. Start by uploading your first image or text file."}
                </p>
                {!searchQuery && (
                  <button 
                    onClick={() => setIsUploadModalOpen(true)}
                    className="px-8 py-3 bg-white border border-zinc-200 rounded-2xl font-medium hover:bg-zinc-50 transition-all"
                  >
                    Upload your first asset
                  </button>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      <PreviewModal 
        asset={previewAsset} 
        onClose={() => setPreviewAsset(null)} 
        onRename={(a: Asset) => setRenameItem({ id: a.id, name: a.name, type: 'asset' })}
        onDelete={handleDelete}
        isAdmin={isAdmin}
      />
      <CreateFolderModal isOpen={isFolderModalOpen} onClose={() => setIsFolderModalOpen(false)} onCreate={handleCreateFolder} parentFolderName={selectedFolderName} />
      <UploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
        onUpload={handleUpload}
        uploadingFiles={uploadingFiles}
      />
      <RenameModal 
        isOpen={!!renameItem} 
        onClose={() => setRenameItem(null)} 
        onRename={handleRename} 
        initialName={renameItem?.name || ''} 
        title={`Rename ${renameItem?.type === 'asset' ? 'Asset' : 'Folder'}`}
      />
      <DeleteModal
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onDelete={executeDelete}
        title={`Delete ${deleteItem?.type === 'asset' ? 'Asset' : 'Folder'}`}
        message={deleteItem?.type === 'asset' 
          ? `Are you sure you want to delete "${deleteItem?.name}"? This action cannot be undone.`
          : `Delete folder "${deleteItem?.name}"? Assets inside will remain but won't be in this folder anymore.`}
      />
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | { uid: string; email?: string; displayName?: string } | null>(() => {
    const saved = localStorage.getItem('assethub_user');
    if (saved) return JSON.parse(saved);
    return { 
      uid: 'public_user', 
      email: 'public@assethub.local', 
      displayName: 'Public Guest' 
    };
  });
  const [loading, setLoading] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const handleLogin = (password: string) => {
    if (password === ADMIN_PASSWORD) {
      const adminUser = {
        uid: 'admin_user',
        email: 'admin@assethub.local',
        displayName: 'Administrator'
      };
      setUser(adminUser);
      localStorage.setItem('assethub_user', JSON.stringify(adminUser));
      setIsDemo(false);
      setShowLogin(false);
    }
  };

  const handleLogout = () => {
    const guestUser = { 
      uid: 'public_user', 
      email: 'public@assethub.local', 
      displayName: 'Public Guest' 
    };
    setUser(guestUser);
    localStorage.removeItem('assethub_user');
    setIsDemo(false);
  };

  const isAdmin = !isDemo && user?.uid === 'admin_user';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f4]">
        <Loader2 className="w-10 h-10 text-zinc-300 animate-spin" />
      </div>
    );
  }

  if (showLogin) {
    return <Login onLogin={handleLogin} onDemoMode={() => setShowLogin(false)} />;
  }

  return <Dashboard user={user!} isDemo={isDemo} isAdmin={isAdmin} onLoginClick={() => setShowLogin(true)} onLogout={handleLogout} />;
}
