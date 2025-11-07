// show all users + delete button (self only)

import { useEffect, useState, useCallback } from "react";
import { fetchUsers, deleteUser } from "../lib/api";

// Type for a single user
type UserRow = { userId: string; username: string };

export default function UsersList(props: { currentUserId: string; token: string }) {
  const { currentUserId, token } = props;
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Load user list (useCallback prevents re-create function every render)
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchUsers(token);
      setUsers(data);
    } catch {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Delete current user (only yourself)
  async function handleDelete(user: UserRow) {
    if (!currentUserId || user.userId !== currentUserId) {
      alert("Cannot delete this user...");
      return;
    }

    const sure = window.confirm("Delete your account? This cannot be undone.");
    if (!sure) return;

    try {
      await deleteUser(user.userId, token);
      setUsers((prev) => prev.filter((u) => u.userId !== user.userId));
      alert("User deleted.");
    } catch {
      alert("Failed to delete user.");
    }
  }

  return (
    <div className="users-list">
      <h2>All Users</h2>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <ul>
        {users.map((u) => (
          <li key={u.userId} className="user-row">
            {u.username}
            {u.userId === currentUserId && (
              <button
                className="btn small danger"
                onClick={() => handleDelete(u)}
              >
                Delete
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
