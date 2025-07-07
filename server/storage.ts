import {
  users, tracks, emojiReactions, shares, playlists, savedTracks,
  type User,
  type InsertUser,
  type UpsertUser,
  type Track,
  type InsertTrack,
  type EmojiReaction,
  type InsertEmojiReaction,
  type Share,
  type InsertShare,
  type Playlist,
  type InsertPlaylist,
  type SavedTrack,
  type InsertSavedTrack
} from "@shared/schema";
import { nanoid } from "nanoid";
import bcrypt from "bcrypt";
import { eq, and, asc, desc, sql } from "drizzle-orm";
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
  getAllTracksForFeed(): Promise<(Track & { creatorUsername: string })[]>;
  getUserTracks(userId: string): Promise<Track[]>;
  createTrack(track: InsertTrack): Promise<Track>;
  updateTrackWaveform(trackId: string, waveformData: any): Promise<void>;
  deleteTrack(id: string): Promise<void>;
  
  // Emoji reaction methods
  getEmojiReactionsByTrack(trackId: string): Promise<EmojiReaction[]>;
  getAllEmojiReactions(): Promise<EmojiReaction[]>;
  getEmojiReactionsBySession(trackId: string, sessionId: string): Promise<EmojiReaction[]>;
  createEmojiReaction(reaction: InsertEmojiReaction): Promise<EmojiReaction>;
  deleteEmojiReaction(id: string): Promise<void>;
  

  
  // Share methods
  getShareByToken(token: string): Promise<Share | undefined>;
  createShare(share: InsertShare): Promise<Share>;
  
  // Admin methods
  getAllTracks(): Promise<Track[]>;
  getAllUsers(): Promise<User[]>;
  updateTrack(id: string, updates: Partial<Track>): Promise<void>;
  updateUser(id: string, updates: Partial<User>): Promise<void>;
  deleteUser(id: string): Promise<void>;
  
  // Playlist methods
  createPlaylist(playlist: InsertPlaylist): Promise<Playlist>;
  getUserPlaylists(userId: string): Promise<Playlist[]>;
  getPlaylist(id: string): Promise<Playlist | undefined>;
  updatePlaylist(id: string, updates: Partial<Playlist>): Promise<void>;
  deletePlaylist(id: string): Promise<void>;
  
  // Saved track methods
  saveTrackToPlaylist(savedTrack: InsertSavedTrack): Promise<SavedTrack>;
  removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<void>;
  getPlaylistTracks(playlistId: string): Promise<(SavedTrack & { track: Track & { creatorUsername: string; creatorArtistName: string; creatorEmail: string } })[]>;
  isTrackInPlaylist(playlistId: string, trackId: string): Promise<boolean>;
  getNextPosition(playlistId: string): Promise<number>;
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

  async getAllTracksForFeed(): Promise<(Track & { creatorUsername: string; creatorArtistName: string; creatorEmail: string })[]> {
    const result = await db
      .select({
        id: tracks.id,
        uploaderUserId: tracks.uploaderUserId,
        filename: tracks.filename,
        originalName: tracks.originalName,
        duration: tracks.duration,
        waveformData: tracks.waveformData,
        fileDeletedAt: tracks.fileDeletedAt,
        uploadDate: tracks.uploadDate,
        creatorUsername: users.username,
        creatorArtistName: users.artistName,
        creatorEmail: users.email
      })
      .from(tracks)
      .leftJoin(users, eq(tracks.uploaderUserId, users.id));
      
    return result.map(row => ({
      ...row,
      creatorUsername: row.creatorUsername || '',
      creatorArtistName: row.creatorArtistName || '',
      creatorEmail: row.creatorEmail || ''
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

  async updateTrackWaveform(trackId: string, waveformData: any): Promise<void> {
    await db
      .update(tracks)
      .set({ waveformData })
      .where(eq(tracks.id, trackId));
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

  // Admin methods implementation
  async getAllTracks(): Promise<Track[]> {
    const allTracks = await db
      .select()
      .from(tracks)
      .orderBy(desc(tracks.uploadDate));
    
    return allTracks;
  }

  async getAllUsers(): Promise<User[]> {
    const allUsers = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
    
    return allUsers;
  }

  async updateTrack(id: string, updates: Partial<Track>): Promise<void> {
    await db
      .update(tracks)
      .set(updates)
      .where(eq(tracks.id, id));
  }

  async updateUser(id: string, updates: Partial<User>): Promise<void> {
    await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(users.id, id));
  }

  async deleteUser(id: string): Promise<void> {
    // First delete all tracks by this user
    await db
      .delete(tracks)
      .where(eq(tracks.uploaderUserId, id));
    
    // Then delete the user
    await db
      .delete(users)
      .where(eq(users.id, id));
  }

  // Playlist methods
  async createPlaylist(insertPlaylist: InsertPlaylist): Promise<Playlist> {
    const [playlist] = await db
      .insert(playlists)
      .values({
        ...insertPlaylist,
        id: insertPlaylist.id || nanoid()
      })
      .returning();
    
    console.log('[STORAGE] Created playlist:', playlist);
    return playlist;
  }

  async getUserPlaylists(userId: string): Promise<Playlist[]> {
    const userPlaylists = await db
      .select()
      .from(playlists)
      .where(eq(playlists.userId, userId))
      .orderBy(desc(playlists.createdAt));
    
    console.log('[STORAGE] Found', userPlaylists.length, 'playlists for user:', userId);
    return userPlaylists;
  }

  async getPlaylist(id: string): Promise<Playlist | undefined> {
    const [playlist] = await db
      .select()
      .from(playlists)
      .where(eq(playlists.id, id));
    
    return playlist;
  }

  async updatePlaylist(id: string, updates: Partial<Playlist>): Promise<void> {
    await db
      .update(playlists)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(playlists.id, id));
  }

  async deletePlaylist(id: string): Promise<void> {
    // Cascade delete will handle removing saved tracks
    await db
      .delete(playlists)
      .where(eq(playlists.id, id));
  }

  // Saved track methods
  async saveTrackToPlaylist(insertSavedTrack: InsertSavedTrack): Promise<SavedTrack> {
    const [savedTrack] = await db
      .insert(savedTracks)
      .values({
        ...insertSavedTrack,
        id: insertSavedTrack.id || nanoid()
      })
      .returning();
    
    console.log('[STORAGE] Saved track to playlist:', savedTrack);
    return savedTrack;
  }

  async removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<void> {
    await db
      .delete(savedTracks)
      .where(and(
        eq(savedTracks.playlistId, playlistId),
        eq(savedTracks.trackId, trackId)
      ));
  }

  async getPlaylistTracks(playlistId: string): Promise<(SavedTrack & { track: Track & { creatorUsername: string; creatorArtistName: string; creatorEmail: string } })[]> {
    const playlistTracks = await db
      .select({
        savedTrack: savedTracks,
        track: tracks,
        user: users
      })
      .from(savedTracks)
      .innerJoin(tracks, eq(savedTracks.trackId, tracks.id))
      .leftJoin(users, eq(tracks.uploaderUserId, users.id))
      .where(eq(savedTracks.playlistId, playlistId))
      .orderBy(asc(savedTracks.position));
    
    return playlistTracks.map(({ savedTrack, track, user }) => ({
      ...savedTrack,
      track: {
        ...track,
        creatorUsername: user?.username || '',
        creatorArtistName: user?.artistName || 'Unknown Artist',
        creatorEmail: user?.email || ''
      }
    }));
  }

  async isTrackInPlaylist(playlistId: string, trackId: string): Promise<boolean> {
    const [exists] = await db
      .select({ count: sql<number>`count(*)` })
      .from(savedTracks)
      .where(and(
        eq(savedTracks.playlistId, playlistId),
        eq(savedTracks.trackId, trackId)
      ));
    
    return exists.count > 0;
  }

  async getNextPosition(playlistId: string): Promise<number> {
    const [result] = await db
      .select({ maxPosition: sql<number>`coalesce(max(position), -1)` })
      .from(savedTracks)
      .where(eq(savedTracks.playlistId, playlistId));
    
    return result.maxPosition + 1;
  }
}

export const storage = new DatabaseStorage();