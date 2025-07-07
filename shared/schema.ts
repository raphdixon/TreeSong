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
  artistName: varchar("artist_name"),
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
  waveformData: jsonb("waveform_data"), // Store pre-generated waveform peaks
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



// Shares table
export const shares = pgTable("shares", {
  id: varchar("id").primaryKey().notNull(),
  trackId: varchar("track_id").notNull(),
  token: varchar("token").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Playlists table
export const playlists = pgTable("playlists", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Saved tracks (tracks in playlists)
export const savedTracks = pgTable("saved_tracks", {
  id: varchar("id").primaryKey().notNull(),
  playlistId: varchar("playlist_id").notNull().references(() => playlists.id, { onDelete: 'cascade' }),
  trackId: varchar("track_id").notNull().references(() => tracks.id, { onDelete: 'cascade' }),
  position: integer("position").notNull(), // Order of tracks in playlist
  savedAt: timestamp("saved_at").defaultNow().notNull()
}, (table) => [
  index("idx_playlist_track").on(table.playlistId, table.trackId),
  index("idx_playlist_position").on(table.playlistId, table.position)
]);

// Insert schemas
export const insertTrackSchema = createInsertSchema(tracks).omit({
  id: true,
  uploadDate: true
});

export const insertEmojiReactionSchema = createInsertSchema(emojiReactions).omit({
  id: true,
  timestamp: true
});



export const insertShareSchema = createInsertSchema(shares).omit({
  id: true,
  createdAt: true
});

export const insertPlaylistSchema = createInsertSchema(playlists).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertSavedTrackSchema = createInsertSchema(savedTracks).omit({
  id: true,
  savedAt: true
});

// Types
export type InsertTrack = z.infer<typeof insertTrackSchema>;
export type Track = typeof tracks.$inferSelect;
export type InsertEmojiReaction = z.infer<typeof insertEmojiReactionSchema>;
export type EmojiReaction = typeof emojiReactions.$inferSelect;

export type InsertShare = z.infer<typeof insertShareSchema>;
export type Share = typeof shares.$inferSelect;

export type InsertPlaylist = z.infer<typeof insertPlaylistSchema>;
export type Playlist = typeof playlists.$inferSelect;
export type InsertSavedTrack = z.infer<typeof insertSavedTrackSchema>;
export type SavedTrack = typeof savedTracks.$inferSelect;
