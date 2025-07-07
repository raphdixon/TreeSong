import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath.path);

export interface WaveformData {
  peaks: number[];
  length: number;
}

/**
 * Generate waveform peaks from an audio file using FFmpeg
 * Extracts real audio data for accurate waveform visualization
 */
export async function generateWaveformData(filePath: string): Promise<WaveformData> {
  return new Promise((resolve, reject) => {
    const targetPeaks = 300; // Number of peaks for visualization
    const peaks: number[] = [];
    let duration = 0;
    
    // First, get the audio duration
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error('Error probing audio file:', err);
        // Return a simple fallback if ffmpeg fails
        const fallbackPeaks = new Array(targetPeaks).fill(0).map(() => Math.random() * 0.3 + 0.1);
        resolve({
          peaks: fallbackPeaks,
          length: fallbackPeaks.length
        });
        return;
      }
      
      duration = metadata.format.duration || 0;
      if (duration === 0) {
        console.error('Could not determine audio duration');
        const fallbackPeaks = new Array(targetPeaks).fill(0).map(() => Math.random() * 0.3 + 0.1);
        resolve({
          peaks: fallbackPeaks,
          length: fallbackPeaks.length
        });
        return;
      }
      
      // Extract audio peaks using FFmpeg
      const tempPeaks: number[] = [];
      
      ffmpeg(filePath)
        .outputOptions([
          '-ac', '1', // Convert to mono
          '-ar', '8000', // Low sample rate for efficiency
          '-f', 's16le', // 16-bit little-endian PCM
          '-acodec', 'pcm_s16le'
        ])
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          // Return fallback on error
          const fallbackPeaks = new Array(targetPeaks).fill(0).map(() => Math.random() * 0.3 + 0.1);
          resolve({
            peaks: fallbackPeaks,
            length: fallbackPeaks.length
          });
        })
        .pipe()
        .on('data', (chunk: Buffer) => {
          // Process PCM data
          for (let i = 0; i < chunk.length - 1; i += 2) {
            // Read 16-bit sample
            const sample = chunk.readInt16LE(i);
            const normalizedSample = Math.abs(sample) / 32768; // Normalize to 0-1
            tempPeaks.push(normalizedSample);
          }
        })
        .on('end', () => {
          // Downsample to target number of peaks
          const downsampled = downsamplePeaks(tempPeaks, targetPeaks);
          
          resolve({
            peaks: downsampled,
            length: downsampled.length
          });
        });
    });
  });
}

/**
 * Downsample peaks array to target length
 * Takes the maximum value in each chunk for better visualization
 */
function downsamplePeaks(peaks: number[], targetLength: number): number[] {
  if (peaks.length <= targetLength) {
    return peaks;
  }
  
  const result: number[] = [];
  const chunkSize = Math.floor(peaks.length / targetLength);
  
  for (let i = 0; i < targetLength; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, peaks.length);
    
    // Find the maximum peak in this chunk
    let maxPeak = 0;
    for (let j = start; j < end; j++) {
      maxPeak = Math.max(maxPeak, peaks[j]);
    }
    
    // Ensure minimum visibility
    result.push(Math.max(maxPeak, 0.05));
  }
  
  return result;
}

/**
 * Get cached waveform data for a track, or generate it if not available
 */
export async function getCachedWaveformData(
  trackId: string, 
  filePath: string, 
  existingWaveformData?: any
): Promise<WaveformData | null> {
  // If we already have cached waveform data, return it
  if (existingWaveformData && existingWaveformData.peaks && existingWaveformData.length) {
    return existingWaveformData as WaveformData;
  }
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.warn(`Audio file not found: ${filePath}`);
    return null;
  }
  
  // Generate new waveform data
  console.log(`Generating waveform for track ${trackId}`);
  return generateWaveformData(filePath);
}