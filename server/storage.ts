import {
  users, teams, tracks, emojiReactions, trackListens, shares, invites, teamMembers,
  type User,
  type InsertUser,
  type Team,
  type InsertTeam,
  type Track,
  type InsertTrack,
  type EmojiReaction,
  type InsertEmojiReaction,
  type TrackListen,
  type InsertTrackListen,
  type Share,
  type InsertShare,
  type Invite,
  type InsertInvite
} from "@shared/schema";
import { nanoid } from "nanoid";
import bcrypt from "bcrypt";
import { eq, and } from "drizzle-orm";
import { db } from "./db";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Team methods
  getTeam(id: string): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  addUserToTeam(teamId: string, userId: string): Promise<void>;
  
  // Track methods
  getTrack(id: string): Promise<Track | undefined>;
  getTracksByTeam(teamId: string): Promise<Track[]>;
  getAllTracks(): Promise<Track[]>;
  createTrack(track: InsertTrack): Promise<Track>;
  deleteTrack(id: string): Promise<void>;
  
  // Emoji reaction methods
  getEmojiReactionsByTrack(trackId: string): Promise<EmojiReaction[]>;
  createEmojiReaction(reaction: InsertEmojiReaction): Promise<EmojiReaction>;
  
  // Track listen methods
  getTrackListen(trackId: string, sessionId: string): Promise<TrackListen | undefined>;
  createTrackListen(trackListen: InsertTrackListen): Promise<TrackListen>;
  markTrackListenComplete(trackId: string, sessionId: string): Promise<void>;
  
  // Share methods
  getShareByToken(token: string): Promise<Share | undefined>;
  createShare(share: InsertShare): Promise<Share>;
  
  // Invite methods
  getInviteByToken(token: string): Promise<Invite | undefined>;
  createInvite(invite: InsertInvite): Promise<Invite>;
  acceptInvite(token: string): Promise<void>;
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = nanoid();
    const passwordHash = await bcrypt.hash(insertUser.password, 10);
    
    const [user] = await db
      .insert(users)
      .values({
        id,
        email: insertUser.email,
        passwordHash,
        teamId: insertUser.teamId || 'default-team'
      })
      .returning();
      
    return user;
  }

  // Team methods
  async getTeam(id: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const id = nanoid();
    
    const [team] = await db
      .insert(teams)
      .values({
        id,
        name: insertTeam.name
      })
      .returning();
      
    return team;
  }

  async addUserToTeam(teamId: string, userId: string): Promise<void> {
    await db.insert(teamMembers).values({
      id: nanoid(),
      teamId,
      userId
    });
  }

  // Track methods
  async getTrack(id: string): Promise<Track | undefined> {
    const [track] = await db.select().from(tracks).where(eq(tracks.id, id));
    return track;
  }

  async getTracksByTeam(teamId: string): Promise<Track[]> {
    return await db.select().from(tracks).where(eq(tracks.teamId, teamId));
  }

  async getAllTracks(): Promise<Track[]> {
    return await db.select().from(tracks);
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

  // Invite methods
  async getInviteByToken(token: string): Promise<Invite | undefined> {
    const [invite] = await db.select().from(invites).where(eq(invites.token, token));
    return invite;
  }

  async createInvite(insertInvite: InsertInvite): Promise<Invite> {
    const id = nanoid();
    
    const [invite] = await db
      .insert(invites)
      .values({
        id,
        ...insertInvite
      })
      .returning();
      
    return invite;
  }

  async acceptInvite(token: string): Promise<void> {
    await db.update(invites).set({ accepted: true }).where(eq(invites.token, token));
  }
}

export const storage = new DatabaseStorage();