import {
  User,
  InsertUser,
  Team,
  InsertTeam,
  Track,
  InsertTrack,
  Comment,
  InsertComment,
  Share,
  InsertShare,
  Invite,
  InsertInvite
} from "@shared/schema";
import { nanoid } from "nanoid";
import bcrypt from "bcrypt";

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

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private teams: Map<string, Team> = new Map();
  private tracks: Map<string, Track> = new Map();
  private comments: Map<string, Comment> = new Map();
  private shares: Map<string, Share> = new Map();
  private invites: Map<string, Invite> = new Map();

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = nanoid();
    const passwordHash = await bcrypt.hash(insertUser.password, 10);
    
    let teamId = insertUser.teamId;
    if (!teamId) {
      // Create a new team for the user
      const team = await this.createTeam({ name: `${insertUser.email}'s Team` });
      teamId = team.id;
    }

    const user: User = {
      id,
      email: insertUser.email,
      passwordHash,
      teamId,
      createdAt: new Date()
    };

    this.users.set(id, user);
    await this.addUserToTeam(teamId, id);
    return user;
  }

  // Team methods
  async getTeam(id: string): Promise<Team | undefined> {
    return this.teams.get(id);
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const id = nanoid();
    const newTeam: Team = {
      id,
      name: team.name,
      members: [],
      createdAt: new Date()
    };
    this.teams.set(id, newTeam);
    return newTeam;
  }

  async addUserToTeam(teamId: string, userId: string): Promise<void> {
    const team = this.teams.get(teamId);
    if (team && !team.members.includes(userId)) {
      team.members.push(userId);
      this.teams.set(teamId, team);
    }
  }

  // Track methods
  async getTrack(id: string): Promise<Track | undefined> {
    return this.tracks.get(id);
  }

  async getTracksByTeam(teamId: string): Promise<Track[]> {
    return Array.from(this.tracks.values()).filter(track => track.teamId === teamId);
  }

  async createTrack(track: InsertTrack): Promise<Track> {
    const id = nanoid();
    const newTrack: Track = {
      id,
      ...track,
      bpm: track.bpm || null,
      uploadDate: new Date()
    };
    this.tracks.set(id, newTrack);
    return newTrack;
  }

  async deleteTrack(id: string): Promise<void> {
    this.tracks.delete(id);
    // Also delete associated comments
    const trackComments = Array.from(this.comments.entries())
      .filter(([_, comment]) => comment.trackId === id);
    trackComments.forEach(([commentId]) => this.comments.delete(commentId));
  }

  // Comment methods
  async getCommentsByTrack(trackId: string): Promise<Comment[]> {
    return Array.from(this.comments.values())
      .filter(comment => comment.trackId === trackId)
      .sort((a, b) => a.time - b.time);
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const id = nanoid();
    const newComment: Comment = {
      id,
      ...comment,
      authorUserId: comment.authorUserId || null,
      timestamp: new Date()
    };
    this.comments.set(id, newComment);
    return newComment;
  }

  async deleteComment(id: string): Promise<void> {
    this.comments.delete(id);
  }

  // Share methods
  async getShareByToken(token: string): Promise<Share | undefined> {
    return Array.from(this.shares.values()).find(share => share.token === token);
  }

  async createShare(share: InsertShare): Promise<Share> {
    const id = nanoid();
    const newShare: Share = {
      id,
      ...share,
      createdAt: new Date()
    };
    this.shares.set(id, newShare);
    return newShare;
  }

  // Invite methods
  async getInviteByToken(token: string): Promise<Invite | undefined> {
    return Array.from(this.invites.values()).find(invite => invite.token === token);
  }

  async createInvite(invite: InsertInvite): Promise<Invite> {
    const id = nanoid();
    const newInvite: Invite = {
      id,
      ...invite,
      createdAt: new Date(),
      accepted: false
    };
    this.invites.set(id, newInvite);
    return newInvite;
  }

  async acceptInvite(token: string): Promise<void> {
    const invite = Array.from(this.invites.values()).find(inv => inv.token === token);
    if (invite) {
      invite.accepted = true;
      this.invites.set(invite.id, invite);
    }
  }
}

export const storage = new MemStorage();
