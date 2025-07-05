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
    <div className="emoji-picker-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '8px' }}>
      <div className="emoji-grid" style={{ flex: 1, overflow: 'auto' }}>
        {EMOJI_OPTIONS.map((emoji) => (
          <button
            key={emoji}
            className="emoji-button"
            onClick={() => onEmojiSelect(emoji)}
            disabled={disabled}
            title={`Add ${emoji} reaction`}
          >
            {emoji}
          </button>
        ))}
      </div>
      {disabled && (
        <p style={{ 
          textAlign: 'center', 
          marginTop: '8px', 
          fontSize: '11px',
          color: '#666',
          padding: '4px'
        }}>
          Complete the track to start adding reactions
        </p>
      )}
    </div>
  );
}