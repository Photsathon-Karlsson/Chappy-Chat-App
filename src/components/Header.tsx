// Header - shows the app title + username + logout button

export default function Header(props: {
  username?: string; // name of current user
  onLogout?: () => void; // function to run when clicking logout
  currentRoom?: string; // show which room/DM is active
}) {
  const { username, onLogout, currentRoom } = props;

  return (
    <header className="app-header flex justify-between items-center px-4 py-2 bg-sky-100">
      {/* Left side: app name + username */}
      <div className="flex flex-col">
        <h1 className="text-xl font-bold">Chappy</h1>
        {username && (
          <span className="text-sm text-gray-600">
            Logged in as: <b>{username}</b>
          </span>
        )}
        {currentRoom && (
          <span className="text-xs text-gray-500">
            Room: {currentRoom}
          </span>
        )}
      </div>

      {/* Right side: logout button */}
      {onLogout && (
        <button
          onClick={onLogout}
          className="btn bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded"
        >
          Log out
        </button>
      )}
    </header>
  );
}