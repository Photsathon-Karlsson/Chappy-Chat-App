// Simple list of all users from backend

import { useEffect, useState } from "react";
import { fetchUsers, type UserDTO } from "../lib/api";

type UsersListProps = {
  token?: string;
};

export default function UsersList(props: UsersListProps) {
  const { token } = props;

  const [users, setUsers] = useState<UserDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // No token -> no request
    if (!token) {
      setUsers([]);
      return;
    }

    let cancelled = false;
    const authToken: string = token; // make sure this is string

    async function loadUsers() {
      try {
        setLoading(true);
        setError(null);

        const raw = await fetchUsers(authToken);
        if (cancelled) return;

        setUsers(raw);
      } catch {
        if (cancelled) return;
        setError("Failed to load users");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadUsers();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token) {
    return <p>No user list without login.</p>;
  }

  if (loading) {
    return <p>Loading users...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <ul>
      {users.map((u) => (
        <li key={u.id}>{u.username}</li>
      ))}
    </ul>
  );
}
