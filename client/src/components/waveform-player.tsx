import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import CommentPopup from "./comment-popup";
import { initializeWaveSurfer } from "@/lib/wavesurfer";

interface WaveformPlayerProps {
  trackId: string;
  audioUrl: string;
  bpm: number | null;
  duration: number;
  comments: any[];
  isPublic: boolean;
}

export default function WaveformPlayer({ 
  trackId, 
  audioUrl, 
  bpm, 
  duration, 
  comments, 
  isPublic 
}: WaveformPlayerProps) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const waveSurferRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(75);
  const [showCommentPopup, setShowCommentPopup] = useState(false);
  const [commentTime, setCommentTime] = useState(0);
  const [commentPosition, setCommentPosition] = useState({ x: 0, y: 0 });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Initialize WaveSurfer
  useEffect(() => {
    if (waveformRef.current) {
      initializeWaveSurfer(waveformRef.current, audioUrl)
        .then((waveSurfer) => {
          console.log('WaveSurfer initialized successfully');
          waveSurferRef.current = waveSurfer;

          // Event listeners
          waveSurfer.on('ready', () => {
            console.log('WaveSurfer ready');
          });

          waveSurfer.on('audioprocess', (time: number) => {
            setCurrentTime(time);
          });

          waveSurfer.on('play', () => setIsPlaying(true));
          waveSurfer.on('pause', () => setIsPlaying(false));

          // Click to seek and comment
          waveSurfer.on('click', (progress: number) => {
            console.log('WaveSurfer click - progress:', progress, 'duration:', duration);
            const clickTime = progress * duration;
            console.log('Calculated click time:', clickTime);
            
            // Immediately seek to clicked position
            waveSurfer.seekTo(progress);
            setCurrentTime(clickTime);
            setCommentTime(clickTime);
            
            // Calculate position for popup relative to viewport
            const rect = waveformRef.current!.getBoundingClientRect();
            setCommentPosition({
              x: rect.left + (progress * rect.width),
              y: rect.top - 10 // Position popup above the waveform
            });
            
            setShowCommentPopup(true);
          });

          // Alternative: Use seek event to ensure we get the actual time
          waveSurfer.on('seek', (progress: number) => {
            const seekTime = progress * duration;
            console.log('WaveSurfer seek - progress:', progress, 'seekTime:', seekTime);
            setCurrentTime(seekTime);
          });
        })
        .catch((error) => {
          console.error('Failed to initialize WaveSurfer:', error);
          toast({ 
            title: "Audio Player Error", 
            description: "Failed to load the audio player. Please try refreshing the page."
          });
        });

      return () => {
        if (waveSurferRef.current) {
          waveSurferRef.current.destroy();
        }
      };
    }
  }, [audioUrl, duration]);

  // Update volume
  useEffect(() => {
    if (waveSurferRef.current && waveSurferRef.current.backend) {
      waveSurferRef.current.setVolume(volume / 100);
    }
  }, [volume]);

  const togglePlay = () => {
    if (waveSurferRef.current) {
      waveSurferRef.current.playPause();
    }
  };

  const stop = () => {
    if (waveSurferRef.current) {
      waveSurferRef.current.stop();
      setCurrentTime(0);
    }
  };

  const seekToTime = (time: number) => {
    if (waveSurferRef.current) {
      const progress = time / duration;
      waveSurferRef.current.seekTo(progress);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate grid lines based on BPM or time
  const generateGridLines = () => {
    const lines = [];
    const containerWidth = 100; // percentage

    // Simplified grid - show major time markers every 10-15 seconds regardless of BPM
    const interval = Math.max(10, Math.floor(duration / 10)); // Show 6-10 major markers
    const numLines = Math.floor(duration / interval);
    
    for (let i = 0; i <= numLines; i++) {
      const position = (i * interval / duration) * containerWidth;
      
      lines.push(
        <div
          key={`time-${i}`}
          className="grid-line major"
          style={{ left: `${position}%` }}
        >
          <div className="time-label">
            {formatTime(i * interval)}
          </div>
        </div>
      );
    }

    return lines;
  };

  // Generate comment markers
  const generateCommentMarkers = () => {
    return comments.map((comment) => {
      const position = (comment.time / duration) * 100;
      return (
        <div
          key={comment.id}
          className="comment-marker"
          style={{ left: `${position}%` }}
          title={`${comment.username}: ${comment.text}`}
          onClick={(e) => {
            e.stopPropagation();
            seekToTime(comment.time);
          }}
        />
      );
    });
  };

  const addCommentMutation = useMutation({
    mutationFn: async (commentData: { time: number; username: string; text: string }) => {
      const response = await apiRequest("POST", `/api/tracks/${trackId}/comments`, commentData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tracks/${trackId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tracks/${trackId}/comments`] });
      setShowCommentPopup(false);
      toast({ title: "Comment added!", description: "Your comment has been posted successfully." });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to add comment", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  return (
    <div>
      {/* Waveform Container */}
      <div className="waveform-container">
        <div ref={waveformRef} style={{ width: "100%", height: "100%" }} />
        
        {/* Grid Overlay */}
        <div className="waveform-grid">
          {generateGridLines()}
          {generateCommentMarkers()}
        </div>
      </div>

      {/* Controls */}
      <div className="controls-panel">
        <button className="btn" onClick={togglePlay}>
          {isPlaying ? "⏸️" : "▶️"}
        </button>
        <button className="btn" onClick={stop}>⏹️</button>
        <button className="btn">⏮️</button>
        <button className="btn">⏭️</button>
        
        <div className="time-display">{formatTime(currentTime)}</div>
        <span style={{ margin: "0 8px" }}>/</span>
        <div className="time-display">{formatTime(duration)}</div>
        
        <label style={{ marginLeft: "16px" }}>Volume:</label>
        <input
          type="range"
          className="volume-slider"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
        />
      </div>

      {/* Comments Section */}
      <div className="comments-section">
        <div className="comments-header">
          <h3>{isPublic ? "Public Comments" : "Comments"}</h3>
          <button 
            className="btn"
            onClick={() => {
              setCommentTime(currentTime);
              setCommentPosition({ x: 400, y: 300 });
              setShowCommentPopup(true);
            }}
          >
            💬 Add Comment
          </button>
        </div>
        
        <div className="comments-list">
          {comments.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>
              No comments yet. Click on the waveform or use the button above to add one!
            </div>
          ) : (
            comments.map((comment) => (
              <div 
                key={comment.id} 
                className="comment-item"
                onClick={() => seekToTime(comment.time)}
              >
                <span className="comment-time">[{formatTime(comment.time)}]</span>
                <span className="comment-author">{comment.username}:</span>
                <span> {comment.text}</span>
                {comment.isPublic && (
                  <span style={{ fontSize: "9px", color: "#808080" }}> (Public)</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Comment Popup */}
      {showCommentPopup && (
        <CommentPopup
          time={commentTime}
          position={commentPosition}
          isPublic={isPublic}
          onSubmit={(data) => addCommentMutation.mutate(data)}
          onClose={() => setShowCommentPopup(false)}
          isLoading={addCommentMutation.isPending}
        />
      )}
    </div>
  );
}
