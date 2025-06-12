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
      
      // Try primary BPM analysis method
      let result = await this.processBPM(audioBuffer);
      
      // If primary method fails, try fallback beat detection
      if (!result.processed || result.bpm === 0) {
        this.reportProgress('analyzing', 70, 'Trying alternative analysis...');
        const fallbackBpm = await this.fallbackBpmDetection(audioBuffer);
        if (fallbackBpm > 0) {
          result = {
            bpm: fallbackBpm,
            confidence: 0.7,
            beats: [],
            processed: true
          };
        }
      }
      
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
      }, 60000); // Increased to 60 second timeout

      let bpmResult: BPMAnalysisResult = {
        bpm: 0,
        confidence: 0,
        beats: [],
        processed: false
      };

      let receivedResults = false;

      createRealTimeBpmProcessor(this.audioContext!)
        .then((realtimeAnalyzerNode) => {
          // Set up audio processing chain
          const source = this.audioContext!.createBufferSource();
          const lowpass = getBiquadFilter(this.audioContext!);
          
          // Configure lowpass filter for better kick drum detection
          lowpass.frequency.setValueAtTime(200, this.audioContext!.currentTime);
          lowpass.Q.setValueAtTime(1, this.audioContext!.currentTime);
          
          source.buffer = audioBuffer;
          source.connect(lowpass);
          lowpass.connect(realtimeAnalyzerNode);
          
          // Listen for BPM results with more detailed logging
          realtimeAnalyzerNode.port.onmessage = (event) => {
            console.log('Received message from BPM processor:', event.data);
            
            if (event.data.message === 'BPM') {
              const data = event.data.data;
              console.log('BPM Analysis Result:', data);
              receivedResults = true;
              
              // Accept BPM values in reasonable range
              const detectedBpm = data.bpm || 0;
              if (detectedBpm >= 60 && detectedBpm <= 200) {
                bpmResult = {
                  bpm: Math.round(detectedBpm),
                  confidence: data.confidence || 0,
                  beats: data.beats || [],
                  processed: true
                };
                
                this.reportProgress('analyzing', 90, `Detected ${bpmResult.bpm} BPM`);
              } else {
                console.log('BPM out of reasonable range:', detectedBpm);
              }
            }
          };
          
          // Start processing
          source.start();
          
          // Wait for processing to complete
          source.onended = () => {
            clearTimeout(timeoutId);
            // Wait longer for analysis to complete
            setTimeout(() => {
              if (!receivedResults) {
                console.log('No BPM results received, analysis may have failed');
              }
              resolve(bpmResult);
            }, 3000); // Wait 3 seconds for final results
          };
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          console.error('Error creating BPM processor:', error);
          reject(error);
        });
    });
  }

  // Fallback BPM detection using onset detection for electronic music
  private async fallbackBpmDetection(audioBuffer: AudioBuffer): Promise<number> {
    if (!this.audioContext) {
      return 0;
    }

    try {
      // Convert to mono and downsample for processing
      const channelData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;
      const duration = audioBuffer.duration;
      
      // Only analyze first 60 seconds to speed up processing
      const analyzeDuration = Math.min(duration, 60);
      const analyzeLength = Math.floor(analyzeDuration * sampleRate);
      const samples = channelData.slice(0, analyzeLength);
      
      // Apply high-pass filter to focus on kick drums
      const filteredSamples = this.highPassFilter(samples, sampleRate, 60);
      
      // Detect onsets (beat events)
      const onsets = this.detectOnsets(filteredSamples, sampleRate);
      
      if (onsets.length < 4) {
        console.log('Not enough onsets detected for BPM calculation');
        return 0;
      }
      
      // Calculate intervals between onsets
      const intervals = [];
      for (let i = 1; i < onsets.length; i++) {
        intervals.push(onsets[i] - onsets[i - 1]);
      }
      
      // Find most common interval (peak detection)
      const bpm = this.calculateBpmFromIntervals(intervals);
      
      console.log('Fallback BPM detection result:', bpm);
      return Math.round(bpm);
    } catch (error) {
      console.error('Fallback BPM detection failed:', error);
      return 0;
    }
  }

  private highPassFilter(samples: Float32Array, sampleRate: number, cutoff: number): Float32Array {
    const nyquist = sampleRate / 2;
    const normalizedCutoff = cutoff / nyquist;
    const alpha = Math.exp(-2 * Math.PI * normalizedCutoff);
    
    const filtered = new Float32Array(samples.length);
    let prev = 0;
    
    for (let i = 0; i < samples.length; i++) {
      filtered[i] = alpha * (filtered[i - 1] || 0) + (1 - alpha) * (samples[i] - prev);
      prev = samples[i];
    }
    
    return filtered;
  }

  private detectOnsets(samples: Float32Array, sampleRate: number): number[] {
    const hopSize = Math.floor(sampleRate * 0.01); // 10ms hops
    const windowSize = hopSize * 2;
    const onsets: number[] = [];
    
    // Calculate energy in each window
    const energies: number[] = [];
    for (let i = 0; i < samples.length - windowSize; i += hopSize) {
      let energy = 0;
      for (let j = 0; j < windowSize; j++) {
        energy += samples[i + j] * samples[i + j];
      }
      energies.push(energy);
    }
    
    // Find peaks in energy (potential beats)
    const threshold = Math.max(...energies) * 0.3; // 30% of max energy
    
    for (let i = 1; i < energies.length - 1; i++) {
      if (energies[i] > threshold && 
          energies[i] > energies[i - 1] && 
          energies[i] > energies[i + 1]) {
        const timePosition = (i * hopSize) / sampleRate;
        onsets.push(timePosition);
      }
    }
    
    return onsets;
  }

  private calculateBpmFromIntervals(intervals: number[]): number {
    if (intervals.length === 0) return 0;
    
    // Convert intervals to BPM values
    const bpms = intervals.map(interval => 60 / interval);
    
    // Filter reasonable BPM range
    const validBpms = bpms.filter(bpm => bpm >= 60 && bpm <= 200);
    
    if (validBpms.length === 0) return 0;
    
    // Find most common BPM using histogram approach
    const histogram: { [key: number]: number } = {};
    const tolerance = 3; // BPM tolerance for grouping
    
    validBpms.forEach(bpm => {
      const rounded = Math.round(bpm / tolerance) * tolerance;
      histogram[rounded] = (histogram[rounded] || 0) + 1;
    });
    
    // Find BPM with highest frequency
    let maxCount = 0;
    let bestBpm = 0;
    
    for (const [bpm, count] of Object.entries(histogram)) {
      if (count > maxCount) {
        maxCount = count;
        bestBpm = parseInt(bpm);
      }
    }
    
    return bestBpm;
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