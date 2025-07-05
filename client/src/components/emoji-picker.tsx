import { useState } from "react";
import { Button } from "@/components/ui/button";

// Popular emojis for music reactions - exactly 32 (4 rows x 8 columns)
const EMOJI_OPTIONS = [
  "🔥", "❤️", "😍", "🤯", "💯", "🎵", "🎶", "🎤",
  "🎸", "🥁", "🎹", "🎺", "🎷", "🎻", "🪇", "👏",
  "🙌", "✨", "⚡", "💫", "😱", "🤩", "😭", "😊",
  "🥳", "🤘", "👌", "💪", "🔊", "📈", "🎧", "🎼"
];

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  disabled?: boolean;
  currentCount?: number;
  showWarning?: boolean;
}

export default function EmojiPicker({ 
  onEmojiSelect, 
  disabled = false, 
  currentCount = 0, 
  showWarning = false 
}: EmojiPickerProps) {
  return (
    <div className="emoji-picker-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '8px' }}>
      {/* Emoji Counter - Only show when we have emojis or approaching limit */}
      {(currentCount > 0 || showWarning) && (
        <div style={{
          textAlign: 'center',
          padding: '4px 8px',
          fontSize: '11px',
          fontWeight: 'bold',
          background: showWarning ? '#ffeb3b' : 'var(--windows-gray)',
          color: showWarning ? '#d84315' : '#000',
          border: '1px inset var(--windows-gray)',
          marginBottom: '4px'
        }}>
          {showWarning ? `⚠️ ${currentCount}/10 emojis used` : `${currentCount}/10 emojis`}
        </div>
      )}
      
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