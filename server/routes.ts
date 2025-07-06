import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";
import express from "express";
import { insertTrackSchema, insertEmojiReactionSchema, insertTrackListenSchema } from "@shared/schema";
import rateLimit from "express-rate-limit";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { generateWaveformData } from "./waveform";

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

// Auth middleware will be provided by setupAuth

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Setup Replit Auth middleware
  await setupAuth(app);

  // Serve uploaded files
  app.use('/uploads', express.static(uploadsDir));

  // Auth routes - handled by setupAuth
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post('/api/auth/update-artist', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { artistName } = req.body;
      
      if (!artistName || typeof artistName !== 'string') {
        return res.status(400).json({ message: "Artist name is required" });
      }

      // Update user's artist name
      await storage.updateUserArtistName(userId, artistName.trim());
      
      res.json({ message: "Artist name updated successfully" });
    } catch (error) {
      console.error("Error updating artist name:", error);
      res.status(500).json({ message: "Failed to update artist name" });
    }
  });

  // Track routes  
  app.get("/api/tracks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tracks = await storage.getUserTracks(userId);
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

  // Get waveform data for a track
  app.get("/api/tracks/:trackId/waveform", async (req, res) => {
    try {
      const track = await storage.getTrack(req.params.trackId);
      if (!track) {
        return res.status(404).json({ message: "Track not found" });
      }

      // Check if we need to regenerate (old data has too many peaks)
      const needsRegeneration = track.waveformData && 
        track.waveformData.peaks && 
        track.waveformData.peaks.length > 500;

      // Return cached waveform data if available and good quality
      if (track.waveformData && !needsRegeneration) {
        res.json(track.waveformData);
      } else {
        // Generate waveform data on-demand if not cached or needs regeneration
        const filePath = path.join(uploadsDir, track.filename);
        if (fs.existsSync(filePath)) {
          console.log(`Regenerating waveform for track ${req.params.trackId}`);
          const waveformData = await generateWaveformData(filePath);
          
          // Update the track with new waveform data
          await storage.updateTrackWaveform(req.params.trackId, waveformData);
          
          res.json(waveformData);
        } else {
          res.status(404).json({ message: "Audio file not found" });
        }
      }
    } catch (error) {
      console.error("Error fetching waveform:", error);
      res.status(500).json({ message: "Failed to fetch waveform data" });
    }
  });

  app.post("/api/tracks", isAuthenticated, upload.single('audio'), async (req: any, res) => {
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

      const userId = req.user.claims.sub;

      // Generate waveform data for faster loading
      console.log("Generating waveform data...");
      const waveformData = await generateWaveformData(newPath);
      console.log("Waveform generated with", waveformData.peaks.length, "peaks");

      const trackData = insertTrackSchema.parse({
        uploaderUserId: userId,
        filename,
        originalName: req.file.originalname,
        duration,
        waveformData
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

  app.delete("/api/tracks/:trackId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const track = await storage.getTrack(req.params.trackId);
      if (!track) {
        return res.status(404).json({ message: "Track not found" });
      }

      // Check if user has permission to delete (only uploader can delete)
      if (track.uploaderUserId !== userId) {
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



  const httpServer = createServer(app);
  return httpServer;
}
