import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "./db";
import { projects, projectImages, colorRegions, canvasStates, recentColors, insertProjectSchema, insertCanvasStateSchema } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import multer from "multer";
import { writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";
import { existsSync } from "fs";
import { randomUUID } from "crypto";

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  }
});

const UPLOAD_DIR = join(process.cwd(), "uploads");

export async function registerRoutes(app: Express): Promise<Server> {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }

  app.post("/api/upload", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const ext = extname(req.file.originalname).toLowerCase();
      const safeFileName = `${randomUUID()}${ext}`;
      const filePath = join(UPLOAD_DIR, safeFileName);
      
      await writeFile(filePath, req.file.buffer);

      res.json({ 
        path: `/uploads/${safeFileName}`,
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  app.get("/api/projects", async (_req, res) => {
    try {
      const allProjects = await db.select().from(projects).orderBy(desc(projects.updatedAt));
      res.json(allProjects);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const project = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
      
      if (project.length === 0) {
        return res.status(404).json({ message: "Project not found" });
      }

      const images = await db.select().from(projectImages).where(eq(projectImages.projectId, id));
      const regions = await db.select().from(colorRegions).where(eq(colorRegions.projectId, id));
      const canvas = await db.select().from(canvasStates).where(eq(canvasStates.projectId, id)).limit(1);

      res.json({
        project: project[0],
        images,
        colorRegions: regions,
        canvasState: canvas[0]
      });
    } catch (error) {
      console.error("Failed to fetch project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const validated = insertProjectSchema.parse(req.body);
      
      const [newProject] = await db.insert(projects).values(validated).returning();

      res.json(newProject);
    } catch (error) {
      console.error("Failed to create project:", error);
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid project data", error });
      }
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.put("/api/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validated = insertProjectSchema.parse(req.body);

      const [updatedProject] = await db.update(projects)
        .set({ 
          ...validated,
          updatedAt: new Date()
        })
        .where(eq(projects.id, id))
        .returning();

      if (!updatedProject) {
        return res.status(404).json({ message: "Project not found" });
      }

      res.json(updatedProject);
    } catch (error) {
      console.error("Failed to update project:", error);
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid project data", error });
      }
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(projects).where(eq(projects.id, id));
      res.json({ message: "Project deleted successfully" });
    } catch (error) {
      console.error("Failed to delete project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  app.post("/api/projects/:id/canvas", async (req, res) => {
    try {
      const { id } = req.params;
      const validated = insertCanvasStateSchema.parse({
        ...req.body,
        projectId: id
      });

      const existing = await db.select().from(canvasStates).where(eq(canvasStates.projectId, id)).limit(1);

      if (existing.length > 0) {
        const [updated] = await db.update(canvasStates)
          .set({ ...validated, updatedAt: new Date() })
          .where(eq(canvasStates.projectId, id))
          .returning();
        res.json(updated);
      } else {
        const [newState] = await db.insert(canvasStates)
          .values(validated)
          .returning();
        res.json(newState);
      }
    } catch (error) {
      console.error("Failed to save canvas state:", error);
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid canvas data", error });
      }
      res.status(500).json({ message: "Failed to save canvas state" });
    }
  });

  app.use('/uploads', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
  });

  const httpServer = createServer(app);

  return httpServer;
}
