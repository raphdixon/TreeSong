import {
  users, teams, tracks, comments, shares, invites, teamMembers,
  type User,
  type InsertUser,
  type Team,
  type InsertTeam,
  type Track,
  type InsertTrack,
  type Comment,
  type InsertComment,
  type Share,
  type InsertShare,
  type Invite,
  type InsertInvite
} from "@shared/schema";
import { nanoid } from "nanoid";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
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
  createTrack(track: InsertTrack): Promise<Track>;
  deleteTrack(id: string): Promise<void>;
  updateTrackBpm(id: string, bpm: number): Promise<void>;
  
  // Comment methods
  getCommentsByTrack(trackId: string): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  deleteComment(id: string): Promise<void>;
  
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

  async updateTrackBpm(id: string, bpm: number): Promise<void> {
    await db.update(tracks)
      .set({ bpm })
      .where(eq(tracks.id, id));
  }

  // Comment methods
  async getCommentsByTrack(trackId: string): Promise<Comment[]> {
    return await db.select().from(comments).where(eq(comments.trackId, trackId));
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const id = nanoid();
    
    const [comment] = await db
      .insert(comments)
      .values({
        id,
        ...insertComment
      })
      .returning();
      
    return comment;
  }

  async deleteComment(id: string): Promise<void> {
    await db.delete(comments).where(eq(comments.id, id));
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