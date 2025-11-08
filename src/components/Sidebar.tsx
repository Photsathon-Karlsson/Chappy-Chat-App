// Sidebar - shows Channels & DMs on the left

import { useMemo } from "react";

type Scope = "channel" | "dm";

export type SidebarItem = {
  id: string;
  name: string;
  unread?: number;
  locked?: boolean; // true for private channels
};

type SidebarProps = {
  channels: SidebarItem[];
  dms: SidebarItem[];
  onSelect: (scope: Scope, id: string) => void;
  active?: { scope: Scope; id: string };
  isGuest: boolean; // can show locks only for guests
};

export default function Sidebar(props: SidebarProps) {
  const { channels, dms, onSelect, active, isGuest } = props;

  // Build "channel:123" or "dm:abc" for easy comparison
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
        isGuest={isGuest}
      />
      <Section
        title="DM"
        items={dms}
        scope="dm"
        onSelect={onSelect}
        activeKey={activeKey}
        isGuest={isGuest}
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
  isGuest: boolean;
};

function Section({
  title,
  items,
  scope,
  onSelect,
  activeKey,
  isGuest,
}: SectionProps) {
  const showDmGuestMessage = scope === "dm" && isGuest && items.length === 0;

  return (
    <div className="sidebar-section">
      <h2 className="sidebar-title">{title}</h2>
      <ul className="sidebar-list">
        {items.map((it) => {
          const key = `${scope}:${it.id}`;
          const isActive = key === activeKey;

          const baseLabel =
            scope === "channel" ? `# ${it.name}` : it.name;

          // Guests see 🔒 next to locked channels
          const showLockForGuestChannel =
            isGuest && scope === "channel" && it.locked;

          return (
            <li key={key}>
              <button
                type="button"
                className={`sidebar-item-button ${
                  isActive ? "active" : ""
                }`}
                onClick={() => onSelect(scope, it.id)}
              >
                <span className="sidebar-item-left">
                  {baseLabel}
                  {showLockForGuestChannel ? " 🔒" : ""}
                </span>

                <span className="sidebar-item-right">
                  {/* Only show unread badge on the right side */}
                  {it.unread && it.unread > 0 && (
                    <span className="badge">{it.unread}</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}

        {/* If no items -> show helper text */}
        {items.length === 0 && (
          <li className="sidebar-empty">
            {showDmGuestMessage ? (
              <>
                <span aria-hidden="true">🔒</span>{" "}
                <span>Log in to use DMs</span>
              </>
            ) : (
              "(empty)"
            )}
          </li>
        )}
      </ul>
    </div>
  );
}
