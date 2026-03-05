import React, { useState, useEffect, useCallback, Component } from 'react';
import { 
  auth, 
  db, 
  storage,
  handleFirestoreError, 
  OperationType 
} from './firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  orderBy, 
  Timestamp,
  updateDoc 
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
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
  Check
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

const Login = () => {
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f4]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[32px] shadow-sm border border-zinc-200 p-12 text-center"
      >
        <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-8">
          <Upload className="text-white w-8 h-8" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 mb-3">AssetHub</h1>
        <p className="text-zinc-500 mb-10">Manage and organize your digital assets in one place.</p>
        <button 
          onClick={handleLogin}
          className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-medium hover:bg-zinc-800 transition-all flex items-center justify-center gap-3"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
          Continue with Google
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
  viewMode = 'grid'
}: { 
  asset: Asset; 
  onDelete: (asset: Asset) => void | Promise<void>; 
  onPreview: (asset: Asset) => void; 
  onRename: (asset: Asset) => void;
  viewMode?: 'grid' | 'list';
}) => {
  const [isCopying, setIsCopying] = useState(false);
  const isText = asset.type === 'text' || asset.mimeType.includes('text') || asset.name.endsWith('.txt') || asset.name.endsWith('.md');

  const handleDragStart = (e: React.DragEvent) => {
    const downloadUrl = `${asset.mimeType}:${asset.name}:${asset.content}`;
    e.dataTransfer.setData('DownloadURL', downloadUrl);
    e.dataTransfer.setData('text/plain', asset.content);
    e.dataTransfer.setData('text/uri-list', asset.content);
    e.dataTransfer.setData('text/html', `<img src="${asset.content}" alt="${asset.name}">`);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleCopyContent = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCopying(true);
    try {
      const response = await fetch(asset.content);
      const text = await response.text();
      await navigator.clipboard.writeText(text);
      setTimeout(() => setIsCopying(false), 2000);
    } catch (err) {
      console.error('Failed to copy content:', err);
      setIsCopying(false);
    }
  };

  if (viewMode === 'list') {
    return (
      <motion.div 
        layout
        draggable
        onDragStart={handleDragStart}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="group flex items-center justify-between p-3 bg-white hover:bg-zinc-50 border-b border-zinc-100 transition-colors cursor-grab active:cursor-grabbing"
      >
        <div 
          onClick={() => onPreview(asset)}
          className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
        >
          <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {asset.type === 'image' ? (
              <img src={asset.content} alt="" className="w-full h-full object-cover pointer-events-none" referrerPolicy="no-referrer" />
            ) : (
              <FileIcon size={18} className="text-zinc-400 pointer-events-none" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-zinc-900 truncate">{asset.name}</h3>
            <p className="text-[11px] text-zinc-500 uppercase tracking-wider">
              {format(asset.createdAt.toDate(), 'MMM d, yyyy')} • {(asset.size / 1024).toFixed(1)} KB
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {isText && (
            <button 
              onClick={handleCopyContent} 
              className={cn(
                "p-2 rounded-lg transition-colors",
                isCopying ? "bg-emerald-100 text-emerald-600" : "hover:bg-zinc-200 text-zinc-600"
              )}
              title="Copy content"
            >
              {isCopying ? <Check size={16} /> : <Copy size={16} />}
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onRename(asset); }} className="p-2 hover:bg-zinc-200 rounded-lg text-zinc-600 transition-colors"><Edit2 size={16} /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(asset); }} className="p-2 hover:bg-red-100 rounded-lg text-red-600 transition-colors"><Trash2 size={16} /></button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      layout
      draggable
      onDragStart={handleDragStart}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative bg-white rounded-2xl border border-zinc-200 overflow-hidden hover:shadow-md transition-all h-full flex flex-col cursor-grab active:cursor-grabbing"
    >
      <div 
        onClick={() => onPreview(asset)}
        className="aspect-[2/3] bg-zinc-50 flex items-center justify-center relative overflow-hidden cursor-pointer"
      >
        {asset.type === 'image' ? (
          <img 
            src={asset.content} 
            alt={asset.name} 
            className="w-full h-full object-cover pointer-events-none"
            referrerPolicy="no-referrer"
          />
        ) : asset.type === 'text' ? (
          <div className="flex flex-col items-center gap-2 pointer-events-none">
            <FileText className="w-12 h-12 text-zinc-300" />
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Text File</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 pointer-events-none">
            <FileIcon className="w-12 h-12 text-zinc-300" />
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">File</span>
          </div>
        )}
      </div>
      
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          {isText && (
            <button 
              onClick={handleCopyContent} 
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                isCopying ? "bg-emerald-100 text-emerald-600" : "hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900"
              )}
              title="Copy content"
            >
              {isCopying ? <Check size={14} /> : <Copy size={14} />}
            </button>
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); onRename(asset); }}
            className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-zinc-900 transition-colors"
            title="Rename"
          >
            <Edit2 size={14} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(asset); }}
            className="p-1.5 hover:bg-red-50 rounded-lg text-zinc-500 hover:text-red-600 transition-colors"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
          <div className="ml-auto text-[10px] text-zinc-400 font-medium uppercase tracking-wider">
            {(asset.size / 1024).toFixed(1)} KB
          </div>
        </div>

        <h3 className="text-sm font-semibold text-zinc-900 truncate mb-1" title={asset.name}>
          {asset.name}
        </h3>
        <div className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">
          {format(asset.createdAt.toDate(), 'MMM d, yyyy')}
        </div>
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
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl p-8">
            <h2 className="text-2xl font-semibold text-zinc-900 mb-6">{title}</h2>
            <form onSubmit={handleSubmit}>
              <input 
                autoFocus
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-100 border-transparent focus:bg-white focus:border-zinc-300 rounded-xl text-sm transition-all outline-none mb-6"
              />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={onClose} className="px-6 py-2.5 text-zinc-600 font-medium hover:bg-zinc-100 rounded-xl transition-colors">Cancel</button>
                <button 
                  type="submit" 
                  disabled={isRenaming || !name.trim() || name === initialName}
                  className="px-6 py-2.5 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
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
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl p-8">
            <h2 className="text-2xl font-semibold text-zinc-900 mb-2">New Folder</h2>
            {parentFolderName && <p className="text-sm text-zinc-500 mb-6">Creating inside: <span className="font-semibold">{parentFolderName}</span></p>}
            <form onSubmit={handleSubmit}>
              <input 
                autoFocus
                type="text" 
                placeholder="Folder name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-100 border-transparent focus:bg-white focus:border-zinc-300 rounded-xl text-sm transition-all outline-none mb-6"
              />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={onClose} className="px-6 py-2.5 text-zinc-600 font-medium hover:bg-zinc-100 rounded-xl transition-colors">Cancel</button>
                <button 
                  type="submit" 
                  disabled={isCreating || !name.trim()}
                  className="px-6 py-2.5 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
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

