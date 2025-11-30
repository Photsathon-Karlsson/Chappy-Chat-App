import React from "react";

// One item in sidebar (channel or dm)
export type SidebarItem = {
  id: string;
  name: string;
  unread?: number;
  locked?: boolean;
};

// Which item is active now
type ActiveSidebar = {
  scope: "channel" | "dm";
  id: string;
};

type SidebarProps = {
  channels: SidebarItem[];
  dms: SidebarItem[];
  active?: ActiveSidebar;
  // Called when user clicks channel or dm
  onSelect: (scope: "channel" | "dm", id: string) => void;
  // Guest cannot use DM
  isGuest: boolean;
};

const Sidebar: React.FC<SidebarProps> = ({
  channels,
  dms,
  active,
  onSelect,
  isGuest,
}) => {
  // Check if channel is selected
  const isChannelActive = (ch: SidebarItem) => {
    if (!active) return false;
    if (active.scope !== "channel") return false;
    return active.id === ch.name || active.id === ch.id;
  };

  // Check if dm is selected
  const isDmActive = (dm: SidebarItem) => {
    if (!active) return false;
    if (active.scope !== "dm") return false;
    return active.id === dm.id;
  };

  return (
    <aside className="sidebar">
      {/* Channels section */}
      <section className="sidebar-section">
        <h3 className="sidebar-title">Channels</h3>

        <ul className="sidebar-list">
          {channels.map((ch) => (
            <li key={ch.id}>
              <button
                type="button"
                className={
                  "sidebar-item" +
                  (isChannelActive(ch) ? " sidebar-item-active" : "")
                }
                onClick={() => onSelect("channel", ch.name)}
              >
                <span className="sidebar-item-name">
                  #{ch.name}
                  {ch.locked && (
                    <span
                      className="sidebar-item-lock"
                      aria-label="Locked channel"
                      title="Locked channel"
                    >
                      🔒
                    </span>
                  )}
                </span>

                {typeof ch.unread === "number" && ch.unread > 0 && (
                  <span className="badge">{ch.unread}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* DM section */}
      <section className="sidebar-section">
        <h3 className="sidebar-title">DM</h3>

        {isGuest ? (
          <p className="sidebar-guest-note">Log in to use DMs</p>
        ) : dms.length === 0 ? (
          <p className="sidebar-empty">No DMs yet</p>
        ) : (
          // Scroll box for DM list (like message box)
          <div className="sidebar-dm-box">
            <ul className="sidebar-dm-list">
              {dms.map((dm) => (
                <li key={dm.id}>
                  <button
                    type="button"
                    className={
                      "sidebar-dm-button" +
                      (isDmActive(dm) ? " sidebar-dm-button-active" : "")
                    }
                    onClick={() => onSelect("dm", dm.id)}
                  >
                    <span className="sidebar-dm-name">{dm.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </aside>
  );
};

export default Sidebar;
