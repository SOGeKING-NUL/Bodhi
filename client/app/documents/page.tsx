"use client";

import { useState } from "react";
import {
  type SearchResult,
  type TopicsResponse,
  ingestText,
  uploadFile,
  searchDocs,
  getTopics,
} from "@/lib/api";

export default function DocumentsPage() {
  const [msg, setMsg] = useState("");

  // Text ingest
  const [ingestForm, setIngestForm] = useState({
    company: "",
    role: "general",
    text: "",
    source_label: "",
  });

  // File upload
  const [uploadForm, setUploadForm] = useState({ company: "", role: "general" });
  const [file, setFile] = useState<File | null>(null);

  // Search
  const [searchForm, setSearchForm] = useState({ company: "", role: "general", query: "" });
  const [results, setResults] = useState<SearchResult[]>([]);

  // Topics
  const [topicForm, setTopicForm] = useState({ company: "", role: "general" });
  const [topics, setTopics] = useState<TopicsResponse | null>(null);

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    try {
      const r = await ingestText(ingestForm);
      setMsg(`Ingested ${r.chunks_ingested} chunk(s)`);
      setIngestForm({ ...ingestForm, text: "" });
    } catch (err) {
      setMsg(String(err));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    if (!file) return setMsg("Select a file first");
    try {
      const r = await uploadFile(uploadForm.company, uploadForm.role, file);
      setMsg(
        `Uploaded: ${r.chunks_ingested} chunk(s), ${r.topics_extracted.length} topic(s) extracted`
      );
      setFile(null);
    } catch (err) {
      setMsg(String(err));
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    try {
      const r = await searchDocs(searchForm);
      setResults(r);
    } catch (err) {
      setMsg(String(err));
    }
  };

  const handleTopics = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    try {
      const r = await getTopics(topicForm.company, topicForm.role);
      setTopics(r);
    } catch (err) {
      setMsg(String(err));
    }
  };

  const inputCls =
    "rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm w-full";
  const sectionCls =
    "rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 space-y-3";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Documents &amp; RAG</h1>

      {msg && (
        <div className="rounded border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm">
          {msg}
        </div>
      )}

      {/* Text ingest */}
      <form onSubmit={handleIngest} className={sectionCls}>
        <h2 className="text-lg font-semibold">Ingest Text</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            placeholder="Company *"
            required
            value={ingestForm.company}
            onChange={(e) => setIngestForm({ ...ingestForm, company: e.target.value })}
            className={inputCls}
          />
          <input
            placeholder="Role"
            value={ingestForm.role}
            onChange={(e) => setIngestForm({ ...ingestForm, role: e.target.value })}
            className={inputCls}
          />
          <input
            placeholder="Source label"
            value={ingestForm.source_label}
            onChange={(e) => setIngestForm({ ...ingestForm, source_label: e.target.value })}
            className={inputCls}
          />
        </div>
        <textarea
          placeholder="Paste document text here..."
          required
          rows={4}
          value={ingestForm.text}
          onChange={(e) => setIngestForm({ ...ingestForm, text: e.target.value })}
          className={inputCls}
        />
        <button
          type="submit"
          className="rounded border border-white px-4 py-2 text-sm font-medium text-white transition hover:bg-white hover:text-black"
        >
          Ingest
        </button>
      </form>

      {/* File upload */}
      <form onSubmit={handleUpload} className={sectionCls}>
        <h2 className="text-lg font-semibold">Upload File (PDF / DOCX / TXT)</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            placeholder="Company *"
            required
            value={uploadForm.company}
            onChange={(e) => setUploadForm({ ...uploadForm, company: e.target.value })}
            className={inputCls}
          />
          <input
            placeholder="Role"
            value={uploadForm.role}
            onChange={(e) => setUploadForm({ ...uploadForm, role: e.target.value })}
            className={inputCls}
          />
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className={inputCls}
          />
        </div>
        <button
          type="submit"
          className="rounded border border-white px-4 py-2 text-sm font-medium text-white transition hover:bg-white hover:text-black"
        >
          Upload &amp; Ingest
        </button>
      </form>

      {/* Topics */}
      <form onSubmit={handleTopics} className={sectionCls}>
        <h2 className="text-lg font-semibold">Cached Topics</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            placeholder="Company *"
            required
            value={topicForm.company}
            onChange={(e) => setTopicForm({ ...topicForm, company: e.target.value })}
            className={inputCls}
          />
          <input
            placeholder="Role"
            value={topicForm.role}
            onChange={(e) => setTopicForm({ ...topicForm, role: e.target.value })}
            className={inputCls}
          />
        </div>
        <button
          type="submit"
          className="rounded border border-white px-4 py-2 text-sm font-medium text-white transition hover:bg-white hover:text-black"
        >
          Fetch Topics
        </button>
        {topics && (
          <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-300">
            {topics.topics.length === 0 && <li className="text-zinc-500">No topics cached.</li>}
            {topics.topics.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        )}
      </form>

      {/* Search */}
      <form onSubmit={handleSearch} className={sectionCls}>
        <h2 className="text-lg font-semibold">Semantic Search</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            placeholder="Company *"
            required
            value={searchForm.company}
            onChange={(e) => setSearchForm({ ...searchForm, company: e.target.value })}
            className={inputCls}
          />
          <input
            placeholder="Role"
            value={searchForm.role}
            onChange={(e) => setSearchForm({ ...searchForm, role: e.target.value })}
            className={inputCls}
          />
          <input
            placeholder="Query *"
            required
            value={searchForm.query}
            onChange={(e) => setSearchForm({ ...searchForm, query: e.target.value })}
            className={inputCls}
          />
        </div>
        <button
          type="submit"
          className="rounded border border-white px-4 py-2 text-sm font-medium text-white transition hover:bg-white hover:text-black"
        >
          Search
        </button>
        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((r, i) => (
              <div
                key={i}
                className="rounded border border-[var(--border)] bg-[var(--background)] p-3 text-sm"
              >
                <span className="text-xs text-zinc-500">
                  sim: {r.similarity.toFixed(3)}
                </span>
                <p className="mt-1 text-zinc-300">{r.chunk_text}</p>
              </div>
            ))}
          </div>
        )}
      </form>
    </div>
  );
}
