import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import EmojiPicker from "./emoji-picker";
import SimpleWaveform from "@/components/simple-waveform";
import { nanoid } from "nanoid";
import { useGlobalVolume } from "@/pages/feed";

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
  const globalVolume = useGlobalVolume();

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
      audioRef.current.volume = globalVolume / 100;
      
      // Auto-play if requested
      if (autoPlay) {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(console.error);
      }
    }
  }, [audioUrl, autoPlay, globalVolume]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = globalVolume / 100;
    }
  }, [globalVolume]);

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

  // Update emoji display when props or user emojis change
  useEffect(() => {
    console.log('[DEBUG] Initializing emojis from props:', emojiReactions?.length || 0);
    
    if (emojiReactions) {
      setDisplayEmojis(emojiReactions);
      setEmojiCount(emojiReactions.length);
    }
    
    if (userEmojis) {
      console.log('[DEBUG] Initial emoji count response:', userEmojis);
      setEmojiCount((userEmojis as any).count || 0);
    }
  }, [emojiReactions, userEmojis]);

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
      console.log('[DEBUG] Emoji reaction response:', data);
      
      // Update display emojis with all reactions from server
      if (data.allReactions) {
        setDisplayEmojis(data.allReactions);
        setEmojiCount(data.currentCount || data.allReactions.length);
      } else if (data.reaction) {
        // Fallback: add just the new reaction if allReactions not provided
        setDisplayEmojis(prev => [...prev, data.reaction]);
        setEmojiCount(data.currentCount || 0);
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/tracks/${trackId}/emoji-reactions/session/${sessionId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/tracks/public'] });
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
        <button
          onClick={togglePlayPause}
          style={{
            background: 'var(--win95-gray)',
            border: '2px outset var(--win95-gray)',
            padding: '4px 8px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>
        
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
      />
    </div>
  );
}