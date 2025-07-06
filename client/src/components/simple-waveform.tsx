import { useEffect, useRef, useState } from "react";

interface SimpleWaveformProps {
  trackId: string;
  duration: number;
  onSeek?: (time: number) => void;
  currentTime?: number;
  isPlaying?: boolean;
}

// Generate fake waveform bars for visualization
function generateBars(count: number): number[] {
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    // Create a more interesting pattern
    const base = 0.3;
    const variation = Math.sin(i * 0.3) * 0.3 + Math.random() * 0.2;
    bars.push(Math.max(0.1, Math.min(1, base + variation)));
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
  const [bars] = useState(() => generateBars(100)); // Fixed 100 bars for consistency
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