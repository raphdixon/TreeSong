import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import Windows95Layout from "@/components/windows95-layout";
import UploadModal from "@/components/upload-modal";
import InviteModal from "@/components/invite-modal";
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [showUpload, setShowUpload] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [activeTab, setActiveTab] = useState("tracks");

  // Redirect if not logged in
  if (!user) {
    setLocation("/login");
    return null;
  }

  // Fetch user data and team info
  const { data: userData } = useQuery({
    queryKey: ["/api/me"],
  });

  // Fetch tracks
  const { data: tracks = [], isLoading: tracksLoading } = useQuery({
    queryKey: ["/api/tracks"],
  });

  const handleLogout = () => {
    logout();
    setLocation("/login");
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
            onClick={() => setShowInvite(true)}
            style={{ fontSize: "11px", padding: "2px 8px" }}
          >
            ✉️ Invite Teammate
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
          {/* Team Info */}
          <div style={{ 
            background: "#C0C0C0", 
            border: "1px inset #C0C0C0", 
            padding: "8px", 
            marginBottom: "16px",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "8px"
          }}>
            <strong>Team: {(userData as any)?.team?.name || "Loading..."}</strong>
            <span style={{ fontSize: "11px" }}>
              Logged in as: {user.email}
            </span>
          </div>

          <h3>Your Team's Tracks</h3>
          
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
          <span>Team: {(userData as any)?.team?.name}</span>
        </div>
      </div>

      {/* Modals */}
      {showUpload && (
        <UploadModal 
          onClose={() => setShowUpload(false)}
          teamId={user.teamId}
        />
      )}
      
      {showInvite && (
        <InviteModal onClose={() => setShowInvite(false)} />
      )}
    </Windows95Layout>
  );
}
