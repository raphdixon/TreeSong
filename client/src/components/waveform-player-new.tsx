import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import EmojiPicker from "./emoji-picker";
import SimpleWaveform from "@/components/simple-waveform";
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
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(75);
  
  // First-listen functionality
  const [hasCompletedFirstListen, setHasCompletedFirstListen] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  const [hasStartedListening, setHasStartedListening] = useState(false);
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
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Emoji state
  const [displayEmojis, setDisplayEmojis] = useState<any[]>(emojiReactions || []);
  const [emojiCount, setEmojiCount] = useState(0);

  // Check first listen status
  const { data: listenStatus } = useQuery({
    queryKey: [`/api/tracks/${trackId}/listens/${sessionId}`],
    enabled: !!trackId && !!sessionId,
  });

  useEffect(() => {
    if (listenStatus) {
      const hasCompleted = listenStatus.completed || listenStatus.status === 'completed';
      setHasCompletedFirstListen(hasCompleted);
      setCanSkip(hasCompleted);
      console.log('[WaveformPlayer] Listen status:', listenStatus);
    }
  }, [listenStatus]);

  // Create listen record mutation
  const createListenMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/tracks/${trackId}/listens`, {
        listenerSessionId: sessionId
      });
    },
    onSuccess: () => {
      setHasStartedListening(true);
    },
    onError: (error) => {
      console.error('Failed to create listen record:', error);
      // Still allow playing even if listen record fails
      setHasStartedListening(true);
    }
  });

  // Complete listen mutation
  const completeListenMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/tracks/${trackId}/listens/complete`, {
        listenerSessionId: sessionId
      });
    },
    onSuccess: () => {
      setHasCompletedFirstListen(true);
      setCanSkip(true);
      queryClient.invalidateQueries({ queryKey: [`/api/tracks/${trackId}/listens/${sessionId}`] });
      toast({
        title: "🎉 Track unlocked!",
        description: "You can now skip around and add reactions!"
      });
    }
  });

  // Initialize audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
      
      // Auto-play if requested
      if (autoPlay) {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
          createListenMutation.mutate();
        }).catch(console.error);
      }
    }
  }, [audioUrl, autoPlay]);

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

    const handlePlay = () => {
      setIsPlaying(true);
      if (!hasStartedListening) {
        createListenMutation.mutate();
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      
      // Mark as completed if this was their first listen
      if (!hasCompletedFirstListen && hasStartedListening) {
        completeListenMutation.mutate();
      }
      
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
  }, [hasCompletedFirstListen, hasStartedListening, onTrackEnd]);

  // Initialize emoji state from props
  useEffect(() => {
    console.log('[DEBUG] Initializing emojis from props:', emojiReactions?.length || 0);
    setDisplayEmojis(emojiReactions || []);
  }, [emojiReactions]);
  
  // Fetch initial emoji count for this session
  useEffect(() => {
    const fetchEmojiCount = async () => {
      try {
        const responseRaw = await apiRequest('GET', `/api/tracks/${trackId}/emoji-reactions/session/${sessionId}`);
        const response = await responseRaw.json();
        console.log('[DEBUG] Initial emoji count response:', response);
        setEmojiCount(response.count || 0);
      } catch (error) {
        console.error('Failed to fetch emoji count:', error);
      }
    };
    
    fetchEmojiCount();
  }, [trackId, sessionId]);

  // Handle emoji selection
  const handleEmojiSelect = async (emoji: string) => {
    if (!audioRef.current || !hasStartedListening) return;
    
    try {
      const responseRaw = await apiRequest('POST', `/api/tracks/${trackId}/emoji-reactions`, {
        emoji,
        time: currentTime,
        listenerSessionId: sessionId
      });
      
      const response = await responseRaw.json();
      console.log('[DEBUG] Emoji response:', response);
      
      // Update local state
      if (response.allReactions) {
        setDisplayEmojis(response.allReactions);
      }
      setEmojiCount(response.currentCount || 0);
      
      // Refetch reactions
      queryClient.invalidateQueries({ queryKey: [`/api/tracks/${trackId}/emoji-reactions`] });
    } catch (error) {
      console.error('Failed to add emoji:', error);
      toast({
        title: "Failed to add reaction",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  // Handle waveform seek
  const handleSeek = (time: number) => {
    if (!audioRef.current) return;
    
    if (!hasCompletedFirstListen && !canSkip) {
      toast({
        title: "⏯️ First listen required",
        description: "Please listen to the full track first before you can skip around!"
      });
      return;
    }
    
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  // Playback controls
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate emoji markers
  const generateEmojiMarkers = () => {
    console.log('[EMOJI FLOW] 8. generateEmojiMarkers called, count:', displayEmojis.length);
    
    if (!displayEmojis || displayEmojis.length === 0) {
      console.log('[EMOJI FLOW] 9. No emojis to render');
      return null;
    }

    console.log('[EMOJI FLOW] 10. Rendering', displayEmojis.length, 'emojis');
    
    return displayEmojis.map((reaction: any, index: number) => {
      const position = (reaction.time / duration) * 100;
      
      // Generate random height based on reaction ID or index
      const seed = reaction.id ? 
        reaction.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) : 
        index;
      const heightVariations = [5, 15, 25, 35, 45, 55, 65, 75, 85, 95];
      const randomHeight = heightVariations[seed % heightVariations.length];
      
      return (
        <div
          key={reaction.id || `emoji-${index}`}
          style={{
            position: 'absolute',
            left: `${position}%`,
            bottom: `${randomHeight}px`,
            fontSize: '20px',
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            zIndex: 20,
            display: 'block',
            visibility: 'visible'
          }}
        >
          {reaction.emoji}
        </div>
      );
    });
  };

  console.log('[WaveformPlayer] Component mounted/updated', {
    trackId,
    audioUrl,
    duration,
    hasEmojiReactions: displayEmojis.length,
    isPlaying,
    currentTime,
    hasCompletedFirstListen
  });

  return (
    <div className="player-container" style={{ 
      padding: '16px',
      background: 'var(--win95-gray)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      height: '100%'
    }}>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
      />

      {/* File deleted warning */}
      {fileDeletedAt && (
        <div style={{
          background: '#FFFF00',
          color: '#000000',
          padding: '4px 8px',
          border: '1px solid #000000',
          marginBottom: '8px',
          fontSize: '10px',
          fontWeight: 'bold'
        }}>
          ⚠️ FILE DELETED - Audio unavailable
        </div>
      )}

      {/* Waveform visualization */}
      <div style={{ 
        position: 'relative', 
        width: '100%',
        minHeight: '140px'
      }}>
        <SimpleWaveform
          trackId={trackId}
          duration={duration}
          onSeek={handleSeek}
          currentTime={currentTime}
          isPlaying={isPlaying}
        />
        {generateEmojiMarkers()}
      </div>

      {/* Player controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginTop: '8px'
      }}>
        <button 
          onClick={togglePlay}
          style={{
            padding: '4px 12px',
            fontSize: '16px',
            background: 'var(--win95-gray)',
            border: '2px outset var(--win95-gray)',
            cursor: 'pointer'
          }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        
        <button 
          onClick={stop}
          style={{
            padding: '4px 12px',
            fontSize: '16px',
            background: 'var(--win95-gray)',
            border: '2px outset var(--win95-gray)',
            cursor: 'pointer'
          }}
        >
          ⏹
        </button>

        <div style={{
          background: '#000000',
          color: '#00FF00',
          padding: '4px 8px',
          fontFamily: 'monospace',
          fontSize: '12px',
          border: '2px inset var(--win95-gray)',
          minWidth: '100px',
          textAlign: 'center'
        }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        <div style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '10px' }}>🔊</span>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            style={{ width: '80px' }}
          />
        </div>
      </div>

      {/* Emoji picker */}
      <div className="win95-emoji-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '4px',
        width: '100%',
        marginTop: '8px'
      }}>
        <EmojiPicker 
          onEmojiSelect={handleEmojiSelect}
          disabled={!hasStartedListening}
          currentCount={emojiCount}
          showWarning={!hasCompletedFirstListen}
        />
      </div>
    </div>
  );
}