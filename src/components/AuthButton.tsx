// AuthButton - toggles between login & logout button
// When logging out, it clears local token and calls onLogout.

export default function AuthButton(props: {
  loggedIn: boolean;
  onLogin: () => void;
  onLogout: () => void; // parent should clear store/state and navigate
}) {
  const { loggedIn, onLogin, onLogout } = props;

  function handleLogout() {
    // 1) remove token from local storage
    // 2) call parent to clear state and navigate to /login
    localStorage.removeItem("token");
    onLogout();
  }

  return (
    <div className="auth">
      {loggedIn ? (
        <button className="btn" id="logout-btn" onClick={handleLogout}>
          Log out
        </button>
      ) : (
        <button className="btn primary" id="login-btn" onClick={onLogin}>
          Log in
        </button>
      )}
    </div>
  );
}
