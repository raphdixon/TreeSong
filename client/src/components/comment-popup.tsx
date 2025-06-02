import { useState, useEffect } from "react";

interface CommentPopupProps {
  time: number;
  position: { x: number; y: number };
  isPublic: boolean;
  onSubmit: (data: { time: number; username: string; text: string }) => void;
  onClose: () => void;
  isLoading: boolean;
}

export default function CommentPopup({ 
  time, 
  position, 
  isPublic, 
  onSubmit, 
  onClose, 
  isLoading 
}: CommentPopupProps) {
  const [username, setUsername] = useState("");
  const [text, setText] = useState("");

  // Load username from localStorage
  useEffect(() => {
    const savedUsername = localStorage.getItem("commentUsername");
    if (savedUsername) {
      setUsername(savedUsername);
    }
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && text.trim()) {
      // Save username to localStorage
      localStorage.setItem("commentUsername", username);
      
      onSubmit({
        time,
        username: username.trim(),
        text: text.trim()
      });
    }
  };

  return (
    <div className="modal-backdrop">
      <div 
        className="window modal-window" 
        style={{ 
          position: "fixed",
          left: `${Math.min(position.x, window.innerWidth - 300)}px`,
          top: `${Math.min(position.y, window.innerHeight - 300)}px`,
          width: "300px",
          zIndex: 100
        }}
      >
        <div className="title-bar">
          <div className="title-bar-text">Add Comment</div>
          <div className="title-bar-controls">
            <div className="title-bar-button" onClick={onClose}>×</div>
          </div>
        </div>
        
        <div className="window-body">
          <form onSubmit={handleSubmit}>
            <div className="field-row">
              <label>Time:</label>
              <span>{formatTime(time)}</span>
            </div>
            
            <div className="field-row">
              <label htmlFor="commentUsername">Username:</label>
              <input
                type="text"
                id="commentUsername"
                className="textbox"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your name"
                required
                style={{ flex: 1 }}
              />
            </div>
            
            <div className="field-row">
              <label htmlFor="commentText">Comment:</label>
            </div>
            <div className="field-row">
              <textarea
                id="commentText"
                className="textbox"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter your feedback..."
                required
                rows={3}
                style={{ width: "100%", resize: "vertical" }}
              />
            </div>
            
            <div className="field-row" style={{ justifyContent: "center", marginTop: "15px" }}>
              <button 
                type="submit" 
                className="btn"
                disabled={isLoading || !username.trim() || !text.trim()}
              >
                {isLoading ? "Posting..." : "💬 Post"}
              </button>
              <button 
                type="button" 
                className="btn"
                onClick={onClose}
                style={{ marginLeft: "10px" }}
              >
                Cancel
              </button>
            </div>
            
            {isPublic && (
              <div style={{ fontSize: "10px", color: "#666", marginTop: "8px", textAlign: "center" }}>
                This comment will be public and visible to anyone with the share link.
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
