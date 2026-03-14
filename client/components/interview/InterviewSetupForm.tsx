"use client"

import { useState } from "react"
import { FormInput } from "@/components/ui/form-input"
import { PrimaryButton } from "@/components/ui/primary-button"
import { type CandidateProfile, uploadResume } from "@/lib/api"

interface InterviewSetupFormProps {
  onSubmit: (formData: InterviewFormData) => void
  loading?: boolean
}

export interface InterviewFormData {
  candidate_name: string
  company: string
  role: string
  mode: "standard" | "option_a" | "option_b"
  user_id: string
  jd_text: string
}

export function InterviewSetupForm({ onSubmit, loading }: InterviewSetupFormProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [uploadedProfile, setUploadedProfile] = useState<CandidateProfile | null>(null)
  
  const [form, setForm] = useState<InterviewFormData>({
    candidate_name: "",
    company: "",
    role: "Software Engineer",
    mode: "standard",
    user_id: "",
    jd_text: "",
  })

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploading(true)
    setError("")
    
    try {
      const result = await uploadResume(file)
      setUploadedProfile(result.profile)
      setForm((prev) => ({
        ...prev,
        user_id: result.user_id,
        candidate_name: result.profile.name || prev.candidate_name,
      }))
    } catch (err) {
      setError(String(err))
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      {error && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 animate-fade-in-up shadow-[0px_4px_12px_rgba(239,68,68,0.08)]">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 3v3m0 2v.5" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-red-800 mb-1">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <label className="block text-sm font-semibold text-[#2F3037] font-sans">
          Interview Mode
        </label>
        <select
          value={form.mode}
          onChange={(e) => {
            setForm({
              ...form,
              mode: e.target.value as "standard" | "option_a" | "option_b",
            })
            setUploadedProfile(null)
            setError("")
          }}
          className="w-full px-4 py-3.5 rounded-xl border-2 border-[rgba(55,50,47,0.12)] bg-white text-[#2F3037] focus:outline-none focus:ring-4 focus:ring-[#37322F]/10 focus:border-[#37322F] transition-all font-sans text-[15px] cursor-pointer hover:border-[rgba(55,50,47,0.2)] shadow-[0px_2px_8px_rgba(55,50,47,0.04)]"
        >
          <option value="standard">Standard (Company-based)</option>
          <option value="option_a">Resume-Based</option>
          <option value="option_b">JD-Targeted</option>
        </select>
        <p className="text-xs text-[rgba(55,50,47,0.5)] leading-relaxed">
          Choose how you want to conduct your mock interview
        </p>
      </div>

      {form.mode !== "standard" && !form.user_id && (
        <div className="space-y-3 animate-fade-in-up">
          <label className="block text-sm font-semibold text-[#2F3037] font-sans">
            Upload Resume <span className="text-[rgba(55,50,47,0.45)] font-normal text-xs">(PDF or DOCX)</span>
          </label>
          <input
            type="file"
            accept=".pdf,.docx"
            onChange={handleResumeUpload}
            disabled={uploading}
            className="w-full rounded-xl border-2 border-[rgba(55,50,47,0.12)] bg-white px-4 py-3.5 text-sm text-[#2F3037]
              file:mr-4 file:py-2 file:px-5 file:rounded-full file:border-0
              file:bg-gradient-to-r file:from-[#37322F] file:to-[#2A2624] file:text-white file:text-xs file:font-semibold
              hover:file:from-[#2A2624] hover:file:to-[#1F1C1A] hover:file:shadow-lg
              focus:outline-none focus:ring-4 focus:ring-[#37322F]/10 focus:border-[#37322F]
              hover:border-[rgba(55,50,47,0.2)] shadow-[0px_2px_8px_rgba(55,50,47,0.04)]
              disabled:opacity-50 transition-all cursor-pointer"
          />
          {uploading && (
            <p className="text-sm text-[rgba(55,50,47,0.6)] flex items-center gap-2.5 font-sans">
              <span className="w-4 h-4 border-2 border-[rgba(55,50,47,0.3)] border-t-[#37322F] rounded-full animate-spin" />
              Uploading and parsing resume...
            </p>
          )}
          {!uploading && (
            <p className="text-xs text-[rgba(55,50,47,0.5)] leading-relaxed">
              Upload your resume to enable resume-based or JD-targeted interviews
            </p>
          )}
        </div>
      )}

      {form.mode !== "standard" && uploadedProfile && (
        <div className="rounded-xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-6 space-y-4 animate-fade-in-up shadow-[0px_4px_16px_rgba(34,197,94,0.08)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shrink-0 shadow-lg">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8L7 12L13 5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-green-800 font-sans">Resume Uploaded Successfully</p>
                <p className="text-xs text-green-600 mt-0.5">Ready to start your interview</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setUploadedProfile(null)
                setForm((p) => ({ ...p, user_id: "" }))
              }}
              className="px-3 py-1.5 text-xs text-green-700 hover:text-green-900 hover:bg-green-100 rounded-lg transition-all font-semibold"
            >
              Change
            </button>
          </div>
          
          <div className="pt-3 border-t border-green-200">
            <div className="space-y-2.5">
              <div>
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-1">Candidate</p>
                <p className="font-semibold text-[#2F3037] text-base">{uploadedProfile.name}</p>
                {uploadedProfile.email && (
                  <p className="text-[rgba(55,50,47,0.6)] text-sm mt-0.5">{uploadedProfile.email}</p>
                )}
              </div>
              
              {uploadedProfile.skills.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-2">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {uploadedProfile.skills.slice(0, 6).map((s, i) => (
                      <span
                        key={i}
                        className="rounded-lg bg-white border border-green-200 px-3 py-1.5 text-xs font-medium text-[#2F3037] shadow-sm"
                      >
                        {s}
                      </span>
                    ))}
                    {uploadedProfile.skills.length > 6 && (
                      <span className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">
                        +{uploadedProfile.skills.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <label className="block text-sm font-semibold text-[#2F3037] font-sans">
          Your Name <span className="text-red-500">*</span>
        </label>
        <FormInput
          placeholder="Enter your full name"
          required
          value={form.candidate_name}
          onChange={(e) => setForm({ ...form, candidate_name: e.target.value })}
        />
      </div>

      {form.mode === "standard" && (
        <>
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-[#2F3037] font-sans">
              Company <span className="text-red-500">*</span>
            </label>
            <FormInput
              placeholder="e.g. Google, Microsoft, Amazon"
              required
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            />
          </div>
          
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-[#2F3037] font-sans">
              Role <span className="text-red-500">*</span>
            </label>
            <FormInput
              placeholder="e.g. Software Engineer, Product Manager"
              required
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            />
          </div>
        </>
      )}

      {form.mode === "option_b" && (
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-[#2F3037] font-sans">
            Job Description <span className="text-red-500">*</span>
          </label>
          <textarea
            placeholder="Paste the full job description here..."
            value={form.jd_text}
            onChange={(e) => setForm({ ...form, jd_text: e.target.value })}
            className="w-full min-h-44 px-4 py-3.5 rounded-xl border-2 border-[rgba(55,50,47,0.12)] bg-white text-[#2F3037] placeholder:text-[rgba(55,50,47,0.35)] focus:outline-none focus:ring-4 focus:ring-[#37322F]/10 focus:border-[#37322F] hover:border-[rgba(55,50,47,0.2)] shadow-[0px_2px_8px_rgba(55,50,47,0.04)] transition-all font-sans text-[15px] resize-y leading-relaxed"
            required
          />
          <p className="text-xs text-[rgba(55,50,47,0.5)] leading-relaxed">
            Include role requirements, responsibilities, and qualifications
          </p>
        </div>
      )}

      <div className="pt-4">
        <PrimaryButton type="submit" fullWidth loading={loading}>
          {loading ? "Starting Interview..." : "Continue →"}
        </PrimaryButton>
      </div>
    </form>
  )
}
