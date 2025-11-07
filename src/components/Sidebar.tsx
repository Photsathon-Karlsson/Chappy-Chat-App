// Sidebar - shows Channels & DMs and highlights the selected item

import { useMemo } from "react";

type Scope = "channel" | "dm";

export type SidebarItem = {
  id: string;
  name: string;
  unread?: number;
};

export default function Sidebar(props: {
  channels: SidebarItem[];
  dms: SidebarItem[];
  onSelect: (scope: Scope, id: string) => void;
  active?: { scope: Scope; id: string };
}) {
  const { channels, dms, onSelect, active } = props;

  // Make a key that tells which item is active
  const activeKey = useMemo(
    () => (active ? `${active.scope}:${active.id}` : ""),
    [active]
  );

  return (
    <aside className="sidebar">
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

function Section(props: {
  title: string;
  items: SidebarItem[];
  scope: Scope;
  onSelect: (scope: Scope, id: string) => void;
  activeKey: string;
}) {
  const { title, items, scope, onSelect, activeKey } = props;

  return (
    <div className="sidebar-section">
      <h2 className="sidebar-title">{title}</h2>
      <ul className="sidebar-list">
        {items.map((it) => {
          const key = `${scope}:${it.id}`;
          const isActive = key === activeKey;

          return (
            <li key={key}>
              <button
                type="button"
                className={`sidebar-item ${isActive ? "active" : ""}`}
                onClick={() => onSelect(scope, it.id)}
              >
                <span>{it.name}</span>
                {it.unread && it.unread > 0 && (
                  <span className="badge">{it.unread}</span>
                )}
              </button>
            </li>
          );
        })}
        {items.length === 0 && (
          <li className="text" style={{ opacity: 0.6 }}>
            (empty)
          </li>
        )}
      </ul>
    </div>
  );
}
