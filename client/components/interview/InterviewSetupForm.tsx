"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import {
  CheckIcon,
  CompanyIcon,
  type IconType,
  PlusIcon,
  ResumeIcon,
} from "@/components/app/ui/icons";
import { Button } from "@/components/app/ui/button";
import { Chip } from "@/components/app/ui/chip";
import { Field, Input, Label, Select, Textarea } from "@/components/app/ui/form";
import { cn } from "@/lib/utils";
import {
  type CandidateProfile,
  type CompanyProfile,
  uploadResume,
} from "@/lib/api";

interface InterviewSetupFormProps {
  onSubmit: (formData: InterviewFormData) => void;
  loading?: boolean;
}

export interface InterviewFormData {
  candidate_name: string;
  company: string;
  role: string;
  experience_level: string;
  mode: "standard" | "option_a" | "option_b";
  user_id: string;
  jd_text: string;
  interviewer_persona: "bodhi" | "riya";
}

interface RawProfile {
  full_name?: string;
  name?: string;
  contact?: { email?: string | null; phone?: string | null };
  email?: string | null;
  phone?: string | null;
  professional_summary?: string | RawProfile;
  summary?: string | null;
  technical_skills?: string[];
  skills?: string[];
  work_experience?: CandidateProfile["experience"];
  experience?: CandidateProfile["experience"];
  education?: CandidateProfile["education"];
  projects?: CandidateProfile["projects"];
}

function normalizeProfile(raw: unknown): CandidateProfile {
  const root = (raw ?? {}) as RawProfile;
  const ps = (root.professional_summary ?? root) as RawProfile;
  const psSummary =
    typeof ps.professional_summary === "string" ? ps.professional_summary : "";
  return {
    name: ps.full_name || ps.name || "",
    email: ps.contact?.email ?? ps.email ?? null,
    phone: ps.contact?.phone ?? ps.phone ?? null,
    summary: psSummary || ps.summary || null,
    skills: ps.technical_skills || ps.skills || [],
    experience: ps.work_experience || ps.experience || [],
    education: ps.education || [],
    projects: ps.projects || [],
  };
}

function OptionCard({
  active,
  icon: Icon,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  icon: IconType;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border p-5 text-center transition-all",
        active
          ? "border-[#1a1a1a] bg-[#1a1a1a] text-white shadow-[0_8px_20px_-6px_rgba(26,26,26,0.35)]"
          : "border-bodhi-line bg-bodhi-surface text-[#1a1a1a] shadow-[0_1px_2px_rgba(55,50,47,0.03)] hover:border-neutral-300 hover:shadow-[0_4px_16px_-4px_rgba(55,50,47,0.12)]",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full",
          active ? "bg-white/15" : "bg-neutral-100",
        )}
      >
        <Icon size={18} className={active ? "text-white" : "text-neutral-500"} />
      </div>
      <span className="text-sm font-semibold">{title}</span>
      <span className={cn("text-[11px]", active ? "text-white/70" : "text-neutral-500")}>
        {subtitle}
      </span>
    </button>
  );
}

function PersonaCard({
  active,
  initial,
  name,
  tagline,
  onClick,
}: {
  active: boolean;
  initial: string;
  name: string;
  tagline: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border p-5 text-center transition-all",
        active
          ? "border-[#1a1a1a] bg-[#1a1a1a] text-white shadow-[0_8px_20px_-6px_rgba(26,26,26,0.35)]"
          : "border-bodhi-line bg-bodhi-surface text-[#1a1a1a] shadow-[0_1px_2px_rgba(55,50,47,0.03)] hover:border-neutral-300 hover:shadow-[0_4px_16px_-4px_rgba(55,50,47,0.12)]",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold",
          active ? "bg-white/15 text-white" : "bg-neutral-100 text-neutral-600",
        )}
      >
        {initial}
      </div>
      <span className="text-sm font-semibold">{name}</span>
      <span className={cn("text-[11px]", active ? "text-white/70" : "text-neutral-500")}>
        {tagline}
      </span>
    </button>
  );
}

