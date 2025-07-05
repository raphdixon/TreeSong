import { LogIn } from "lucide-react";
import { useState } from "react";

interface AuthPromptCardProps {
  onLogin: () => void;
}

export default function AuthPromptCard({ onLogin }: AuthPromptCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleLogin = () => {
    console.log("[AUTH_PROMPT] User clicked login button");
    // Store current feed position in sessionStorage for restoration after OAuth
    const currentPosition = sessionStorage.getItem('feedPosition') || '0';
    sessionStorage.setItem('feedPositionBeforeAuth', currentPosition);
    sessionStorage.setItem('returnToFeed', 'true');
    onLogin();
  };

  return (
    <div className="win95-audio-player auth-prompt-card">
      {/* Title Bar */}
      <div className="win95-title-bar">
        <div className="win95-title-text">
          <span>🔐 Login Required</span>
        </div>
        <div className="win95-window-controls">
          <button className="win95-window-btn">_</button>
          <button className="win95-window-btn">□</button>
          <button className="win95-window-btn">×</button>
        </div>
      </div>
      
      {/* Auth Content */}
      <div className="win95-player-content" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '400px',
        textAlign: 'center',
        padding: '40px 20px'
      }}>
        <div style={{
          background: '#C0C0C0',
          border: '2px inset #DFDFDF',
          padding: '30px',
          maxWidth: '400px',
          width: '100%'
        }}>
          <h2 style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '16px',
            marginBottom: '20px',
            color: '#000080'
          }}>
            Keep Discovering Music!
          </h2>
          
          <p style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '10px',
            lineHeight: '1.8',
            marginBottom: '30px',
            color: '#000000'
          }}>
            Sign in with Replit to continue exploring unlimited tracks and save your favorites
          </p>

          {/* Login Button */}
          <button
            className="win95-button"
            onClick={handleLogin}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: '12px',
              padding: '12px 24px',
              background: isHovered ? '#000080' : '#C0C0C0',
              color: isHovered ? '#FFFFFF' : '#000000',
              border: isHovered ? '2px inset #000080' : '2px outset #DFDFDF',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <LogIn size={16} />
            Login with Replit
          </button>

          <div style={{
            marginTop: '30px',
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '8px',
            color: '#808080'
          }}>
            Free account • No credit card required
          </div>
        </div>

        {/* Bottom stats */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          width: '100%',
          maxWidth: '400px',
          marginTop: '30px',
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '8px',
          color: '#000080'
        }}>
          <div>
            <div style={{ fontSize: '14px', marginBottom: '5px' }}>4</div>
            <div>TRACKS PLAYED</div>
          </div>
          <div>
            <div style={{ fontSize: '14px', marginBottom: '5px' }}>∞</div>
            <div>MORE TO DISCOVER</div>
          </div>
        </div>
      </div>
    </div>
  );
}