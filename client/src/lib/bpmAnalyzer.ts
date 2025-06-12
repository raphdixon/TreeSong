import { createRealTimeBpmProcessor, getBiquadFilter } from 'realtime-bpm-analyzer';

export interface BPMAnalysisResult {
  bpm: number;
  confidence: number;
  beats: number[];
  processed: boolean;
}

export interface BPMAnalysisProgress {
  stage: 'loading' | 'decoding' | 'analyzing' | 'complete' | 'error';
  progress: number;
  message: string;
}

export class BPMAnalyzer {
  private audioContext: AudioContext | null = null;
  private onProgress?: (progress: BPMAnalysisProgress) => void;

  constructor(onProgress?: (progress: BPMAnalysisProgress) => void) {
    this.onProgress = onProgress;
  }

  async analyzeFile(file: File): Promise<BPMAnalysisResult> {
    try {
      this.reportProgress('loading', 0, 'Initializing audio context...');
      
      // Initialize AudioContext
      this.audioContext = new AudioContext();
      
      this.reportProgress('loading', 10, 'Reading audio file...');
      
      // Read file as array buffer
      const arrayBuffer = await file.arrayBuffer();
      
      this.reportProgress('decoding', 30, 'Decoding audio data...');
      
      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      this.reportProgress('analyzing', 50, 'Analyzing tempo and beats...');
      
      // Analyze BPM
      const result = await this.processBPM(audioBuffer);
      
      this.reportProgress('complete', 100, 'Analysis complete');
      
      return result;
    } catch (error) {
      console.error('BPM Analysis error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.reportProgress('error', 0, `Analysis failed: ${message}`);
      throw error;
    } finally {
      // Clean up audio context
      if (this.audioContext) {
        await this.audioContext.close();
        this.audioContext = null;
      }
    }
  }

  private async processBPM(audioBuffer: AudioBuffer): Promise<BPMAnalysisResult> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('BPM analysis timeout'));
      }, 30000); // 30 second timeout

      let bpmResult: BPMAnalysisResult = {
        bpm: 0,
        confidence: 0,
        beats: [],
        processed: false
      };

      createRealTimeBpmProcessor(this.audioContext!)
        .then((realtimeAnalyzerNode) => {
          // Set up audio processing chain
          const source = this.audioContext!.createBufferSource();
          const lowpass = getBiquadFilter(this.audioContext!);
          
          source.buffer = audioBuffer;
          source.connect(lowpass);
          lowpass.connect(realtimeAnalyzerNode);
          
          // Listen for BPM results
          realtimeAnalyzerNode.port.onmessage = (event) => {
            if (event.data.message === 'BPM') {
              const data = event.data.data;
              console.log('BPM Analysis Result:', data);
              
              bpmResult = {
                bpm: Math.round(data.bpm || 0),
                confidence: data.confidence || 0,
                beats: data.beats || [],
                processed: true
              };
              
              this.reportProgress('analyzing', 90, `Detected ${bpmResult.bpm} BPM`);
            }
          };
          
          // Start processing
          source.start();
          
          // Wait for processing to complete
          source.onended = () => {
            clearTimeout(timeoutId);
            setTimeout(() => {
              resolve(bpmResult);
            }, 1000); // Wait a bit for final results
          };
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  private reportProgress(stage: BPMAnalysisProgress['stage'], progress: number, message: string) {
    if (this.onProgress) {
      this.onProgress({ stage, progress, message });
    }
  }

  // Static method for quick BPM detection without progress callbacks
  static async detectBPM(file: File): Promise<number> {
    const analyzer = new BPMAnalyzer();
    const result = await analyzer.analyzeFile(file);
    return result.bpm;
  }

  // Validate if file is suitable for BPM analysis
  static validateAudioFile(file: File): { valid: boolean; error?: string } {
    const validTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/flac'];
    const maxSize = 50 * 1024 * 1024; // 50MB

    if (!validTypes.includes(file.type)) {
      return { 
        valid: false, 
        error: 'Unsupported audio format. Please use MP3, WAV, or FLAC files.' 
      };
    }

    if (file.size > maxSize) {
      return { 
        valid: false, 
        error: 'File size exceeds 50MB limit.' 
      };
    }

    return { valid: true };
  }

  // Check browser compatibility
  static checkBrowserCompatibility(): { supported: boolean; error?: string } {
    if (!window.AudioContext && !(window as any).webkitAudioContext) {
      return {
        supported: false,
        error: 'Your browser does not support Web Audio API required for BPM analysis.'
      };
    }

    if (!window.AudioWorklet) {
      return {
        supported: false,
        error: 'Your browser does not support AudioWorklet required for real-time analysis.'
      };
    }

    return { supported: true };
  }
}