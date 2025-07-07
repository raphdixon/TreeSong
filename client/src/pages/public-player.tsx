import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Windows95Layout from "@/components/windows95-layout";
import WaveformPlayer from "@/components/waveform-player-simple";

export default function PublicPlayerPage() {
  const { token } = useParams();

  // Fetch shared track data
  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/share/${token}`],
    enabled: !!token,
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
            <p>Loading shared track...</p>
          </div>
        </div>
      </Windows95Layout>
    );
  }

  if (error || !data) {
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
            <p>Shared track not found or link has expired.</p>
          </div>
        </div>
      </Windows95Layout>
    );
  }

  const { track } = data;

  return (
    <Windows95Layout>
      <div className="window" style={{ 
        top: "60px", 
        left: "100px", 
        width: "900px",
        minHeight: "600px"
      }}>
        <div className="title-bar">
          <div className="title-bar-text">TreeNote - {track.originalName} (Public View)</div>
          <div className="title-bar-controls">
            <div className="title-bar-button">_</div>
            <div className="title-bar-button">□</div>
            <div className="title-bar-button">×</div>
          </div>
        </div>

        <div className="window-body" style={{ padding: "10px" }}>
          {/* Public Notice */}
          <div style={{ 
            background: "#FFFFCC", 
            border: "1px solid #CCCC99", 
            padding: "8px", 
            marginBottom: "12px"
          }}>
            <strong>🌐 Public View</strong> - You are viewing a shared track. 
            Comments you post will be public and anonymous.
          </div>

          {/* Track Info */}
          <h2>{track.originalName}</h2>
          <p style={{ color: "#666", fontSize: "11px" }}>
            BPM: {track.bpm || "Not set"} • Duration: {Math.floor(track.duration / 60)}:{Math.floor(track.duration % 60).toString().padStart(2, '0')}
          </p>

          {/* Waveform Player */}
          <WaveformPlayer 
            trackId={track.id}
            audioUrl={`/uploads/${track.filename}`}
            duration={track.duration}
            emojiReactions={[]} // Will be fetched by the component
            isPublic={true}
            fileDeletedAt={track.fileDeletedAt}
          />
        </div>
      </div>
    </Windows95Layout>
  );
}
