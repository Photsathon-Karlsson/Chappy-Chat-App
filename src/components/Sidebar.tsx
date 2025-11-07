// Sidebar - shows Channels and DMs on the left

import { useMemo } from "react";

type Scope = "channel" | "dm";

export type SidebarItem = {
  id?: string; // id can be missing, so we mark it as optional
  name: string;
  unread?: number;
  locked?: boolean; // true for private channels
};

export default function Sidebar(props: {
  channels: SidebarItem[];
  dms: SidebarItem[];
  onSelect: (scope: Scope, id: string) => void;
  active?: { scope: Scope; id: string };
}) {
  const { channels, dms, onSelect, active } = props;

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

type SectionProps = {
  title: string;
  items: SidebarItem[];
  scope: Scope;
  onSelect: (scope: Scope, id: string) => void;
  activeKey: string;
};

function Section({
  title,
  items,
  scope,
  onSelect,
  activeKey,
}: SectionProps) {
  return (
    <div className="sidebar-section">
      <h2 className="sidebar-title">{title}</h2>
      <ul className="sidebar-list">
        {items.map((it, index) => {
          // new: check if this item has a real id
          const hasRealId = Boolean(it.id);

          // new: create a safe id for React key (no "undefined")
          const safeKeyId = hasRealId ? it.id! : `temp-${scope}-${index}`;

          const key = `${scope}:${safeKeyId}`;
          const isActive = hasRealId && key === activeKey; // new: only active when real id exists

          return (
            <li key={key}>
              <button
                type="button"
                className={`sidebar-item-button ${
                  isActive ? "active" : ""
                }`}
                // new: only call onSelect when there is a real id
                onClick={() => {
                  if (hasRealId) {
                    onSelect(scope, it.id!);
                  }
                }}
                // new: disable button if there is no id (cannot select)
                disabled={!hasRealId}
              >
                <span className="sidebar-item-left">
                  {scope === "channel" ? `# ${it.name}` : it.name}
                </span>

                <span className="sidebar-item-right">
                  {it.locked && (
                    <span
                      className="sidebar-lock"
                      aria-label="Locked channel"
                      title="Locked channel"
                    >
                      🔒
                    </span>
                  )}
                  {it.unread && it.unread > 0 && (
                    <span className="badge">{it.unread}</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
        {items.length === 0 && (
          <li className="sidebar-empty">(empty)</li>
        )}
      </ul>
    </div>
  );
}
