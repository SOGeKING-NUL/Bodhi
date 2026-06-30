"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  DownloadIcon,
  EditIcon,
  UploadIcon,
} from "@/components/app/ui/icons";
import { Button } from "@/components/app/ui/button";
import { Card } from "@/components/app/ui/card";
import { Chip } from "@/components/app/ui/chip";
import { Alert, Spinner } from "@/components/app/ui/feedback";
import { Input, Select } from "@/components/app/ui/form";
import { Modal } from "@/components/app/ui/modal";
import { PageHeader } from "@/components/app/ui/page-header";
import {
  type UserProfileResponse,
  downloadResumeBlob,
  getUserProfile,
  uploadResume,
} from "@/lib/api";

const EXPERIENCE_LEVELS = ["Intern", "Junior", "Mid-Level", "Senior"];

export default function ProfilePage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [downloading, setDownloading] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [editingExp, setEditingExp] = useState(false);
  const [newExp, setNewExp] = useState("");
  const [savingExp, setSavingExp] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      setProfile(await getUserProfile(token ?? undefined));
    } catch (err) {
      console.error("Failed to load profile:", err);
      setError("Failed to load your profile. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/");
      return;
    }
    if (isLoaded && isSignedIn) void loadProfile();
  }, [isLoaded, isSignedIn, loadProfile, router]);

  const updateField = async (
    path: string,
    body: Record<string, string>,
    onDone: () => void,
    setSaving: (v: boolean) => void,
  ) => {
    try {
      setSaving(true);
      setError("");
      const token = await getToken();
      const res = await fetch(path, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Update failed");
      await loadProfile();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const fileInput = formEl.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      setUploadError("Please select a file.");
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      const token = await getToken();
      await uploadResume(file, token ?? undefined);
      await loadProfile();
      setUploadOpen(false);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Failed to upload resume.",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const token = await getToken();
      const { blob, filename } = await downloadResumeBlob(token ?? undefined);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || "resume.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to download resume. It may not exist.");
    } finally {
      setDownloading(false);
    }
  };

  if (!isLoaded || loading) return <Spinner className="py-32" />;

  const displayName = profile?.full_name || user?.fullName || "Candidate";
  const email = user?.emailAddresses[0]?.emailAddress;
  const resume = profile?.resume_data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="Manage your account, resume, and review past interviews."
        actions={
          <Button variant="secondary" onClick={() => signOut(() => router.push("/"))}>
            Sign out
          </Button>
        }
      />

      {error && <Alert type="error">{error}</Alert>}

      <Card className="flex flex-col items-center gap-5 p-6 sm:flex-row sm:items-center">
        {user?.imageUrl ? (
          <Image
            unoptimized
            src={user.imageUrl}
            alt={displayName}
            width={64}
            height={64}
            className="h-16 w-16 rounded-full border border-neutral-200 object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-xl font-semibold uppercase text-neutral-500">
            {displayName.charAt(0)}
          </div>
        )}

        <div className="flex-1 text-center sm:text-left">
          {editingName ? (
            <div className="flex flex-col items-center gap-2 sm:flex-row">
              <Input
                value={newName}
                autoFocus
                placeholder="Your name"
                onChange={(e) => setNewName(e.target.value)}
                className="sm:max-w-xs"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  loading={savingName}
                  onClick={() =>
                    updateField(
                      "/api/users/me/name",
                      { full_name: newName.trim() },
                      () => setEditingName(false),
                      setSavingName,
                    )
                  }
                >
                  Save
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setEditingName(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <h2 className="text-xl font-semibold text-[#1a1a1a]">{displayName}</h2>
              <button
                type="button"
                title="Edit name"
                onClick={() => {
                  setNewName(profile?.full_name || user?.fullName || "");
                  setEditingName(true);
                }}
                className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
              >
                <EditIcon size={14} />
              </button>
            </div>
          )}

          {email && !editingName && (
            <p className="mt-0.5 text-sm text-neutral-500">{email}</p>
          )}

          <div className="mt-3 flex items-center justify-center gap-2 sm:justify-start">
            {editingExp ? (
              <>
                <Select
                  value={newExp}
                  onChange={(e) => setNewExp(e.target.value)}
                  className="max-w-[180px]"
                >
                  <option value="">Select level</option>
                  {EXPERIENCE_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </Select>
                <Button
                  size="sm"
                  loading={savingExp}
                  onClick={() =>
                    updateField(
                      "/api/users/me/experience",
                      { experience_level: newExp.trim() },
                      () => setEditingExp(false),
                      setSavingExp,
                    )
                  }
                >
                  Save
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setEditingExp(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Chip>{profile?.experience_level || "No level set"}</Chip>
                <button
                  type="button"
                  onClick={() => {
                    setNewExp(profile?.experience_level || "");
                    setEditingExp(true);
                  }}
                  className="text-xs font-medium text-neutral-500 underline underline-offset-2 transition-colors hover:text-[#1a1a1a]"
                >
                  Edit
                </button>
              </>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-[#1a1a1a]">Resume</h2>
          <div className="flex items-center gap-2">
            {profile?.resume_file_name && (
              <Button
                variant="secondary"
                size="sm"
                loading={downloading}
                onClick={handleDownload}
              >
                <DownloadIcon size={15} />
                Download
              </Button>
            )}
            <Button size="sm" onClick={() => setUploadOpen(true)}>
              <UploadIcon size={15} />
              {profile?.has_resume ? "Update" : "Upload"}
            </Button>
          </div>
        </div>

        {resume ? (
          <div className="mt-5 space-y-5">
            {resume.summary && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Summary
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                  {resume.summary}
                </p>
              </div>
            )}
            {resume.skills && resume.skills.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Skills
                </h4>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {resume.skills.map((skill, i) => (
                    <Chip key={i}>{skill}</Chip>
                  ))}
                </div>
              </div>
            )}
            {resume.projects && resume.projects.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Projects
                </h4>
                <ul className="mt-2 space-y-1.5">
                  {resume.projects.map((project, i) => (
                    <li key={i} className="text-[13px] leading-relaxed text-neutral-600">
                      <span className="font-semibold text-[#1a1a1a]">
                        {project.name}
                      </span>
                      {project.description ? ` — ${project.description}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-neutral-500">
            No resume uploaded yet. Upload one to personalize your interviews.
          </p>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-base font-semibold text-[#1a1a1a]">Interview history</h2>

        {!profile?.interview_history || profile.interview_history.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">
            You haven&apos;t completed any interviews yet.
          </p>
        ) : (
          <div className="mt-5 divide-y divide-neutral-100">
            {profile.interview_history.map((session) => (
              <div
                key={session.session_id}
                className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#1a1a1a]">
                    {session.target_role}
                    <span className="font-normal text-neutral-400"> at </span>
                    {session.target_company}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {new Date(session.started_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-4">
                  {session.overall_score !== null && session.overall_score > 0 ? (
                    <div className="text-right">
                      <span className="text-lg font-semibold text-[#1a1a1a]">
                        {Math.round(session.overall_score)}
                      </span>
                      <span className="text-xs text-neutral-400">/100</span>
                    </div>
                  ) : (
                    <Chip>Incomplete</Chip>
                  )}
                  <Link
                    href={`/report/${session.session_id}`}
                    className="flex items-center gap-1 text-sm font-medium text-[#1a1a1a] hover:underline"
                  >
                    Report
                    <ArrowRightIcon size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title={profile?.has_resume ? "Update resume" : "Upload resume"}
        description="PDF or DOCX. We parse it into a structured profile."
        footer={
          <div className="flex justify-end gap-2.5">
            <Button variant="secondary" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="resume-upload-form" loading={uploading}>
              Upload &amp; parse
            </Button>
          </div>
        }
      >
        <form id="resume-upload-form" onSubmit={handleUpload} className="space-y-4">
          {uploadError && <Alert type="error">{uploadError}</Alert>}
          <input
            type="file"
            name="file"
            accept=".pdf,.docx"
            disabled={uploading}
            className="w-full cursor-pointer rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-600 transition-colors file:mr-3 file:rounded-md file:border-0 file:bg-[#1a1a1a] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-black focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-black/[0.06] disabled:opacity-50"
          />
        </form>
      </Modal>
    </div>
  );
}
