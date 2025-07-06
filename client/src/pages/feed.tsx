import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useTrackCounter } from "@/hooks/use-track-counter";
import Windows95Layout from "@/components/windows95-layout";
import WaveformPlayer from "@/components/waveform-player-new";
import AuthPromptCard from "@/components/auth-prompt-card";
import { ChevronUp, ChevronDown, User, LogIn, Upload } from "lucide-react";

interface Track {
  id: string;
  originalName: string;
  filename: string;
  duration: number;
  uploadDate: string;
  uploaderUserId: string;
  creatorUsername: string;
  emojiReactions: any[];
  reactionScore: number;
  recencyScore: number;
  randomScore: number;
  totalScore: number;
}

interface FeedItemProps {
  track: Track;
  isActive: boolean;
  onTrackEnd: () => void;
}

function FeedItem({ track, isActive, onTrackEnd }: FeedItemProps) {
  if (!track) return null;

  return (
    <div className="win95-audio-player" data-track-id={track.id}>
      {/* Title Bar */}
      <div className="win95-title-bar">
        <div className="win95-title-text">
          <span>♪ {track.originalName}</span>
        </div>
        <div className="win95-window-controls">
          <button className="win95-window-btn">_</button>
          <button className="win95-window-btn">□</button>
          <button className="win95-window-btn">×</button>
        </div>
      </div>
      
      {/* Player Content */}
      <div className="win95-player-content">
        {/* Track Info */}
        <div className="win95-track-info">
          <div className="win95-creator">
            <span>👤 Creator</span>
          </div>
          <div className="win95-reactions-count">
            {track.emojiReactions?.length || 0} reactions
          </div>
        </div>
        
        {/* Waveform */}
        <div className="win95-waveform-container">
          <WaveformPlayer 
            trackId={track.id}
            audioUrl={`/uploads/${track.filename}`}
            duration={track.duration}
            emojiReactions={track.emojiReactions || []}
            isPublic={true}
            autoPlay={isActive}
            onTrackEnd={onTrackEnd}
          />
        </div>
      </div>
    </div>
  );
}

