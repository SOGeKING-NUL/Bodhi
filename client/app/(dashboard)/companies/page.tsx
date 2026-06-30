"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CompanyIcon,
  PlusIcon,
  RoleIcon,
  TrashIcon,
} from "@/components/app/ui/icons";
import { Button } from "@/components/app/ui/button";
import { Card } from "@/components/app/ui/card";
import { Chip } from "@/components/app/ui/chip";
import { Alert, EmptyState, Spinner } from "@/components/app/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/app/ui/form";
import { Modal } from "@/components/app/ui/modal";
import { PageHeader } from "@/components/app/ui/page-header";
import { SearchInput } from "@/components/app/ui/search-input";
import { CompanyDetailBody } from "@/components/companies/CompanyDetail";
import {
  type CompanyProfile,
  createCompany,
  deleteCompany,
  listCompanies,
} from "@/lib/api";

const EMPTY_FORM = {
  company_name: "",
  role: "general",
  experience_level: "Mid-Level",
  description: "",
  hiring_patterns: "",
  tech_stack: "",
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error">("success");
  const [selected, setSelected] = useState<CompanyProfile | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  const load = () => {
    setLoading(true);
    listCompanies()
      .then(setCompanies)
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
      await createCompany(form);
      setForm(EMPTY_FORM);
      setIsFormOpen(false);
      setMsg("Company profile created.");
      setMsgType("success");
      load();
    } catch (err) {
      setMsg(String(err));
      setMsgType("error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (company: CompanyProfile) => {
    try {
      await deleteCompany(
        company.company_name,
        company.role,
        company.experience_level,
      );
      setSelected(null);
      load();
    } catch (err) {
      setMsg(String(err));
      setMsgType("error");
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter(
      (c) =>
        c.company_name.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q) ||
        c.tech_stack?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q),
    );
  }, [companies, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Companies"
        description="Build target-company profiles so interviews match their culture, tech stack, and hiring patterns."
        actions={
          <Button onClick={() => setIsFormOpen(true)}>
            <PlusIcon size={16} />
            New company
          </Button>
        }
      />

      {msg && <Alert type={msgType}>{msg}</Alert>}

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search companies, roles, or tech stack…"
      />

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CompanyIcon}
          title={search ? "No companies found" : "No companies yet"}
          description={
            search
              ? "Try a different search term."
              : "Add your first target company to tailor your interviews."
          }
          action={
            !search && (
              <Button onClick={() => setIsFormOpen(true)}>
                <PlusIcon size={16} />
                New company
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((company) => {
            const techs = company.tech_stack
              ? company.tech_stack.split(",").map((t) => t.trim()).filter(Boolean)
              : [];
            return (
              <Card
                key={`${company.company_name}-${company.role}-${company.experience_level}`}
                interactive
                onClick={() => setSelected(company)}
                className="p-5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#1a1a1a] text-base font-semibold text-white">
                    {company.company_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-[15px] font-semibold text-[#1a1a1a]">
                      {company.company_name}
                    </h3>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-500">
                      <RoleIcon size={12} />
                      <span className="truncate">{company.role}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  <Chip>{company.experience_level}</Chip>
                  {techs.slice(0, 3).map((tech, i) => (
                    <Chip key={i}>{tech}</Chip>
                  ))}
                  {techs.length > 3 && <Chip>+{techs.length - 3}</Chip>}
                </div>

                {company.description && (
                  <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-neutral-500">
                    {company.description}
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
        title="Add company profile"
        description="Create a company profile to tailor your interview preparation."
        footer={
          <div className="flex justify-end gap-2.5">
            <Button variant="secondary" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="company-form" loading={submitting}>
              Save company
            </Button>
          </div>
        }
      >
        <form id="company-form" onSubmit={handleCreate} className="space-y-5">
          <Field label="Company name" required>
            <Input
              placeholder="e.g. Google, Stripe, Startup Inc."
              required
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
            />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Role">
              <Input
                placeholder="e.g. Backend Engineer"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              />
            </Field>
            <Field label="Experience level" required>
              <Select
                required
                value={form.experience_level}
                onChange={(e) =>
                  setForm({ ...form, experience_level: e.target.value })
                }
              >
                <option value="Intern">Intern</option>
                <option value="Junior">Junior</option>
                <option value="Mid-Level">Mid-Level</option>
                <option value="Senior">Senior</option>
              </Select>
            </Field>
          </div>

          <Field label="Description">
            <Textarea
              rows={3}
              placeholder="Brief description of the company…"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>

          <Field label="Hiring patterns">
            <Textarea
              rows={3}
              placeholder="What they look for in candidates…"
              value={form.hiring_patterns}
              onChange={(e) =>
                setForm({ ...form, hiring_patterns: e.target.value })
              }
            />
          </Field>

          <Field label="Tech stack" hint="Comma-separated">
            <Input
              placeholder="React, Python, AWS, PostgreSQL"
              value={form.tech_stack}
              onChange={(e) => setForm({ ...form, tech_stack: e.target.value })}
            />
          </Field>
        </form>
      </Modal>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.company_name}
        description={
          selected ? `${selected.role} · ${selected.experience_level}` : undefined
        }
        footer={
          selected && (
            <Button
              variant="danger"
              fullWidth
              onClick={() => handleDelete(selected)}
            >
              <TrashIcon size={16} />
              Delete company profile
            </Button>
          )
        }
      >
        {selected && <CompanyDetailBody company={selected} />}
      </Modal>
    </div>
  );
}
