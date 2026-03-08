import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import { createServer } from "http";
import { Server } from "socket.io";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite database
let db: Database.Database;
try {
  db = new Database("database.db");
  console.log("Database initialized successfully.");
} catch (err) {
  console.error("Failed to initialize database:", err);
  process.exit(1);
}

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ownerId TEXT NOT NULL,
    parentId TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    storagePath TEXT,
    size INTEGER NOT NULL,
    mimeType TEXT NOT NULL,
    ownerId TEXT NOT NULL,
    folderId TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (folderId) REFERENCES folders(id) ON DELETE CASCADE
  );
`);

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwChR5AgYhQI_49nvkY1N-WVggatMXEQeN8YJA-nEczbYUpKGa2p2f_FxzkANw2RQ1x/exec";
const TARGET_DRIVE_FOLDER_ID = "1MlLf6hr-H4VzIQThltwhAgQJVbLKjRB3";

async function syncToGoogleDrive(data: any): Promise<boolean> {
  const payload = { ...data, targetDriveFolderId: TARGET_DRIVE_FOLDER_ID };
  console.log(`Đang gửi dữ liệu đồng bộ: ${payload.action} - ${payload.name || payload.id} (Path: ${payload.path?.join('/') || 'Root'})`);
  
  // If it's a file upload, try to send base64 if not already present
  if (payload.action === "uploadFile" && !payload.base64 && payload.content) {
    try {
      if (payload.content.startsWith('data:')) {
        payload.base64 = payload.content.split(',')[1];
      } else if (payload.content.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, payload.content);
        if (fs.existsSync(filePath)) {
          payload.base64 = fs.readFileSync(filePath).toString('base64');
        }
      }
    } catch (err) {
      console.error("Lỗi đọc file để lấy base64:", err);
    }
  }

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });
    
    if (!response.ok) {
      console.error(`Google Drive Script trả về lỗi: ${response.status}`);
      return false;
    } else {
      const result = await response.json();
      console.log(`Đồng bộ thành công: ${data.name || data.id}`);
      return true;
    }
  } catch (error) {
    console.error("Lỗi kết nối đến Google Drive Script:", error);
    return false;
  }
}

function getFolderPath(folderId: string | null, allFolders: any[]): string[] {
  if (!folderId) return [];
  const folder = allFolders.find(f => f.id === folderId);
  if (!folder) return [];
  return [...getFolderPath(folder.parentId, allFolders), folder.name];
}

async function startServer() {
  try {
    const app = express();
    const httpServer = createServer(app);
    const io = new Server(httpServer);
    const PORT = 3000;

    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Configure Cloudinary
  const isCloudinaryConfigured = !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );

  if (isCloudinaryConfigured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    console.log("Cloudinary configured for permanent storage.");
  } else {
    console.warn("Cloudinary not configured. Falling back to local storage (temporary).");
  }

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
  });

  const broadcastUpdate = () => {
    io.emit("data:updated");
  };

  // Ensure uploads directory exists
  const uploadDir = path.join(__dirname, "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }

  // Configure multer for file storage
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, file.fieldname + "-" + uniqueSuffix + ext);
    },
  });

  const upload = multer({ storage: storage });
  const memoryUpload = multer({ storage: multer.memoryStorage() });

  app.use(express.json());

  // --- Folder API ---
  app.get("/api/folders", (req, res) => {
    // Return all folders so everyone can see the structure
    const folders = db.prepare("SELECT * FROM folders").all();
    res.json(folders);
  });

  app.post("/api/folders", (req, res) => {
    const { id, name, ownerId, parentId } = req.body;
    db.prepare("INSERT INTO folders (id, name, ownerId, parentId) VALUES (?, ?, ?, ?)")
      .run(id, name, ownerId, parentId);
    
    // Sync to Google Drive
    const folders = db.prepare("SELECT * FROM folders").all() as any[];
    const path = getFolderPath(id, folders);
    syncToGoogleDrive({
      action: "createFolder",
      id,
      name,
      parentId,
      ownerId,
      path,
      timestamp: new Date().toISOString()
    });

    broadcastUpdate();
    res.json({ success: true });
  });

  app.patch("/api/folders/:id", (req, res) => {
    const { name } = req.body;
    db.prepare("UPDATE folders SET name = ? WHERE id = ?").run(name, req.params.id);
    broadcastUpdate();
    res.json({ success: true });
  });

  app.delete("/api/folders/:id", (req, res) => {
    db.prepare("DELETE FROM folders WHERE id = ?").run(req.params.id);
    broadcastUpdate();
    res.json({ success: true });
  });

  // --- Asset API ---
  app.get("/api/assets", (req, res) => {
    // Return all assets so everyone can see them
    const assets = db.prepare("SELECT * FROM assets").all();
    res.json(assets);
  });

  app.post("/api/upload", (req, res, next) => {
    if (isCloudinaryConfigured) {
      memoryUpload.single("file")(req, res, (err) => {
        if (err) return next(err);
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "assethub" },
          (error, result) => {
            if (error) return res.status(500).json({ error: "Cloudinary upload failed" });
            if (!result) return res.status(500).json({ error: "No result from Cloudinary" });
            
            res.json({
              url: result.secure_url,
              filename: result.public_id,
              size: result.bytes,
              mimetype: req.file!.mimetype,
              isCloudinary: true
            });
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
      });
    } else {
      upload.single("file")(req, res, (err) => {
        if (err) return next(err);
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });
        
        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({
          url: fileUrl,
          filename: req.file.filename,
          size: req.file.size,
          mimetype: req.file.mimetype,
          isCloudinary: false
        });
      });
    }
  });

  app.post("/api/assets", (req, res) => {
    const { id, name, type, content, storagePath, size, mimeType, ownerId, folderId } = req.body;
    db.prepare(`
      INSERT INTO assets (id, name, type, content, storagePath, size, mimeType, ownerId, folderId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, type, content, storagePath, size, mimeType, ownerId, folderId);

    // Sync to Google Drive
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const origin = `${protocol}://${host}`;
    
    let fullContentUrl = content;
    if (fullContentUrl.startsWith("/uploads/")) {
      fullContentUrl = `${origin}${fullContentUrl}`;
    }

    const folders = db.prepare("SELECT * FROM folders").all() as any[];
    const path = getFolderPath(folderId, folders);

    syncToGoogleDrive({
      action: "uploadFile",
      id,
      name,
      type,
      content: fullContentUrl,
      size,
      mimeType,
      ownerId,
      folderId,
      path,
      timestamp: new Date().toISOString()
    });

    broadcastUpdate();
    res.json({ success: true });
  });

  app.patch("/api/assets/:id", (req, res) => {
    const { name } = req.body;
    db.prepare("UPDATE assets SET name = ? WHERE id = ?").run(name, req.params.id);
    broadcastUpdate();
    res.json({ success: true });
  });

  app.delete("/api/assets/:id", (req, res) => {
    const asset = db.prepare("SELECT storagePath FROM assets WHERE id = ?").get(req.params.id) as any;
    if (asset && asset.storagePath) {
      if (asset.storagePath.startsWith("uploads/")) {
        const filePath = path.join(__dirname, asset.storagePath);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } else if (asset.storagePath.startsWith("cloudinary/")) {
        const publicId = asset.storagePath.replace("cloudinary/", "");
        if (isCloudinaryConfigured) {
          cloudinary.uploader.destroy(publicId).catch(err => console.error("Cloudinary delete failed:", err));
        }
      }
    }
    db.prepare("DELETE FROM assets WHERE id = ?").run(req.params.id);
    broadcastUpdate();
    res.json({ success: true });
  });

  app.post("/api/sync-folder/:id", async (req, res) => {
    try {
      const folder = db.prepare("SELECT * FROM folders WHERE id = ?").get(req.params.id) as any;
      if (!folder) return res.status(404).json({ error: "Folder not found" });
      
      const allFolders = db.prepare("SELECT * FROM folders").all() as any[];
      const path = getFolderPath(folder.id, allFolders);
      
      const success = await syncToGoogleDrive({
        action: "createFolder",
        ...folder,
        path,
        timestamp: new Date().toISOString()
      });
      
      res.json({ success });
    } catch (error) {
      console.error("Folder sync failed:", error);
      res.status(500).json({ error: "Folder sync failed" });
    }
  });

  app.post("/api/sync-asset/:id", async (req, res) => {
    try {
      const asset = db.prepare("SELECT * FROM assets WHERE id = ?").get(req.params.id) as any;
      if (!asset) return res.status(404).json({ error: "Asset not found" });
      
      const allFolders = db.prepare("SELECT * FROM folders").all() as any[];
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers['x-forwarded-host'] || req.get('host');
      const origin = `${protocol}://${host}`;
      
      let fullContentUrl = asset.content;
      if (fullContentUrl.startsWith("/uploads/")) {
        fullContentUrl = `${origin}${fullContentUrl}`;
      }

      const path = getFolderPath(asset.folderId, allFolders);
      const success = await syncToGoogleDrive({
        action: "uploadFile",
        ...asset,
        content: fullContentUrl,
        path,
        timestamp: new Date().toISOString()
      });
      
      res.json({ success });
    } catch (error) {
      console.error("Asset sync failed:", error);
      res.status(500).json({ error: "Asset sync failed" });
    }
  });

  app.post("/api/sync-all", async (req, res) => {
    try {
      const folders = db.prepare("SELECT * FROM folders").all() as any[];
      const assets = db.prepare("SELECT * FROM assets").all() as any[];

      console.log(`Bắt đầu đồng bộ thủ công: ${folders.length} thư mục, ${assets.length} file.`);

      // Sync all folders first
      for (const folder of folders) {
        const path = getFolderPath(folder.id, folders);
        await syncToGoogleDrive({
          action: "createFolder",
          ...folder,
          path,
          timestamp: new Date().toISOString()
        });
      }

      // Sync all assets
      for (const asset of assets) {
        const path = getFolderPath(asset.folderId, folders);
        await syncToGoogleDrive({
          action: "uploadFile",
          ...asset,
          path,
          timestamp: new Date().toISOString()
        });
      }

      res.json({ success: true, message: `Đã đồng bộ xong ${folders.length} thư mục và ${assets.length} file.` });
    } catch (error) {
      console.error("Manual sync failed:", error);
      res.status(500).json({ error: "Manual sync failed" });
    }
  });

  app.get("/api/proxy-content", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: "URL is required" });
    }
    try {
      const response = await fetch(url);
      const contentType = response.headers.get("content-type");
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }
      
      // For images and other binary data, we should pipe the buffer or arrayBuffer
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (error) {
      console.error("Proxy fetch failed:", error);
      res.status(500).json({ error: "Failed to fetch content" });
    }
  });

  app.get("/api/drive-list", async (req, res) => {
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({ action: "listAll", targetDriveFolderId: TARGET_DRIVE_FOLDER_ID }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Drive list failed:", error);
      res.status(500).json({ error: "Drive list failed" });
    }
  });

  app.post("/api/import-from-drive", async (req, res) => {
    try {
      const { folders, files } = req.body;
      
      // Clear current data (Optional: user might want to merge, but clear is safer for "Drive-first")
      // db.prepare("DELETE FROM assets").run();
      // db.prepare("DELETE FROM folders").run();

      for (const folder of folders) {
        db.prepare("INSERT OR IGNORE INTO folders (id, name, ownerId, parentId) VALUES (?, ?, ?, ?)")
          .run(folder.id, folder.name, folder.ownerId || 'admin', folder.parentId);
      }

      for (const file of files) {
        db.prepare(`
          INSERT OR IGNORE INTO assets (id, name, type, content, storagePath, size, mimeType, ownerId, folderId)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          file.id, 
          file.name, 
          file.type, 
          file.content, 
          file.storagePath || 'google-drive', 
          file.size || 0, 
          file.mimeType || 'application/octet-stream', 
          file.ownerId || 'admin', 
          file.folderId
        );
      }

      broadcastUpdate();
      res.json({ success: true });
    } catch (error) {
      console.error("Import failed:", error);
      res.status(500).json({ error: "Import failed" });
    }
  });

  app.use("/uploads", express.static(uploadDir));

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  } catch (error) {
    console.error("Failed to start server:", error);
  }
}

startServer();