export default function FeedPage() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [hasViewedTrack, setHasViewedTrack] = useState<Set<string>>(new Set());
  const feedRef = useRef<HTMLDivElement>(null);
  
  const { 
    tracksViewed, 
    incrementTrackCount, 
    shouldShowAuthPrompt,
    TRACKS_BEFORE_AUTH 
  } = useTrackCounter();

  // Fetch all public tracks for the feed
  const { data: allTracks = [], isLoading } = useQuery({
    queryKey: ["/api/feed/tracks"],
    queryFn: async () => {
      // For now, we'll fetch from the existing tracks endpoint
      // Later we'll create a dedicated feed endpoint
      const response = await fetch("/api/tracks/public");
      if (!response.ok) {
        // Fallback to regular tracks endpoint for now
        const fallbackResponse = await fetch("/api/tracks");
        return fallbackResponse.json();
      }
      return response.json();
    }
  });

  // Recommendation algorithm
  const getRecommendedTracks = (tracks: any[]): Track[] => {
    if (!tracks.length) return [];

    return tracks.map((track: any) => {
      // Calculate scores for recommendation algorithm
      const emojiCount = track.emojiReactions?.length || 0;
      const reactionScore = Math.min(emojiCount * 0.1, 1); // Cap at 1.0
      
      const uploadDate = new Date(track.uploadDate);
      const daysSinceUpload = (Date.now() - uploadDate.getTime()) / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, 1 - (daysSinceUpload / 30)); // Decay over 30 days
      
      const randomScore = Math.random() * 0.3; // 30% randomness for discovery
      
      const totalScore = reactionScore * 0.5 + recencyScore * 0.3 + randomScore * 0.2;

      return {
        ...track,
        reactionScore,
        recencyScore,
        randomScore,
        totalScore,
        emojiReactions: track.emojiReactions || []
      };
    }).sort((a, b) => b.totalScore - a.totalScore);
  };

  const recommendedTracks = getRecommendedTracks(allTracks);

  // Create display items list with auth prompts injected
  const createDisplayItems = () => {
    if (!recommendedTracks.length) return [];
    
    const items: Array<{ type: 'track' | 'auth', data?: Track, index: number }> = [];
    let trackIndex = 0;
    
    for (let i = 0; i < recommendedTracks.length + Math.floor(recommendedTracks.length / TRACKS_BEFORE_AUTH); i++) {
      if (!isAuthenticated && shouldShowAuthPrompt(i)) {
        console.log(`[FEED] Injecting auth prompt at position ${i}`);
        items.push({ type: 'auth', index: i });
      } else if (trackIndex < recommendedTracks.length) {
        items.push({ type: 'track', data: recommendedTracks[trackIndex], index: i });
        trackIndex++;
      }
    }
    
    return items;
  };
  
  const displayItems = createDisplayItems();

  const navigateTrack = (direction: 'up' | 'down') => {
    if (isScrolling) return;
    
    setIsScrolling(true);
    
    const newIndex = direction === 'down' 
      ? Math.min(currentTrackIndex + 1, displayItems.length - 1)
      : Math.max(currentTrackIndex - 1, 0);
    
    if (newIndex !== currentTrackIndex) {
      setCurrentTrackIndex(newIndex);
      
      // Track view for actual tracks (not auth prompts)
      const item = displayItems[newIndex];
      if (item?.type === 'track' && item.data) {
        const trackId = item.data.id;
        if (!hasViewedTrack.has(trackId)) {
          incrementTrackCount(trackId);
          setHasViewedTrack(prev => new Set(prev).add(trackId));
          console.log(`[FEED] Track ${trackId} marked as viewed`);
        }
      }
    }
    
    // Reset scrolling lock after animation
    setTimeout(() => setIsScrolling(false), 500);
  };

  const handleTrackEnd = () => {
    // Auto-advance to next item when current track ends
    if (currentTrackIndex < displayItems.length - 1) {
      console.log('[FEED] Track ended, auto-advancing to next item');
      setTimeout(() => navigateTrack('down'), 1000);
    }
  };

  const handleLogin = () => {
    console.log('[FEED] Redirecting to login...');
    window.location.href = '/api/login';
  };

  // Wheel navigation with automatic track jumping
  useEffect(() => {
    let wheelTimeout: NodeJS.Timeout;
    
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      // Debounce wheel events
      clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(() => {
        if (e.deltaY > 0) {
          // Scroll down - next track
          navigateTrack('down');
        } else if (e.deltaY < 0) {
          // Scroll up - previous track
          navigateTrack('up');
        }
      }, 100);
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigateTrack('up');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigateTrack('down');
      } else if (e.key === ' ') {
        e.preventDefault();
        // Space bar for next track
        navigateTrack('down');
      }
    };

    // Add passive: false to allow preventDefault on wheel
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyPress);
    
    return () => {
      clearTimeout(wheelTimeout);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [currentTrackIndex, isScrolling]);

  if (isLoading) {
    return (
      <Windows95Layout>
        <div className="feed-loading">
          <div className="window" style={{ width: "300px", height: "150px" }}>
            <div className="title-bar">
              <div className="title-bar-text">🎵 Loading Feed...</div>
            </div>
            <div className="window-body" style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              height: "100%"
            }}>
              <div>Discovering amazing music...</div>
            </div>
          </div>
        </div>
      </Windows95Layout>
    );
  }

  if (!recommendedTracks.length) {
    return (
      <Windows95Layout>
        <div className="feed-empty">
          <div className="window" style={{ width: "400px" }}>
            <div className="title-bar">
              <div className="title-bar-text">🎵 DemoTree Feed</div>
            </div>
            <div className="window-body" style={{ textAlign: "center", padding: "20px" }}>
              <h3>No tracks available yet!</h3>
              <p>Be the first to upload some music to get the feed started.</p>
            </div>
          </div>
        </div>
      </Windows95Layout>
    );
  }

  const currentItem = displayItems[currentTrackIndex];
  const currentTrack = currentItem?.type === 'track' ? currentItem.data : null;

  return (
    <div className="win95-desktop" ref={feedRef}>
      {/* Windows 95 Taskbar */}
      <div className="win95-taskbar">
        <div className="win95-taskbar-left">
          <button className="win95-start-btn">
            ♪ DemoTree
          </button>
        </div>
        <div className="win95-taskbar-center">
          {/* Track counter removed */}
        </div>
        <div className="win95-taskbar-right">
          {user ? (
            <button 
              className="win95-taskbar-btn"
              onClick={() => setLocation('/dashboard')}
              title="Go to Dashboard"
            >
              📁 Upload
            </button>
          ) : (
            <button 
              className="win95-taskbar-btn"
              onClick={() => window.location.href = '/api/login'}
              title="Login to Upload Music"
            >
              🔐 Login
            </button>
          )}
        </div>
      </div>
      {/* Main Content - Win95 Audio Player */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flex: 1,
        paddingBottom: '40px'
      }}>
        {currentItem?.type === 'auth' ? (
          <AuthPromptCard onLogin={handleLogin} />
        ) : currentTrack ? (
          <div className="win95-audio-player">
            {/* Title Bar */}
            <div className="win95-title-bar ml-[0px] mr-[0px] mt-[0px] mb-[0px] pt-[14px] pb-[14px]">
              <div className="win95-title-text">
                ♪ {currentTrack.originalName}
              </div>
              <div className="win95-window-controls">
                <button 
                  className="win95-vote-btn win95-vote-dislike" 
                  title="Dislike this track"
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Implement dislike functionality
                    console.log('Dislike track:', currentTrack.id);
                  }}
                >
                  -
                </button>
                <button 
                  className="win95-vote-btn win95-vote-like" 
                  title="Like this track"
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Implement like functionality
                    console.log('Like track:', currentTrack.id);
                  }}
                >
                  +
                </button>
              </div>
            </div>
            
            {/* Player Content */}
            <div className="win95-player-content">
              {/* Track Info */}
              <div className="win95-track-info">
                <button 
                  className="win95-creator win95-creator-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocation(`/artist/${encodeURIComponent(currentTrack.creatorUsername)}`);
                  }}
                  title={`View ${currentTrack.creatorUsername}'s tracks`}
                >
                  👤 {currentTrack.creatorUsername || 'Unknown Artist'}
                </button>
                <div className="win95-reactions-count">
                  {currentTrack.emojiReactions?.length || 0} reactions
                </div>
              </div>
              
              {/* Waveform and Controls */}
              <WaveformPlayer 
                trackId={currentTrack.id}
                audioUrl={`/uploads/${currentTrack.filename}`}
                duration={currentTrack.duration}
                emojiReactions={currentTrack.emojiReactions || []}
                isPublic={true}
                autoPlay={true}
                onTrackEnd={() => navigateTrack('down')}
              />
            </div>
          </div>
        ) : null}
      </div>
      {/* Navigation Arrows - Bottom Right */}
      <div style={{
        position: 'fixed',
        right: '20px',
        bottom: '40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 100
      }}>
        <button 
          className="win95-nav-btn"
          onClick={() => navigateTrack('up')}
          disabled={currentTrackIndex === 0 || isScrolling}
          title="Previous Track"
        >
          ↑
        </button>
        
        <button 
          className="win95-nav-btn"
          onClick={() => navigateTrack('down')}
          disabled={currentTrackIndex === displayItems.length - 1 || isScrolling}
          title="Next Track"
        >
          ↓
        </button>
      </div>
    </div>
  );
}

