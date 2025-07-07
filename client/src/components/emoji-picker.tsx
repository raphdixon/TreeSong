import { useState } from "react";

// Win95 pixel-style emojis for music reactions - 32 emojis total, 16 per page
const EMOJI_OPTIONS = [
  "🔥", "❤️", "🎵", "🎤", "🎸", "🥁", "🎹", "🎷",
  "💯", "🤩", "😍", "👏", "✨", "🎶", "🎧", "🎉",
  "🎺", "🪗", "🎻", "🎪", "🎭", "🎨", "💫", "⭐",
  "🌟", "💥", "🚀", "🎯", "🔮", "⚡", "🌈", "🦄"
];

const EMOJIS_PER_PAGE = 16;

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
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = Math.ceil(EMOJI_OPTIONS.length / EMOJIS_PER_PAGE);
  
  const startIndex = currentPage * EMOJIS_PER_PAGE;
  const currentEmojis = EMOJI_OPTIONS.slice(startIndex, startIndex + EMOJIS_PER_PAGE);
  
  const goToNextPage = () => {
    setCurrentPage((prev) => (prev + 1) % totalPages);
  };
  
  const goToPrevPage = () => {
    setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      background: 'var(--win95-gray)',
      border: '2px inset var(--win95-gray)',
      padding: '4px'
    }}>
      {/* Pagination controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '4px',
        padding: '2px'
      }}>
        <button
          onClick={goToPrevPage}
          disabled={disabled}
          style={{
            background: 'var(--win95-gray)',
            border: '1px outset var(--win95-gray)',
            width: '24px',
            height: '16px',
            cursor: 'pointer',
            fontSize: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Previous emojis"
        >
          ◀
        </button>
        
        <div style={{
          fontSize: '10px',
          color: '#666',
          fontFamily: 'monospace'
        }}>
          {currentPage + 1}/{totalPages}
        </div>
        
        <button
          onClick={goToNextPage}
          disabled={disabled}
          style={{
            background: 'var(--win95-gray)',
            border: '1px outset var(--win95-gray)',
            width: '24px',
            height: '16px',
            cursor: 'pointer',
            fontSize: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Next emojis"
        >
          ▶
        </button>
      </div>
      
      {/* Emoji grid */}
      <div className="emoji-grid" style={{ height: '140px' }}>
        {currentEmojis.map((emoji) => (
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
    </div>
  );
}