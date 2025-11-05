// AuthButton - toggles between login & logout button

export default function AuthButton(props: {
  loggedIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
}) {
  const { loggedIn, onLogin, onLogout } = props;

  return (
    <div className="auth">
      {loggedIn ? (
        // Logged in -> show Logout
        <button className="btn" id="logout-btn" onClick={onLogout}>
          Log out
        </button>
      ) : (
        // Not logged in -> show Login
        <button className="btn primary" id="login-btn" onClick={onLogin}>
          Log in
        </button>
      )}
    </div>
  );
}
