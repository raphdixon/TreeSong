// Win95 pixel-style emojis for music reactions - exactly 32 emojis (4x8 mobile, 8x4 desktop)
const EMOJI_OPTIONS = [
  "🔥", "❤️", "🎵", "🎤", "🎸", "🥁", "🎹", "🎷",
  "💯", "🤩", "😍", "👏", "✨", "🎶", "🎧", "🎉",
  "🎺", "🪗", "🎻", "🎪", "🎭", "🎨", "💫", "⭐",
  "🌟", "💥", "🚀", "🎯", "🔮", "⚡", "🌈", "🦄"
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
    <div className="emoji-grid">
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
  );
}