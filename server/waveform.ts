import fs from 'fs';
import path from 'path';

export interface WaveformData {
  peaks: number[];
  length: number;
}

/**
 * Generate waveform peaks from an audio file using a simple sampling approach
 * This is a lightweight alternative to heavy audio processing libraries
 */
export async function generateWaveformData(filePath: string): Promise<WaveformData> {
  try {
    // For now, we'll generate a simple waveform based on file data
    // In a production environment, you'd use proper audio analysis
    const fileBuffer = fs.readFileSync(filePath);
    const peaks = generatePeaksFromBuffer(fileBuffer);
    
    return {
      peaks,
      length: peaks.length
    };
  } catch (error) {
    console.error('Error generating waveform:', error);
    // Return a fallback flat waveform
    const fallbackPeaks = new Array(1000).fill(0).map(() => Math.random() * 0.5);
    return {
      peaks: fallbackPeaks,
      length: fallbackPeaks.length
    };
  }
}

/**
 * Generate peaks from audio buffer data
 * Creates a reasonable number of peaks for visualization
 */
function generatePeaksFromBuffer(buffer: Buffer): number[] {
  const peaks: number[] = [];
  const targetPeaks = 200; // Much more reasonable number for visualization
  const samplesPerPeak = Math.floor(buffer.length / targetPeaks);
  
  for (let i = 0; i < buffer.length; i += samplesPerPeak) {
    let max = 0;
    let min = 255;
    
    // Find min/max in this section for better peak detection
    for (let j = i; j < Math.min(i + samplesPerPeak, buffer.length); j++) {
      max = Math.max(max, buffer[j]);
      min = Math.min(min, buffer[j]);
    }
    
    // Calculate peak amplitude (difference from center)
    const range = max - min;
    const normalized = Math.min(range / 255, 1); // Normalize to 0-1 range
    
    // Add some variation and ensure minimum amplitude for visualization
    const finalPeak = Math.max(normalized * 0.8 + Math.random() * 0.2, 0.1);
    peaks.push(finalPeak);
  }
  
  return peaks;
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