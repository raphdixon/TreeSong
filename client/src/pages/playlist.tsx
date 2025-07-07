import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import WaveformPlayer from "@/components/waveform-player-simple";

interface PlaylistTrack {
  id: string;
  playlistId: string;
  trackId: string;
  position: number;
  savedAt: string;
  track: {
    id: string;
    originalName: string;
    filename: string;
    duration: number;
    uploadDate: string;
    uploaderUserId: string;
    creatorUsername: string;
    creatorArtistName: string;
    creatorEmail: string;
  };
}

interface Playlist {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export default function PlaylistPage() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { id: playlistId } = useParams();
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);

  // Redirect if not logged in
  if (!isLoading && !isAuthenticated) {
    setLocation("/");
    return null;
  }

  // Fetch playlist details
  const { data: playlist } = useQuery<Playlist>({
    queryKey: ["/api/playlists", playlistId],
    enabled: !!playlistId && isAuthenticated,
  });

  // Fetch playlist tracks
  const { data: playlistTracks = [], isLoading: tracksLoading } = useQuery<PlaylistTrack[]>({
    queryKey: ["/api/playlists", playlistId, "tracks"],
    enabled: !!playlistId && isAuthenticated,
  });

  const currentTrack = playlistTracks[currentTrackIndex];

  // Early return if no current track is available
  if (!currentTrack && !tracksLoading) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        background: 'linear-gradient(45deg, #008080 0%, #006666 50%, #004444 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div className="win95-audio-player">
          <div className="win95-title-bar">
            <div className="win95-title-text">Playlist Empty</div>
          </div>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <p>This playlist is empty.</p>
            <button 
              className="btn" 
              onClick={() => setLocation('/dashboard')}
              style={{ marginTop: '10px' }}
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const navigateTrack = (direction: 'up' | 'down') => {
    if (isScrolling || !playlistTracks.length) return;
    
    setIsScrolling(true);
    
    if (direction === 'down' && currentTrackIndex < playlistTracks.length - 1) {
      setCurrentTrackIndex(currentTrackIndex + 1);
    } else if (direction === 'up' && currentTrackIndex > 0) {
      setCurrentTrackIndex(currentTrackIndex - 1);
    } else if (direction === 'down' && currentTrackIndex === playlistTracks.length - 1) {
      // End of playlist - redirect to main feed
      setLocation('/');
      return;
    }
    
    setTimeout(() => setIsScrolling(false), 500);
  };

  // Keyboard navigation
  useEffect(() => {
    // Only set up keyboard navigation if we have tracks
    if (!playlistTracks.length) return;
    
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
        e.preventDefault();
        navigateTrack(e.code === 'ArrowUp' ? 'up' : 'down');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentTrackIndex, isScrolling, playlistTracks.length]);

  if (isLoading || tracksLoading) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        background: 'linear-gradient(45deg, #008080 0%, #006666 50%, #004444 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div className="win95-audio-player">
          <div className="win95-title-bar">
            <div className="win95-title-text">Loading...</div>
          </div>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            Loading playlist...
          </div>
        </div>
      </div>
    );
  }

  if (!playlist || playlistTracks.length === 0) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        background: 'linear-gradient(45deg, #008080 0%, #006666 50%, #004444 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div className="win95-audio-player">
          <div className="win95-title-bar">
            <div className="win95-title-text">Playlist Not Found</div>
          </div>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <p>This playlist is empty or doesn't exist.</p>
            <button 
              className="btn" 
              onClick={() => setLocation('/dashboard')}
              style={{ marginTop: '10px' }}
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      background: 'linear-gradient(45deg, #008080 0%, #006666 50%, #004444 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Windows 95 Taskbar */}
      <div className="win95-taskbar">
        <div className="win95-taskbar-left">
          <button 
            className="win95-start-btn"
            onClick={() => setLocation('/dashboard')}
            title="Back to Dashboard"
          >
            ♪ {playlist.name}
          </button>
        </div>
        <div className="win95-taskbar-center">
          <span style={{ fontSize: '10px' }}>
            Track {currentTrackIndex + 1} of {playlistTracks.length}
          </span>
        </div>
        <div className="win95-taskbar-right">
          <button 
            className="win95-taskbar-btn"
            onClick={() => setLocation('/dashboard')}
            title="Back to Dashboard"
          >
            📁 Dashboard
          </button>
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
        {currentTrack && currentTrack.track ? (
          <div className="win95-audio-player">
            {/* Title Bar */}
            <div className="win95-title-bar ml-[0px] mr-[0px] mt-[0px] mb-[14px]">
              <div className="win95-title-text">
                ♪ {currentTrack.track.originalName}
              </div>
              <div className="win95-window-controls">
                <button 
                  className="win95-vote-btn win95-vote-dislike" 
                  title="Previous Track"
                  onClick={() => navigateTrack('up')}
                  disabled={currentTrackIndex === 0}
                >
                  ↑
                </button>
                <button 
                  className="win95-vote-btn win95-vote-like" 
                  title="Next Track"
                  onClick={() => navigateTrack('down')}
                >
                  ↓
                </button>
              </div>
            </div>
            
            {/* Player Content */}
            <div className="win95-player-content">
              {/* Track Info */}
              <div className="win95-track-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button 
                    className="win95-creator win95-creator-btn"
                    onClick={() => setLocation(`/artist/${currentTrack.track.uploaderUserId}`)}
                    title="View artist page"
                  >
                    👤 {currentTrack.track.creatorArtistName || 'Unknown Artist'}
                  </button>
                </div>
                <div className="win95-reactions-count">
                  Track {currentTrackIndex + 1}/{playlistTracks.length}
                </div>
              </div>
              
              {/* Waveform and Controls */}
              <WaveformPlayer 
                trackId={currentTrack.track.id}
                audioUrl={`/uploads/${currentTrack.track.filename}`}
                duration={currentTrack.track.duration}
                emojiReactions={[]}
                isPublic={false}
                autoPlay={true}
                onTrackEnd={() => navigateTrack('down')}
                onReactionCountChange={() => {}}
                artistName={currentTrack.track.creatorArtistName || 'Unknown Artist'}
                trackName={currentTrack.track.originalName}
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
          disabled={isScrolling}
          title="Next Track (or return to feed when finished)"
        >
          ↓
        </button>
      </div>
    </div>
  );
}