function ResumeSummary({
  profile,
  onChange,
}: {
  profile: CandidateProfile;
  onChange?: () => void;
}) {
  return (
    <div className="rounded-lg border border-bodhi-line bg-bodhi-bg/60 p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium text-[#1a1a1a]">
          <CheckIcon size={15} className="text-emerald-600" />
          Resume ready
        </p>
        {onChange && (
          <button
            type="button"
            onClick={onChange}
            className="text-xs text-neutral-500 transition-colors hover:text-[#1a1a1a]"
          >
            Change
          </button>
        )}
      </div>
      <p className="mt-1.5 text-sm text-[#1a1a1a]">{profile.name}</p>
      {profile.email && <p className="text-xs text-neutral-500">{profile.email}</p>}
      {profile.skills && profile.skills.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {profile.skills.slice(0, 5).map((s, i) => (
            <Chip key={i}>{s}</Chip>
          ))}
          {profile.skills.length > 5 && (
            <span className="text-xs text-neutral-400">+{profile.skills.length - 5}</span>
          )}
        </div>
      )}
    </div>
  );
}

export function InterviewSetupForm({ onSubmit, loading }: InterviewSetupFormProps) {
  const { user } = useUser();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [uploadedProfile, setUploadedProfile] = useState<CandidateProfile | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(false);
  const [selectedMode, setSelectedMode] = useState<"company" | "resume">("company");
  const [showJdField, setShowJdField] = useState(false);
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);

  const [form, setForm] = useState<InterviewFormData>({
    candidate_name: "",
    company: "",
    role: "Software Engineer",
    experience_level: "Mid-Level",
    mode: "standard",
    user_id: "",
    jd_text: "",
    interviewer_persona: "bodhi",
  });

  useEffect(() => {
    import("@/lib/api").then((api) => {
      api.listCompanies().then(setCompanies).catch(console.error);
    });
  }, []);

  useEffect(() => {
    const loadExistingResume = async () => {
      try {
        const { getAuthHeaders, getResumeProfile } = await import("@/lib/api");
        const res = await fetch("/api/users/me/status", { headers: await getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        if (data.has_resume && data.user_id) {
          const profile = normalizeProfile(await getResumeProfile(data.user_id));
          setUploadedProfile(profile);
          setForm((prev) => ({
            ...prev,
            user_id: data.user_id,
            candidate_name: profile.name || prev.candidate_name,
          }));
        }
      } catch (err) {
        console.log("No existing resume to preload:", err);
      }
    };
    loadExistingResume();
  }, []);

  useEffect(() => {
    const loadUserName = async () => {
      try {
        const { getAuthHeaders } = await import("@/lib/api");
        const response = await fetch("/api/users/me/profile", {
          headers: await getAuthHeaders(),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.full_name) {
            setForm((prev) => ({ ...prev, candidate_name: data.full_name }));
            return;
          }
        }
      } catch (err) {
        console.log("Could not load user name:", err);
      }
      if (user?.fullName) {
        setForm((prev) => ({ ...prev, candidate_name: user.fullName || "" }));
      }
    };
    loadUserName();
  }, [user]);

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const result = await uploadResume(file);
      const profile = normalizeProfile(result.profile);
      setUploadedProfile(profile);
      setForm((prev) => ({
        ...prev,
        user_id: result.user_id,
        candidate_name: profile.name || prev.candidate_name,
      }));
    } catch (err) {
      setError(String(err));
    } finally {
      setUploading(false);
    }
  };

  const checkExistingProfile = async () => {
    setCheckingProfile(true);
    setError("");
    try {
      const { getAuthHeaders, getResumeProfile } = await import("@/lib/api");
      const response = await fetch("/api/users/me/status", {
        headers: await getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.has_resume && data.user_id) {
          const profile = normalizeProfile(await getResumeProfile(data.user_id));
          setUploadedProfile(profile);
          setForm((prev) => ({
            ...prev,
            user_id: data.user_id,
            candidate_name: profile.name || prev.candidate_name,
          }));
        }
      }
    } catch (err) {
      console.log("No existing profile found:", err);
    } finally {
      setCheckingProfile(false);
    }
  };

  const handleModeSwitch = (mode: "company" | "resume") => {
    setSelectedMode(mode);
    setUploadedProfile(null);
    setError("");
    setShowJdField(false);
    if (mode === "company") {
      setForm((prev) => ({ ...prev, mode: "standard", user_id: "", jd_text: "" }));
    } else {
      setForm((prev) => ({
        ...prev,
        mode: "option_a",
        company: "",
        role: "Software Engineer",
        jd_text: "",
      }));
      checkExistingProfile();
    }
  };

  const handleShowJdField = () => {
    setShowJdField(true);
    const checkResumeForJD = async () => {
      try {
        const { getAuthHeaders, getResumeProfile } = await import("@/lib/api");
        const response = await fetch("/api/users/me/status", {
          headers: await getAuthHeaders(),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.has_resume && data.user_id) {
            const profile = normalizeProfile(await getResumeProfile(data.user_id));
            setForm((prev) => ({
              ...prev,
              mode: "option_b",
              user_id: data.user_id,
              candidate_name: profile.name || prev.candidate_name,
            }));
            setUploadedProfile(profile);
          }
        }
      } catch (err) {
        console.log("No existing profile found for JD mode:", err);
      }
    };
    checkResumeForJD();
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(form);
  };

  const companyNames = Array.from(new Set(companies.map((c) => c.company_name)));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label>Interview mode</Label>
        <div className="grid grid-cols-2 gap-3">
          <OptionCard
            active={selectedMode === "company"}
            icon={CompanyIcon}
            title="Company based"
            subtitle="Target a specific company"
            onClick={() => handleModeSwitch("company")}
          />
          <OptionCard
            active={selectedMode === "resume"}
            icon={ResumeIcon}
            title="Resume based"
            subtitle="Based on your resume"
            onClick={() => handleModeSwitch("resume")}
          />
        </div>
      </div>

      {selectedMode === "resume" && !form.user_id && !checkingProfile && (
        <Field label="Upload resume" hint="PDF or DOCX">
          <input
            type="file"
            accept=".pdf,.docx"
            onChange={handleResumeUpload}
            disabled={uploading}
            className="w-full cursor-pointer rounded-lg border border-bodhi-line bg-bodhi-surface px-3.5 py-3 text-sm text-neutral-600 shadow-[inset_0_1px_2px_rgba(55,50,47,0.03)] file:mr-3 file:rounded-md file:border-0 file:bg-[#1a1a1a] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-black focus:border-neutral-400 focus:outline-none focus:ring-4 focus:ring-black/[0.06] disabled:opacity-50"
          />
          {uploading && (
            <p className="flex items-center gap-2 text-xs text-neutral-500">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600" />
              Uploading and parsing resume…
            </p>
          )}
        </Field>
      )}

      {checkingProfile && (
        <p className="flex items-center gap-2 text-sm text-neutral-500">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600" />
          Checking for an existing resume…
        </p>
      )}

      {selectedMode === "resume" && uploadedProfile && (
        <ResumeSummary
          profile={uploadedProfile}
          onChange={() => {
            setUploadedProfile(null);
            setForm((p) => ({ ...p, user_id: "" }));
          }}
        />
      )}

      <Field label="Your name" required>
        <Input
          placeholder="Jane Doe"
          required
          value={form.candidate_name}
          onChange={(e) => setForm({ ...form, candidate_name: e.target.value })}
        />
      </Field>

      {selectedMode === "company" && (
        <>
          <Field label="Company" required hint={companyNames.length === 0 ? "No companies yet — add one in the Companies tab." : undefined}>
            <Select
              required
              value={form.company}
              onChange={(e) => {
                const selected = e.target.value;
                setForm((prev) => {
                  const next = { ...prev, company: selected };
                  const comp = companies.find((c) => c.company_name === selected);
                  if (comp) {
                    next.role = comp.role;
                    if (comp.experience_level) next.experience_level = comp.experience_level;
                  }
                  return next;
                });
              }}
            >
              <option value="" disabled>
                Select a company
              </option>
              {companyNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Role" required>
            <Input
              placeholder="Software Engineer"
              required
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            />
          </Field>

          <Field label="Experience level" required>
            <Select
              required
              value={form.experience_level}
              onChange={(e) => setForm({ ...form, experience_level: e.target.value })}
            >
              <option value="Intern">Intern</option>
              <option value="Junior">Junior</option>
              <option value="Mid-Level">Mid-Level</option>
              <option value="Senior">Senior</option>
            </Select>
          </Field>

          {!showJdField ? (
            <button
              type="button"
              onClick={handleShowJdField}
              className="flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition-colors hover:text-[#1a1a1a]"
            >
              <PlusIcon size={15} />
              Add job description (optional)
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Job description</Label>
                <button
                  type="button"
                  onClick={() => {
                    setShowJdField(false);
                    setForm((prev) => ({ ...prev, jd_text: "", mode: "standard", user_id: "" }));
                    setUploadedProfile(null);
                  }}
                  className="text-xs text-neutral-500 transition-colors hover:text-[#1a1a1a]"
                >
                  Remove
                </button>
              </div>
              {uploadedProfile && (
                <p className="rounded-lg border border-bodhi-line bg-bodhi-bg/60 px-3 py-2 text-xs text-neutral-600">
                  Using your resume profile ({uploadedProfile.name} ·{" "}
                  {uploadedProfile.skills?.length || 0} skills) for a JD-targeted interview.
                </p>
              )}
              <Textarea
                rows={4}
                placeholder="Paste the job description to tailor your questions…"
                value={form.jd_text}
                onChange={(e) => setForm({ ...form, jd_text: e.target.value })}
              />
            </div>
          )}
        </>
      )}

      {selectedMode === "resume" && (
        <>
          <Field label="Experience level" required>
            <Select
              required
              value={form.experience_level}
              onChange={(e) => setForm({ ...form, experience_level: e.target.value })}
            >
              <option value="Intern">Intern</option>
              <option value="Junior">Junior</option>
              <option value="Mid-Level">Mid-Level</option>
              <option value="Senior">Senior</option>
            </Select>
          </Field>

          <div className="space-y-2">
            <Label>
              Job description{" "}
              <span className="font-normal text-neutral-400">(optional)</span>
            </Label>
            <p className="text-xs text-neutral-500">
              When provided, the job description drives the questions — your resume is
              used as secondary context to tailor and probe them.
            </p>
            <Textarea
              rows={4}
              placeholder="Paste the job description to tailor your questions…"
              value={form.jd_text}
              onChange={(e) => {
                const jd = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  jd_text: jd,
                  // JD present → JD-primary gap-analysis interview (option_b);
                  // JD empty → fall back to pure resume-based (option_a).
                  mode: jd.trim() ? "option_b" : "option_a",
                }));
              }}
            />
          </div>
        </>
      )}

      <div className="space-y-2 border-t border-bodhi-line pt-6">
        <Label>Choose interviewer</Label>
        <div className="grid grid-cols-2 gap-3">
          <PersonaCard
            active={form.interviewer_persona === "bodhi"}
            initial="B"
            name="Bodhi"
            tagline="Tough but fair"
            onClick={() => setForm({ ...form, interviewer_persona: "bodhi" })}
          />
          <PersonaCard
            active={form.interviewer_persona === "riya"}
            initial="R"
            name="Riya"
            tagline="Supportive"
            onClick={() => setForm({ ...form, interviewer_persona: "riya" })}
          />
        </div>
      </div>

      <Button type="submit" fullWidth loading={loading}>
        Continue
      </Button>
    </form>
  );
}
