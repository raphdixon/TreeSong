import { useEffect, useRef, useState } from "react";

interface SimpleWaveformProps {
  trackId: string;
  duration: number;
  onSeek?: (time: number) => void;
  currentTime?: number;
  isPlaying?: boolean;
}

// Generate unique waveform bars based on trackId
function generateBars(count: number, trackId: string): number[] {
  const bars: number[] = [];
  
  // Create a simple hash from trackId to use as seed
  let hash = 0;
  for (let i = 0; i < trackId.length; i++) {
    const char = trackId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Use hash to create deterministic but unique pattern
  const seed = Math.abs(hash);
  const offset = (seed % 100) / 100;
  const frequency = 0.3 + (seed % 30) / 100;
  
  for (let i = 0; i < count; i++) {
    // Create unique pattern based on track
    const base = 0.4 + (seed % 20) / 100;
    const wave1 = Math.sin((i + offset * 10) * frequency) * 0.3;
    const wave2 = Math.sin((i + offset * 5) * frequency * 2.1) * 0.15;
    const pseudoRandom = ((seed * (i + 1)) % 100) / 500 - 0.1;
    
    const height = base + wave1 + wave2 + pseudoRandom;
    bars.push(Math.max(0.1, Math.min(1, height)));
  }
  return bars;
}

export default function SimpleWaveform({ 
  trackId, 
  duration, 
  onSeek, 
  currentTime = 0,
  isPlaying = false 
}: SimpleWaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [bars] = useState(() => generateBars(100, trackId)); // Generate unique bars per track
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const handleBarClick = (index: number) => {
    const time = (index / bars.length) * duration;
    onSeek?.(time);
  };

  const currentBar = Math.floor((currentTime / duration) * bars.length);

  return (
    <div 
      ref={containerRef}
      className="waveform-container"
      style={{
        width: '100%',
        height: '120px',
        background: '#FFFFFF',
        border: '2px inset #808080',
        display: 'flex',
        alignItems: 'center',
        padding: '4px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div 
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          alignItems: 'center',
          gap: '1px'
        }}
      >
        {bars.map((height, index) => (
          <div
            key={index}
            onClick={() => handleBarClick(index)}
            onMouseEnter={() => setHoveredBar(index)}
            onMouseLeave={() => setHoveredBar(null)}
            style={{
              flex: 1,
              height: `${height * 100}%`,
              background: index <= currentBar 
                ? '#000080' // Navy for played portion
                : hoveredBar === index 
                  ? '#0000FF' // Bright blue on hover
                  : '#0000FF', // Blue for unplayed
              transition: 'none',
              borderRadius: 0,
              cursor: 'pointer'
            }}
          />
        ))}
      </div>
      
      {/* Progress line */}
      <div
        style={{
          position: 'absolute',
          left: `${(currentTime / duration) * 100}%`,
          top: 0,
          bottom: 0,
          width: '2px',
          background: '#FF0000',
          pointerEvents: 'none',
          display: isPlaying ? 'block' : 'none'
        }}
      />
    </div>
  );
}