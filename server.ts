import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import { createServer } from "http";
import { Server } from "socket.io";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite database
const db = new Database("database.db");

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

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer);
  const PORT = 3000;

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

  app.post("/api/upload", upload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      url: fileUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  });

  app.post("/api/assets", (req, res) => {
    const { id, name, type, content, storagePath, size, mimeType, ownerId, folderId } = req.body;
    db.prepare(`
      INSERT INTO assets (id, name, type, content, storagePath, size, mimeType, ownerId, folderId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, type, content, storagePath, size, mimeType, ownerId, folderId);
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
    if (asset && asset.storagePath && asset.storagePath.startsWith("uploads/")) {
      const filePath = path.join(__dirname, asset.storagePath);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    db.prepare("DELETE FROM assets WHERE id = ?").run(req.params.id);
    broadcastUpdate();
    res.json({ success: true });
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
}

startServer();
