import { pgTable, text, varchar, timestamp, integer, boolean, real, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table - updated for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  username: varchar("username").unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true
});

export const upsertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;

// Tracks table
export const tracks = pgTable("tracks", {
  id: varchar("id").primaryKey().notNull(),
  uploaderUserId: varchar("uploader_user_id").notNull(),
  filename: varchar("filename").notNull(),
  originalName: varchar("original_name").notNull(),
  uploadDate: timestamp("upload_date").defaultNow().notNull(),
  duration: real("duration").notNull(),
  fileDeletedAt: timestamp("file_deleted_at")
});

// Emoji reactions table
export const emojiReactions = pgTable("emoji_reactions", {
  id: varchar("id").primaryKey().notNull(),
  trackId: varchar("track_id").notNull(),
  time: real("time").notNull(),
  emoji: varchar("emoji").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  listenerSessionId: varchar("listener_session_id") // For tracking unique listeners
});

// Track listens table - to track if a user has completed listening
export const trackListens = pgTable("track_listens", {
  id: varchar("id").primaryKey().notNull(),
  trackId: varchar("track_id").notNull(),
  sessionId: varchar("session_id").notNull(),
  completedAt: timestamp("completed_at"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  hasCompletedFullListen: boolean("has_completed_full_listen").default(false).notNull()
});

// Shares table
export const shares = pgTable("shares", {
  id: varchar("id").primaryKey().notNull(),
  trackId: varchar("track_id").notNull(),
  token: varchar("token").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Insert schemas
export const insertTrackSchema = createInsertSchema(tracks).omit({
  id: true,
  uploadDate: true
});

export const insertEmojiReactionSchema = createInsertSchema(emojiReactions).omit({
  id: true,
  timestamp: true
});

export const insertTrackListenSchema = createInsertSchema(trackListens).omit({
  id: true,
  startedAt: true,
  completedAt: true
});

export const insertShareSchema = createInsertSchema(shares).omit({
  id: true,
  createdAt: true
});

// Types
export type InsertTrack = z.infer<typeof insertTrackSchema>;
export type Track = typeof tracks.$inferSelect;
export type InsertEmojiReaction = z.infer<typeof insertEmojiReactionSchema>;
export type EmojiReaction = typeof emojiReactions.$inferSelect;
export type InsertTrackListen = z.infer<typeof insertTrackListenSchema>;
export type TrackListen = typeof trackListens.$inferSelect;
export type InsertShare = z.infer<typeof insertShareSchema>;
export type Share = typeof shares.$inferSelect;
