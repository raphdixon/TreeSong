import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import Windows95Layout from "@/components/windows95-layout";
import WaveformPlayer from "@/components/waveform-player";
import { ChevronUp, ChevronDown, User } from "lucide-react";

interface Track {
  id: string;
  originalName: string;
  filename: string;
  duration: number;
  uploadDate: string;
  uploaderUserId: string;
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
    <div className="feed-item" data-track-id={track.id}>
      <div className="track-info-overlay">
        <div className="track-title">🎵 {track.originalName}</div>
        <div className="track-meta">
          <span className="uploader">
            <User size={12} /> Creator
          </span>
          <span className="duration">
            {Math.floor(track.duration / 60)}:{Math.floor(track.duration % 60).toString().padStart(2, '0')}
          </span>
          <span className="reactions-count">
            {track.emojiReactions?.length || 0} reactions
          </span>
        </div>
      </div>
      
      <div className="waveform-container">
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
  );
}

export default function FeedPage() {
  const { user } = useAuth();
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

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

  const navigateTrack = (direction: 'up' | 'down') => {
    if (isScrolling) return;
    
    setIsScrolling(true);
    
    if (direction === 'down' && currentTrackIndex < recommendedTracks.length - 1) {
      setCurrentTrackIndex(prev => prev + 1);
    } else if (direction === 'up' && currentTrackIndex > 0) {
      setCurrentTrackIndex(prev => prev - 1);
    }
    
    // Reset scrolling lock after animation
    setTimeout(() => setIsScrolling(false), 500);
  };

  const handleTrackEnd = () => {
    // Auto-advance to next track when current track ends
    if (currentTrackIndex < recommendedTracks.length - 1) {
      setTimeout(() => navigateTrack('down'), 1000);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigateTrack('up');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigateTrack('down');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
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

  const currentTrack = recommendedTracks[currentTrackIndex];

  return (
    <Windows95Layout>
      <div className="feed-container" ref={feedRef}>
        {/* Windows 95 Style Header */}
        <div className="feed-header">
          <div className="window-title-bar">
            <div className="title-bar-text">🎵 DemoTree - Music Discovery Feed</div>
            <div className="feed-counter">
              {currentTrackIndex + 1} / {recommendedTracks.length}
            </div>
          </div>
        </div>

        {/* Main Feed Area */}
        <div className="feed-main">
          <div 
            className="feed-viewport"
            style={{ 
              transform: `translateY(-${currentTrackIndex * 100}vh)`,
              transition: isScrolling ? 'transform 0.5s ease-out' : 'none'
            }}
          >
            {recommendedTracks.map((track, index) => (
              <FeedItem
                key={track.id}
                track={track}
                isActive={index === currentTrackIndex}
                onTrackEnd={handleTrackEnd}
              />
            ))}
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="feed-controls">
          <button 
            className="nav-btn nav-up"
            onClick={() => navigateTrack('up')}
            disabled={currentTrackIndex === 0 || isScrolling}
            title="Previous Track (↑)"
          >
            <ChevronUp size={24} />
          </button>
          
          <div className="track-indicator">
            <div className="dots">
              {recommendedTracks.slice(Math.max(0, currentTrackIndex - 2), currentTrackIndex + 3).map((_, dotIndex) => {
                const actualIndex = Math.max(0, currentTrackIndex - 2) + dotIndex;
                return (
                  <div 
                    key={actualIndex}
                    className={`dot ${actualIndex === currentTrackIndex ? 'active' : ''}`}
                  />
                );
              })}
            </div>
          </div>
          
          <button 
            className="nav-btn nav-down"
            onClick={() => navigateTrack('down')}
            disabled={currentTrackIndex === recommendedTracks.length - 1 || isScrolling}
            title="Next Track (↓)"
          >
            <ChevronDown size={24} />
          </button>
        </div>

        {/* Algorithm Debug Info (remove in production) */}
        {process.env.NODE_ENV === 'development' && currentTrack && (
          <div className="debug-info">
            <div className="window" style={{ width: "250px", fontSize: "10px" }}>
              <div className="title-bar">
                <div className="title-bar-text">🧠 Recommendation Debug</div>
              </div>
              <div className="window-body" style={{ padding: "4px" }}>
                <div>Reactions: {currentTrack.reactionScore.toFixed(2)}</div>
                <div>Recency: {currentTrack.recencyScore.toFixed(2)}</div>
                <div>Random: {currentTrack.randomScore.toFixed(2)}</div>
                <div><strong>Total: {currentTrack.totalScore.toFixed(2)}</strong></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Windows95Layout>
  );
}