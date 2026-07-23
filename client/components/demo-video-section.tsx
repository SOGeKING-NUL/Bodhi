"use client";

import { useEffect, useRef, useState } from "react";
import {
  FileText,
  Upload,
  Search,
  Check,
  Mic,
  Play,
  BarChart3
} from "lucide-react";

export default function DemoVideoSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 },
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="w-full py-24 md:py-32 px-4 md:px-8 bg-transparent"
    >
      {/* Centered Header Section */}
      <div className="max-w-3xl mx-auto text-center mb-16 md:mb-20">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 bg-bodhi-surface rounded-full border border-[rgba(55,50,47,0.22)] mb-6 text-[11px] font-medium uppercase tracking-[0.1em] text-[#0a0a0a]/60"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-bodhi-clay animate-pulse" />
          Workflow
        </div>
        <h2
          className="text-[#0a0a0a] text-3xl md:text-[48px] font-light leading-[1.15] tracking-[-0.03em] mb-6"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          From prep to interview edge
          <span
            className="italic font-light text-bodhi-clay"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            {" "}
            in four steps.
          </span>
        </h2>
        <p
          className="text-[#0a0a0a]/55 text-base md:text-lg leading-relaxed max-w-xl mx-auto"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          Two minutes from resume upload to a live voice interview — no scripts, no buttons.
        </p>
      </div>

      {/* Standalone Video centerpiece */}
      <div className="max-w-[1000px] mx-auto mb-24 md:mb-32 flex justify-center px-2">
        <div
          className="group relative w-full rounded-3xl border border-[rgba(55,50,47,0.22)] bg-bodhi-surface p-3 shadow-[0_45px_100px_rgba(55,50,47,0.15)] transition-all duration-700 hover:scale-[1.01] hover:rotate-0"
          style={{ transform: "rotate(-1deg)" }}
        >
          <div
            className="relative aspect-video w-full overflow-hidden rounded-2xl"
            style={{
              background:
                "radial-gradient(ellipse at 50% 40%, #3d332c 0%, #241f1a 65%, #17130f 100%)",
            }}
          >
            {/* Ambient Background Light Glow behind Video */}
            <div className="absolute -inset-10 bg-radial-gradient from-bodhi-clay/20 to-transparent blur-2xl opacity-50 group-hover:opacity-75 transition-opacity duration-700 pointer-events-none" />

            <iframe
              className="absolute inset-0 h-full w-full z-10"
              src="https://www.youtube.com/embed/tvwdEFT3wSc?rel=0"
              title="Bodhi Demo Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      </div>

      {/* Single Bento Box — 4 steps, one bordered container, sharp corners, internal dividers */}
      <div
        className="max-w-[1100px] mx-auto flex flex-col border border-[rgba(55,50,47,0.22)] bg-bodhi-surface shadow-[0_20px_60px_rgba(55,50,47,0.06)]"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateY(0)" : "translateY(24px)",
          transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* UPPER ROW */}
        <div className="grid grid-cols-1 md:grid-cols-[1.8fr_1fr] border-b border-[rgba(55,50,47,0.22)]">
          {/* STEP 01: Upload */}
          <div className="group relative p-7 md:p-8 border-b md:border-b-0 md:border-r border-[rgba(55,50,47,0.22)] transition-colors duration-500 hover:bg-black/[0.015] cursor-default flex flex-col justify-between min-h-[420px]">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[11px] font-mono font-semibold text-bodhi-clay/40 bg-bodhi-clay/[0.06] px-2 py-0.5 rounded-full border border-bodhi-clay/10">
                STEP 01
              </span>
              <span className="text-[10px] font-semibold tracking-[0.1em] text-[#0a0a0a]/40 uppercase font-mono">
                Resume Parsing
              </span>
            </div>

            <h3
              className="text-[#0a0a0a] text-xl md:text-2xl font-medium tracking-[-0.02em] mb-3"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              Upload Resume
            </h3>
            <p
              className="text-[#0a0a0a]/50 text-sm leading-relaxed"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              Upload your resume to give the AI context about your experience and background. The agent parses it instantly to adapt the questions.
            </p>
          </div>

          {/* Vector Visual: Upload Drag-n-Drop Zone Mockup */}
          <div className="relative w-full h-56 mt-8 border border-dashed border-[rgba(55,50,47,0.22)] bg-[#faf6f0]/40 p-6 flex flex-col items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-radial-gradient from-white/30 to-transparent pointer-events-none" />

            {/* Document Icon Graphic */}
            <div className="relative flex flex-col items-center z-10 transition-transform duration-500 group-hover:scale-105">
              <div className="h-16 w-12 border-2 border-bodhi-clay/35 bg-white shadow-md p-2 flex flex-col gap-1.5 justify-center relative">
                <FileText className="w-5 h-5 text-bodhi-clay absolute -right-2 -top-2 bg-white rounded-md p-0.5 border border-[rgba(55,50,47,0.22)]" />
                <div className="h-1.5 w-7 bg-bodhi-clay/20 rounded" />
                <div className="h-1.5 w-6 bg-bodhi-clay/15 rounded" />
                <div className="h-1.5 w-5 bg-bodhi-clay/10 rounded" />
              </div>
              <span className="text-[11px] font-medium text-[#0a0a0a]/50 mt-4 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-bodhi-clay" /> drag & drop PDF
              </span>
            </div>

            {/* Skill Tags floating in */}
            <div className="absolute left-4 top-6 px-2.5 py-1 bg-white rounded-full border border-[rgba(55,50,47,0.22)] text-[10px] font-medium text-[#0a0a0a]/60 shadow-sm rotate-[-6deg] transition-all duration-700 group-hover:translate-x-2">
              Python
            </div>
            <div className="absolute right-4 top-8 px-2.5 py-1 bg-white rounded-full border border-[rgba(55,50,47,0.22)] text-[10px] font-medium text-[#0a0a0a]/60 shadow-sm rotate-[8deg] transition-all duration-700 group-hover:-translate-x-2">
              React
            </div>
            <div className="absolute left-6 bottom-4 px-2.5 py-1 bg-white rounded-full border border-[rgba(55,50,47,0.22)] text-[10px] font-medium text-[#0a0a0a]/60 shadow-sm rotate-[4deg] transition-all duration-700 group-hover:translate-x-1">
              System Design
            </div>

            {/* Animating Scanning Line */}
            <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-bodhi-clay to-transparent opacity-60 shadow-[0_0_8px_#d97757] animate-scan pointer-events-none" />
          </div>
        </div>

        {/* STEP 02: Select Role */}
        <div className="group relative p-7 md:p-8 border-b-0 transition-colors duration-500 hover:bg-black/[0.015] cursor-default flex flex-col justify-between min-h-[420px]">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[11px] font-mono font-semibold text-bodhi-clay/40 bg-bodhi-clay/[0.06] px-2 py-0.5 rounded-full border border-bodhi-clay/10">
                STEP 02
              </span>
              <span className="text-[10px] font-semibold tracking-[0.1em] text-[#0a0a0a]/40 uppercase font-mono">
                Customization
              </span>
            </div>

            <h3
              className="text-[#0a0a0a] text-xl md:text-2xl font-medium tracking-[-0.02em] mb-3"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              Select Role & Domain
            </h3>
            <p
              className="text-[#0a0a0a]/50 text-sm leading-relaxed"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              Customize your targeted domain, job title, and specific company rules to practice exactly what you need.
            </p>
          </div>

          {/* Vector Visual: Role Pill Selector Mockup */}
          <div className="relative w-full h-56 mt-8 border border-[rgba(55,50,47,0.22)] bg-[#faf6f0]/40 p-6 flex flex-col justify-center gap-3 overflow-hidden">
            {/* Fake Search Bar */}
            <div className="w-full h-8 bg-white border border-[rgba(55,50,47,0.28)] px-2.5 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-[#0a0a0a]/30" />
              <span className="text-[11px] text-[#0a0a0a]/30">Search role (e.g. Google Coding)</span>
            </div>

            {/* Tag pills selection */}
            <div className="flex flex-wrap gap-2">
              <div className="px-2.5 py-1 bg-white rounded-full border-2 border-bodhi-clay text-[10px] font-semibold text-bodhi-clay flex items-center gap-1 shadow-sm">
                <Check className="w-3 h-3 text-bodhi-clay" /> Systems Architect
              </div>
              <div className="px-2.5 py-1 bg-white rounded-full border border-[rgba(55,50,47,0.22)] text-[10px] font-medium text-[#0a0a0a]/50">
                Frontend
              </div>
              <div className="px-2.5 py-1 bg-white rounded-full border border-[rgba(55,50,47,0.22)] text-[10px] font-medium text-[#0a0a0a]/50">
                Behavioral
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* LOWER ROW */}
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* STEP 03: Voice Interview */}
          <div className="group relative p-7 md:p-8 border-b md:border-b-0 md:border-r border-[rgba(55,50,47,0.22)] transition-colors duration-500 hover:bg-black/[0.015] cursor-default flex flex-col justify-between min-h-[420px]">
            <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[11px] font-mono font-semibold text-bodhi-clay/40 bg-bodhi-clay/[0.06] px-2 py-0.5 rounded-full border border-bodhi-clay/10">
                STEP 03
              </span>
              <span className="text-[10px] font-semibold tracking-[0.1em] text-[#0a0a0a]/40 uppercase font-mono">
                Live Voice Run
              </span>
            </div>

            <h3
              className="text-[#0a0a0a] text-xl md:text-2xl font-medium tracking-[-0.02em] mb-3"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              Voice Interview
            </h3>
            <p
              className="text-[#0a0a0a]/50 text-sm leading-relaxed"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              Engage in a realistic voice-based mock session with dynamic follow-up questions from the AI.
            </p>
          </div>

          {/* Vector Visual: Pulsing Mic & Audio Waveform Mockup */}
          <div className="relative w-full h-56 mt-8 border border-[rgba(55,50,47,0.22)] bg-[#faf6f0]/40 p-4 flex items-center justify-center gap-6 overflow-hidden">
            {/* Waveform Left */}
            <div className="flex items-end gap-1.5 h-12">
              <div className="w-1.5 bg-bodhi-clay/30 rounded-full animate-wave-short" style={{ height: "40%" }} />
              <div className="w-1.5 bg-bodhi-clay/50 rounded-full animate-wave-tall" style={{ height: "70%" }} />
              <div className="w-1.5 bg-bodhi-clay/30 rounded-full animate-wave-short" style={{ height: "30%" }} />
            </div>

            {/* Pulsing Mic Orb */}
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 w-16 h-16 rounded-full bg-bodhi-clay/20 animate-pulseGlow blur-md" />
              <div className="relative h-14 w-14 rounded-full bg-bodhi-clay flex items-center justify-center text-white shadow-[0_8px_20px_rgba(217,119,87,0.3)] transition-transform duration-500 group-hover:scale-105">
                <Mic className="w-6 h-6 text-white" />
              </div>
            </div>

            {/* Waveform Right */}
            <div className="flex items-end gap-1.5 h-12">
              <div className="w-1.5 bg-bodhi-clay/30 rounded-full animate-wave-short" style={{ height: "30%" }} />
              <div className="w-1.5 bg-bodhi-clay/50 rounded-full animate-wave-tall" style={{ height: "80%" }} />
              <div className="w-1.5 bg-bodhi-clay/30 rounded-full animate-wave-short" style={{ height: "45%" }} />
            </div>
          </div>
        </div>

        {/* STEP 04: Review / Scorecard */}
        <div className="group relative p-7 md:p-8 transition-colors duration-500 hover:bg-black/[0.015] cursor-default flex flex-col justify-between min-h-[420px]">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[11px] font-mono font-semibold text-bodhi-clay/40 bg-bodhi-clay/[0.06] px-2 py-0.5 rounded-full border border-bodhi-clay/10">
                STEP 04
              </span>
              <span className="text-[10px] font-semibold tracking-[0.1em] text-[#0a0a0a]/40 uppercase font-mono">
                Deep Insights
              </span>
            </div>

            <h3
              className="text-[#0a0a0a] text-xl md:text-2xl font-medium tracking-[-0.02em] mb-3"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              Comprehensive Scorecard
            </h3>
            <p
              className="text-[#0a0a0a]/50 text-sm leading-relaxed"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              Receive an actionable scorecard, detailed feedback, and suggested improvements across behavioral and technical metrics.
            </p>
          </div>

          {/* Vector Visual: Bar-chart Scorecard Mockup */}
          <div className="relative w-full h-56 mt-8 border border-[rgba(55,50,47,0.22)] bg-[#faf6f0]/40 p-5 flex flex-col justify-between overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-bodhi-clay/10 border border-bodhi-clay/25 flex items-center justify-center shrink-0">
                <BarChart3 className="w-4.5 h-4.5 text-bodhi-clay" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-[#0a0a0a]/75 uppercase tracking-wide">Performance</div>
                <div className="text-[10px] text-emerald-600 font-medium">Ready for onsite • Excellent communication</div>
              </div>
            </div>

            {/* Vertical bar chart */}
            <div className="flex items-end justify-center gap-5 h-28 mt-2">
              <div className="flex-1 max-w-[36px] flex flex-col items-center gap-2">
                <span className="text-[10px] font-semibold text-bodhi-clay">94%</span>
                <div className="w-full bg-bodhi-clay/15 border border-bodhi-clay/20 relative" style={{ height: "100%" }}>
                  <div className="absolute bottom-0 left-0 right-0 bg-bodhi-clay" style={{ height: "94%" }} />
                </div>
                <span className="text-[9px] text-[#0a0a0a]/40 font-medium text-center leading-tight">Technical</span>
              </div>
              <div className="flex-1 max-w-[36px] flex flex-col items-center gap-2">
                <span className="text-[10px] font-semibold text-bodhi-clay">88%</span>
                <div className="w-full bg-bodhi-clay/15 border border-bodhi-clay/20 relative" style={{ height: "100%" }}>
                  <div className="absolute bottom-0 left-0 right-0 bg-bodhi-clay" style={{ height: "88%" }} />
                </div>
                <span className="text-[9px] text-[#0a0a0a]/40 font-medium text-center leading-tight">Comms</span>
              </div>
              <div className="flex-1 max-w-[36px] flex flex-col items-center gap-2">
                <span className="text-[10px] font-semibold text-bodhi-clay">91%</span>
                <div className="w-full bg-bodhi-clay/15 border border-bodhi-clay/20 relative" style={{ height: "100%" }}>
                  <div className="absolute bottom-0 left-0 right-0 bg-bodhi-clay" style={{ height: "91%" }} />
                </div>
                <span className="text-[9px] text-[#0a0a0a]/40 font-medium text-center leading-tight">Delivery</span>
              </div>
              <div className="flex-1 max-w-[36px] flex flex-col items-center gap-2">
                <span className="text-[10px] font-semibold text-bodhi-clay">92%</span>
                <div className="w-full bg-bodhi-clay/15 border border-bodhi-clay/20 relative" style={{ height: "100%" }}>
                  <div className="absolute bottom-0 left-0 right-0 bg-bodhi-clay" style={{ height: "92%" }} />
                </div>
                <span className="text-[9px] text-[#0a0a0a]/40 font-medium text-center leading-tight">Overall</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Embedded CSS Animations */}
      <style jsx>{`
        @keyframes scan {
          0%, 100% {
            top: 5%;
          }
          50% {
            top: 95%;
          }
        }
        @keyframes pulseGlow {
          0%, 100% {
            transform: scale(1);
            opacity: 0.2;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.35;
          }
        }
        @keyframes wavePulse {
          0%, 100% {
            transform: scaleY(1);
          }
          50% {
            transform: scaleY(1.4);
          }
        }
        .animate-scan {
          animation: scan 4s linear infinite;
        }
        .animate-pulseGlow {
          animation: pulseGlow 2.5s ease-in-out infinite;
        }
        .animate-wave-short {
          animation: wavePulse 1.2s ease-in-out infinite;
          transform-origin: bottom;
        }
        .animate-wave-tall {
          animation: wavePulse 0.9s ease-in-out infinite;
          transform-origin: bottom;
        }
      `}</style>
    </section>
  );
}
