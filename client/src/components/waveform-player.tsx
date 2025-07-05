import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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

  // Simple state for emoji display
  const [displayEmojis, setDisplayEmojis] = useState<any[]>(emojiReactions || []);
  const [emojiCount, setEmojiCount] = useState(0);

  // Simple async function to handle emoji addition
  const handleEmojiSelect = async (emoji: string) => {
    if (!waveSurferRef.current || !hasStartedListening) return;
    
    try {
      const currentTime = waveSurferRef.current.getCurrentTime();
      
      const response: any = await apiRequest('POST', `/api/tracks/${trackId}/emoji-reactions`, {
        emoji,
        time: currentTime,
        listenerSessionId: sessionId
      });
      
      // Update local state immediately with response data
      if (response.allReactions) {
        setDisplayEmojis(response.allReactions);
      }
      if (response.currentCount !== undefined) {
        setEmojiCount(response.currentCount);
      }
      
      // Update feed data
      queryClient.invalidateQueries({ queryKey: ['/api/tracks/public'] });
      
      toast({
        title: "Emoji added!",
        description: `${response.currentCount || 0}/10 emojis used`
      });
      
    } catch (error) {
      console.error('Error adding emoji:', error);
      toast({
        title: "Error",
        description: "Failed to add emoji. Please try again.",
        variant: "destructive"
      });
    }
  };

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

  // Initialize emoji state from props
  useEffect(() => {
    setDisplayEmojis(emojiReactions || []);
  }, [emojiReactions]);
  
  // Fetch initial emoji count for this session
  useEffect(() => {
    const fetchEmojiCount = async () => {
      try {
        const response: any = await apiRequest('GET', `/api/tracks/${trackId}/emoji-reactions/session/${sessionId}`);
        setEmojiCount(response.count || 0);
      } catch (error) {
        console.error('Failed to fetch emoji count:', error);
      }
    };
    
    fetchEmojiCount();
  }, [trackId, sessionId]);



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
    try {
      console.log('[EMOJI FLOW] 8. generateEmojiMarkers called, count:', displayEmojis?.length || 0);
      
      if (!displayEmojis || !Array.isArray(displayEmojis) || displayEmojis.length === 0) {
        console.log('[EMOJI FLOW] 9. No emojis to render');
        return [];
      }
      
      console.log('[EMOJI FLOW] 10. Rendering', displayEmojis.length, 'emojis');
    } catch (error) {
      console.error('[EMOJI ERROR] generateEmojiMarkers failed:', error);
      return [];
    }
    
    // Calculate visible time range based on zoom and offset
    const visibleDuration = duration / zoomLevel;
    const startTime = viewOffset * duration;
    const endTime = startTime + visibleDuration;
    
    return displayEmojis
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

  // Add debug logging
  useEffect(() => {
    console.log('[WaveformPlayer] Component mounted/updated', {
      trackId,
      audioUrl,
      duration,
      hasEmojiReactions: emojiReactions.length,
      isPlaying,
      currentTime,
      hasCompletedFirstListen
    });
  }, [trackId, isPlaying, currentTime, hasCompletedFirstListen]);

  return (
    <div className="player-container">
      {/* Compact Waveform Section */}
      <div className="waveform-section">
        <div className="waveform-wrapper">
          <div ref={waveformRef} className="waveform-element" />
          
          {/* Overlay Controls on Waveform */}
          <div className="waveform-overlay-controls">
            <button 
              className="play-pause-btn"
              onClick={togglePlay}
              disabled={isFileDeleted}
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? "⏸" : "▶"}
            </button>
            
            <div className="time-info">
              <span className="current-time">{formatTime(currentTime)}</span>
              <span className="time-separator">/</span>
              <span className="total-time">{formatTime(duration)}</span>
            </div>
            
            <input
              type="range"
              className="volume-control"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              title={`Volume: ${volume}%`}
            />
          </div>
          
          {/* Emoji Markers on Waveform */}
          <div className="waveform-markers" key={`markers-${displayEmojis.length}`}>
            {generateEmojiMarkers()}
          </div>
        </div>
        

      </div>



      {/* Emoji Picker Section - Always at Bottom */}
      <div className="emoji-picker-section">
        <EmojiPicker 
          onEmojiSelect={handleEmojiSelect}
          disabled={false}
          currentCount={emojiCount}
          showWarning={emojiCount >= 8}
        />
      </div>

      {/* File Deleted Overlay */}
      {isFileDeleted && (
        <div className="file-deleted-overlay">
          <div className="deleted-message">
            Audio file deleted after 21 days
          </div>
        </div>
      )}
    </div>
  );
}
