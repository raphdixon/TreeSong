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
import { insertUserSchema, insertTrackSchema, insertCommentSchema, insertInviteSchema } from "@shared/schema";
import { sendEmail, createTeamInviteEmail, createCommentNotificationEmail } from "./email";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

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
    console.log("Token verification failed:", error.message);
    return res.status(403).json({ message: "Invalid token" });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Serve uploaded files
  app.use('/uploads', express.static(uploadsDir));

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
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
      res.status(400).json({ message: "Registration failed: " + error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
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
  app.get("/api/tracks", async (req, res) => {
    try {
      // For now, get all tracks (we'll add proper team filtering later)
      const tracks = await storage.getTracksByTeam("default-team");
      res.json(tracks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tracks" });
    }
  });

  app.get("/api/tracks/:trackId", async (req, res) => {
    try {
      const track = await storage.getTrack(req.params.trackId);
      if (!track) {
        return res.status(404).json({ message: "Track not found" });
      }

      const comments = await storage.getCommentsByTrack(track.id);
      res.json({ track, comments });
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
      const bpm = req.body.bpm ? parseInt(req.body.bpm) : undefined;
      const duration = parseFloat(req.body.duration) || 180; // Default 3 minutes if not provided
      
      console.log("BPM:", bpm, "Duration:", duration);
      
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
        bpm,
        duration
      });

      console.log("Creating track with data:", trackData);
      const track = await storage.createTrack(trackData);
      console.log("Track created successfully:", track.id);
      
      res.json(track);
    } catch (error) {
      console.error("Upload error:", error);
      res.status(400).json({ message: "Failed to upload track", error: error.message });
    }
  });

  app.delete("/api/tracks/:trackId", authenticateToken, async (req, res) => {
    try {
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

  // Update track BPM
  app.patch("/api/tracks/:trackId/bpm", authenticateToken, async (req: any, res) => {
    console.log('=== BPM UPDATE ROUTE ===');
    console.log('Track ID:', req.params.trackId);
    console.log('Request body:', req.body);
    console.log('User:', req.user);
    
    try {
      const { bpm } = req.body;
      console.log('Extracted BPM:', bpm, 'Type:', typeof bpm);
      
      if (!bpm || isNaN(bpm) || bpm < 60 || bpm > 200) {
        console.log('BPM validation failed:', { bpm, isNaN: isNaN(bpm) });
        return res.status(400).json({ message: "Invalid BPM value. Must be between 60 and 200." });
      }

      const track = await storage.getTrack(req.params.trackId);
      console.log('Track found:', track ? 'Yes' : 'No');
      
      if (!track) {
        return res.status(404).json({ message: "Track not found" });
      }

      console.log('Calling storage.updateTrackBpm with:', req.params.trackId, parseInt(bpm));
      
      // Update the track BPM
      await storage.updateTrackBpm(req.params.trackId, parseInt(bpm));
      
      console.log('BPM update completed successfully');
      res.json({ message: "BPM updated successfully", bpm: parseInt(bpm) });
    } catch (error) {
      console.error("=== BPM UPDATE ROUTE ERROR ===");
      console.error("Error:", error);
      console.error("Error message:", error instanceof Error ? error.message : 'Unknown error');
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack');
      res.status(500).json({ message: "Failed to update track BPM" });
    }
  });

  // Comment routes
  app.get("/api/tracks/:trackId/comments", async (req, res) => {
    try {
      const comments = await storage.getCommentsByTrack(req.params.trackId);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post("/api/tracks/:trackId/comments", async (req, res) => {
    try {
      const { time, username, text } = req.body;
      
      const commentData = insertCommentSchema.parse({
        trackId: req.params.trackId,
        time: parseFloat(time),
        username,
        text,
        isPublic: !req.user, // Public if no authenticated user
        authorUserId: req.user?.id
      });

      const comment = await storage.createComment(commentData);
      
      // Send notification email to track owner
      try {
        const track = await storage.getTrack(req.params.trackId);
        if (track && track.uploaderUserId) {
          const trackOwner = await storage.getUser(track.uploaderUserId);
          
          // Don't send notification if commenter is the track owner
          if (trackOwner && trackOwner.id !== req.user?.id) {
            const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
            const trackUrl = `https://${baseUrl}/tracks/${track.id}`;
            
            const emailTemplate = createCommentNotificationEmail(
              track.originalName,
              username || 'Anonymous',
              text,
              parseFloat(time),
              trackUrl
            );
            emailTemplate.to = trackOwner.email;
            
            const emailSent = await sendEmail(emailTemplate);
            if (emailSent) {
              console.log(`Comment notification sent to ${trackOwner.email} for track ${track.originalName}`);
            } else {
              console.error(`Failed to send comment notification to ${trackOwner.email}`);
            }
          }
        }
      } catch (emailError) {
        console.error('Error sending comment notification:', emailError);
        // Don't fail the comment creation if email fails
      }
      
      res.json(comment);
    } catch (error) {
      res.status(400).json({ message: "Failed to create comment" });
    }
  });

  app.delete("/api/tracks/:trackId/comments/:commentId", authenticateToken, async (req, res) => {
    try {
      const comments = await storage.getCommentsByTrack(req.params.trackId);
      const targetComment = comments.find(c => c.id === req.params.commentId);
      
      if (!targetComment) {
        return res.status(404).json({ message: "Comment not found" });
      }

      // Check if user can delete this comment
      const track = await storage.getTrack(req.params.trackId);
      if (targetComment.authorUserId !== req.user.id && track?.uploaderUserId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteComment(req.params.commentId);
      res.json({ message: "Comment deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete comment" });
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
      const comments = await storage.getCommentsByTrack(share.trackId);
      
      res.json({ track, comments });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shared track" });
    }
  });

  // Invite routes
  app.post("/api/invite", authenticateToken, async (req, res) => {
    try {
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
