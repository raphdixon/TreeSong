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
  maxCount?: number;
}

export default function EmojiPicker({ 
  onEmojiSelect, 
  disabled = false, 
  currentCount = 0, 
  showWarning = false,
  maxCount = 10
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
      {/* Emoji counter */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: '4px',
        paddingRight: '4px'
      }}>
        <div style={{
          fontSize: '10px',
          color: '#333',
          fontFamily: 'monospace',
          fontWeight: 'bold'
        }}>
          {currentCount}/{maxCount}
        </div>
      </div>
      
      {/* Emoji grid */}
      <div className="emoji-grid">
        {currentEmojis.map((emoji) => (
          <button
            key={emoji}
            className="emoji-button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onEmojiSelect(emoji);
            }}
            disabled={disabled}
            title={`Add ${emoji} reaction`}
          >
            {emoji}
          </button>
        ))}
      </div>
      
      {/* Pagination controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '4px',
        padding: '2px'
      }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            goToPrevPage();
          }}
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
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            goToNextPage();
          }}
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
    </div>
  );
}