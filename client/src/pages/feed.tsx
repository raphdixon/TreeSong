import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import Windows95Layout from "@/components/windows95-layout";
import WaveformPlayer from "@/components/waveform-player";
import { ChevronUp, ChevronDown, User, LogIn, Upload } from "lucide-react";

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
    <div className="desktop-window" data-track-id={track.id}>
      <div className="window-header">
        <div className="window-title">
          <span className="window-icon">🎵</span>
          <span className="track-name">{track.originalName}</span>
        </div>
        <div className="window-controls">
          <button className="window-btn minimize">_</button>
          <button className="window-btn maximize">□</button>
          <button className="window-btn close">×</button>
        </div>
      </div>
      
      <div className="window-content">
        <div className="track-info-bar">
          <span className="track-creator">
            <User size={12} /> Creator
          </span>
          <span className="track-duration">
            {Math.floor(track.duration / 60)}:{Math.floor(track.duration % 60).toString().padStart(2, '0')}
          </span>
          <span className="track-reactions">
            {track.emojiReactions?.length || 0} reactions
          </span>
        </div>
        
        <div className="waveform-area">
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
  const { user } = useAuth();
  const [, setLocation] = useLocation();
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

  const currentTrack = recommendedTracks[currentTrackIndex];

  return (
    <div className="desktop-environment" ref={feedRef}>
      {/* Desktop Background */}
      <div className="desktop-background">
        
        {/* Minimal Taskbar */}
        <div className="desktop-taskbar">
          <div className="taskbar-left">
            <div className="start-button">
              🎵 DemoTree
            </div>
          </div>
          <div className="taskbar-center">
            <span className="track-counter">
              Track {currentTrackIndex + 1} of {recommendedTracks.length}
            </span>
          </div>
          <div className="taskbar-right">
            {user ? (
              <button 
                className="taskbar-btn upload-btn"
                onClick={() => setLocation('/dashboard')}
                title="Go to Dashboard"
              >
                <Upload size={14} />
                Upload
              </button>
            ) : (
              <button 
                className="taskbar-btn login-btn"
                onClick={() => setLocation('/login')}
                title="Login to Upload Music"
              >
                <LogIn size={14} />
                Login
              </button>
            )}
            <div className="taskbar-time">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {/* Floating Windows Container */}
        <div className="desktop-windows">
          <div 
            className="windows-viewport"
            style={{ 
              transform: `translateY(-${currentTrackIndex * 100}vh)`,
              transition: isScrolling ? 'transform 0.6s cubic-bezier(0.25, 0.8, 0.25, 1)' : 'none'
            }}
          >
            {recommendedTracks.map((track, index) => (
              <div 
                key={track.id}
                className="window-viewport"
                style={{
                  opacity: index === currentTrackIndex ? 1 : 0.3,
                  transform: index === currentTrackIndex ? 'scale(1)' : 'scale(0.8)',
                  transition: isScrolling ? 'all 0.6s cubic-bezier(0.25, 0.8, 0.25, 1)' : 'all 0.3s ease'
                }}
              >
                <FeedItem 
                  track={track}
                  isActive={index === currentTrackIndex}
                  onTrackEnd={() => navigateTrack('down')}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Desktop Navigation Arrows */}
        <div className="desktop-navigation">
          <button 
            className="desktop-nav-btn nav-up"
            onClick={() => navigateTrack('up')}
            disabled={currentTrackIndex === 0 || isScrolling}
            title="Previous Track (↑)"
          >
            <ChevronUp size={24} />
          </button>
          
          <button 
            className="desktop-nav-btn nav-down"
            onClick={() => navigateTrack('down')}
            disabled={currentTrackIndex === recommendedTracks.length - 1 || isScrolling}
            title="Next Track (↓)"
          >
            <ChevronDown size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}

