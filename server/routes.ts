import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";
import express from "express";
import cookieParser from "cookie-parser";
import { insertUserSchema, insertTrackSchema, insertEmojiReactionSchema, insertTrackListenSchema, insertInviteSchema } from "@shared/schema";
import { sendEmail, createTeamInviteEmail } from "./email";
import rateLimit from "express-rate-limit";

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable must be set");
}

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const upload = multer({
  dest: uploadsDir,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.mp3', '.wav', '.ogg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP3, WAV, and OGG files are allowed.'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Auth middleware
const authenticateToken = async (req: any, res: any, next: any) => {
  console.log("=== AUTH MIDDLEWARE ===");
  console.log("Request path:", req.path);
  console.log("Cookies:", req.cookies);
  console.log("Authorization header:", req.headers.authorization);
  
  // Try to get token from cookie first, then from Authorization header
  let token = req.cookies?.token;
  
  if (!token) {
    // Try Authorization header as fallback
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      console.log("Found token in Authorization header");
    }
  } else {
    console.log("Found token in cookies");
  }
  
  if (!token) {
    console.log("No token found in cookies or Authorization header");
    return res.status(401).json({ message: "Access token required" });
  }

  try {
    console.log("Verifying token:", token.substring(0, 20) + "...");
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    console.log("Token decoded, userId:", decoded.userId);
    
    const user = await storage.getUser(decoded.userId);
    
    if (!user) {
      console.log("User not found for userId:", decoded.userId);
      return res.status(401).json({ message: "User not found" });
    }
    
    console.log("User authenticated:", user.email);
    req.user = user;
    next();
  } catch (error) {
    console.log("Token verification failed:", (error as Error).message);
    return res.status(403).json({ message: "Invalid token" });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Serve uploaded files
  app.use('/uploads', express.static(uploadsDir));

  // Rate limiters
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: "Too many authentication attempts, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Auth routes
  app.post("/api/auth/register", authLimiter, async (req, res) => {
    try {
      console.log("Registration request body:", req.body);
      
      const { email, password, teamId } = req.body;
      
      // Basic validation
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Create team for new user if no teamId provided
      let userTeamId = teamId;
      if (!userTeamId) {
        const team = await storage.createTeam({ name: `${email}'s Team` });
        userTeamId = team.id;
      }

      const userData = { email, password, teamId: userTeamId };
      const user = await storage.createUser(userData);
      
      // Add user to the team
      await storage.addUserToTeam(userTeamId, user.id);
      
      const token = jwt.sign({ userId: user.id }, JWT_SECRET);
      
      res.cookie("token", token, { 
        httpOnly: true, 
        secure: false, 
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000 
      });
      console.log("Register: Setting cookie with token:", token.substring(0, 20) + "...");
      res.json({ 
        user: { id: user.id, email: user.email, teamId: user.teamId },
        token: token
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "Registration failed: " + (error as Error).message });
    }
  });

  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET);
      res.cookie("token", token, { 
        httpOnly: true, 
        secure: false, 
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000 
      });
      console.log("Login: Setting cookie with token:", token.substring(0, 20) + "...");
      res.json({ 
        user: { id: user.id, email: user.email, teamId: user.teamId },
        token: token
      });
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ message: "Logged out successfully" });
  });

  // User info route
  app.get("/api/me", authenticateToken, async (req, res) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    const team = await storage.getTeam(user.teamId);
    res.json({ 
      user: { id: user.id, email: user.email, teamId: user.teamId },
      team: team ? { id: team.id, name: team.name } : null
    });
  });

  // Debug route to check authentication
  app.get("/api/debug/auth", (req, res) => {
    console.log("=== DEBUG AUTH CHECK ===");
    console.log("Cookies:", req.cookies);
    console.log("Headers:", req.headers);
    res.json({
      hasCookies: !!req.cookies,
      cookieNames: Object.keys(req.cookies || {}),
      hasToken: !!req.cookies?.token,
      userAgent: req.headers['user-agent']
    });
  });

  // Track routes  
  app.get("/api/tracks", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const tracks = await storage.getTracksByTeam(req.user.teamId);
      res.json(tracks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tracks" });
    }
  });

  // Public tracks for the feed (all tracks across teams)
  app.get("/api/tracks/public", async (req, res) => {
    try {
      // Batch fetch tracks and all emoji reactions in just 2 queries instead of N+1
      const [tracks, allEmojiReactions] = await Promise.all([
        storage.getAllTracks(),
        storage.getAllEmojiReactions()
      ]);
      
      // Group emoji reactions by trackId for efficient lookup
      const reactionsByTrackId = allEmojiReactions.reduce((acc, reaction) => {
        if (!acc[reaction.trackId]) {
          acc[reaction.trackId] = [];
        }
        acc[reaction.trackId].push(reaction);
        return acc;
      }, {} as Record<string, any[]>);
      
      // Add emoji reactions to each track using the grouped data
      const tracksWithReactions = tracks.map((track) => ({
        ...track,
        emojiReactions: reactionsByTrackId[track.id] || []
      }));
      
      res.json(tracksWithReactions);
    } catch (error) {
      console.error("Failed to fetch public tracks:", error);
      res.status(500).json({ message: "Failed to fetch public tracks" });
    }
  });

  app.get("/api/tracks/:trackId", async (req, res) => {
    try {
      const track = await storage.getTrack(req.params.trackId);
      if (!track) {
        return res.status(404).json({ message: "Track not found" });
      }

      const emojiReactions = await storage.getEmojiReactionsByTrack(track.id);
      res.json({ track, emojiReactions });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch track" });
    }
  });

  app.post("/api/tracks", authenticateToken, upload.single('audio'), async (req: any, res) => {
    console.log("=== UPLOAD TRACK REQUEST ===");
    console.log("Request body:", req.body);
    console.log("File:", req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    } : "No file");
    
    try {
      if (!req.file) {
        console.log("ERROR: No file provided");
        return res.status(400).json({ message: "Audio file is required" });
      }

      console.log("Processing file upload...");
      const duration = parseFloat(req.body.duration) || 180; // Default 3 minutes if not provided
      
      console.log("Duration:", duration);
      
      // Generate unique filename
      const ext = path.extname(req.file.originalname);
      const filename = `${nanoid()}${ext}`;
      const newPath = path.join(uploadsDir, filename);
      
      console.log("Moving file from", req.file.path, "to", newPath);
      
      // Move file to permanent location
      fs.renameSync(req.file.path, newPath);
      
      console.log("File moved successfully");

      const trackData = insertTrackSchema.parse({
        teamId: req.user.teamId,
        uploaderUserId: req.user.id,
        filename,
        originalName: req.file.originalname,
        duration
      });

      console.log("Creating track with data:", trackData);
      const track = await storage.createTrack(trackData);
      console.log("Track created successfully:", track.id);
      
      res.json(track);
    } catch (error) {
      console.error("Upload error:", error);
      res.status(400).json({ message: "Failed to upload track", error: (error as Error).message });
    }
  });

  app.delete("/api/tracks/:trackId", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const track = await storage.getTrack(req.params.trackId);
      if (!track) {
        return res.status(404).json({ message: "Track not found" });
      }

      // Check if user has permission to delete
      if (track.teamId !== req.user.teamId || track.uploaderUserId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Delete file from filesystem
      const filePath = path.join(uploadsDir, track.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      await storage.deleteTrack(track.id);
      res.json({ message: "Track deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete track" });
    }
  });



  // Emoji reaction routes
  app.get("/api/tracks/:trackId/emoji-reactions", async (req, res) => {
    try {
      const reactions = await storage.getEmojiReactionsByTrack(req.params.trackId);
      res.json(reactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch emoji reactions" });
    }
  });

  app.get("/api/tracks/:trackId/emoji-reactions/session/:sessionId", async (req, res) => {
    try {
      const { trackId, sessionId } = req.params;
      const reactions = await storage.getEmojiReactionsBySession(trackId, sessionId);
      res.json({ count: reactions.length, reactions });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch session emoji reactions" });
    }
  });

  app.post("/api/tracks/:trackId/emoji-reactions", async (req, res) => {
    try {
      const { emoji, time, listenerSessionId } = req.body;
      const trackId = req.params.trackId;
      
      console.log('[SESSION DEBUG] Received emoji reaction request:', {
        trackId,
        emoji,
        time,
        listenerSessionId,
        bodyKeys: Object.keys(req.body)
      });
      
      // Check current emoji count for this session
      const existingReactions = await storage.getEmojiReactionsBySession(trackId, listenerSessionId);
      console.log('[SESSION DEBUG] Existing reactions for session:', {
        sessionId: listenerSessionId,
        count: existingReactions.length,
        reactions: existingReactions.map(r => ({ id: r.id, emoji: r.emoji, time: r.time }))
      });
      
      // If we have 10 or more emojis, remove the oldest one (FIFO)
      if (existingReactions.length >= 10) {
        const oldestReaction = existingReactions[0]; // First one (oldest by timestamp)
        await storage.deleteEmojiReaction(oldestReaction.id);
      }
      
      const reactionData = insertEmojiReactionSchema.parse({
        trackId,
        emoji,
        time: parseFloat(time),
        listenerSessionId
      });

      const reaction = await storage.createEmojiReaction(reactionData);
      
      // Return the new reaction with current count
      const updatedReactions = await storage.getEmojiReactionsBySession(trackId, listenerSessionId);
      console.log('[SESSION DEBUG] Updated reactions after insert:', {
        sessionId: listenerSessionId,
        count: updatedReactions.length,
        reactions: updatedReactions.map(r => ({ id: r.id, emoji: r.emoji, time: r.time }))
      });
      
      const allTrackReactions = await storage.getEmojiReactionsByTrack(trackId);
      console.log('[SESSION DEBUG] All track reactions:', {
        trackId,
        count: allTrackReactions.length,
        reactions: allTrackReactions.slice(0, 5).map(r => ({ 
          id: r.id, 
          emoji: r.emoji, 
          sessionId: r.listenerSessionId 
        }))
      });
      
      const responseData = { 
        reaction, 
        currentCount: updatedReactions.length,
        allReactions: allTrackReactions
      };
      
      console.log('[BACKEND DEBUG] Sending response data:', {
        hasReaction: !!responseData.reaction,
        currentCount: responseData.currentCount,
        allReactionsLength: responseData.allReactions?.length,
        fullResponse: JSON.stringify(responseData)
      });
      
      res.json(responseData);
    } catch (error) {
      console.error("Failed to create emoji reaction:", error);
      res.status(400).json({ message: "Failed to create emoji reaction" });
    }
  });

  // Track listen routes
  app.post("/api/tracks/:trackId/listens", async (req, res) => {
    try {
      const { sessionId } = req.body;
      
      const listenData = insertTrackListenSchema.parse({
        trackId: req.params.trackId,
        sessionId
      });

      const listen = await storage.createTrackListen(listenData);
      res.json(listen);
    } catch (error) {
      res.status(400).json({ message: "Failed to create track listen" });
    }
  });

  app.post("/api/tracks/:trackId/listens/:sessionId/complete", async (req, res) => {
    try {
      await storage.markTrackListenComplete(req.params.trackId, req.params.sessionId);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ message: "Failed to mark listen complete" });
    }
  });



  // Share routes
  app.post("/api/tracks/:trackId/share", async (req, res) => {
    try {
      const track = await storage.getTrack(req.params.trackId);
      if (!track) {
        return res.status(404).json({ message: "Track not found" });
      }

      const token = nanoid(16);
      const share = await storage.createShare({
        trackId: track.id,
        token
      });

      const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
      const shareUrl = `https://${baseUrl}/share/${token}`;
      
      res.json({ shareUrl, token });
    } catch (error) {
      res.status(500).json({ message: "Failed to create share link" });
    }
  });

  app.get("/api/share/:token", async (req, res) => {
    try {
      const share = await storage.getShareByToken(req.params.token);
      if (!share) {
        return res.status(404).json({ message: "Share link not found" });
      }

      const track = await storage.getTrack(share.trackId);
      
      res.json({ track });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shared track" });
    }
  });

  // Invite routes
  app.post("/api/invite", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const { email } = req.body;
      const token = nanoid(32);
      
      // Get team info for email
      const team = await storage.getTeam(req.user.teamId);
      const teamName = team?.name || "Unknown Team";
      
      const invite = await storage.createInvite({
        teamId: req.user.teamId,
        email,
        token
      });

      // Send invitation email
      const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
      const emailTemplate = createTeamInviteEmail(
        req.user.email,
        teamName,
        token,
        `https://${baseUrl}`
      );
      emailTemplate.to = email;
      
      const emailSent = await sendEmail(emailTemplate);
      if (!emailSent) {
        console.error("Failed to send invitation email to", email);
        return res.status(500).json({ message: "Failed to send invitation email" });
      }
      
      console.log(`Invitation email sent to ${email} with token: ${token}`);
      res.json({ message: "Invitation sent successfully" });
    } catch (error) {
      console.error("Invitation error:", error);
      res.status(500).json({ message: "Failed to send invitation" });
    }
  });

  app.get("/api/invite/accept/:token", async (req, res) => {
    try {
      const invite = await storage.getInviteByToken(req.params.token);
      if (!invite) {
        return res.status(404).json({ message: "Invalid invitation token" });
      }

      if (invite.accepted) {
        return res.status(400).json({ message: "Invitation already accepted" });
      }

      res.json({ invite: { email: invite.email, teamId: invite.teamId } });
    } catch (error) {
      res.status(500).json({ message: "Failed to validate invitation" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
