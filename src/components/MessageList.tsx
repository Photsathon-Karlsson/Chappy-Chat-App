// MessageList - displays chat messages or a loading / empty message

// Type for each chat message
export type Message = {
  id: string;           // unique ID for each message
  sender: string;       // who sent the message       
  text: string;         // the message content
  time: string;         // time shown, e.g. "10:23"
};

// Component to show all messages in the chat
export default function MessageList(props: {
  items: Message[];
  loading?: boolean;
}) {
  const { items, loading } = props;

  // If messages are loading
  if (loading) {
    return (
      <div className="message-list loading">
        <p>Loading messages...</p>
      </div>
    );
  }

  // If there are no messages
  if (!items || items.length === 0) {
    return (
      <div className="message-list empty">
        <p>No messages yet</p>
      </div>
    );
  }

  // Show the list of messages
  return (
    <ul className="message-list" role="list">
      {items.map((msg) => (
        <li key={msg.id} className="message-item">
          <div className="message-header">
            <span className="sender">{msg.sender}</span>
            <time className="timestamp">{msg.time}</time>
          </div>
          <p className="text">{msg.text}</p>
        </li>
      ))}
    </ul>
  );
}
