"use client";

import { useEffect, useState } from "react";
import { type Role, listRoles, createRole, deleteRole } from "@/lib/api";

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    role_name: "",
    description: "",
    focus_areas: "",
    typical_topics: "",
  });

  const load = () => {
    setLoading(true);
    listRoles()
      .then(setRoles)
      .catch((e) => setMsg(String(e)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    try {
      await createRole(form);
      setForm({ role_name: "", description: "", focus_areas: "", typical_topics: "" });
      load();
      setMsg("Role created");
    } catch (err) {
      setMsg(String(err));
    }
  };

  const handleDelete = async (name: string) => {
    try {
      await deleteRole(name);
      load();
    } catch (err) {
      setMsg(String(err));
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Role Profiles</h1>

      {msg && (
        <div className="rounded border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm">
          {msg}
        </div>
      )}

      <form
        onSubmit={handleCreate}
        className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 sm:grid-cols-2"
      >
        <input
          placeholder="Role name *"
          required
          value={form.role_name}
          onChange={(e) => setForm({ ...form, role_name: e.target.value })}
          className="rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        />
        <input
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        />
        <input
          placeholder="Focus areas"
          value={form.focus_areas}
          onChange={(e) => setForm({ ...form, focus_areas: e.target.value })}
          className="rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        />
        <input
          placeholder="Typical topics"
          value={form.typical_topics}
          onChange={(e) => setForm({ ...form, typical_topics: e.target.value })}
          className="rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="col-span-full rounded border border-white px-4 py-2 text-sm font-medium text-white transition hover:bg-white hover:text-black"
        >
          Create Role
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading...</p>
      ) : roles.length === 0 ? (
        <p className="text-sm text-zinc-500">No roles yet.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-zinc-400">
              <th className="py-2">Name</th>
              <th className="py-2">Description</th>
              <th className="py-2">Focus Areas</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.id} className="border-b border-[var(--border)]">
                <td className="py-2 font-medium">{r.role_name}</td>
                <td className="py-2 text-zinc-400">{r.description}</td>
                <td className="py-2 text-zinc-400">{r.focus_areas}</td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => handleDelete(r.role_name)}
                    className="text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
