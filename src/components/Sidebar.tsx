// Sidebar - shows Channels & DMs & tells the parent which one is selected

import { useMemo } from "react";

// Type for what kind of item (chat channel or direct message)
type Scope = "channel" | "dm";

// Each item in the sidebar (a channel or a DM)
export type SidebarItem = {
  id: string;       // unique key ID (e.g. "CHANNEL#general" or "USER#alice")
  name: string;     // display name (e.g. "#general" or "@alice")
  unread?: number;  // optional unread message count
};

// Main Sidebar component
export default function Sidebar(props: {
  channels: SidebarItem[];                      // list of channels
  dms: SidebarItem[];                           // list of direct messages
  onSelect: (scope: Scope, id: string) => void; // when user clicks an item 
  active?: { scope: Scope; id: string };        // the currently selected item
}) {
  const { channels, dms, onSelect, active } = props;

  // Create a simple string key for the active item, like "channel:CHANNEL#general"
  const activeKey = useMemo(() => (active ? `${active.scope}:${active.id}` : ""), [active]);

  return (
    <aside className="sidebar" aria-label="Sidebar with channels and direct messages">
      <Section
        title="Channels"
        items={channels}
        scope="channel"
        onSelect={onSelect}
        activeKey={activeKey}
      />
      <Section
        title="DM"
        items={dms}
        scope="dm"
        onSelect={onSelect}
        activeKey={activeKey}
      />
    </aside>
  );
}

// Part of the sidebar that shows one group (like Channels or DMs)
function Section({
  title,
  items,
  scope,
  onSelect,
  activeKey,
}: {
  title: string;
  items: SidebarItem[];
  scope: Scope;
  onSelect: (scope: Scope, id: string) => void;
  activeKey: string;
}) {
  return (
    <div className="sidebar-section">
      <h2 className="sidebar-title">{title}</h2>
      <ul className="sidebar-list" role="list">
        {items.map((it) => {
          const key = `${scope}:${it.id}`;
          const isActive = key === activeKey;
          return (
            <li key={key}>
              <button
                type="button"
                className={`sidebar-item ${isActive ? "active" : ""}`}
                onClick={() => onSelect(scope, it.id)}
                aria-current={isActive ? "true" : undefined}
              >
                <span className="sidebar-item__name">{it.name}</span>
                {typeof it.unread === "number" && it.unread > 0 && (
                  <span className="badge" aria-label={`${it.unread} unread`}>
                    {it.unread}
                  </span>
                )}
              </button>
            </li>
          );
        })}
        {items.length === 0 && (
          <li className="muted" aria-live="polite">
            (empty)
          </li>
        )}
      </ul>
    </div>
  );
}
