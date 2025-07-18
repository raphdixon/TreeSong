import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";
import express from "express";
import { insertTrackSchema, insertEmojiReactionSchema } from "@shared/schema";
import rateLimit from "express-rate-limit";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { generateWaveformData } from "./waveform";

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads - MP3 only
const upload = multer({
  dest: uploadsDir,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.mp3'];
    const allowedMimeTypes = ['audio/mpeg', 'audio/mp3'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext) || allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP3 files are allowed.'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Auth middleware will be provided by setupAuth

// Admin middleware
const isAdmin: RequestHandler = async (req, res, next) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = req.user as any;
    const userId = user.claims?.sub;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const dbUser = await storage.getUser(userId);
    if (!dbUser || dbUser.email !== 'me@raph.plus') {
      return res.status(403).json({ message: "Forbidden - Admin access only" });
    }

    next();
  } catch (error) {
    console.error("Admin auth error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Setup Replit Auth middleware
  await setupAuth(app);
  
  // Initialize genres if not already present
  try {
    const genres = await storage.getAllGenres();
    if (genres.length === 0) {
      console.log("No genres found, seeding genres...");
      await storage.seedGenres();
      console.log("Genres seeded successfully");
    } else {
      console.log(`Found ${genres.length} genres in database`);
    }
  } catch (error) {
    console.error("Failed to initialize genres:", error);
  }

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
        storage.getAllTracksForFeed(),
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
      try {
        // First try rename (fast)
        fs.renameSync(req.file.path, newPath);
      } catch (renameError: any) {
        console.log("Rename failed, trying copy approach:", renameError.message);
        // If rename fails (e.g., cross-device), fall back to copy + delete
        try {
          fs.copyFileSync(req.file.path, newPath);
          fs.unlinkSync(req.file.path); // Delete the temp file
        } catch (copyError: any) {
          console.error("Failed to move file:", copyError);
          return res.status(500).json({ message: "Failed to save audio file. Please try again." });
        }
      }
      
      // Verify the file exists at the new location
      if (!fs.existsSync(newPath)) {
        console.error("File not found at destination after move:", newPath);
        return res.status(500).json({ message: "File upload failed. Please try again." });
      }
      
      console.log("File moved successfully, size:", fs.statSync(newPath).size, "bytes");

      const userId = req.user.claims.sub;

      // Generate waveform data for faster loading
      console.log("Generating waveform data...");
      const waveformData = await generateWaveformData(newPath);
      console.log("Waveform generated with", waveformData.peaks.length, "peaks");

      // Parse genres from request body
      let genreIds: string[] = [];
      try {
        if (req.body.genres) {
          genreIds = JSON.parse(req.body.genres);
          console.log("Parsed genre IDs:", genreIds);
          
          // Validate that 2-3 genres are selected
          if (genreIds.length < 2 || genreIds.length > 3) {
            return res.status(400).json({ message: "Please select 2-3 genres for your track" });
          }
        }
      } catch (error) {
        console.error("Failed to parse genres:", error);
        return res.status(400).json({ message: "Invalid genre data" });
      }

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
      
      // Add genres to track
      if (genreIds.length > 0) {
        console.log("Adding genres to track:", genreIds);
        await storage.addGenresToTrack(track.id, genreIds);
      }
      
      // Generate waveform data asynchronously after track creation
      const filePath = path.join(uploadsDir, track.filename);
      generateWaveformData(filePath).then(async (waveformData) => {
        console.log(`Generated waveform for track ${track.id} with ${waveformData.peaks.length} peaks`);
        await storage.updateTrackWaveform(track.id, waveformData);
      }).catch((error) => {
        console.error(`Failed to generate waveform for track ${track.id}:`, error);
      });
      
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

  // Admin routes
  app.get("/api/admin/tracks", isAdmin, async (req, res) => {
    try {
      const tracks = await storage.getAllTracks();
      res.json(tracks);
    } catch (error) {
      console.error("Failed to fetch tracks:", error);
      res.status(500).json({ message: "Failed to fetch tracks" });
    }
  });

  app.get("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/tracks/:id", isAdmin, async (req, res) => {
    try {
      const { title, artist } = req.body;
      await storage.updateTrack(req.params.id, { title, artist });
      res.json({ message: "Track updated successfully" });
    } catch (error) {
      console.error("Failed to update track:", error);
      res.status(500).json({ message: "Failed to update track" });
    }
  });

  app.patch("/api/admin/users/:id", isAdmin, async (req, res) => {
    try {
      const { artistName, email } = req.body;
      await storage.updateUser(req.params.id, { artistName, email });
      res.json({ message: "User updated successfully" });
    } catch (error) {
      console.error("Failed to update user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/admin/tracks/:id", isAdmin, async (req, res) => {
    try {
      const track = await storage.getTrack(req.params.id);
      if (!track) {
        return res.status(404).json({ message: "Track not found" });
      }

      // Delete file from filesystem
      const filePath = path.join(uploadsDir, track.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      await storage.deleteTrack(req.params.id);
      res.json({ message: "Track deleted successfully" });
    } catch (error) {
      console.error("Failed to delete track:", error);
      res.status(500).json({ message: "Failed to delete track" });
    }
  });

  app.delete("/api/admin/users/:id", isAdmin, async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Failed to delete user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Playlist routes
  app.get("/api/playlists", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const playlists = await storage.getUserPlaylists(userId);
      console.log('[ROUTES] Fetched playlists for user:', userId, 'count:', playlists.length);
      res.json(playlists);
    } catch (error) {
      console.error("Failed to fetch playlists:", error);
      res.status(500).json({ message: "Failed to fetch playlists" });
    }
  });

  app.post("/api/playlists", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name } = req.body;
      
      if (!name || !name.trim()) {
        return res.status(400).json({ message: "Playlist name is required" });
      }
      
      const playlist = await storage.createPlaylist({
        userId,
        name: name.trim()
      });
      
      console.log('[ROUTES] Created playlist:', playlist);
      res.json(playlist);
    } catch (error) {
      console.error("Failed to create playlist:", error);
      res.status(500).json({ message: "Failed to create playlist" });
    }
  });

  app.get("/api/playlists/:id", async (req, res) => {
    try {
      const playlist = await storage.getPlaylist(req.params.id);
      
      if (!playlist) {
        return res.status(404).json({ message: "Playlist not found" });
      }
      
      // Get tracks for the playlist
      const tracks = await storage.getPlaylistTracks(playlist.id);
      
      res.json({ ...playlist, tracks });
    } catch (error) {
      console.error("Failed to fetch playlist:", error);
      res.status(500).json({ message: "Failed to fetch playlist" });
    }
  });

  app.get("/api/playlists/by-name/:username/:playlistName", async (req, res) => {
    try {
      const { username, playlistName } = req.params;
      
      // Find user by email (using username parameter as email)
      const user = await storage.getUserByEmail(username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get all playlists for user
      const playlists = await storage.getUserPlaylists(user.id);
      
      // Find playlist by name
      const playlist = playlists.find(p => p.name.toLowerCase() === playlistName.toLowerCase());
      
      if (!playlist) {
        return res.status(404).json({ message: "Playlist not found" });
      }
      
      // Get tracks for the playlist
      const tracks = await storage.getPlaylistTracks(playlist.id);
      
      res.json({ ...playlist, tracks });
    } catch (error) {
      console.error("Failed to fetch playlist by name:", error);
      res.status(500).json({ message: "Failed to fetch playlist" });
    }
  });

  app.get("/api/playlists/:id/tracks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const playlist = await storage.getPlaylist(req.params.id);
      
      if (!playlist) {
        return res.status(404).json({ message: "Playlist not found" });
      }
      
      // Check if user owns this playlist
      if (playlist.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const tracks = await storage.getPlaylistTracks(req.params.id);
      console.log('[ROUTES] Fetched tracks for playlist:', req.params.id, 'count:', tracks.length);
      res.json(tracks);
    } catch (error) {
      console.error("Failed to fetch playlist tracks:", error);
      res.status(500).json({ message: "Failed to fetch playlist tracks" });
    }
  });

  app.post("/api/playlists/:id/tracks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { trackId } = req.body;
      
      if (!trackId) {
        return res.status(400).json({ message: "Track ID is required" });
      }
      
      const playlist = await storage.getPlaylist(req.params.id);
      
      if (!playlist) {
        return res.status(404).json({ message: "Playlist not found" });
      }
      
      // Check if user owns this playlist
      if (playlist.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Check if track exists
      const track = await storage.getTrack(trackId);
      if (!track) {
        return res.status(404).json({ message: "Track not found" });
      }
      
      // Check if track is already in playlist
      const exists = await storage.isTrackInPlaylist(req.params.id, trackId);
      if (exists) {
        return res.status(400).json({ message: "Track already in playlist" });
      }
      
      // Get next position
      const position = await storage.getNextPosition(req.params.id);
      
      const savedTrack = await storage.saveTrackToPlaylist({
        playlistId: req.params.id,
        trackId,
        position
      });
      
      console.log('[ROUTES] Added track to playlist:', savedTrack);
      res.json(savedTrack);
    } catch (error) {
      console.error("Failed to add track to playlist:", error);
      res.status(500).json({ message: "Failed to add track to playlist" });
    }
  });

  app.delete("/api/playlists/:id/tracks/:trackId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const playlist = await storage.getPlaylist(req.params.id);
      
      if (!playlist) {
        return res.status(404).json({ message: "Playlist not found" });
      }
      
      // Check if user owns this playlist
      if (playlist.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.removeTrackFromPlaylist(req.params.id, req.params.trackId);
      console.log('[ROUTES] Removed track from playlist:', req.params.trackId);
      res.json({ message: "Track removed from playlist" });
    } catch (error) {
      console.error("Failed to remove track from playlist:", error);
      res.status(500).json({ message: "Failed to remove track from playlist" });
    }
  });

  app.delete("/api/playlists/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const playlist = await storage.getPlaylist(req.params.id);
      
      if (!playlist) {
        return res.status(404).json({ message: "Playlist not found" });
      }
      
      // Check if user owns this playlist
      if (playlist.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deletePlaylist(req.params.id);
      console.log('[ROUTES] Deleted playlist:', req.params.id);
      res.json({ message: "Playlist deleted successfully" });
    } catch (error) {
      console.error("Failed to delete playlist:", error);
      res.status(500).json({ message: "Failed to delete playlist" });
    }
  });

  // Genre routes
  app.post("/api/genres/seed", isAdmin, async (req, res) => {
    try {
      await storage.seedGenres();
      res.json({ message: "Genres seeded successfully" });
    } catch (error) {
      console.error("Failed to seed genres:", error);
      res.status(500).json({ message: "Failed to seed genres" });
    }
  });

  app.get("/api/genres", async (req, res) => {
    try {
      const genres = await storage.getAllGenres();
      res.json(genres);
    } catch (error) {
      console.error("Failed to fetch genres:", error);
      res.status(500).json({ message: "Failed to fetch genres" });
    }
  });

  // User genre rating routes
  app.get("/api/genres/unrated", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 5;
      
      const unratedGenres = await storage.getUnratedGenres(userId, limit);
      res.json(unratedGenres);
    } catch (error) {
      console.error("Failed to fetch unrated genres:", error);
      res.status(500).json({ message: "Failed to fetch unrated genres" });
    }
  });

  app.post("/api/genres/rate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { genreId, rating } = req.body;
      
      if (!genreId || !rating) {
        return res.status(400).json({ message: "Genre ID and rating are required" });
      }
      
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }
      
      const userRating = await storage.rateGenre({
        userId,
        genreId,
        rating
      });
      
      res.json(userRating);
    } catch (error) {
      console.error("Failed to rate genre:", error);
      res.status(500).json({ message: "Failed to rate genre" });
    }
  });

  app.get("/api/genres/rated-all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const hasRatedAll = await storage.hasRatedAllGenres(userId);
      res.json({ hasRatedAll });
    } catch (error) {
      console.error("Failed to check if user rated all genres:", error);
      res.status(500).json({ message: "Failed to check genre ratings" });
    }
  });

  // Track play recording
  app.post("/api/tracks/:id/play", async (req: any, res) => {
    try {
      const { sessionId, completionRate = 0, isRepeat = false } = req.body;
      const userId = req.user?.claims?.sub || null;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }
      
      const trackPlay = await storage.recordTrackPlay({
        trackId: req.params.id,
        userId,
        sessionId,
        completionRate,
        isRepeat
      });
      
      res.json(trackPlay);
    } catch (error) {
      console.error("Failed to record track play:", error);
      res.status(500).json({ message: "Failed to record track play" });
    }
  });

  // Debug endpoint to check audio files
  app.get("/api/debug/audio-files", async (req, res) => {
    try {
      const tracks = await storage.getAllTracks();
      const results = await Promise.all(tracks.map(async (track) => {
        const filePath = path.join(uploadsDir, track.filename);
        const exists = fs.existsSync(filePath);
        return { 
          trackId: track.id, 
          filename: track.filename, 
          exists,
          originalName: track.originalName,
          uploaderId: track.uploaderUserId
        };
      }));
      
      const missing = results.filter(r => !r.exists);
      res.json({ 
        total: tracks.length, 
        existing: tracks.length - missing.length,
        missing: missing.length, 
        missingFiles: missing 
      });
    } catch (error) {
      console.error("Failed to check audio files:", error);
      res.status(500).json({ message: "Failed to check audio files" });
    }
  });

  // Admin settings routes
  app.get("/api/admin/settings/:key", isAdmin, async (req, res) => {
    try {
      const value = await storage.getAdminSetting(req.params.key);
      res.json({ key: req.params.key, value });
    } catch (error) {
      console.error("Failed to fetch admin setting:", error);
      res.status(500).json({ message: "Failed to fetch admin setting" });
    }
  });

  app.post("/api/admin/settings", isAdmin, async (req, res) => {
    try {
      const { key, value } = req.body;
      
      if (!key || !value) {
        return res.status(400).json({ message: "Key and value are required" });
      }
      
      await storage.setAdminSetting(key, value);
      res.json({ message: "Setting updated successfully" });
    } catch (error) {
      console.error("Failed to update admin setting:", error);
      res.status(500).json({ message: "Failed to update admin setting" });
    }
  });

  // Enhanced feed endpoint with genre-based recommendations
  app.get("/api/feed/tracks", async (req: any, res) => {
    try {
      const sessionId = req.query.sessionId as string;
      const userId = req.user?.claims?.sub || null;
      const page = parseInt(req.query.page as string) || 0;
      const pageSize = 10;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }
      
      // Get recently played tracks to exclude
      const recentlyPlayed = await storage.getRecentlyPlayedTracksForSession(sessionId, 50);
      
      // Get user's played tracks to exclude (if logged in)
      let userPlayedTracks: string[] = [];
      if (userId) {
        userPlayedTracks = await storage.getUserPlayedTracks(userId);
      }
      
      const excludeTrackIds = Array.from(new Set([...recentlyPlayed, ...userPlayedTracks]));
      
      // Check if we need to show initial tracks for logged-out users
      let feedTracks: any[] = [];
      
      if (!userId && page === 0) {
        // Get admin-selected initial tracks for logged-out users
        const initialTrack1Id = await storage.getAdminSetting('initial_track_1');
        const initialTrack2Id = await storage.getAdminSetting('initial_track_2');
        
        if (initialTrack1Id) {
          const track1 = await storage.getTrack(initialTrack1Id);
          if (track1) {
            const genres = await storage.getTrackGenres(track1.id);
            const playCount = await storage.getTrackPlayCount(track1.id);
            const user = await storage.getUser(track1.uploaderUserId);
            feedTracks.push({
              ...track1,
              genres,
              playCount,
              creatorUsername: user?.username || '',
              creatorArtistName: user?.artistName || 'Unknown Artist',
              creatorEmail: user?.email || ''
            });
          }
        }
        
        if (initialTrack2Id) {
          const track2 = await storage.getTrack(initialTrack2Id);
          if (track2) {
            const genres = await storage.getTrackGenres(track2.id);
            const playCount = await storage.getTrackPlayCount(track2.id);
            const user = await storage.getUser(track2.uploaderUserId);
            feedTracks.push({
              ...track2,
              genres,
              playCount,
              creatorUsername: user?.username || '',
              creatorArtistName: user?.artistName || 'Unknown Artist',
              creatorEmail: user?.email || ''
            });
          }
        }
      }
      
      // Get all tracks with genre and play info
      const allTracks = await storage.getTracksWithGenreAndPlayInfo();
      console.log(`[FEED] Found ${allTracks.length} total tracks`);
      
      // Filter out excluded tracks
      const availableTracks = allTracks.filter(t => !excludeTrackIds.includes(t.id));
      console.log(`[FEED] ${availableTracks.length} tracks available after filtering`);
      
      // Get user's genre affinity (if logged in)
      let genreAffinity = new Map<string, number>();
      if (userId) {
        genreAffinity = await storage.getUserGenreAffinity(userId);
      }
      
      // Build the rest of the feed
      const remainingSlots = pageSize - feedTracks.length;
      
      if (remainingSlots > 0) {
        // TODO: Implement the complex recommendation algorithm
        // For now, just return random tracks
        const shuffled = availableTracks.sort(() => Math.random() - 0.5);
        feedTracks.push(...shuffled.slice(0, remainingSlots));
      }
      
      res.json(feedTracks);
    } catch (error) {
      console.error("Failed to fetch feed:", error);
      res.status(500).json({ message: "Failed to fetch feed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
