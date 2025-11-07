// shows list of channels and DMs on the left

export type SidebarItem = {
  id: string;
  name: string;
  unread?: number;
  locked?: boolean; // show 🔒 icon
};

type SidebarProps = {
  channels: SidebarItem[];
  dms: SidebarItem[];
  active?: { scope: "channel" | "dm"; id: string };
  onSelect: (scope: "channel" | "dm", id: string) => void;
};

export default function Sidebar({
  channels,
  dms,
  active,
  onSelect,
}: SidebarProps) {
  
  // Function to render the list of items
  function renderList(scope: "channel" | "dm", items: SidebarItem[]) {
    if (!items || items.length === 0) {
      return <p style={{ marginLeft: "0.5rem" }}>(empty)</p>;
    }

    return (
      <ul className="sidebar-list">
        {items.map((item) => {
          const isActive =
            active && active.scope === scope && active.id === item.id;

          return (
            <li
              key={item.id}
              className={`sidebar-item ${isActive ? "active" : ""}`}
              onClick={() => onSelect(scope, item.id)}
            >
              {/* If it's a channel and locked = true -> show 🔒  */}
              {scope === "channel" && item.locked ? "🔒 " : "# "}
              {item.name}
              {item.unread ? ` (${item.unread})` : ""}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <aside className="sidebar">
      <h3>Channels</h3>
      {renderList("channel", channels)}

      <h3>DM</h3>
      {renderList("dm", dms)}
    </aside>
  );
}
