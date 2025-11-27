// MessageInput - lets user type & send a message

import { useState } from "react";

export default function MessageInput(props: {
  onSend: (text: string) => void;
  disabled?: boolean;
}) {
  const { onSend, disabled } = props;
  const [text, setText] = useState(""); // store what the user types

  // When user presses Enter or clicks Send
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();                     // stop page reload
    if (!text.trim() || disabled) return;   // skip empty text or when disabled
    onSend(text.trim());                    // send message to parent
    setText("");                            // clear input after sending
  }

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message..."
        disabled={disabled}
        className="input"
      />
      <button type="submit" className="btn primary" disabled={disabled || !text.trim()}>
        Send
      </button>
    </form>
  );
}