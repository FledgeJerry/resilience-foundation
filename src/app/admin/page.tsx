"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type User = {
  id: string;
  name: string | null;
  email: string;
  role: "USER" | "ADMIN";
  createdAt: string;
  _count: { coopMemberships: number };
};

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "ADMIN") { router.push("/"); return; }
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => { setUsers(data); setLoading(false); });
  }, [session, status, router]);

  async function setUserRole(id: string, role: string) {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, role }),
    });
    setUsers((us) => us.map((u) => u.id === id ? { ...u, role: role as User["role"] } : u));
  }

  if (status === "loading" || loading) return <p className="text-muted">Loading…</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <span className="eyebrow">Administration</span>
        <h1>Users</h1>
        <p style={{ marginTop: "0.25rem" }}>{users.length} registered</p>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="ll-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Co-ops</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={{ color: "var(--color-limestone)" }}>{u.name ?? "—"}</td>
                <td>{u.email}</td>
                <td>
                  <select
                    value={u.role}
                    onChange={(e) => setUserRole(u.id, e.target.value)}
                    disabled={u.id === session?.user.id}
                    style={{ width: "auto" }}
                  >
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </td>
                <td>{u._count.coopMemberships}</td>
                <td style={{ fontSize: "0.8rem" }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                <td>
                  {u._count.coopMemberships > 0 && (
                    <Link href={`/handbook?userId=${u.id}&name=${encodeURIComponent(u.name ?? u.email)}`} style={{ fontSize: "0.8rem", color: "var(--color-primary)" }}>
                      View handbook →
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
