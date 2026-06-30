"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  type IconType,
  PlusIcon,
  RoleIcon,
  TargetIcon,
  TopicsIcon,
  TrashIcon,
} from "@/components/app/ui/icons";
import { Button } from "@/components/app/ui/button";
import { Card } from "@/components/app/ui/card";
import { Chip } from "@/components/app/ui/chip";
import { Alert, EmptyState, Spinner } from "@/components/app/ui/feedback";
import { Field, Input, Textarea } from "@/components/app/ui/form";
import { Modal } from "@/components/app/ui/modal";
import { PageHeader } from "@/components/app/ui/page-header";
import { SearchInput } from "@/components/app/ui/search-input";
import { type Role, createRole, deleteRole, listRoles } from "@/lib/api";

const EMPTY_FORM = {
  role_name: "",
  description: "",
  focus_areas: "",
  typical_topics: "",
};

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error">("success");
  const [selected, setSelected] = useState<Role | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  const load = () => {
    setLoading(true);
    listRoles()
      .then(setRoles)
      .catch((e) => {
        setMsg(String(e));
        setMsgType("error");
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg("");
    try {
      await createRole(form);
      setForm(EMPTY_FORM);
      setIsFormOpen(false);
      setMsg("Role profile created.");
      setMsgType("success");
      load();
    } catch (err) {
      setMsg(String(err));
      setMsgType("error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (role: Role) => {
    try {
      await deleteRole(role.role_name);
      setSelected(null);
      load();
    } catch (err) {
      setMsg(String(err));
      setMsgType("error");
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter(
      (r) =>
        r.role_name.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.focus_areas?.toLowerCase().includes(q) ||
        r.typical_topics?.toLowerCase().includes(q),
    );
  }, [roles, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles"
        description="Define the roles you're targeting so Bodhi can tailor questions, feedback, and prep."
        actions={
          <Button onClick={() => setIsFormOpen(true)}>
            <PlusIcon size={16} />
            New role
          </Button>
        }
      />

      {msg && <Alert type={msgType}>{msg}</Alert>}

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search roles, focus areas, or topics…"
      />

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={RoleIcon}
          title={search ? "No roles found" : "No roles yet"}
          description={
            search
              ? "Try a different search term."
              : "Add your first target role to customize your interviews."
          }
          action={
            !search && (
              <Button onClick={() => setIsFormOpen(true)}>
                <PlusIcon size={16} />
                New role
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((role) => {
            const topics = role.typical_topics
              ? role.typical_topics.split(",").map((t) => t.trim()).filter(Boolean)
              : [];
            return (
              <Card
                key={role.id}
                interactive
                onClick={() => setSelected(role)}
                className="p-5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#1a1a1a] text-white">
                    <RoleIcon size={18} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-[15px] font-semibold text-[#1a1a1a]">
                      {role.role_name}
                    </h3>
                    {role.focus_areas && (
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-500">
                        <TargetIcon size={12} />
                        <span className="truncate">{role.focus_areas}</span>
                      </div>
                    )}
                  </div>
                </div>

                {topics.length > 0 && (
                  <div className="mt-4 flex flex-wrap items-center gap-1.5">
                    {topics.slice(0, 3).map((topic, i) => (
                      <Chip key={i}>{topic}</Chip>
                    ))}
                    {topics.length > 3 && <Chip>+{topics.length - 3}</Chip>}
                  </div>
                )}

                {role.description && (
                  <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-neutral-500">
                    {role.description}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Add role profile"
        description="Create a role profile to customize your interview preparation."
        footer={
          <div className="flex justify-end gap-2.5">
            <Button variant="secondary" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="role-form" loading={submitting}>
              Save role
            </Button>
          </div>
        }
      >
        <form id="role-form" onSubmit={handleCreate} className="space-y-5">
          <Field label="Role name" required>
            <Input
              placeholder="e.g. Senior Software Engineer"
              required
              value={form.role_name}
              onChange={(e) => setForm({ ...form, role_name: e.target.value })}
            />
          </Field>

          <Field label="Description">
            <Textarea
              rows={3}
              placeholder="Brief description of the role and responsibilities…"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>

          <Field label="Focus areas">
            <Input
              placeholder="e.g. System Design, Data Structures, Algorithms"
              value={form.focus_areas}
              onChange={(e) => setForm({ ...form, focus_areas: e.target.value })}
            />
          </Field>

          <Field label="Typical topics" hint="Comma-separated">
            <Input
              placeholder="Microservices, REST APIs, Database Design"
              value={form.typical_topics}
              onChange={(e) =>
                setForm({ ...form, typical_topics: e.target.value })
              }
            />
          </Field>
        </form>
      </Modal>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.role_name}
        description={selected?.focus_areas || undefined}
        footer={
          selected && (
            <Button
              variant="danger"
              fullWidth
              onClick={() => handleDelete(selected)}
            >
              <TrashIcon size={16} />
              Delete role profile
            </Button>
          )
        }
      >
        {selected && <RoleDetailBody role={selected} />}
      </Modal>
    </div>
  );
}

function DetailSection({
  icon: Icon,
  title,
  children,
}: {
  icon: IconType;
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Icon size={15} className="text-neutral-400" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function RoleDetailBody({ role }: { role: Role }) {
  const topics = role.typical_topics
    ? role.typical_topics.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  if (!role.description && topics.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        No additional details for this role yet.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {role.description && (
        <DetailSection icon={TargetIcon} title="Description">
          <p className="text-sm leading-relaxed text-neutral-600">
            {role.description}
          </p>
        </DetailSection>
      )}

      {topics.length > 0 && (
        <DetailSection icon={TopicsIcon} title="Typical topics">
          <div className="flex flex-wrap gap-1.5">
            {topics.map((topic, i) => (
              <Chip key={i}>{topic}</Chip>
            ))}
          </div>
        </DetailSection>
      )}
    </div>
  );
}
