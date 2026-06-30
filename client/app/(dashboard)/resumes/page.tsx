"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowRightIcon, ResumeIcon } from "@/components/app/ui/icons";
import { Button } from "@/components/app/ui/button";
import { Card } from "@/components/app/ui/card";
import { Chip } from "@/components/app/ui/chip";
import { Alert, Spinner } from "@/components/app/ui/feedback";
import { PageHeader } from "@/components/app/ui/page-header";
import {
  type CandidateProfile,
  getCurrentUserStatus,
  getResumeProfile,
  uploadResume,
} from "@/lib/api";

export default function ResumesPage() {
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadExisting = async () => {
      try {
        const status = await getCurrentUserStatus();
        if (status.has_resume && status.user_id) {
          setUserId(status.user_id);
          setProfile(await getResumeProfile(status.user_id));
        }
      } catch (err) {
        console.error("Failed to load existing resume:", err);
      } finally {
        setLoading(false);
      }
    };
    void loadExisting();
  }, []);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const fileInput = formEl.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      setError("Please select a PDF or DOCX file.");
      return;
    }

    setUploading(true);
    setError("");
    try {
      const res = await uploadResume(file);
      setProfile(res.profile);
      setUserId(res.user_id);
      formEl.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload resume.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resume"
        description="Upload your resume to power resume-based and job-description-targeted interviews."
      />

      {error && <Alert type="error">{error}</Alert>}

      {loading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <Card className="p-6 lg:col-span-2 lg:self-start">
            <h2 className="text-base font-semibold text-[#1a1a1a]">
              {profile ? "Upload new resume" : "Upload resume"}
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              PDF or DOCX. We parse it into a structured profile.
            </p>

            <form onSubmit={handleUpload} className="mt-5 space-y-4">
              <input
                type="file"
                name="file"
                accept=".pdf,.docx"
                disabled={uploading}
                className="w-full cursor-pointer rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-600 transition-colors file:mr-3 file:rounded-md file:border-0 file:bg-[#1a1a1a] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-black focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-black/[0.06] disabled:opacity-50"
              />
              <Button type="submit" fullWidth loading={uploading}>
                {uploading ? "Uploading & parsing…" : "Upload resume"}
              </Button>
            </form>

            {userId && (
              <Link
                href={`/interview?mode=option_a&user_id=${userId}`}
                className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-[#1a1a1a] transition-colors hover:bg-neutral-50"
              >
                Start resume-based interview
                <ArrowRightIcon size={15} />
              </Link>
            )}
          </Card>

          <div className="lg:col-span-3">
            {profile ? (
              <ResumeProfileView profile={profile} />
            ) : (
              <Card className="flex h-full flex-col items-center justify-center p-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
                  <ResumeIcon size={22} />
                </div>
                <h3 className="mt-4 text-base font-semibold text-[#1a1a1a]">
                  No resume yet
                </h3>
                <p className="mt-1 max-w-xs text-sm text-neutral-500">
                  Upload a resume to see your parsed profile here.
                </p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
        {title}
      </h4>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function ResumeProfileView({ profile }: { profile: CandidateProfile }) {
  return (
    <Card className="space-y-6 p-6">
      <div>
        <h2 className="text-lg font-semibold text-[#1a1a1a]">
          {profile.name || "Parsed profile"}
        </h2>
        {profile.email && (
          <p className="mt-0.5 text-sm text-neutral-500">{profile.email}</p>
        )}
      </div>

      {profile.summary && (
        <Section title="Summary">
          <p className="text-sm leading-relaxed text-neutral-600">
            {profile.summary}
          </p>
        </Section>
      )}

      {profile.skills && profile.skills.length > 0 && (
        <Section title="Skills">
          <div className="flex flex-wrap gap-1.5">
            {profile.skills.map((skill, i) => (
              <Chip key={i}>{skill}</Chip>
            ))}
          </div>
        </Section>
      )}

      {profile.experience && profile.experience.length > 0 && (
        <Section title="Experience">
          <div className="space-y-3">
            {profile.experience.map((exp, i) => (
              <div
                key={i}
                className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-4"
              >
                <p className="text-sm font-semibold text-[#1a1a1a]">{exp.title}</p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {exp.company}
                  {exp.duration ? ` · ${exp.duration}` : ""}
                </p>
                {exp.description && (
                  <p className="mt-2 text-[13px] leading-relaxed text-neutral-600">
                    {exp.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {profile.education && profile.education.length > 0 && (
        <Section title="Education">
          <div className="space-y-2">
            {profile.education.map((edu, i) => (
              <div key={i}>
                <p className="text-sm font-semibold text-[#1a1a1a]">{edu.degree}</p>
                <p className="text-xs text-neutral-500">
                  {edu.institution}
                  {edu.year ? ` · ${edu.year}` : ""}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {profile.projects && profile.projects.length > 0 && (
        <Section title="Projects">
          <div className="space-y-3">
            {profile.projects.map((project, i) => (
              <div
                key={i}
                className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-4"
              >
                <p className="text-sm font-semibold text-[#1a1a1a]">
                  {project.name}
                </p>
                {project.description && (
                  <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-600">
                    {project.description}
                  </p>
                )}
                {project.technologies && project.technologies.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {project.technologies.map((tech, j) => (
                      <Chip key={j}>{tech}</Chip>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}
    </Card>
  );
}
