// List of channels and DMs

type Scope = "channel" | "dm";

export type SidebarItem = {
  id: string;
  name: string;
  unread?: number;
  locked?: boolean;
};

type SidebarProps = {
  channels: SidebarItem[];
  dms: SidebarItem[];
  active?: {
    scope: Scope;
    id: string;
  };
  isGuest: boolean;
  onSelect: (scope: Scope, id: string) => void;
};

export default function Sidebar(props: SidebarProps) {
  const { channels, dms, active, isGuest, onSelect } = props;

  // Check active item in sidebar
  function isActive(scope: Scope, id: string): boolean {
    if (!active) return false;
    return active.scope === scope && active.id === id;
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <h3 className="sidebar-title">Channels</h3>

        <ul className="sidebar-list">
          {channels.map((ch) => (
            <li key={ch.id}>
              <button
                type="button"
                className={
                  "sidebar-item" +
                  (isActive("channel", ch.name) ? " sidebar-item-active" : "")
                }
                onClick={() => onSelect("channel", ch.name)}
              >
                <span className="sidebar-item-name"># {ch.name}</span>
                {ch.locked && (
                  <span className="sidebar-item-lock" aria-hidden="true">
                    🔒
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="sidebar-section">
        <h3 className="sidebar-title">DM</h3>

        {isGuest ? (
          <p className="sidebar-guest-note">Log in to use DMs</p>
        ) : (
          <ul className="sidebar-list sidebar-dm-list">
            {dms.map((dm) => (
              <li key={dm.id}>
                <button
                  type="button"
                  className={
                    "sidebar-dm-button" +
                    (isActive("dm", dm.id) ? " sidebar-dm-button-active" : "")
                  }
                  onClick={() => onSelect("dm", dm.id)}
                >
                  <span className="sidebar-dm-name">{dm.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
