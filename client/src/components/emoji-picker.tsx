// Win95 pixel-style emojis for music reactions - exactly 12 (3 rows x 4 columns)
const EMOJI_OPTIONS = [
  "🔥", "❤️", "🎵", "🎤",
  "🎸", "🥁", "🎹", "👏", 
  "💯", "🤩", "🎧", "🎼"
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
    <>
      {EMOJI_OPTIONS.map((emoji) => (
        <button
          key={emoji}
          className="win95-emoji-btn"
          onClick={() => onEmojiSelect(emoji)}
          disabled={disabled}
          title={`Add ${emoji} reaction`}
        >
          {emoji}
        </button>
      ))}
    </>
  );
}