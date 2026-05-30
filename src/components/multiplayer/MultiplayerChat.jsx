import { useState } from "react";

export function MultiplayerChat({ messages, canSend, onSend }) {
  const [text, setText] = useState("");

  const submit = (event) => {
    event.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <div className="chat-box">
      <h3>Live Chat</h3>
      <div className="chat-log">
        {messages.length === 0 && <p className="muted">Session-only chat. Nothing is stored or replayed.</p>}
        {messages.map((message) => (
          <p key={message.id}><strong>{message.from}</strong><span>{message.text}</span></p>
        ))}
      </div>
      <form onSubmit={submit}>
        <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Send a session message" disabled={!canSend} />
        <button type="submit" disabled={!canSend || !text.trim()}>Send</button>
      </form>
    </div>
  );
}
