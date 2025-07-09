import { useState } from 'react';

interface StartupScreenProps {
  onStart: () => void;
}

export default function StartupScreen({ onStart }: StartupScreenProps) {
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = () => {
    setIsStarting(true);
    // Play CRT animation then call onStart
    setTimeout(() => {
      onStart();
    }, 800); // Duration of CRT animation
  };

  return (
    <div 
      className={`startup-screen ${isStarting ? 'crt-starting' : ''}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        zIndex: 9999,
        cursor: 'pointer'
      }}
      onClick={handleStart}
    >
      <button
        className="crt-power-button"
        style={{
          background: '#C0C0C0',
          border: '3px outset #DFDFDF',
          padding: '20px 40px',
          fontSize: '24px',
          fontFamily: '"Press Start 2P", monospace',
          cursor: 'pointer',
          color: '#000000',
          letterSpacing: '2px',
          position: 'relative',
          transition: 'all 0.1s'
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.border = '3px inset #DFDFDF';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.border = '3px outset #DFDFDF';
        }}
      >
        ON
      </button>
      <p style={{
        color: '#C0C0C0',
        fontSize: '14px',
        fontFamily: '"Press Start 2P", monospace',
        marginTop: '20px',
        letterSpacing: '1px'
      }}>
        Click to start
      </p>
    </div>
  );
}