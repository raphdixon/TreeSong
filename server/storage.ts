import {
  users, tracks, emojiReactions, trackListens, shares,
  type User,
  type InsertUser,
  type UpsertUser,
  type Track,
  type InsertTrack,
  type EmojiReaction,
  type InsertEmojiReaction,
  type TrackListen,
  type InsertTrackListen,
  type Share,
  type InsertShare
} from "@shared/schema";
import { nanoid } from "nanoid";
import bcrypt from "bcrypt";
import { eq, and, asc } from "drizzle-orm";
import { db } from "./db";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserArtistName(userId: string, artistName: string): Promise<void>;
  
  // Track methods
  getTrack(id: string): Promise<Track | undefined>;
  getAllTracks(): Promise<(Track & { creatorUsername: string })[]>;
  getUserTracks(userId: string): Promise<Track[]>;
  createTrack(track: InsertTrack): Promise<Track>;
  deleteTrack(id: string): Promise<void>;
  
  // Emoji reaction methods
  getEmojiReactionsByTrack(trackId: string): Promise<EmojiReaction[]>;
  getAllEmojiReactions(): Promise<EmojiReaction[]>;
  getEmojiReactionsBySession(trackId: string, sessionId: string): Promise<EmojiReaction[]>;
  createEmojiReaction(reaction: InsertEmojiReaction): Promise<EmojiReaction>;
  deleteEmojiReaction(id: string): Promise<void>;
  
  // Track listen methods
  getTrackListen(trackId: string, sessionId: string): Promise<TrackListen | undefined>;
  createTrackListen(trackListen: InsertTrackListen): Promise<TrackListen>;
  markTrackListenComplete(trackId: string, sessionId: string): Promise<void>;
  
  // Share methods
  getShareByToken(token: string): Promise<Share | undefined>;
  createShare(share: InsertShare): Promise<Share>;
  

}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
      
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserArtistName(userId: string, artistName: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        artistName: artistName,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId));
  }

  // Track methods
  async getTrack(id: string): Promise<Track | undefined> {
    const [track] = await db.select().from(tracks).where(eq(tracks.id, id));
    return track;
  }

  async getUserTracks(userId: string): Promise<Track[]> {
    return await db.select().from(tracks).where(eq(tracks.uploaderUserId, userId));
  }

  async getAllTracks(): Promise<(Track & { creatorUsername: string })[]> {
    const result = await db
      .select({
        id: tracks.id,
        uploaderUserId: tracks.uploaderUserId,
        filename: tracks.filename,
        originalName: tracks.originalName,
        duration: tracks.duration,
        fileDeletedAt: tracks.fileDeletedAt,
        uploadDate: tracks.uploadDate,
        creatorUsername: users.username
      })
      .from(tracks)
      .leftJoin(users, eq(tracks.uploaderUserId, users.id));
      
    return result.map(row => ({
      ...row,
      creatorUsername: row.creatorUsername || 'Unknown Artist'
    }));
  }

  async createTrack(insertTrack: InsertTrack): Promise<Track> {
    const id = nanoid();
    
    const [track] = await db
      .insert(tracks)
      .values({
        id,
        ...insertTrack
      })
      .returning();
      
    return track;
  }

  async deleteTrack(id: string): Promise<void> {
    await db.delete(tracks).where(eq(tracks.id, id));
  }

  // Emoji reaction methods
  async getEmojiReactionsByTrack(trackId: string): Promise<EmojiReaction[]> {
    return await db.select().from(emojiReactions).where(eq(emojiReactions.trackId, trackId));
  }

  async getAllEmojiReactions(): Promise<EmojiReaction[]> {
    return await db.select().from(emojiReactions);
  }

  async getEmojiReactionsBySession(trackId: string, sessionId: string): Promise<EmojiReaction[]> {
    const results = await db.select().from(emojiReactions)
      .where(and(eq(emojiReactions.trackId, trackId), eq(emojiReactions.listenerSessionId, sessionId)))
      .orderBy(asc(emojiReactions.timestamp));
      
    console.log('[STORAGE DEBUG] getEmojiReactionsBySession query:', {
      trackId,
      sessionId,
      resultsCount: results.length,
      firstResult: results[0]
    });
    
    return results;
  }

  async createEmojiReaction(insertReaction: InsertEmojiReaction): Promise<EmojiReaction> {
    const id = nanoid();
    
    const [reaction] = await db
      .insert(emojiReactions)
      .values({
        id,
        ...insertReaction
      })
      .returning();
      
    return reaction;
  }

  async deleteEmojiReaction(id: string): Promise<void> {
    await db.delete(emojiReactions).where(eq(emojiReactions.id, id));
  }

  // Track listen methods
  async getTrackListen(trackId: string, sessionId: string): Promise<TrackListen | undefined> {
    const [listen] = await db
      .select()
      .from(trackListens)
      .where(and(
        eq(trackListens.trackId, trackId),
        eq(trackListens.sessionId, sessionId)
      ));
    return listen;
  }

  async createTrackListen(insertListen: InsertTrackListen): Promise<TrackListen> {
    const id = nanoid();
    
    const [listen] = await db
      .insert(trackListens)
      .values({
        id,
        ...insertListen
      })
      .returning();
      
    return listen;
  }

  async markTrackListenComplete(trackId: string, sessionId: string): Promise<void> {
    await db
      .update(trackListens)
      .set({
        hasCompletedFullListen: true,
        completedAt: new Date()
      })
      .where(and(
        eq(trackListens.trackId, trackId),
        eq(trackListens.sessionId, sessionId)
      ));
  }

  // Share methods
  async getShareByToken(token: string): Promise<Share | undefined> {
    const [share] = await db.select().from(shares).where(eq(shares.token, token));
    return share;
  }

  async createShare(insertShare: InsertShare): Promise<Share> {
    const id = nanoid();
    
    const [share] = await db
      .insert(shares)
      .values({
        id,
        ...insertShare
      })
      .returning();
      
    return share;
  }
}

export const storage = new DatabaseStorage();