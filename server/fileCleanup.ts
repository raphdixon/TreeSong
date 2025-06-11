import { promises as fs } from 'fs';
import path from 'path';
import { storage } from './storage';
import { tracks } from '@shared/schema';
import { db } from './db';
import { lt, and, isNull, eq } from 'drizzle-orm';

export class FileCleanupService {
  private readonly uploadsDir = path.join(process.cwd(), 'uploads');
  private readonly cleanupIntervalMs = 24 * 60 * 60 * 1000; // 24 hours
  private intervalId: NodeJS.Timeout | null = null;

  async start() {
    console.log('Starting file cleanup service...');
    
    // Run cleanup immediately on start
    await this.performCleanup();
    
    // Schedule regular cleanup
    this.intervalId = setInterval(() => {
      this.performCleanup().catch(console.error);
    }, this.cleanupIntervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async performCleanup() {
    try {
      console.log('Running file cleanup...');
      
      const twentyOneDaysAgo = new Date();
      twentyOneDaysAgo.setDate(twentyOneDaysAgo.getDate() - 21);

      // Find tracks older than 21 days that haven't been marked as deleted
      const tracksToCleanup = await db
        .select()
        .from(tracks)
        .where(
          and(
            lt(tracks.uploadDate, twentyOneDaysAgo),
            isNull(tracks.fileDeletedAt)
          )
        );

      console.log(`Found ${tracksToCleanup.length} files to cleanup`);

      for (const track of tracksToCleanup) {
        try {
          // Delete the actual file
          const filePath = path.join(this.uploadsDir, track.filename);
          
          try {
            await fs.access(filePath);
            await fs.unlink(filePath);
            console.log(`Deleted file: ${track.filename}`);
          } catch (error) {
            // File might already be deleted, that's okay
            console.log(`File not found (already deleted): ${track.filename}`);
          }

          // Mark the track as file deleted in database
          await db
            .update(tracks)
            .set({ fileDeletedAt: new Date() })
            .where(eq(tracks.id, track.id));

          console.log(`Marked track ${track.id} as file deleted`);
        } catch (error) {
          console.error(`Error cleaning up track ${track.id}:`, error);
        }
      }

      console.log('File cleanup completed');
    } catch (error) {
      console.error('Error during file cleanup:', error);
    }
  }

  async getFileDeleteDate(uploadDate: Date): Promise<Date> {
    const deleteDate = new Date(uploadDate);
    deleteDate.setDate(deleteDate.getDate() + 21);
    return deleteDate;
  }

  async isFileDeleted(trackId: string): Promise<boolean> {
    const track = await storage.getTrack(trackId);
    return track?.fileDeletedAt !== null;
  }
}

export const fileCleanupService = new FileCleanupService();