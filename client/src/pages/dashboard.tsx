import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Windows95Layout from "@/components/windows95-layout";
import UploadModal from "@/components/upload-modal";
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [activeTab, setActiveTab] = useState("tracks");

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

  return (
    <Windows95Layout>
      <div className="window" style={{ 
        top: "20px", 
        left: "20px", 
        right: "20px",
        bottom: "60px",
        width: "auto",
        minHeight: "calc(100vh - 120px)",
        maxWidth: "1200px",
        margin: "0 auto"
      }}>
        <div className="title-bar">
          <div className="title-bar-text">TreeNote - Dashboard</div>
          <div className="title-bar-controls">
            <div className="title-bar-button">_</div>
            <div className="title-bar-button">□</div>
            <div className="title-bar-button">×</div>
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
        </div>

        {/* Status Bar */}
        <div style={{ 
          background: "#C0C0C0", 
          borderTop: "1px inset #C0C0C0", 
          padding: "4px 8px",
          fontSize: "11px",
          display: "flex",
          justifyContent: "space-between",
          position: "absolute",
          bottom: "0",
          left: "0",
          right: "0"
        }}>
          <span>Ready</span>
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
