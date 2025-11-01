import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Projects table - stores furniture customization projects
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  previewImageUrl: text("preview_image_url"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Project images table - stores uploaded furniture images
export const projectImages = pgTable("project_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  originalImagePath: text("original_image_path").notNull(),
  mimeType: varchar("mime_type", { length: 32 }).notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertProjectImageSchema = createInsertSchema(projectImages).omit({
  id: true,
  createdAt: true,
});

export type InsertProjectImage = z.infer<typeof insertProjectImageSchema>;
export type ProjectImage = typeof projectImages.$inferSelect;

// Color regions table - stores canvas objects with applied colors
export const colorRegions = pgTable("color_regions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  fabricObject: jsonb("fabric_object").notNull(), // Serialized Fabric.js object
  fillHex: varchar("fill_hex", { length: 7 }).notNull(),
  opacity: numeric("opacity").notNull().default('1'),
  blendMode: varchar("blend_mode", { length: 16 }).notNull().default('normal'),
  zIndex: integer("z_index").notNull().default(0),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertColorRegionSchema = createInsertSchema(colorRegions).omit({
  id: true,
  createdAt: true,
});

export type InsertColorRegion = z.infer<typeof insertColorRegionSchema>;
export type ColorRegion = typeof colorRegions.$inferSelect;

// Recent colors table - stores user's recently used colors
export const recentColors = pgTable("recent_colors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: 'cascade' }),
  hex: varchar("hex", { length: 7 }).notNull(),
  colorCode: varchar("color_code", { length: 16 }),
  colorName: text("color_name"),
  usedAt: timestamp("used_at").notNull().default(sql`now()`),
});

export const insertRecentColorSchema = createInsertSchema(recentColors).omit({
  id: true,
  usedAt: true,
});

export type InsertRecentColor = z.infer<typeof insertRecentColorSchema>;
export type RecentColor = typeof recentColors.$inferSelect;

// Canvas state snapshots - stores full canvas JSON for easy loading
export const canvasStates = pgTable("canvas_states", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }).unique(),
  canvasJson: jsonb("canvas_json").notNull(), // Full Fabric.js canvas serialization
  zoom: numeric("zoom").notNull().default('1'),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertCanvasStateSchema = createInsertSchema(canvasStates).omit({
  id: true,
  updatedAt: true,
});

export type InsertCanvasState = z.infer<typeof insertCanvasStateSchema>;
export type CanvasState = typeof canvasStates.$inferSelect;
