import {
  users, tracks, emojiReactions, shares, playlists, savedTracks,
  genres, trackGenres, userGenreRatings, trackPlays, adminSettings,
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
  type InsertSavedTrack,
  type Genre,
  type InsertGenre,
  type TrackGenre,
  type InsertTrackGenre,
  type UserGenreRating,
  type InsertUserGenreRating,
  type TrackPlay,
  type InsertTrackPlay,
  type AdminSetting,
  type InsertAdminSetting
} from "@shared/schema";
import { nanoid } from "nanoid";
import bcrypt from "bcrypt";
import { eq, and, asc, desc, sql, inArray } from "drizzle-orm";
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
  
  // Genre methods
  createGenre(genre: InsertGenre): Promise<Genre>;
  getAllGenres(): Promise<Genre[]>;
  getGenre(id: string): Promise<Genre | undefined>;
  seedGenres(): Promise<void>;
  
  // Track genre methods
  addGenresToTrack(trackId: string, genreIds: string[]): Promise<void>;
  getTrackGenres(trackId: string): Promise<Genre[]>;
  
  // User genre rating methods
  getUserGenreRatings(userId: string): Promise<UserGenreRating[]>;
  rateGenre(rating: InsertUserGenreRating): Promise<UserGenreRating>;
  getUnratedGenres(userId: string, limit: number): Promise<Genre[]>;
  hasRatedAllGenres(userId: string): Promise<boolean>;
  
  // Track play methods
  recordTrackPlay(play: InsertTrackPlay): Promise<TrackPlay>;
  getUserPlayedTracks(userId: string): Promise<string[]>;
  getTrackPlayCount(trackId: string): Promise<number>;
  getRecentlyPlayedTracksForSession(sessionId: string, limit: number): Promise<string[]>;
  
  // Admin settings methods
  getAdminSetting(key: string): Promise<string | undefined>;
  setAdminSetting(key: string, value: string): Promise<void>;
  
  // Recommendation methods
  getTracksWithGenreAndPlayInfo(): Promise<(Track & { 
    genres: Genre[]; 
    playCount: number; 
    creatorUsername: string;
    creatorArtistName: string;
    creatorEmail: string;
  })[]>;
  getUserGenreAffinity(userId: string): Promise<Map<string, number>>;
  getRandomGenreTrack(genreId: string, excludeTrackIds: string[]): Promise<Track | undefined>;
  getFreshTracks(excludeTrackIds: string[], limit: number): Promise<Track[]>;
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

  // Genre methods
  async createGenre(insertGenre: InsertGenre): Promise<Genre> {
    const [genre] = await db
      .insert(genres)
      .values({
        id: nanoid(),
        ...insertGenre
      })
      .returning();
    
    return genre;
  }

  async getAllGenres(): Promise<Genre[]> {
    return await db
      .select()
      .from(genres)
      .orderBy(asc(genres.displayOrder));
  }

  async getGenre(id: string): Promise<Genre | undefined> {
    const [genre] = await db
      .select()
      .from(genres)
      .where(eq(genres.id, id));
    
    return genre;
  }

  async seedGenres(): Promise<void> {
    const genreList = [
      'Hiphop', 'Pop', 'R&B', 'Indie', 'Electronic',
      'House', 'Techno', 'Drum & Bass', 'Dubstep', 'Trap',
      'Ambient', 'Folk', 'Rock', 'Metal', 'Jazz',
      'Soul', 'Funk', 'Disco', 'Reggae', 'World',
      'Classical', 'Blues', 'Punk', 'Garage', 'Synthwave',
      'Chillout', 'Experimental', 'Acoustic', 'Lo-fi', 'Country'
    ];

    const existingGenres = await this.getAllGenres();
    if (existingGenres.length > 0) {
      return; // Already seeded
    }

    const genresToInsert = genreList.map((name, index) => ({
      id: nanoid(),
      name,
      displayOrder: index
    }));

    await db.insert(genres).values(genresToInsert);
  }

  // Track genre methods
  async addGenresToTrack(trackId: string, genreIds: string[]): Promise<void> {
    if (genreIds.length === 0) return;

    const trackGenresToInsert = genreIds.map(genreId => ({
      id: nanoid(),
      trackId,
      genreId
    }));

    await db.insert(trackGenres).values(trackGenresToInsert);
  }

  async getTrackGenres(trackId: string): Promise<Genre[]> {
    const results = await db
      .select({
        genre: genres
      })
      .from(trackGenres)
      .innerJoin(genres, eq(trackGenres.genreId, genres.id))
      .where(eq(trackGenres.trackId, trackId))
      .orderBy(asc(genres.displayOrder));

    return results.map(r => r.genre);
  }

  // User genre rating methods
  async getUserGenreRatings(userId: string): Promise<UserGenreRating[]> {
    return await db
      .select()
      .from(userGenreRatings)
      .where(eq(userGenreRatings.userId, userId));
  }

  async rateGenre(rating: InsertUserGenreRating): Promise<UserGenreRating> {
    const [userRating] = await db
      .insert(userGenreRatings)
      .values({
        id: nanoid(),
        ...rating
      })
      .onConflictDoUpdate({
        target: [userGenreRatings.userId, userGenreRatings.genreId],
        set: {
          rating: rating.rating,
          ratedAt: new Date()
        }
      })
      .returning();
    
    return userRating;
  }

  async getUnratedGenres(userId: string, limit: number): Promise<Genre[]> {
    // Get genres that user hasn't rated yet
    const unratedGenres = await db
      .select({
        genre: genres
      })
      .from(genres)
      .leftJoin(
        userGenreRatings,
        and(
          eq(userGenreRatings.genreId, genres.id),
          eq(userGenreRatings.userId, userId)
        )
      )
      .where(sql`${userGenreRatings.id} IS NULL`)
      .orderBy(sql`random()`)
      .limit(limit);

    return unratedGenres.map(r => r.genre);
  }

  async hasRatedAllGenres(userId: string): Promise<boolean> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(userGenreRatings)
      .where(eq(userGenreRatings.userId, userId));
    
    const [totalGenres] = await db
      .select({ count: sql<number>`count(*)` })
      .from(genres);
    
    return result.count >= totalGenres.count;
  }

  // Track play methods
  async recordTrackPlay(play: InsertTrackPlay): Promise<TrackPlay> {
    const [trackPlay] = await db
      .insert(trackPlays)
      .values({
        id: nanoid(),
        ...play
      })
      .returning();
    
    return trackPlay;
  }

  async getUserPlayedTracks(userId: string): Promise<string[]> {
    const plays = await db
      .select({ trackId: trackPlays.trackId })
      .from(trackPlays)
      .where(eq(trackPlays.userId, userId))
      .groupBy(trackPlays.trackId);
    
    return plays.map(p => p.trackId);
  }

  async getTrackPlayCount(trackId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(trackPlays)
      .where(eq(trackPlays.trackId, trackId));
    
    return result.count;
  }

  async getRecentlyPlayedTracksForSession(sessionId: string, limit: number): Promise<string[]> {
    const plays = await db
      .select({ trackId: trackPlays.trackId })
      .from(trackPlays)
      .where(eq(trackPlays.sessionId, sessionId))
      .orderBy(desc(trackPlays.playedAt))
      .limit(limit);
    
    return plays.map(p => p.trackId);
  }

  // Admin settings methods
  async getAdminSetting(key: string): Promise<string | undefined> {
    const [setting] = await db
      .select()
      .from(adminSettings)
      .where(eq(adminSettings.key, key));
    
    return setting?.value;
  }

  async setAdminSetting(key: string, value: string): Promise<void> {
    await db
      .insert(adminSettings)
      .values({
        id: nanoid(),
        key,
        value
      })
      .onConflictDoUpdate({
        target: adminSettings.key,
        set: {
          value,
          updatedAt: new Date()
        }
      });
  }

  // Recommendation methods
  async getTracksWithGenreAndPlayInfo(): Promise<(Track & { 
    genres: Genre[]; 
    playCount: number; 
    creatorUsername: string;
    creatorArtistName: string;
    creatorEmail: string;
  })[]> {
    // Get all tracks with their genres and play counts
    const tracksWithInfo = await db
      .select({
        track: tracks,
        user: users,
        playCount: sql<number>`count(distinct ${trackPlays.id})::int`
      })
      .from(tracks)
      .leftJoin(users, eq(tracks.uploaderUserId, users.id))
      .leftJoin(trackPlays, eq(tracks.id, trackPlays.trackId))
      .groupBy(tracks.id, users.id);

    // Get genres for each track
    const trackIds = tracksWithInfo.map(t => t.track.id);
    const trackGenreMap = new Map<string, Genre[]>();
    
    if (trackIds.length > 0) {
      const allTrackGenres = await db
        .select({
          trackId: trackGenres.trackId,
          genre: genres
        })
        .from(trackGenres)
        .innerJoin(genres, eq(trackGenres.genreId, genres.id))
        .where(inArray(trackGenres.trackId, trackIds));
      
      for (const tg of allTrackGenres) {
        if (!trackGenreMap.has(tg.trackId)) {
          trackGenreMap.set(tg.trackId, []);
        }
        trackGenreMap.get(tg.trackId)!.push(tg.genre);
      }
    }

    return tracksWithInfo.map(({ track, user, playCount }) => ({
      ...track,
      genres: trackGenreMap.get(track.id) || [],
      playCount,
      creatorUsername: user?.username || '',
      creatorArtistName: user?.artistName || 'Unknown Artist',
      creatorEmail: user?.email || ''
    }));
  }

  async getUserGenreAffinity(userId: string): Promise<Map<string, number>> {
    const affinityMap = new Map<string, number>();
    
    // Get user's manual genre ratings
    const ratings = await this.getUserGenreRatings(userId);
    for (const rating of ratings) {
      affinityMap.set(rating.genreId, rating.rating);
    }
    
    // TODO: Factor in user interactions (plays, emoji reactions, etc.)
    // This would require joining multiple tables and calculating weighted scores
    
    return affinityMap;
  }

  async getRandomGenreTrack(genreId: string, excludeTrackIds: string[]): Promise<Track | undefined> {
    const query = db
      .select({ track: tracks })
      .from(tracks)
      .innerJoin(trackGenres, eq(tracks.id, trackGenres.trackId))
      .where(eq(trackGenres.genreId, genreId));
    
    if (excludeTrackIds.length > 0) {
      // @ts-ignore - sql.raw works with dynamic values
      query.where(sql`${tracks.id} NOT IN ${sql.raw(`(${excludeTrackIds.map(() => '?').join(', ')})`)}`);
    }
    
    const results = await query.orderBy(sql`random()`).limit(1);
    
    return results[0]?.track;
  }

  async getFreshTracks(excludeTrackIds: string[], limit: number): Promise<Track[]> {
    const query = db
      .select({
        track: tracks,
        playCount: sql<number>`count(${trackPlays.id})::int`
      })
      .from(tracks)
      .leftJoin(trackPlays, eq(tracks.id, trackPlays.trackId))
      .groupBy(tracks.id)
      .having(sql`count(${trackPlays.id}) < 5`) // Consider "fresh" if less than 5 plays
      .orderBy(desc(tracks.uploadDate))
      .limit(limit);
    
    if (excludeTrackIds.length > 0) {
      // @ts-ignore - sql.raw works with dynamic values
      query.where(sql`${tracks.id} NOT IN ${sql.raw(`(${excludeTrackIds.map(() => '?').join(', ')})`)}`);
    }
    
    const results = await query;
    
    return results.map(r => r.track);
  }
}

export const storage = new DatabaseStorage();