const PreviewModal = ({ asset, onClose }: { asset: Asset | null; onClose: () => void }) => {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);

  useEffect(() => {
    if (asset && asset.type === 'text') {
      setLoadingText(true);
      fetch(asset.content)
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
          className="relative w-full max-w-4xl bg-white rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          <div className="p-6 border-bottom border-zinc-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center">
                {asset.type === 'image' ? <ImageIcon size={20} /> : <FileText size={20} />}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 leading-tight">{asset.name}</h2>
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
                  {asset.mimeType} • {(asset.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a 
                href={asset.content} 
                target="_blank"
                rel="noreferrer"
                className="p-2.5 hover:bg-zinc-100 rounded-xl transition-colors text-zinc-600"
                title="Download"
              >
                <Download size={20} />
              </a>
              <button onClick={onClose} className="p-2.5 hover:bg-zinc-100 rounded-xl transition-colors text-zinc-600">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-zinc-50 p-8 flex items-center justify-center">
            {asset.type === 'image' ? (
              <img 
                src={asset.content} 
                alt={asset.name} 
                className="max-w-full max-h-full object-contain shadow-lg rounded-lg"
                referrerPolicy="no-referrer"
              />
            ) : isText ? (
              <div className="w-full max-w-2xl bg-white p-12 rounded-2xl shadow-sm border border-zinc-200 min-h-[400px]">
                {loadingText ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="animate-spin text-zinc-300" />
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap font-mono text-sm text-zinc-800 leading-relaxed">
                    {textContent}
                  </pre>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-zinc-400">
                <FileIcon size={64} />
                <p className="text-zinc-500 font-medium">No preview available for this file type</p>
                <a 
                  href={asset.content} 
                  target="_blank" 
                  rel="noreferrer"
                  className="px-6 py-2 bg-zinc-900 text-white rounded-xl text-sm font-medium"
                >
                  Download File
                </a>
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
  level = 0 
}: { 
  folder: Folder; 
  folders: Folder[]; 
  selectedFolderId: string | null; 
  onSelect: (id: string) => void; 
  onDelete: (e: React.MouseEvent, id: string) => void;
  onRename: (e: React.MouseEvent, folder: Folder) => void;
  level?: number;
}) => {
  const [isOpen, setIsOpen] = useState(false);
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
          "group flex items-center justify-between px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer",
          isSelected ? "bg-zinc-900 text-white shadow-md" : "text-zinc-600 hover:bg-zinc-100"
        )}
        style={{ paddingLeft: `${level * 12 + 16}px` }}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {subFolders.length > 0 ? (
            isOpen ? <ChevronDown size={14} className="flex-shrink-0" /> : <ChevronRight size={14} className="flex-shrink-0" />
          ) : (
            <div className="w-[14px]" />
          )}
          <FolderIcon size={16} className={isSelected ? "text-white" : "text-zinc-400"} />
          <span className="truncate">{folder.name}</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <Edit2 
            size={14} 
            className="hover:text-zinc-900 transition-colors" 
            onClick={(e) => onRename(e, folder)}
          />
          <Trash2 
            size={14} 
            className="hover:text-red-500 transition-colors" 
            onClick={(e) => onDelete(e, folder.id)}
          />
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
                level={level + 1}
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

const Dashboard = ({ user }: { user: User }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [renameItem, setRenameItem] = useState<{ id: string; name: string; type: 'asset' | 'folder' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDraggingGlobal, setIsDraggingGlobal] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [gridSize, setGridSize] = useState(3); // 1 to 5, default 3

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
        if (file.type.startsWith('image/') && file.size > 200 * 1024) {
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

        // Sanitize filename
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        storagePath = `assets/${user.uid}/${Date.now()}_${sanitizedName}`;
        const storageRef = ref(storage, storagePath);

        // 2. Upload step (10-90%)
        try {
          console.log(`Uploading to storage: ${storagePath}`);
          const uploadTask = uploadBytesResumable(storageRef, fileToUpload);
          
          // Add a safety timeout for the upload task
          const uploadPromise = new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              uploadTask.cancel();
              reject(new Error("Upload timed out after 30 seconds"));
            }, 30000);

            uploadTask.on('state_changed', 
              (snapshot) => {
                const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                // Map 0-100% of upload to 10-90% of total progress
                const totalProgress = 10 + (percent * 0.8);
                setUploadingFiles(prev => prev.map(f => 
                  f.id === uploadId ? { ...f, progress: Math.round(totalProgress) } : f
                ));
              }, 
              (error) => {
                clearTimeout(timeout);
                reject(error);
              }, 
              () => {
                clearTimeout(timeout);
                resolve();
              }
            );
          });

          await uploadPromise;
          contentUrl = await getDownloadURL(storageRef);
          console.log(`Upload successful: ${contentUrl}`);
          
        } catch (storageError: any) {
          console.warn("Storage upload failed or timed out, trying fallback:", storageError);
          
          // Fallback: If file is small (< 1MB), store as Base64 in Firestore
          if (fileToUpload.size < 1024 * 1024) {
            setUploadingFiles(prev => prev.map(f => 
              f.id === uploadId ? { ...f, progress: 50, status: 'uploading' } : f
            ));
            
            contentUrl = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => reject(new Error("Failed to read file for fallback"));
              reader.readAsDataURL(fileToUpload);
            });
            storagePath = 'firestore-embedded';
            console.log("Using Firestore fallback for small file");
          } else {
            throw storageError;
          }
        }

        // 3. Metadata step (90-100%)
        setUploadingFiles(prev => prev.map(f => 
          f.id === uploadId ? { ...f, progress: 95 } : f
        ));

        const isTextFile = file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.csv');

        await addDoc(collection(db, 'assets'), {
          name: file.name,
          type: file.type.startsWith('image/') ? 'image' : (isTextFile ? 'text' : 'file'),
          content: contentUrl,
          storagePath,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          ownerId: user.uid,
          folderId: selectedFolderId || null,
          createdAt: Timestamp.now()
        });

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

  const { getRootProps: getGlobalRootProps, getInputProps: getGlobalInputProps, isDragActive: isGlobalDragActive } = useDropzone({
    onDrop: (files) => {
      handleUpload(files);
      setIsDraggingGlobal(false);
    },
    noClick: true,
    noKeyboard: true,
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
    }
  } as any);

  // Global drag state management
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) {
        setIsDraggingGlobal(true);
      }
    };
    window.addEventListener('dragenter', handleDragEnter);
    return () => window.removeEventListener('dragenter', handleDragEnter);
  }, []);

  // Fetch Folders
  useEffect(() => {
    const q = query(
      collection(db, 'folders'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newFolders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Folder[];
      setFolders(newFolders);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'folders');
    });

    return () => unsubscribe();
  }, [user.uid]);

  // Fetch Assets
  useEffect(() => {
    const q = query(
      collection(db, 'assets'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newAssets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Asset[];
      setAssets(newAssets);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'assets');
    });

    return () => unsubscribe();
  }, [user.uid]);

  const handleCreateFolder = async (name: string) => {
    try {
      await addDoc(collection(db, 'folders'), {
        name,
        ownerId: user.uid,
        parentId: selectedFolderId || null,
        createdAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'folders');
    }
  };

  const handleDelete = async (asset: Asset) => {
    if (confirm('Are you sure you want to delete this asset?')) {
      try {
        // 1. Delete from Storage if exists
        if (asset.storagePath) {
          const storageRef = ref(storage, asset.storagePath);
          await deleteObject(storageRef);
        }
        // 2. Delete from Firestore
        await deleteDoc(doc(db, 'assets', asset.id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `assets/${asset.id}`);
      }
    }
  };

  const handleDeleteFolder = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Delete this folder? Assets inside will remain but won\'t be in this folder anymore.')) {
      try {
        await deleteDoc(doc(db, 'folders', id));
        if (selectedFolderId === id) setSelectedFolderId(null);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `folders/${id}`);
      }
    }
  };

  const handleRename = async (newName: string) => {
    if (!renameItem) return;
    try {
      const collectionName = renameItem.type === 'asset' ? 'assets' : 'folders';
      await updateDoc(doc(db, collectionName, renameItem.id), {
        name: newName
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${renameItem.type}s/${renameItem.id}`);
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
    <div className="h-screen w-full bg-zinc-200 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-[500px] aspect-[2/3] max-h-[90vh] flex flex-col bg-[#f5f5f4] text-zinc-900 font-sans overflow-hidden rounded-[40px] shadow-2xl border-[8px] border-zinc-900 relative">
        {/* Header */}
        <header className="bg-white border-b border-zinc-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
                <Upload className="text-white w-4 h-4" />
              </div>
              <h1 className="text-lg font-semibold tracking-tight">AssetHub</h1>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => signOut(auth)} className="p-2 text-zinc-400 hover:text-red-600 transition-all"><LogOut size={18} /></button>
              <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border border-zinc-200" />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search & Folders Bar */}
          <div className="p-4 bg-white border-b border-zinc-100 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <input 
                type="text" 
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-zinc-100 border-transparent focus:bg-white focus:border-zinc-300 rounded-xl text-xs transition-all outline-none"
              />
            </div>
            
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button 
                onClick={() => setSelectedFolderId(null)}
                className={cn(
                  "flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  !selectedFolderId ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                )}
              >
                All
              </button>
              {rootFolders.map(folder => (
                <button 
                  key={folder.id}
                  onClick={() => setSelectedFolderId(folder.id)}
                  className={cn(
                    "flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5",
                    selectedFolderId === folder.id ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  )}
                >
                  <FolderIcon size={12} />
                  {folder.name}
                </button>
              ))}
              <button 
                onClick={() => setIsFolderModalOpen(true)}
                className="flex-shrink-0 p-1.5 bg-zinc-100 text-zinc-400 rounded-lg hover:bg-zinc-200 transition-all"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          <main 
            {...getGlobalRootProps()}
            className="flex-1 flex flex-col bg-[#f5f5f4] overflow-hidden relative"
          >
            <input {...getGlobalInputProps()} />
            
            <AnimatePresence>
              {isDraggingGlobal && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onDragLeave={() => setIsDraggingGlobal(false)}
                  className="absolute inset-0 z-40 bg-zinc-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 text-center"
                >
                  <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center mb-4 border border-white/20">
                    <Upload className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-semibold mb-1">Drop to upload</h2>
                  <p className="text-white/60 text-xs">Files will be added to {selectedFolderName}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="p-4 flex-shrink-0 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-zinc-900">{selectedFolderName}</h2>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                  {filteredAssets.length} Assets
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                  className="p-2 bg-white border border-zinc-200 rounded-xl text-zinc-600 hover:bg-zinc-50 transition-all"
                >
                  {viewMode === 'grid' ? <ListIcon size={16} /> : <Grid size={16} />}
                </button>
                <button 
                  onClick={() => setIsUploadModalOpen(true)}
                  className="p-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-all shadow-sm"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-8">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="w-8 h-8 text-zinc-300 animate-spin" />
                  <p className="text-xs text-zinc-400 font-medium">Loading...</p>
                </div>
              ) : filteredAssets.length > 0 ? (
                <div className={cn(
                  viewMode === 'grid' 
                    ? "grid grid-cols-2 gap-4" 
                    : "flex flex-col bg-white rounded-2xl border border-zinc-200 overflow-hidden"
                )}>
                  <AnimatePresence mode="popLayout">
                    {uploadingFiles.map(file => (
                      <motion.div 
                        key={file.id} 
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={cn(
                          "bg-white rounded-2xl border border-zinc-200 p-3 flex flex-col gap-2",
                          viewMode === 'list' && "flex-row items-center h-14"
                        )}
                      >
                        <div className={cn(
                          "bg-zinc-100 rounded-xl flex items-center justify-center relative overflow-hidden",
                          viewMode === 'grid' ? "aspect-video" : "w-8 h-8 flex-shrink-0"
                        )}>
                          <Loader2 className="w-4 h-4 text-zinc-300 animate-spin z-10" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-semibold truncate text-zinc-400">{file.name}</p>
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
                        />
                      );
                    })}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 bg-zinc-100 rounded-[24px] flex items-center justify-center mb-4">
                    <FileIcon className="text-zinc-300 w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-900 mb-1">No assets</h3>
                  <p className="text-xs text-zinc-500 max-w-[200px] mx-auto">
                    {searchQuery ? "No matches found." : "This folder is empty."}
                  </p>
                </div>
              )}
            </div>
          </main>
        </div>

        {/* Modals */}
        <PreviewModal asset={previewAsset} onClose={() => setPreviewAsset(null)} />
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
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f4]">
        <Loader2 className="w-10 h-10 text-zinc-300 animate-spin" />
      </div>
    );
  }

  return user ? <Dashboard user={user} /> : <Login />;
}
