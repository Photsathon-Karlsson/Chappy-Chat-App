// Sidebar - shows Channels & DMs and highlights selected item

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
  const activeKey = useMemo(
    () => (active ? `${active.scope}:${active.id}` : ""),
    [active]
  );

  return (
    <aside className="sidebar bg-purple-100 p-2 w-48">
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
    <div className="sidebar-section mb-3">
      <h2 className="font-bold mb-1">{title}</h2>
      <ul className="space-y-1">
        {items.map((it) => {
          const key = `${scope}:${it.id}`;
          const isActive = key === activeKey;
          return (
            <li key={key}>
              <button
                type="button"
                className={`w-full text-left px-2 py-1 rounded ${
                  isActive ? "bg-pink-200" : "hover:bg-purple-200"
                }`}
                onClick={() => onSelect(scope, it.id)}
              >
                {it.name}
              </button>
            </li>
          );
        })}
        {items.length === 0 && <li className="text-gray-400">(empty)</li>}
      </ul>
    </div>
  );
}
