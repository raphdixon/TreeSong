import { pgTable, text, varchar, timestamp, integer, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique().notNull(),
  passwordHash: varchar("password_hash").notNull(),
  teamId: varchar("team_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Teams table
export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().notNull(),
  name: varchar("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Team members junction table
export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().notNull(),
  teamId: varchar("team_id").notNull(),
  userId: varchar("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  passwordHash: true,
  createdAt: true
}).extend({
  password: z.string().min(6)
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

// Tracks table
export const tracks = pgTable("tracks", {
  id: varchar("id").primaryKey().notNull(),
  teamId: varchar("team_id").notNull(),
  uploaderUserId: varchar("uploader_user_id").notNull(),
  filename: varchar("filename").notNull(),
  originalName: varchar("original_name").notNull(),
  bpm: integer("bpm"),
  uploadDate: timestamp("upload_date").defaultNow().notNull(),
  duration: real("duration").notNull(),
  fileDeletedAt: timestamp("file_deleted_at")
});

// Comments table
export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().notNull(),
  trackId: varchar("track_id").notNull(),
  time: real("time").notNull(),
  username: varchar("username").notNull(),
  text: text("text").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  isPublic: boolean("is_public").default(false).notNull(),
  authorUserId: varchar("author_user_id")
});

// Shares table
export const shares = pgTable("shares", {
  id: varchar("id").primaryKey().notNull(),
  trackId: varchar("track_id").notNull(),
  token: varchar("token").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Invites table
export const invites = pgTable("invites", {
  id: varchar("id").primaryKey().notNull(),
  teamId: varchar("team_id").notNull(),
  email: varchar("email").notNull(),
  token: varchar("token").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  accepted: boolean("accepted").default(false).notNull()
});

// Insert schemas
export const insertTrackSchema = createInsertSchema(tracks).omit({
  id: true,
  uploadDate: true
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  timestamp: true
});

export const insertShareSchema = createInsertSchema(shares).omit({
  id: true,
  createdAt: true
});

export const insertInviteSchema = createInsertSchema(invites).omit({
  id: true,
  createdAt: true,
  accepted: true
});

// Types
export type InsertTrack = z.infer<typeof insertTrackSchema>;
export type Track = typeof tracks.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertShare = z.infer<typeof insertShareSchema>;
export type Share = typeof shares.$inferSelect;
export type InsertInvite = z.infer<typeof insertInviteSchema>;
export type Invite = typeof invites.$inferSelect;
