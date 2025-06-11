import { useState } from "react";
import { useLocation } from "wouter";
import Windows95Layout from "@/components/windows95-layout";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [notepadOpen, setNotepadOpen] = useState(true);

  return (
    <Windows95Layout>
      {/* Notepad Window */}
      {notepadOpen && (
        <div className="window" style={{ 
          top: "80px", 
          left: "120px", 
          width: "600px",
          height: "400px",
          zIndex: 10
        }}>
          <div className="title-bar">
            <div className="title-bar-text">📝 Notepad - Welcome.txt</div>
            <div className="title-bar-controls">
              <div className="title-bar-button">_</div>
              <div className="title-bar-button">□</div>
              <div className="title-bar-button" onClick={() => setNotepadOpen(false)}>×</div>
            </div>
          </div>
          
          <div className="window-body" style={{ 
            height: "calc(100% - 33px)",
            padding: "8px",
            overflow: "auto"
          }}>
            <textarea 
              readOnly
              style={{
                width: "100%",
                height: "100%",
                border: "1px inset #c0c0c0",
                padding: "4px",
                fontFamily: "MS Sans Serif, sans-serif",
                fontSize: "11px",
                backgroundColor: "#ffffff",
                resize: "none",
                outline: "none"
              }}
              value={`Welcome to TreeNote by The Meeting Tree.

TreeNote allows people to comment on audio wave forms at various timestamps, without creating an account. It is perfect for making notes at certain points of a song or podcast.

TreeNote is currently free. It was made by The Meeting Tree, a boutique global sonic house.

Your files will likely be deleted after 10 days, so please make a note of any comments!`}
            />
          </div>
        </div>
      )}

      {/* Login Window */}
      <div className="window" style={{ 
        top: "200px", 
        left: "300px", 
        width: "350px",
        zIndex: notepadOpen ? 5 : 10
      }}>
        <div className="title-bar">
          <div className="title-bar-text">TreeNote - Access</div>
          <div className="title-bar-controls">
            <div className="title-bar-button">_</div>
            <div className="title-bar-button">□</div>
            <div className="title-bar-button">×</div>
          </div>
        </div>
        
        <div className="window-body" style={{ padding: "16px", textAlign: "center" }}>
          <div style={{ marginBottom: "20px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px" }}>
              🎵 TreeNote
            </h2>
            <p style={{ fontSize: "11px", color: "#666" }}>
              Audio collaboration with time-synchronized feedback
            </p>
          </div>
          
          <div className="field-row" style={{ justifyContent: "center", gap: "8px" }}>
            <button 
              className="btn"
              onClick={() => setLocation("/login")}
              style={{ width: "100px" }}
            >
              Login
            </button>
            
            <button
              className="btn"
              onClick={() => setLocation("/register")}
              style={{ width: "100px" }}
            >
              Register
            </button>
          </div>
          
          <div style={{ marginTop: "16px", fontSize: "10px", color: "#888" }}>
            <p>Create an account to start collaborating</p>
            <p>or browse public shared tracks</p>
          </div>
        </div>
      </div>

      {/* Desktop Icons */}
      <div style={{ 
        position: "absolute", 
        top: "20px", 
        left: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "20px"
      }}>
        <div 
          style={{ 
            textAlign: "center", 
            cursor: "pointer",
            width: "64px"
          }}
          onClick={() => setLocation("/login")}
        >
          <div style={{ 
            fontSize: "32px", 
            marginBottom: "4px",
            padding: "8px",
            borderRadius: "2px"
          }}>
            🎵
          </div>
          <div style={{ 
            fontSize: "10px", 
            color: "white",
            textShadow: "1px 1px 1px rgba(0,0,0,0.8)",
            wordWrap: "break-word"
          }}>
            TreeNote
          </div>
        </div>

        <div 
          style={{ 
            textAlign: "center", 
            cursor: "pointer",
            width: "64px"
          }}
          onClick={() => setNotepadOpen(true)}
        >
          <div style={{ 
            fontSize: "32px", 
            marginBottom: "4px",
            padding: "8px",
            borderRadius: "2px"
          }}>
            📝
          </div>
          <div style={{ 
            fontSize: "10px", 
            color: "white",
            textShadow: "1px 1px 1px rgba(0,0,0,0.8)",
            wordWrap: "break-word"
          }}>
            Welcome
          </div>
        </div>
      </div>
    </Windows95Layout>
  );
}