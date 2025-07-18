import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

interface SimpleWaveformProps {
  trackId: string;
  duration: number;
  onSeek?: (time: number) => void;
  currentTime?: number;
  isPlaying?: boolean;
}

export default function SimpleWaveform({ 
  trackId, 
  duration, 
  onSeek, 
  currentTime = 0,
  isPlaying = false 
}: SimpleWaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  
  // Fetch waveform data from backend
  const { data: waveformData, isLoading } = useQuery<{ peaks: number[]; length: number }>({
    queryKey: [`/api/tracks/${trackId}/waveform`],
    staleTime: Infinity, // Waveform data doesn't change
    gcTime: Infinity // v5 uses gcTime instead of cacheTime
  });
  
  // Use real waveform peaks if available, otherwise show loading state
  const bars = waveformData?.peaks || [];
  const barsToRender = bars.length > 0 ? bars : new Array(100).fill(0.1);
  
  const currentBar = Math.floor((currentTime / duration) * barsToRender.length);

  const handleBarClick = (index: number) => {
    const time = (index / barsToRender.length) * duration;
    onSeek?.(time);
  };

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
        {barsToRender.map((height, index) => (
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
              cursor: 'pointer',
              opacity: isLoading ? 0.3 : 1
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
          zIndex: 10
        }}
      />
      
      {/* Hover time tooltip */}
      {hoveredBar !== null && (
        <div
          style={{
            position: 'absolute',
            top: '-20px',
            left: `${(hoveredBar / barsToRender.length) * 100}%`,
            transform: 'translateX(-50%)',
            background: '#000',
            color: '#FFF',
            padding: '2px 4px',
            fontSize: '10px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 20
          }}
        >
          {formatTime((hoveredBar / barsToRender.length) * duration)}
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}