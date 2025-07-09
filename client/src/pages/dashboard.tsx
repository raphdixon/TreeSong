import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Windows95Layout from "@/components/windows95-layout";
import UploadModal from "@/components/upload-modal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Playlist } from "@shared/schema";

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [activeTab, setActiveTab] = useState("tracks");
  const [isMinimizing, setIsMinimizing] = useState(false);
  const windowRef = useRef<HTMLDivElement>(null);

  // Redirect if not logged in
  if (!isLoading && !isAuthenticated) {
    setLocation("/");
    return null;
  }

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="desktop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="window" style={{ width: '300px' }}>
          <div className="title-bar">
            <div className="title-bar-text">TreeNote</div>
          </div>
          <div className="window-body" style={{ textAlign: 'center', padding: '20px' }}>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Get user data with team info
  const { data: userData } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: isAuthenticated, // Only fetch when authenticated
  });

  // Fetch tracks for user
  const { data: tracks = [], isLoading: tracksLoading } = useQuery({
    queryKey: ["/api/tracks"],
    enabled: isAuthenticated, // Only fetch when authenticated
  });

  // Fetch playlists for user
  const { data: playlists = [], isLoading: playlistsLoading } = useQuery<Playlist[]>({
    queryKey: ["/api/playlists"],
    enabled: isAuthenticated && activeTab === 'playlists',
  });

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const updateArtistName = async (artistName: string) => {
    if (!artistName.trim()) return;
    
    try {
      const response = await fetch('/api/auth/update-artist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ artistName: artistName.trim() })
      });
      
      if (response.ok) {
        toast({ title: "Artist name updated!", description: `Set to: ${artistName.trim()}` });
        // Refresh user data
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      }
    } catch (error) {
      toast({ title: "Failed to update artist name", variant: "destructive" });
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  // Handle minimize with animation
  const handleMinimize = () => {
    setIsMinimizing(true);
    // After animation completes, navigate to feed
    setTimeout(() => {
      setLocation('/');
    }, 300);
  };

  // Handle close (go back to feed)
  const handleClose = () => {
    setLocation('/');
  };

  return (
    <Windows95Layout>
      <div 
        ref={windowRef}
        className={`window dashboard-window ${isMinimizing ? 'minimizing' : ''}`} 
        style={{ 
          top: "20px", 
          left: "20px", 
          right: "20px",
          bottom: "60px",
          width: "auto",
          minHeight: "calc(100vh - 120px)",
          maxWidth: "1200px",
          margin: "0 auto",
          background: "var(--win95-gray)"
        }}
      >
        <div className="title-bar">
          <div className="title-bar-text">TreeNote - Dashboard</div>
          <div className="title-bar-controls">
            <button 
              className="title-bar-button" 
              onClick={handleMinimize}
              style={{ cursor: 'pointer' }}
            >
              _
            </button>
            <button 
              className="title-bar-button" 
              style={{ cursor: 'not-allowed', opacity: 0.5 }}
              disabled
            >
              □
            </button>
            <button 
              className="title-bar-button" 
              onClick={handleClose}
              style={{ cursor: 'pointer' }}
            >
              ×
            </button>
          </div>
        </div>
        
        {/* Menu Bar */}
        <div style={{ 
          background: "#C0C0C0", 
          borderBottom: "1px solid #808080", 
          padding: "4px 8px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "8px",
          minHeight: "36px"
        }}>
          <button 
            className="btn"
            onClick={() => setShowUpload(true)}
            style={{ fontSize: "11px", padding: "2px 8px" }}
          >
            📁 Upload Track
          </button>

          <button 
            className="btn"
            onClick={handleLogout}
            style={{ marginLeft: "auto", fontSize: "11px", padding: "2px 8px" }}
          >
            Logout
          </button>
        </div>

        <div className="window-body" style={{ 
          height: "calc(100% - 120px)", 
          overflowY: "auto",
          padding: "12px"
        }}>
          {/* Artist Settings */}
          <div style={{ 
            background: "#C0C0C0", 
            border: "1px inset #C0C0C0", 
            padding: "8px", 
            marginBottom: "16px"
          }}>
            <strong>Artist Settings</strong>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px", marginBottom: "8px" }}>
              <label htmlFor="artistName" style={{ fontSize: "11px" }}>Artist Name:</label>
              <input
                id="artistName"
                type="text"
                className="textbox"
                placeholder={userData?.email || 'Your artist name'}
                defaultValue={userData?.artistName || ''}
                onBlur={(e) => updateArtistName(e.target.value)}
                style={{ flex: 1, fontSize: "11px" }}
              />
            </div>
            <span style={{ fontSize: "11px" }}>
              Logged in as: {user.email}
            </span>
          </div>

          {/* Tab Navigation */}
          <div style={{ 
            marginBottom: "16px", 
            borderBottom: "2px solid #808080",
            display: "flex",
            gap: "0"
          }}>
            <button
              className={`btn ${activeTab === 'tracks' ? 'active' : ''}`}
              onClick={() => setActiveTab('tracks')}
              style={{
                borderRadius: 0,
                borderBottom: activeTab === 'tracks' ? '2px solid #C0C0C0' : '2px solid transparent',
                marginBottom: '-2px',
                padding: '4px 16px',
                background: activeTab === 'tracks' ? '#C0C0C0' : '#E0E0E0'
              }}
            >
              🎵 Tracks
            </button>
            <button
              className={`btn ${activeTab === 'playlists' ? 'active' : ''}`}
              onClick={() => setActiveTab('playlists')}
              style={{
                borderRadius: 0,
                borderBottom: activeTab === 'playlists' ? '2px solid #C0C0C0' : '2px solid transparent',
                marginBottom: '-2px',
                padding: '4px 16px',
                background: activeTab === 'playlists' ? '#C0C0C0' : '#E0E0E0'
              }}
            >
              📁 Playlists
            </button>
          </div>

          {activeTab === 'tracks' ? (
            <>
              <h3>Your Tracks</h3>
          
          {tracksLoading ? (
            <div>Loading tracks...</div>
          ) : (tracks as any[]).length === 0 ? (
            <div style={{ 
              textAlign: "center", 
              padding: "40px",
              border: "1px inset #C0C0C0",
              background: "#FFFFFF"
            }}>
              <p>No tracks uploaded yet.</p>
              <button 
                className="btn"
                onClick={() => setShowUpload(true)}
              >
                Upload Your First Track
              </button>
            </div>
          ) : (
            <div className="tracks-grid">
              {(tracks as any[]).map((track: any) => (
                <div key={track.id} className="track-card">
                  <div className="track-title">🎵 {track.originalName}</div>
                  <div className="track-info">
                    <div>Uploaded: {formatDate(track.uploadDate)}</div>
                    <div>
                      BPM: {track.bpm ? (
                        <span className="bpm-indicator">{track.bpm}</span>
                      ) : (
                        "Not set"
                      )}
                    </div>
                    <div>Duration: {formatDuration(track.duration)}</div>
                  </div>
                  <div className="track-actions">
                    <button 
                      className="btn"
                      onClick={() => setLocation(`/tracks/${track.id}`)}
                    >
                      ▶️ Play
                    </button>
                    <button className="btn">🔗 Share</button>
                    <button className="btn">🗑️ Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
            </>
          ) : (
            // Playlists Section
            <>
              <h3>Your Playlists</h3>
              
              {playlistsLoading ? (
                <div>Loading playlists...</div>
              ) : playlists.length === 0 ? (
                <div style={{ 
                  textAlign: "center", 
                  padding: "40px",
                  border: "1px inset #C0C0C0",
                  background: "#FFFFFF"
                }}>
                  <p>No playlists created yet.</p>
                  <p style={{ fontSize: "11px", marginTop: "8px" }}>
                    Save tracks to create your first playlist!
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {playlists.map((playlist) => (
                    <div 
                      key={playlist.id} 
                      style={{
                        background: "#FFFFFF",
                        border: "1px inset #C0C0C0",
                        padding: "12px",
                        cursor: "pointer"
                      }}
                      onClick={() => setLocation(`/pl/${playlist.id}`)}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: "13px" }}>📁 {playlist.name}</h4>
                          <p style={{ fontSize: "11px", color: "#666", margin: "4px 0 0 0" }}>
                            Created {new Date(playlist.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button 
                          className="btn"
                          style={{ fontSize: "11px", padding: "2px 8px" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation(`/pl/${playlist.id}`);
                          }}
                        >
                          ▶ Play
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Status Bar */}
        <div style={{ 
          background: "#C0C0C0", 
          borderTop: "1px inset #C0C0C0", 
          padding: "4px 8px",
          fontSize: "11px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "absolute",
          bottom: "0",
          left: "0",
          right: "0"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button 
              className="btn"
              onClick={() => setLocation("/")}
              style={{ 
                fontSize: "10px", 
                padding: "2px 6px",
                background: "#C0C0C0",
                border: "1px outset #C0C0C0"
              }}
              title="Return to music feed"
            >
              ← Feed
            </button>
          </div>
          <span>Artist: {userData?.artistName || userData?.email || 'Loading...'}</span>
        </div>
      </div>

      {/* Modals */}
      {showUpload && (
        <UploadModal 
          onClose={() => setShowUpload(false)}
        />
      )}
    </Windows95Layout>
  );
}
