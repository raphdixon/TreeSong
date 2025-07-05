import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useRoute } from "wouter";
import Windows95Layout from "@/components/windows95-layout";
import WaveformPlayer from "@/components/waveform-player";
import { ChevronUp, ChevronDown, ArrowLeft } from "lucide-react";

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
  onTrackEnd?: () => void;
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
            👤 {track.creatorUsername || 'Unknown Artist'}
          </div>
          <div className="win95-reactions-count">
            {track.emojiReactions?.length || 0} reactions
          </div>
        </div>
        
        {/* Waveform and Controls */}
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

export default function ArtistPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/artist/:username");
  const artistUsername = match ? params?.username : undefined;
  
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  // Fetch all public tracks for the artist
  const { data: allTracks = [], isLoading } = useQuery({
    queryKey: ["/api/artist/tracks", artistUsername],
    queryFn: async () => {
      const response = await fetch("/api/tracks/public");
      if (!response.ok) {
        throw new Error("Failed to fetch tracks");
      }
      const tracks = await response.json();
      // Filter tracks by this artist
      return tracks.filter((track: Track) => track.creatorUsername === decodeURIComponent(artistUsername || ''));
    },
    enabled: !!artistUsername
  });

  // Track recommendation algorithm scores
  const tracksWithScores = allTracks.map((track: Track) => ({
    ...track,
    reactionScore: track.emojiReactions?.length * 2 || 0,
    recencyScore: Math.max(0, 100 - Math.floor((Date.now() - new Date(track.uploadDate).getTime()) / (1000 * 60 * 60 * 24))),
    randomScore: Math.random() * 10
  })).map((track: Track) => ({
    ...track,
    totalScore: track.reactionScore + track.recencyScore + track.randomScore
  })).sort((a: Track, b: Track) => b.totalScore - a.totalScore);

  const currentTrack = tracksWithScores[currentTrackIndex];

  const navigateTrack = (direction: 'up' | 'down') => {
    if (isScrolling) return;
    
    setIsScrolling(true);
    
    if (direction === 'down' && currentTrackIndex < tracksWithScores.length - 1) {
      setCurrentTrackIndex(prev => prev + 1);
    } else if (direction === 'up' && currentTrackIndex > 0) {
      setCurrentTrackIndex(prev => prev - 1);
    }
    
    setTimeout(() => setIsScrolling(false), 300);
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

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [currentTrackIndex, tracksWithScores.length, isScrolling]);

  // Mouse wheel navigation
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      if (Math.abs(e.deltaY) > 50) {
        if (e.deltaY > 0) {
          navigateTrack('down');
        } else {
          navigateTrack('up');
        }
      }
    };

    const feedElement = feedRef.current;
    if (feedElement) {
      feedElement.addEventListener('wheel', handleWheel, { passive: false });
      return () => feedElement.removeEventListener('wheel', handleWheel);
    }
  }, [currentTrackIndex, tracksWithScores.length, isScrolling]);

  if (isLoading) {
    return (
      <Windows95Layout>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          Loading {artistUsername}'s tracks...
        </div>
      </Windows95Layout>
    );
  }

  if (!artistUsername || tracksWithScores.length === 0) {
    return (
      <Windows95Layout>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Artist not found</h2>
          <p>No tracks found for {artistUsername}</p>
          <button 
            className="win95-btn" 
            onClick={() => setLocation('/')}
            style={{ marginTop: '20px' }}
          >
            ← Back to Feed
          </button>
        </div>
      </Windows95Layout>
    );
  }

  return (
    <div 
      ref={feedRef}
      style={{
        height: '100vh',
        width: '100vw',
        background: 'linear-gradient(45deg, #008080 0%, #006666 50%, #004444 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Windows 95 Taskbar */}
      <div className="win95-taskbar">
        <div className="win95-taskbar-left">
          <button 
            className="win95-start-btn"
            onClick={() => setLocation('/')}
            title="Back to Main Feed"
          >
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
              onClick={() => setLocation('/login')}
              title="Login to Upload Music"
            >
              🔐 Login
            </button>
          )}
        </div>
      </div>

      {/* Main Content - Win95 Audio Player */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '96vw',
        maxWidth: '450px',
        zIndex: 50
      }}>
        {currentTrack && (
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
                <div className="win95-creator">
                  👤 {currentTrack.creatorUsername || 'Unknown Artist'}
                </div>
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
        )}
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
          <ChevronUp size={20} />
        </button>
        <button 
          className="win95-nav-btn"
          onClick={() => navigateTrack('down')}
          disabled={currentTrackIndex >= tracksWithScores.length - 1 || isScrolling}
          title="Next Track"
        >
          <ChevronDown size={20} />
        </button>
      </div>
    </div>
  );
}