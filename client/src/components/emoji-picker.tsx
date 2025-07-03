import { useState } from "react";
import { Button } from "@/components/ui/button";

// Popular emojis for music reactions
const EMOJI_OPTIONS = [
  "🔥", "❤️", "😍", "🤯", "💯", "🎵", "🎶", "🎤", "🎸", "🥁",
  "🎹", "🎺", "🎷", "🎻", "🪇", "👏", "🙌", "✨", "⚡", "💫",
  "😱", "🤩", "😭", "😊", "🥳", "🤘", "👌", "💪", "🔊", "📈"
];

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  disabled?: boolean;
}

export default function EmojiPicker({ onEmojiSelect, disabled = false }: EmojiPickerProps) {
  return (
    <div className="window" style={{
      position: "fixed",
      bottom: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      width: "600px",
      zIndex: 1000
    }}>
      <div className="title-bar">
        <div className="title-bar-text">🎵 Emoji Reactions</div>
      </div>
      <div className="window-body" style={{ padding: "8px" }}>
        <div className="emoji-grid" style={{
          display: "grid",
          gridTemplateColumns: "repeat(10, 1fr)",
          gap: "4px",
          maxHeight: "120px",
          overflowY: "auto"
        }}>
          {EMOJI_OPTIONS.map((emoji) => (
            <Button
              key={emoji}
              onClick={() => onEmojiSelect(emoji)}
              disabled={disabled}
              style={{
                width: "40px",
                height: "40px",
                fontSize: "20px",
                padding: "0",
                border: "1px outset #C0C0C0",
                background: "#C0C0C0",
                cursor: disabled ? "not-allowed" : "pointer"
              }}
              className="emoji-btn"
            >
              {emoji}
            </Button>
          ))}
        </div>
        {disabled && (
          <p style={{ 
            fontSize: "11px", 
            color: "#808080", 
            marginTop: "8px", 
            textAlign: "center" 
          }}>
            🎧 Listen to the full track first to unlock emoji reactions!
          </p>
        )}
      </div>
    </div>
  );
}