"use client";

import { useEffect, useState } from "react";
import {
  type CompanyProfile,
  listCompanies,
  createCompany,
  deleteCompany,
} from "@/lib/api";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    company_name: "",
    role: "general",
    description: "",
    hiring_patterns: "",
    tech_stack: "",
  });

  const load = () => {
    setLoading(true);
    listCompanies()
      .then(setCompanies)
      .catch((e) => setMsg(String(e)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    try {
      await createCompany(form);
      setForm({ company_name: "", role: "general", description: "", hiring_patterns: "", tech_stack: "" });
      load();
      setMsg("Company profile created");
    } catch (err) {
      setMsg(String(err));
    }
  };

  const handleDelete = async (name: string, role: string) => {
    try {
      await deleteCompany(name, role);
      load();
    } catch (err) {
      setMsg(String(err));
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Company Profiles</h1>

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
          placeholder="Company name *"
          required
          value={form.company_name}
          onChange={(e) => setForm({ ...form, company_name: e.target.value })}
          className="rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        />
        <input
          placeholder="Role (e.g. Backend Engineer)"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          className="rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        />
        <input
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        />
        <input
          placeholder="Hiring patterns"
          value={form.hiring_patterns}
          onChange={(e) => setForm({ ...form, hiring_patterns: e.target.value })}
          className="rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        />
        <input
          placeholder="Tech stack"
          value={form.tech_stack}
          onChange={(e) => setForm({ ...form, tech_stack: e.target.value })}
          className="col-span-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="col-span-full rounded border border-white px-4 py-2 text-sm font-medium text-white transition hover:bg-white hover:text-black"
        >
          Create / Update
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading...</p>
      ) : companies.length === 0 ? (
        <p className="text-sm text-zinc-500">No company profiles yet.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-zinc-400">
              <th className="py-2">Company</th>
              <th className="py-2">Role</th>
              <th className="py-2">Tech Stack</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={`${c.company_name}-${c.role}`} className="border-b border-[var(--border)]">
                <td className="py-2 font-medium">{c.company_name}</td>
                <td className="py-2 text-zinc-400">{c.role}</td>
                <td className="py-2 text-zinc-400">{c.tech_stack}</td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => handleDelete(c.company_name, c.role)}
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
