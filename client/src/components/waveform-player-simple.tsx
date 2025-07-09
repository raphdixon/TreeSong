import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import EmojiPicker from "./emoji-picker";
import SimpleWaveform from "@/components/simple-waveform";
import { nanoid } from "nanoid";
// Volume hook replacement for playlist mode

interface WaveformPlayerProps {
  trackId: string;
  audioUrl: string;
  duration: number;
  emojiReactions: any[];
  isPublic: boolean;
  fileDeletedAt?: string | null;
  autoPlay?: boolean;
  onTrackEnd?: () => void;
  onReactionCountChange?: (count: number) => void;
  artistName?: string;
  trackName?: string;
}

export default function WaveformPlayer({ 
  trackId, 
  audioUrl, 
  duration,
  emojiReactions,
  isPublic,
  fileDeletedAt,
  autoPlay = false,
  onTrackEnd,
  onReactionCountChange,
  artistName,
  trackName
}: WaveformPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(70); // Local volume state for playlist mode

  const [sessionId] = useState(() => {
    const existingSessionId = localStorage.getItem('demoTreeSessionId');
    if (existingSessionId) {
      console.log('[SESSION] Using existing session ID:', existingSessionId);
      return existingSessionId;
    }
    const newSessionId = nanoid();
    localStorage.setItem('demoTreeSessionId', newSessionId);
    console.log('[SESSION] Created new session ID:', newSessionId);
    return newSessionId;
  });

  // Emoji state
  const [displayEmojis, setDisplayEmojis] = useState<any[]>(emojiReactions || []);
  const [emojiCount, setEmojiCount] = useState(0);
  const [currentTrackId, setCurrentTrackId] = useState(trackId);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch emojis for this session
  const { data: userEmojis } = useQuery({
    queryKey: [`/api/tracks/${trackId}/emoji-reactions/session/${sessionId}`],
    enabled: !!trackId && !!sessionId,
  });

  // Initialize audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
      
      // Auto-play if requested
      if (autoPlay) {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(console.error);
      }
    }
  }, [audioUrl, autoPlay, volume]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (onTrackEnd) {
        onTrackEnd();
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onTrackEnd]);

  // Reset emoji display only when switching to a different track
  useEffect(() => {
    if (trackId !== currentTrackId) {
      console.log('[DEBUG] Track changed from', currentTrackId, 'to:', trackId, 'resetting emoji state');
      
      // Reset emojis for new track
      setDisplayEmojis([]);
      setEmojiCount(0);
      setCurrentTrackId(trackId);
    }
  }, [trackId, currentTrackId]); // Only reset when actually changing tracks
  
  // Initialize emoji display from props when data becomes available
  useEffect(() => {
    if (emojiReactions && emojiReactions.length > 0) {
      console.log('[DEBUG] Setting initial emojis from props:', emojiReactions.length);
      setDisplayEmojis(emojiReactions);
    }
  }, [emojiReactions]); // Update display when emoji data loads
  
  // Update emoji display and count from user session data
  useEffect(() => {
    if (userEmojis) {
      console.log('[DEBUG] Initial emoji count response:', userEmojis);
      const sessionData = userEmojis as any;
      setEmojiCount(sessionData.count || 0);
      
      // Merge session emojis with existing emojis
      if (sessionData.reactions && sessionData.reactions.length > 0) {
        console.log('[DEBUG] Merging session emojis with existing emojis');
        
        setDisplayEmojis(prev => {
          // Get existing emoji IDs to avoid duplicates
          const existingIds = new Set(prev.map(e => e.id));
          
          // Merge unique emojis from session
          const mergedEmojis = [
            ...prev,
            ...sessionData.reactions.filter((r: any) => !existingIds.has(r.id))
          ];
          
          return mergedEmojis;
        });
      }
    }
  }, [userEmojis, trackId]); // Reset when track changes

  // Emoji reaction mutation
  const addEmojiMutation = useMutation({
    mutationFn: async ({ emoji, time }: { emoji: string; time: number }) => {
      const response = await apiRequest('POST', `/api/tracks/${trackId}/emoji-reactions`, {
        emoji,
        time,
        listenerSessionId: sessionId
      });
      return response.json();
    },
    onSuccess: (data) => {
      
      // Update display emojis with all reactions from server
      if (data.allReactions) {
        setDisplayEmojis(data.allReactions);
        const newCount = data.currentCount || data.allReactions.length;
        setEmojiCount(newCount);
        // Call the callback to update parent component
        if (onReactionCountChange) {
          onReactionCountChange(newCount);
        }
      } else if (data.reaction) {
        // Fallback: add just the new reaction if allReactions not provided
        setDisplayEmojis(prev => {
          const updated = [...prev, data.reaction];
          return updated;
        });
        const newCount = data.currentCount || 0;
        setEmojiCount(newCount);
        // Call the callback to update parent component
        if (onReactionCountChange) {
          onReactionCountChange(newCount);
        }
      }
      
      // Only invalidate the emoji reactions query, not the track query to avoid feed re-renders
      queryClient.invalidateQueries({ queryKey: [`/api/tracks/${trackId}/emoji-reactions/session/${sessionId}`] });
    },
    onError: (error) => {
      console.error('Failed to add emoji reaction:', error);
      toast({
        title: "Failed to add reaction",
        description: "Please try again",
        variant: "destructive"
      });
    }
  });

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const time = audioRef.current?.currentTime || 0;
    addEmojiMutation.mutate({ emoji, time });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleShare = () => {
    if (!artistName || !trackName) return;
    
    // Create URL-safe version of artist and track name
    const slug = `${artistName}-${trackName}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    const shareUrl = `${window.location.origin}/?toptrack=${encodeURIComponent(slug)}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast({ 
        title: "Link copied!", 
        description: "Share link copied to clipboard." 
      });
    }).catch(() => {
      toast({ 
        title: "Copy failed", 
        description: "Please manually copy the link.",
        variant: "destructive" 
      });
    });
  };

  // Log component state for debugging
  useEffect(() => {
    console.log('[WaveformPlayer] Component mounted/updated', {
      trackId,
      audioUrl,
      duration,
      hasEmojiReactions: displayEmojis.length,
      isPlaying,
      currentTime
    });
  });

  if (fileDeletedAt) {
    return (
      <div className="flex items-center justify-center h-32 bg-gray-100 rounded-lg">
        <p className="text-gray-500">This track has been deleted</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      {/* Waveform with emoji overlay */}
      <div style={{ position: 'relative' }}>
        <SimpleWaveform
          trackId={trackId}
          duration={duration}
          onSeek={handleSeek}
          currentTime={currentTime}
          isPlaying={isPlaying}
        />
        
        {/* Emoji overlay */}
        <div 
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none'
          }}
        >
          {displayEmojis.map((reaction) => {
            const position = (reaction.time / duration) * 100;
            const randomHeight = 20 + (parseInt(reaction.id, 36) % 60); // Random height 20-80%
            
            return (
              <div
                key={reaction.id}
                style={{ 
                  left: `${position}%`,
                  position: 'absolute',
                  top: `${randomHeight}%`,
                  transform: 'translate(-50%, -50%)',
                  fontSize: '16px',
                  zIndex: 20,
                  cursor: 'pointer',
                  pointerEvents: 'auto'
                }}
                title={`${reaction.emoji} at ${formatTime(reaction.time)}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSeek(reaction.time);
                }}
              >
                {reaction.emoji}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px',
        background: 'var(--win95-gray)',
        border: '2px inset var(--win95-gray)'
      }}>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button
            onClick={togglePlayPause}
            className="win95-play-btn"
            style={{
              background: 'var(--win95-gray)',
              border: '2px outset var(--win95-gray)',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '12px',
              height: '28px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isPlaying ? '⏸️' : '▶️'}
          </button>
          
          {artistName && trackName && (
            <button
              onClick={handleShare}
              className="win95-share-btn"
              style={{
                background: 'var(--win95-gray)',
                border: '2px outset var(--win95-gray)',
                padding: '4px 6px',
                cursor: 'pointer',
                fontSize: '11px',
                height: '28px',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                minWidth: 'auto'
              }}
              title="Share this track"
            >
              <span style={{ fontSize: '10px' }}>🔗</span>
              <span>Share Track</span>
            </button>
          )}
        </div>
        
        <div style={{
          fontFamily: 'monospace',
          fontSize: '10px',
          background: '#000',
          color: '#00ff00',
          padding: '2px 6px',
          border: '1px inset var(--win95-gray)'
        }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      {/* Emoji Picker - Always enabled */}
      <EmojiPicker
        onEmojiSelect={handleEmojiSelect}
        disabled={addEmojiMutation.isPending}
        currentCount={emojiCount}
        maxCount={10}
      />
    </div>
  );
}