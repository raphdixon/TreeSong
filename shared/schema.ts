import { z } from "zod";

// User schema
export const users = {
  id: "string",
  email: "string",
  passwordHash: "string",
  teamId: "string",
  createdAt: "Date"
};

export const insertUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  teamId: z.string().optional()
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = {
  id: string;
  email: string;
  passwordHash: string;
  teamId: string;
  createdAt: Date;
};

// Team schema
export const teams = {
  id: "string",
  name: "string",
  members: "string[]",
  createdAt: "Date"
};

export const insertTeamSchema = z.object({
  name: z.string().min(1)
});

export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = {
  id: string;
  name: string;
  members: string[];
  createdAt: Date;
};

// Track schema
export const tracks = {
  id: "string",
  teamId: "string",
  uploaderUserId: "string",
  filename: "string",
  originalName: "string",
  bpm: "number | null",
  uploadDate: "Date",
  duration: "number"
};

export const insertTrackSchema = z.object({
  teamId: z.string(),
  uploaderUserId: z.string(),
  filename: z.string(),
  originalName: z.string(),
  bpm: z.number().int().positive().optional(),
  duration: z.number()
});

export type InsertTrack = z.infer<typeof insertTrackSchema>;
export type Track = {
  id: string;
  teamId: string;
  uploaderUserId: string;
  filename: string;
  originalName: string;
  bpm: number | null;
  uploadDate: Date;
  duration: number;
};

// Comment schema
export const comments = {
  id: "string",
  trackId: "string",
  time: "number",
  username: "string",
  text: "string",
  timestamp: "Date",
  isPublic: "boolean",
  authorUserId: "string | null"
};

export const insertCommentSchema = z.object({
  trackId: z.string(),
  time: z.number(),
  username: z.string(),
  text: z.string(),
  isPublic: z.boolean().default(false),
  authorUserId: z.string().optional()
});

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = {
  id: string;
  trackId: string;
  time: number;
  username: string;
  text: string;
  timestamp: Date;
  isPublic: boolean;
  authorUserId: string | null;
};

// Share schema
export const shares = {
  id: "string",
  trackId: "string",
  token: "string",
  createdAt: "Date"
};

export const insertShareSchema = z.object({
  trackId: z.string(),
  token: z.string()
});

export type InsertShare = z.infer<typeof insertShareSchema>;
export type Share = {
  id: string;
  trackId: string;
  token: string;
  createdAt: Date;
};

// Invite schema
export const invites = {
  id: "string",
  teamId: "string",
  email: "string",
  token: "string",
  createdAt: "Date",
  accepted: "boolean"
};

export const insertInviteSchema = z.object({
  teamId: z.string(),
  email: z.string().email(),
  token: z.string()
});

export type InsertInvite = z.infer<typeof insertInviteSchema>;
export type Invite = {
  id: string;
  teamId: string;
  email: string;
  token: string;
  createdAt: Date;
  accepted: boolean;
};
