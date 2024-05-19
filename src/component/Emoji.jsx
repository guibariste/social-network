import { useEffect, useRef, useState } from 'react';

const EMOJIS = [
  '😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊', '😋', '😎', '😍', '😘', '😗', '😙', '😚',
  '🙂', '🤗', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😣', '😥', '😮', '🤐', '😯', '😪', '😫', '😴',
  '😌', '🤤', '😷', '🤒', '🤕', '🤢', '🤮', '🥵', '🥶', '🥴', '😵', '🤯', '🤬', '😡', '😠', '🤪', '🥳',
];

export default function Emoji({ onSelect }) {
  const emojiPickerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  
  const handleOutsideClick = (e) => {
    if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
      setIsOpen(false);
    }
  };

  const randomPrintEmoji = () => {
    if (document.getElementById('random-emoji')!=null){
      document.getElementById('random-emoji').innerHTML = EMOJIS[Math.floor(Math.random()*EMOJIS.length)];
    }
  }
  
  const handleEmojiButtonMouseDown = (e) => {
    e.stopPropagation();
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  return (
    <span className="emoji-picker emoticons">
      <div className="emoji-button" onClick={() => setIsOpen(!isOpen)} onMouseDown={handleEmojiButtonMouseDown}>
        <span role="img" aria-label="Pick an emoji" id="random-emoji" onMouseOver={randomPrintEmoji}>😊</span>
      </div>
      {isOpen && (
        <div className="emoji-picker-list" ref={emojiPickerRef}>
          {EMOJIS.map((emoji) => (
            <span key={emoji} className="emoji-item" onClick={() => onSelect(emoji)}>
              {emoji}
            </span>
          ))}
        </div>
      )}
    </span>
  );
}
