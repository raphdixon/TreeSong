import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Windows95Layout from "@/components/windows95-layout";
import WaveformPlayer from "@/components/waveform-player-new";
import ShareModal from "@/components/share-modal";
import { useState } from "react";

export default function PlayerPage() {
  const { trackId } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [showShare, setShowShare] = useState(false);

  // Redirect if not logged in  
  if (!user) {
    setLocation("/");
    return null;
  }

  // Fetch track data
  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/tracks/${trackId}`],
    enabled: !!trackId,
  });

  if (isLoading) {
    return (
      <Windows95Layout>
        <div className="window" style={{ 
          top: "50%", 
          left: "50%", 
          transform: "translate(-50%, -50%)",
          width: "400px"
        }}>
          <div className="title-bar">
            <div className="title-bar-text">Loading...</div>
          </div>
          <div className="window-body">
            <p>Loading track...</p>
          </div>
        </div>
      </Windows95Layout>
    );
  }

  if (error || !data || !(data as any)?.track) {
    return (
      <Windows95Layout>
        <div className="window" style={{ 
          top: "50%", 
          left: "50%", 
          transform: "translate(-50%, -50%)",
          width: "400px"
        }}>
          <div className="title-bar">
            <div className="title-bar-text">Error</div>
          </div>
          <div className="window-body">
            <p>Track not found or access denied.</p>
            <button 
              className="btn"
              onClick={() => setLocation("/dashboard")}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </Windows95Layout>
    );
  }

  const { track, comments = [] } = data as any;

  return (
    <Windows95Layout>
      <div className="window player-window" style={{ 
        top: "10px", 
        left: "10px", 
        right: "10px",
        bottom: "10px",
        position: "fixed",
        width: "calc(100vw - 20px)",
        height: "calc(100vh - 20px)",
        background: "var(--win95-gray)"
      }}>
        <div className="title-bar">
          <div className="title-bar-text">TreeNote - {track.originalName}</div>
          <div className="title-bar-controls">
            <div className="title-bar-button">_</div>
            <div className="title-bar-button">□</div>
            <div className="title-bar-button" onClick={() => setLocation("/dashboard")}>×</div>
          </div>
        </div>
        
        {/* Toolbar */}
        <div style={{ 
          background: "#C0C0C0", 
          borderBottom: "1px solid #808080", 
          padding: "4px",
          display: "flex",
          gap: "2px"
        }}>
          <button className="btn">▶️ Play</button>
          <button className="btn">⏹️ Stop</button>
          <button 
            className="btn"
            onClick={() => setShowShare(true)}
            style={{ marginLeft: "auto" }}
          >
            🔗 Share Track
          </button>
          <button 
            className="btn"
            onClick={() => setLocation("/dashboard")}
          >
            📋 Dashboard
          </button>
        </div>

        <div className="window-body" style={{ padding: "10px" }}>
          {/* Track Info */}
          <div className="field-row">
            <label>Track:</label>
            <span>{track.originalName}</span>
            <span style={{ marginLeft: "20px" }}>Duration:</span>
            <span>{Math.floor(track.duration / 60)}:{Math.floor(track.duration % 60).toString().padStart(2, '0')}</span>
          </div>

          {/* Waveform Player */}
          <WaveformPlayer 
            trackId={track.id}
            audioUrl={`/uploads/${track.filename}`}
            duration={track.duration}
            emojiReactions={comments || []}
            isPublic={false}
            fileDeletedAt={track.fileDeletedAt}
          />
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
          <span>Time Scale: 4/4</span>
          <span>Comments: {comments?.length || 0} | Share Link: Available</span>
        </div>
      </div>

      {/* Share Modal */}
      {showShare && (
        <ShareModal 
          trackId={track.id}
          onClose={() => setShowShare(false)}
        />
      )}
    </Windows95Layout>
  );
}
