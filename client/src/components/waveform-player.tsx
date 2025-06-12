import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import CommentPopup from "./comment-popup";
import { initializeWaveSurfer } from "@/lib/wavesurfer";
import { BPMAnalyzer, type BPMAnalysisProgress } from "@/lib/bpmAnalyzer";

interface WaveformPlayerProps {
  trackId: string;
  audioUrl: string;
  bpm: number | null;
  duration: number;
  comments: any[];
  isPublic: boolean;
  fileDeletedAt?: string | null;
}

export default function WaveformPlayer({ 
  trackId, 
  audioUrl, 
  bpm, 
  duration, 
  comments, 
  isPublic,
  fileDeletedAt
}: WaveformPlayerProps) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const waveSurferRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(75);
  const [showCommentPopup, setShowCommentPopup] = useState(false);
  const [commentTime, setCommentTime] = useState(0);
  const [commentPosition, setCommentPosition] = useState({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewOffset, setViewOffset] = useState(0);
  const [detectedBpm, setDetectedBpm] = useState<number | null>(bpm);
  const [isAnalyzingBpm, setIsAnalyzingBpm] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<BPMAnalysisProgress | null>(null);
  const [showManualBpm, setShowManualBpm] = useState(false);
  const [manualBpmValue, setManualBpmValue] = useState(bpm?.toString() || "");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Initialize WaveSurfer
  useEffect(() => {
    if (waveformRef.current) {
      initializeWaveSurfer(waveformRef.current, audioUrl)
        .then((waveSurfer) => {
          console.log('WaveSurfer initialized successfully');
          waveSurferRef.current = waveSurfer;

          // Event listeners
          waveSurfer.on('ready', () => {
            console.log('WaveSurfer ready');
            
            // Start background BPM detection if no BPM is set
            if (!bpm && !detectedBpm) {
              detectBpmInBackground();
            }
          });

          waveSurfer.on('audioprocess', (time: number) => {
            setCurrentTime(time);
          });

          waveSurfer.on('play', () => setIsPlaying(true));
          waveSurfer.on('pause', () => setIsPlaying(false));

          // Click to seek and comment
          waveSurfer.on('click', (progress: number) => {
            console.log('WaveSurfer click - progress:', progress, 'duration:', duration);
            const clickTime = progress * duration;
            console.log('Calculated click time:', clickTime);
            
            // Immediately seek to clicked position
            waveSurfer.seekTo(progress);
            setCurrentTime(clickTime);
            setCommentTime(clickTime);
            
            // Calculate position for popup relative to viewport
            const rect = waveformRef.current!.getBoundingClientRect();
            setCommentPosition({
              x: rect.left + (progress * rect.width),
              y: rect.top - 10 // Position popup above the waveform
            });
            
            setShowCommentPopup(true);
          });

          // Alternative: Use seek event to ensure we get the actual time
          waveSurfer.on('seek', (progress: number) => {
            const seekTime = progress * duration;
            console.log('WaveSurfer seek - progress:', progress, 'seekTime:', seekTime);
            setCurrentTime(seekTime);
          });

          // Update time display when user interacts with waveform
          const updateTimeDisplay = () => {
            if (waveSurfer.isReady) {
              const currentTime = waveSurfer.getCurrentTime();
              setCurrentTime(currentTime);
            }
          };

          // Listen for various events that should update time display
          waveSurfer.on('interaction', updateTimeDisplay);
          waveSurfer.on('scroll', updateTimeDisplay);
          waveSurfer.on('zoom', updateTimeDisplay);
          
          // Also update time on mouse move over waveform for better responsiveness
          const waveformElement = waveformRef.current;
          if (waveformElement) {
            waveformElement.addEventListener('mousemove', (e) => {
              const rect = waveformElement.getBoundingClientRect();
              const relativeX = e.clientX - rect.left;
              const progress = relativeX / rect.width;
              const hoverTime = progress * duration;
              // Only update if not playing to avoid conflicts
              if (!isPlaying) {
                setCurrentTime(Math.max(0, Math.min(duration, hoverTime)));
              }
            });
          }
        })
        .catch((error) => {
          console.error('Failed to initialize WaveSurfer:', error);
          toast({ 
            title: "Audio Player Error", 
            description: "Failed to load the audio player. Please try refreshing the page."
          });
        });

      return () => {
        if (waveSurferRef.current) {
          waveSurferRef.current.destroy();
        }
      };
    }
  }, [audioUrl, duration]);

  // Update volume
  useEffect(() => {
    if (waveSurferRef.current && waveSurferRef.current.backend) {
      waveSurferRef.current.setVolume(volume / 100);
    }
  }, [volume]);

  // Background BPM detection
  const detectBpmInBackground = async () => {
    try {
      setIsAnalyzingBpm(true);
      setAnalysisProgress({ stage: 'loading', progress: 0, message: 'Starting BPM analysis...' });
      
      // Fetch the audio file for analysis
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
      const file = new File([blob], 'track.mp3', { type: 'audio/mpeg' });
      
      const analyzer = new BPMAnalyzer((progress) => {
        setAnalysisProgress(progress);
      });
      
      const result = await analyzer.analyzeFile(file);
      
      if (result.processed && result.bpm > 0) {
        setDetectedBpm(result.bpm);
        setManualBpmValue(result.bpm.toString());
        
        // Update the track in the database
        updateBpmMutation.mutate(result.bpm);
        
        toast({
          title: "BPM Detected",
          description: `Automatically detected ${result.bpm} BPM`,
        });
      } else {
        console.log('BPM detection failed');
        setAnalysisProgress({ stage: 'error', progress: 0, message: 'Could not detect BPM automatically' });
      }
    } catch (error) {
      console.error('Background BPM detection failed:', error);
      setAnalysisProgress({ stage: 'error', progress: 0, message: 'BPM analysis failed' });
    } finally {
      setIsAnalyzingBpm(false);
      setTimeout(() => setAnalysisProgress(null), 3000); // Clear progress after 3 seconds
    }
  };

  // Update track BPM mutation
  const updateBpmMutation = useMutation({
    mutationFn: async (newBpm: number) => {
      return await apiRequest(`/api/tracks/${trackId}/bpm`, 'PATCH', { bpm: newBpm });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tracks', trackId] });
    },
    onError: (error) => {
      console.error('Failed to update track BPM:', error);
      toast({
        title: "Failed to update BPM",
        description: "Could not save BPM to database",
        variant: "destructive"
      });
    }
  });

  // Handle manual BPM submission
  const handleManualBpmSubmit = async () => {
    const bpmValue = parseInt(manualBpmValue);
    if (isNaN(bpmValue) || bpmValue < 60 || bpmValue > 200) {
      toast({
        title: "Invalid BPM",
        description: "Please enter a BPM between 60 and 200",
        variant: "destructive"
      });
      return;
    }

    setDetectedBpm(bpmValue);
    updateBpmMutation.mutate(bpmValue);
    setShowManualBpm(false);
    
    toast({
      title: "BPM Updated",
      description: `Track BPM set to ${bpmValue}`,
    });
  };

  const togglePlay = () => {
    if (waveSurferRef.current) {
      waveSurferRef.current.playPause();
    }
  };

  const stop = () => {
    if (waveSurferRef.current) {
      waveSurferRef.current.stop();
      setCurrentTime(0);
    }
  };

  const seekToTime = (time: number) => {
    if (waveSurferRef.current) {
      const progress = time / duration;
      waveSurferRef.current.seekTo(progress);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate beats and bars timeline with adaptive density
  const generateBeatsAndBars = () => {
    const currentBpm = detectedBpm || bpm;
    if (!currentBpm) return null;
    
    const beatsPerBar = 4; // Standard 4/4 time signature
    const secondsPerBeat = 60 / currentBpm;
    const secondsPerBar = secondsPerBeat * beatsPerBar;
    
    const totalBars = Math.ceil(duration / secondsPerBar);
    const markers = [];
    
    // Calculate visible time range based on zoom and offset
    const visibleDuration = duration / zoomLevel;
    const startTime = viewOffset * duration;
    const endTime = startTime + visibleDuration;
    
    // Adaptive display based on zoom level
    const barsInView = visibleDuration / secondsPerBar;
    let showBeats = zoomLevel >= 2; // Only show beats at 2x zoom or higher
    let barInterval = 1; // Show every bar by default
    
    // At low zoom levels, show fewer bars to avoid clutter
    if (barsInView > 50) {
      barInterval = Math.ceil(barsInView / 20); // Show max 20 bars
      showBeats = false;
    } else if (barsInView > 20) {
      barInterval = Math.ceil(barsInView / 15); // Show max 15 bars
      showBeats = false;
    }
    
    // Only show bars that are in the visible range
    const startBar = Math.max(1, Math.floor(startTime / secondsPerBar));
    const endBar = Math.min(totalBars, Math.ceil(endTime / secondsPerBar) + 1);
    
    for (let bar = startBar; bar <= endBar; bar += barInterval) {
      const barStartTime = (bar - 1) * secondsPerBar;
      
      // Calculate position relative to visible range
      const relativePosition = ((barStartTime - startTime) / visibleDuration) * 100;
      
      if (relativePosition >= -10 && relativePosition <= 110) {
        // Bar marker
        markers.push(
          <div
            key={`bar-${bar}`}
            className="bar-marker"
            style={{ left: `${relativePosition}%` }}
          >
            <div className="bar-label">{bar}</div>
          </div>
        );
        
        // Beat markers within each bar (only when zoomed in enough)
        if (showBeats) {
          for (let beat = 1; beat <= beatsPerBar; beat++) {
            const beatTime = barStartTime + (beat - 1) * secondsPerBeat;
            const beatRelativePosition = ((beatTime - startTime) / visibleDuration) * 100;
            
            if (beatRelativePosition >= -5 && beatRelativePosition <= 105) {
              markers.push(
                <div
                  key={`beat-${bar}-${beat}`}
                  className={`beat-marker ${beat === 1 ? 'downbeat' : ''}`}
                  style={{ left: `${beatRelativePosition}%` }}
                />
              );
            }
          }
        }
      }
    }
    
    return markers;
  };

  // Zoom controls using WaveSurfer's native zoom
  const handleZoomIn = () => {
    if (waveSurferRef.current) {
      const newZoom = Math.min(zoomLevel * 2, 16);
      setZoomLevel(newZoom);
      
      // Calculate pixels per second for WaveSurfer zoom
      const pxPerSec = Math.max(50, (newZoom * 50));
      waveSurferRef.current.zoom(pxPerSec);
      
      // Adjust offset to keep current time centered
      const centerTime = currentTime / duration;
      const newOffset = Math.max(0, Math.min(1 - 1/newZoom, centerTime - 0.5/newZoom));
      setViewOffset(newOffset);
    }
  };

  const handleZoomOut = () => {
    if (waveSurferRef.current) {
      const newZoom = Math.max(zoomLevel / 2, 1);
      setZoomLevel(newZoom);
      
      if (newZoom === 1) {
        setViewOffset(0);
        waveSurferRef.current.zoom(50); // Reset to default zoom
      } else {
        // Calculate pixels per second for WaveSurfer zoom
        const pxPerSec = Math.max(50, (newZoom * 50));
        waveSurferRef.current.zoom(pxPerSec);
        
        // Adjust offset to keep current time centered
        const centerTime = currentTime / duration;
        const newOffset = Math.max(0, Math.min(1 - 1/newZoom, centerTime - 0.5/newZoom));
        setViewOffset(newOffset);
      }
    }
  };

  const handleZoomReset = () => {
    if (waveSurferRef.current) {
      setZoomLevel(1);
      setViewOffset(0);
      waveSurferRef.current.zoom(50); // Reset to default zoom
    }
  };

  // Generate grid lines based on zoom level and time
  const generateGridLines = () => {
    const lines = [];
    
    // Calculate visible time range based on zoom and offset
    const visibleDuration = duration / zoomLevel;
    const startTime = viewOffset * duration;
    const endTime = startTime + visibleDuration;
    
    // Adaptive time intervals based on zoom level
    let interval;
    if (visibleDuration <= 10) {
      interval = 1; // 1 second intervals for high zoom
    } else if (visibleDuration <= 30) {
      interval = 5; // 5 second intervals
    } else if (visibleDuration <= 60) {
      interval = 10; // 10 second intervals
    } else if (visibleDuration <= 180) {
      interval = 30; // 30 second intervals
    } else {
      interval = 60; // 1 minute intervals for low zoom
    }
    
    // Calculate start and end markers
    const startMarker = Math.floor(startTime / interval) * interval;
    const endMarker = Math.ceil(endTime / interval) * interval;
    
    for (let time = startMarker; time <= endMarker; time += interval) {
      if (time >= 0 && time <= duration) {
        // Calculate position relative to visible range
        const relativePosition = ((time - startTime) / visibleDuration) * 100;
        
        if (relativePosition >= -5 && relativePosition <= 105) {
          lines.push(
            <div
              key={`time-${time}`}
              className="grid-line major"
              style={{ left: `${relativePosition}%` }}
            >
              <div className="time-label">
                {formatTime(time)}
              </div>
            </div>
          );
        }
      }
    }

    return lines;
  };

  // Generate comment markers based on zoom level
  const generateCommentMarkers = () => {
    // Calculate visible time range based on zoom and offset
    const visibleDuration = duration / zoomLevel;
    const startTime = viewOffset * duration;
    const endTime = startTime + visibleDuration;
    
    return comments
      .filter(comment => comment.time >= startTime && comment.time <= endTime)
      .map((comment) => {
        // Calculate position relative to visible range
        const relativePosition = ((comment.time - startTime) / visibleDuration) * 100;
        
        return (
          <div
            key={comment.id}
            className="comment-marker"
            style={{ left: `${relativePosition}%` }}
            title={`${comment.username}: ${comment.text}`}
            onClick={(e) => {
              e.stopPropagation();
              seekToTime(comment.time);
            }}
          />
        );
      });
  };

  const addCommentMutation = useMutation({
    mutationFn: async (commentData: { time: number; username: string; text: string }) => {
      const response = await apiRequest("POST", `/api/tracks/${trackId}/comments`, commentData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tracks/${trackId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tracks/${trackId}/comments`] });
      setShowCommentPopup(false);
      toast({ title: "Comment added!", description: "Your comment has been posted successfully." });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to add comment", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const isFileDeleted = fileDeletedAt !== null && fileDeletedAt !== undefined;

  return (
    <div>
      {/* File Deleted Notice */}
      {isFileDeleted && (
        <div style={{ 
          background: "#FFEEEE", 
          border: "2px inset #C0C0C0", 
          padding: "12px", 
          marginBottom: "16px",
          textAlign: "center"
        }}>
          <h3 style={{ color: "#CC0000", marginBottom: "8px" }}>📁 Audio File Deleted</h3>
          <p style={{ marginBottom: "4px" }}>
            This audio file was automatically deleted after 21 days as per our storage policy.
          </p>
          <p style={{ fontSize: "11px", color: "#666" }}>
            Comments and waveform visualization remain available for collaboration.
          </p>
        </div>
      )}

      {/* BPM Analysis Progress */}
      {isAnalyzingBpm && analysisProgress && (
        <div style={{ 
          background: "#F0F0F0", 
          border: "2px inset #C0C0C0", 
          padding: "12px", 
          marginBottom: "16px" 
        }}>
          <div style={{ marginBottom: "8px" }}>
            <span>🎵 {analysisProgress.message}</span>
          </div>
          <div style={{ 
            background: "#E0E0E0", 
            border: "1px inset #C0C0C0", 
            height: "20px",
            position: "relative"
          }}>
            <div style={{
              background: analysisProgress.stage === 'error' ? "#FF6B6B" : "#4CAF50",
              height: "100%",
              width: `${analysisProgress.progress}%`,
              transition: "width 0.3s ease"
            }} />
          </div>
        </div>
      )}

      {/* BPM Status and Manual Override */}
      <div style={{ 
        background: "#F0F0F0", 
        border: "2px inset #C0C0C0", 
        padding: "12px", 
        marginBottom: "16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div>
          <strong>BPM: </strong>
          {detectedBpm || bpm ? (
            <span>{detectedBpm || bpm} BPM {detectedBpm && !bpm ? "(detected)" : ""}</span>
          ) : (
            <span style={{ color: "#666" }}>
              {isAnalyzingBpm ? "Analyzing..." : "Not detected"}
            </span>
          )}
        </div>
        <div>
          {!showManualBpm ? (
            <button onClick={() => setShowManualBpm(true)}>
              Manually Enter BPM
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="number"
                min="60"
                max="200"
                value={manualBpmValue}
                onChange={(e) => setManualBpmValue(e.target.value)}
                placeholder="Enter BPM"
                style={{ width: "80px" }}
              />
              <button onClick={handleManualBpmSubmit}>Set</button>
              <button onClick={() => setShowManualBpm(false)}>Cancel</button>
            </div>
          )}
        </div>
      </div>

      {/* Waveform Timeline with Zoom Controls */}
      <div className="beats-timeline">
        <div className="timeline-header">
          <span>
            {(detectedBpm || bpm) ? 
              `Bars & Beats (${detectedBpm || bpm} BPM, 4/4)` : 
              'Waveform Timeline'
            }
          </span>
          <div className="zoom-controls">
            <button 
              className="zoom-btn" 
              onClick={handleZoomOut}
              disabled={zoomLevel <= 1}
              title="Zoom Out"
            >
              -
            </button>
            <span className="zoom-level">{zoomLevel}x</span>
            <button 
              className="zoom-btn" 
              onClick={handleZoomIn}
              disabled={zoomLevel >= 16}
              title="Zoom In"
            >
              +
            </button>
            <button 
              className="zoom-btn reset" 
              onClick={handleZoomReset}
              disabled={zoomLevel === 1}
              title="Reset Zoom"
            >
              Reset
            </button>
          </div>
        </div>
        <div className="timeline-markers">
          {generateBeatsAndBars()}
        </div>
      </div>

      {/* Waveform Container */}
      <div className="waveform-container" style={{ opacity: isFileDeleted ? 0.5 : 1 }}>
        <div className="waveform-wrapper">
          <div ref={waveformRef} style={{ width: "100%", height: "100%" }} />
        </div>
        
        {/* Grid Overlay */}
        <div className="waveform-grid">
          {generateGridLines()}
          {generateCommentMarkers()}
        </div>
        
        {/* Horizontal Scrollbar for zoomed view */}
        {zoomLevel > 1 && (
          <div className="timeline-scrollbar">
            <input
              type="range"
              min="0"
              max={1 - 1/zoomLevel}
              step={0.01}
              value={viewOffset}
              onChange={(e) => setViewOffset(parseFloat(e.target.value))}
              className="scrollbar-slider"
            />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="controls-panel" style={{ opacity: isFileDeleted ? 0.5 : 1 }}>
        <button className="btn" onClick={togglePlay} disabled={isFileDeleted}>
          {isPlaying ? "⏸️" : "▶️"}
        </button>
        <button className="btn" onClick={stop} disabled={isFileDeleted}>⏹️</button>
        <button className="btn" disabled={isFileDeleted}>⏮️</button>
        <button className="btn" disabled={isFileDeleted}>⏭️</button>
        
        <div className="time-display">{formatTime(currentTime)}</div>
        <span style={{ margin: "0 8px" }}>/</span>
        <div className="time-display">{formatTime(duration)}</div>
        
        <label style={{ marginLeft: "16px" }}>Volume:</label>
        <input
          type="range"
          className="volume-slider"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
        />
      </div>

      {/* Comments Section */}
      <div className="comments-section">
        <div className="comments-header">
          <h3>{isPublic ? "Public Comments" : "Comments"}</h3>
          <button 
            className="btn"
            onClick={() => {
              setCommentTime(currentTime);
              setCommentPosition({ x: 400, y: 300 });
              setShowCommentPopup(true);
            }}
          >
            💬 Add Comment
          </button>
        </div>
        
        <div className="comments-list">
          {comments.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>
              No comments yet. Click on the waveform or use the button above to add one!
            </div>
          ) : (
            comments.map((comment) => (
              <div 
                key={comment.id} 
                className="comment-item"
                onClick={() => seekToTime(comment.time)}
              >
                <span className="comment-time">[{formatTime(comment.time)}]</span>
                <span className="comment-author">{comment.username}:</span>
                <span> {comment.text}</span>
                {comment.isPublic && (
                  <span style={{ fontSize: "9px", color: "#808080" }}> (Public)</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Comment Popup */}
      {showCommentPopup && (
        <CommentPopup
          time={commentTime}
          position={commentPosition}
          isPublic={isPublic}
          onSubmit={(data) => addCommentMutation.mutate(data)}
          onClose={() => setShowCommentPopup(false)}
          isLoading={addCommentMutation.isPending}
        />
      )}
    </div>
  );
}
