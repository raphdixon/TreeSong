import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useTrackCounter } from "@/hooks/use-track-counter";
import Windows95Layout from "@/components/windows95-layout";
import WaveformPlayer from "@/components/waveform-player-simple";
import AuthPromptCard from "@/components/auth-prompt-card";
import { ChevronUp, ChevronDown, User, LogIn, Upload } from "lucide-react";

// Global volume state
let globalVolume = 70;
const volumeListeners: ((volume: number) => void)[] = [];

function VolumeControl() {
  const [showVolumePopup, setShowVolumePopup] = useState(false);
  const [volume, setVolume] = useState(globalVolume);
  const popupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current && 
        !popupRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowVolumePopup(false);
      }
    };

    if (showVolumePopup) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showVolumePopup]);

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    globalVolume = newVolume;
    
    // Update all audio elements
    volumeListeners.forEach(listener => listener(newVolume));
    
    // Update any currently playing audio
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      audio.volume = newVolume / 100;
    });
  };

  return (
    <div style={{ position: 'relative' }}>
      <button 
        ref={buttonRef}
        className="win95-taskbar-btn"
        onClick={() => setShowVolumePopup(!showVolumePopup)}
        title="Volume Control"
        style={{ minWidth: '30px' }}
      >
        🔊
      </button>
      
      {showVolumePopup && (
        <div
          ref={popupRef}
          style={{
            position: 'absolute',
            bottom: '30px',
            right: '0',
            width: '120px',
            background: 'var(--win95-gray)',
            border: '2px outset var(--win95-gray)',
            padding: '8px',
            zIndex: 2000
          }}
        >
          {/* Title bar */}
          <div style={{
            background: 'linear-gradient(90deg, var(--win95-blue), #0000FF)',
            color: 'white',
            padding: '2px 4px',
            fontSize: '10px',
            fontWeight: 'bold',
            marginBottom: '4px',
            textAlign: 'center'
          }}>
            <span>Volume</span>
          </div>
          
          {/* Volume slider */}
          <div style={{ textAlign: 'center', marginBottom: '4px' }}>
            <div style={{ fontSize: '8px', marginBottom: '2px' }}>
              Volume: {volume}%
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              style={{
                width: '90px',
                height: '16px'
              }}
            />
          </div>
          
          {/* Quick volume buttons */}
          <div style={{ 
            display: 'flex', 
            gap: '2px', 
            justifyContent: 'center'
          }}>
            <button
              onClick={() => handleVolumeChange(0)}
              style={{
                background: 'var(--win95-gray)',
                border: '1px outset var(--win95-gray)',
                padding: '2px 4px',
                fontSize: '8px',
                cursor: 'pointer'
              }}
            >
              Mute
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Export the volume management functions
export const useGlobalVolume = () => {
  const [volume, setVolume] = useState(globalVolume);
  
  useEffect(() => {
    const listener = (newVolume: number) => setVolume(newVolume);
    volumeListeners.push(listener);
    
    return () => {
      const index = volumeListeners.indexOf(listener);
      if (index > -1) {
        volumeListeners.splice(index, 1);
      }
    };
  }, []);
  
  return volume;
};

interface Track {
  id: string;
  originalName: string;
  filename: string;
  duration: number;
  uploadDate: string;
  uploaderUserId: string;
  creatorArtistName: string;
  creatorEmail: string;
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
            <span>👤 {track.creatorArtistName || 'Unknown Artist'}</span>
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
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({});
  
  // Get URL parameters
  const searchParams = new URLSearchParams(window.location.search);
  const topTrackSlug = searchParams.get('toptrack');
  
  const { 
    tracksViewed, 
    incrementTrackCount, 
    shouldShowAuthPrompt,
    TRACKS_BEFORE_AUTH 
  } = useTrackCounter();

  // Fetch all public tracks for the feed
  const { data: allTracks = [], isLoading } = useQuery({
    queryKey: ["/api/tracks/public"],
    queryFn: async () => {
      const response = await fetch("/api/tracks/public");
      if (!response.ok) {
        throw new Error("Failed to fetch tracks");
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
  
  // Check for toptrack parameter and find matching track
  useEffect(() => {
    if (topTrackSlug && recommendedTracks.length > 0) {
      // Try to find a track that matches the slug
      const findTrackIndex = () => {
        for (let i = 0; i < displayItems.length; i++) {
          const item = displayItems[i];
          if (item.type === 'track' && item.data) {
            // Create a slug from the track's artist and name
            const trackSlug = `${item.data.creatorArtistName || 'unknown-artist'}-${item.data.originalName}`
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '');
            
            if (trackSlug === topTrackSlug.toLowerCase()) {
              console.log(`[FEED] Found matching track for slug: ${topTrackSlug}`);
              return i;
            }
          }
        }
        return -1;
      };
      
      const matchIndex = findTrackIndex();
      if (matchIndex !== -1) {
        setCurrentTrackIndex(matchIndex);
        // Mark this track as viewed
        const item = displayItems[matchIndex];
        if (item?.type === 'track' && item.data) {
          const trackId = item.data.id;
          if (!hasViewedTrack.has(trackId)) {
            incrementTrackCount(trackId);
            setHasViewedTrack(prev => new Set(prev).add(trackId));
          }
        }
      }
    }
  }, [topTrackSlug, recommendedTracks, displayItems]);

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
          <VolumeControl />
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
                    setLocation(`/artist/${encodeURIComponent(currentTrack.uploaderUserId)}`);
                  }}
                  title={`View artist's tracks`}
                >
                  👤 {currentTrack.creatorArtistName || 'Unknown Artist'}
                </button>
                <div className="win95-reactions-count">
                  {reactionCounts[currentTrack.id] ?? (currentTrack.emojiReactions?.length || 0)} reactions
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
                onReactionCountChange={(newCount) => {
                  // Update the reaction count in the state
                  setReactionCounts(prev => ({
                    ...prev,
                    [currentTrack.id]: newCount
                  }));
                }}
                artistName={currentTrack.creatorArtistName || 'Unknown Artist'}
                trackName={currentTrack.originalName}
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

