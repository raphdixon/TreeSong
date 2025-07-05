import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import EmojiPicker from "./emoji-picker";
import { initializeWaveSurfer } from "@/lib/wavesurfer";

import { nanoid } from "nanoid";

interface WaveformPlayerProps {
  trackId: string;
  audioUrl: string;
  duration: number;
  emojiReactions: any[];
  isPublic: boolean;
  fileDeletedAt?: string | null;
  autoPlay?: boolean;
  onTrackEnd?: () => void;
}

export default function WaveformPlayer({ 
  trackId, 
  audioUrl, 
  duration, 
  emojiReactions, 
  isPublic,
  fileDeletedAt,
  autoPlay = false,
  onTrackEnd
}: WaveformPlayerProps) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const waveSurferRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(75);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewOffset, setViewOffset] = useState(0);

  
  // New emoji and first-listen functionality
  const [hasCompletedFirstListen, setHasCompletedFirstListen] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  const [sessionId] = useState(() => nanoid());
  const [hasStartedListening, setHasStartedListening] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Function to handle emoji selection
  const handleEmojiSelect = (emoji: string) => {
    createEmojiReactionMutation.mutate({
      emoji,
      time: currentTime
    });
  };

  // Mutations for emoji reactions and track listening
  const createEmojiReactionMutation = useMutation({
    mutationFn: async (data: { emoji: string; time: number }) => {
      return apiRequest('POST', `/api/tracks/${trackId}/emoji-reactions`, {
        emoji: data.emoji,
        time: data.time,
        listenerSessionId: sessionId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tracks/${trackId}/emoji-reactions`] });
      toast({
        title: "Emoji added!",
        description: "Your reaction has been added to the track"
      });
    },
    onError: (error) => {
      console.error('Failed to add emoji reaction:', error);
      toast({
        title: "Could not add emoji",
        description: "Please try again",
        variant: "destructive"
      });
    }
  });

  const createTrackListenMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/tracks/${trackId}/listens`, {
        sessionId
      });
    },
    onError: (error) => {
      console.error('Failed to create track listen:', error);
    }
  });

  const markListenCompleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/tracks/${trackId}/listens/${sessionId}/complete`);
    },
    onSuccess: () => {
      setHasCompletedFirstListen(true);
      setCanSkip(true);
      toast({
        title: "🎉 Track completed!",
        description: "You can now skip around and add emoji reactions anywhere!"
      });
    },
    onError: (error) => {
      console.error('Failed to mark track listen complete:', error);
    }
  });

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
            
            // Auto-play if requested (for feed)
            if (autoPlay) {
              waveSurfer.play();
            }
          });

          waveSurfer.on('audioprocess', (time: number) => {
            setCurrentTime(time);
          });

          waveSurfer.on('play', () => {
            setIsPlaying(true);
            
            // Track the start of listening for first-time listeners
            if (!hasStartedListening) {
              setHasStartedListening(true);
              createTrackListenMutation.mutate();
            }
          });
          
          waveSurfer.on('pause', () => setIsPlaying(false));

          // Handle track completion
          waveSurfer.on('finish', () => {
            if (!hasCompletedFirstListen) {
              markListenCompleteMutation.mutate();
            }
            
            // Call onTrackEnd if provided (for feed auto-advance)
            if (onTrackEnd) {
              onTrackEnd();
            }
          });

          // Click handler - only allow seeking if user has completed first listen
          waveSurfer.on('click', (progress: number) => {
            if (!hasCompletedFirstListen && !canSkip) {
              toast({
                title: "⏯️ First listen required",
                description: "Please listen to the full track first before you can skip around!"
              });
              return;
            }
            
            const clickTime = progress * duration;
            waveSurfer.seekTo(progress);
            setCurrentTime(clickTime);
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



  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Remove BPM-related timeline generation
  const generateBeatsAndBars = () => {
    return null; // BPM detection removed from platform
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

  // Generate emoji reaction markers based on zoom level
  const generateEmojiMarkers = () => {
    // Calculate visible time range based on zoom and offset
    const visibleDuration = duration / zoomLevel;
    const startTime = viewOffset * duration;
    const endTime = startTime + visibleDuration;
    
    return emojiReactions
      .filter(reaction => reaction.time >= startTime && reaction.time <= endTime)
      .map((reaction) => {
        // Calculate position relative to visible range
        const relativePosition = ((reaction.time - startTime) / visibleDuration) * 100;
        
        return (
          <div
            key={reaction.id}
            className="emoji-marker"
            style={{ 
              left: `${relativePosition}%`,
              position: 'absolute',
              top: '10px',
              fontSize: '20px',
              zIndex: 10,
              cursor: 'pointer',
              pointerEvents: 'auto'
            }}
            title={`${reaction.emoji} at ${formatTime(reaction.time)}`}
            onClick={(e) => {
              e.stopPropagation();
              if (hasCompletedFirstListen) {
                seekToTime(reaction.time);
              }
            }}
          >
            {reaction.emoji}
          </div>
        );
      });
  };

  // Function to seek to a specific time (only if completed first listen or can skip)
  const seekToTime = (time: number) => {
    if (!hasCompletedFirstListen && !canSkip) {
      toast({
        title: "Complete first listen",
        description: "Please listen to the full track first before skipping around!"
      });
      return;
    }
    
    if (waveSurferRef.current) {
      const progress = time / duration;
      waveSurferRef.current.seekTo(progress);
      setCurrentTime(time);
    }
  };

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
      {/* Waveform Container */}
      <div className="waveform-container" style={{ opacity: isFileDeleted ? 0.5 : 1 }}>
        <div className="waveform-wrapper">
          <div ref={waveformRef} style={{ width: "100%", height: "100%" }} />
        </div>
        
        {/* Grid Overlay */}
        <div className="waveform-grid">
          {generateGridLines()}
          {generateEmojiMarkers()}
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

      {/* Emoji Reactions Section */}
      <div className="emoji-reactions-section">
        <div className="reactions-header">
          <div style={{ fontSize: "11px", color: "#666" }}>
            {hasCompletedFirstListen ? 
              "Track completed! Fast forward and rewind unlocked." :
              "Complete your first listen to unlock fast forward and rewind."
            }
          </div>
        </div>
        
        <div className="reactions-list">
          {emojiReactions.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>
              No reactions yet. Complete your first listen to start reacting!
            </div>
          ) : (
            emojiReactions.map((reaction) => (
              <div 
                key={reaction.id} 
                className="reaction-item"
                onClick={() => seekToTime(reaction.time)}
                style={{ 
                  cursor: hasCompletedFirstListen ? 'pointer' : 'default',
                  opacity: hasCompletedFirstListen ? 1 : 0.5
                }}
              >
                <span className="reaction-time">[{formatTime(reaction.time)}]</span>
                <span className="reaction-emoji" style={{ fontSize: "16px", marginLeft: "8px" }}>
                  {reaction.emoji}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Comment Popup */}
      {/* Emoji Picker - Always visible and enabled */}
      <EmojiPicker 
        onEmojiSelect={handleEmojiSelect}
        disabled={false}
      />
    </div>
  );
}
