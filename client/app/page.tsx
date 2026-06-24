"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import Navbar from "../components/Navbar";
import AgentTypesSection from "../components/agent-types-section";
import WorkflowSection from "../components/workflow-section";
import FeaturesGridSection from "../components/features-grid-section";
import DeveloperExperienceSection from "../components/developer-experience-section";
import MarqueeSection from "../components/marquee-section";
import EnterpriseSection from "../components/enterprise-section";
import PricingSection from "../components/pricing-section";
import CTASection from "../components/cta-section";
import FooterSection from "../components/footer-section";

function Badge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="group px-[14px] py-[6px] bg-white shadow-[0px_0px_0px_4px_rgba(55,50,47,0.05)] overflow-hidden rounded-[90px] flex justify-start items-center gap-[8px] border border-[rgba(2,6,23,0.08)] shadow-xs transition-all duration-300 hover:shadow-[0px_0px_0px_4px_rgba(55,50,47,0.08),0px_2px_8px_rgba(0,0,0,0.08)] hover:scale-105 cursor-default">
      <div className="w-[14px] h-[14px] relative overflow-hidden flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
        {icon}
      </div>
      <div className="text-center flex justify-center flex-col text-[#37322F] text-xs font-medium leading-3 font-sans">
        {text}
      </div>
    </div>
  );
}

const PixelGridIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="currentColor"
    className="text-gray-500"
  >
    {[0, 3, 6, 9, 12].map((x) =>
      [0, 3, 6, 9].map((y) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="2" height="2" />
      )),
    )}
  </svg>
);

const PixelStarIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="currentColor"
    className="text-gray-500"
  >
    <rect x="6" y="6" width="2" height="2" />
    <rect x="6" y="2" width="2" height="2" />
    <rect x="6" y="10" width="2" height="2" />
    <rect x="2" y="6" width="2" height="2" />
    <rect x="10" y="6" width="2" height="2" />
    <rect x="4" y="4" width="2" height="2" opacity="0.5" />
    <rect x="8" y="4" width="2" height="2" opacity="0.5" />
    <rect x="4" y="8" width="2" height="2" opacity="0.5" />
    <rect x="8" y="8" width="2" height="2" opacity="0.5" />
  </svg>
);

const PixelUserIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="currentColor"
    className="text-gray-500"
  >
    <rect x="5" y="2" width="4" height="4" />
    <rect x="4" y="6" width="6" height="2" />
    <rect x="2" y="9" width="10" height="2" />
    <rect x="2" y="11" width="3" height="3" />
    <rect x="9" y="11" width="3" height="3" />
    <rect x="5" y="11" width="4" height="1" />
  </svg>
);

const PixelHourglassIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="currentColor"
    className="text-gray-500"
  >
    <rect x="2" y="1" width="10" height="2" />
    <rect x="4" y="3" width="6" height="2" />
    <rect x="6" y="5" width="2" height="2" />
    <rect x="4" y="8" width="6" height="2" />
    <rect x="2" y="10" width="10" height="2" />
  </svg>
);

export default function LandingPage() {
  const [activeCard, setActiveCard] = useState(0);
  const [progress, setProgress] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      if (!mountedRef.current) return;

      setProgress((prev) => {
        if (prev >= 100) {
          if (mountedRef.current) {
            setActiveCard((current) => (current + 1) % 3);
          }
          return 0;
        }
        return prev + 2;
      });
    }, 100);

    return () => {
      clearInterval(progressInterval);
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleCardClick = (index: number) => {
    if (!mountedRef.current) return;
    setActiveCard(index);
    setProgress(0);
  };

  const getDashboardContent = () => {
    switch (activeCard) {
      case 0:
        return (
          <div className="text-[#828387] text-sm">
            Interview Performance Overview
          </div>
        );
      case 1:
        return (
          <div className="text-[#828387] text-sm">
            Detailed Skill Analytics & Feedback
          </div>
        );
      case 2:
        return (
          <div className="text-[#828387] text-sm">
            Role-Specific Question Bank & Progress
          </div>
        );
      default:
        return (
          <div className="text-[#828387] text-sm">
            Interview Performance Overview
          </div>
        );
    }
  };

  return (
    <div className="w-full min-h-screen relative bg-[#F7F5F3] flex flex-col justify-start items-center">
      {/* Static Full-Page Grid Background */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, #37322F 1px, transparent 1px),
              linear-gradient(to bottom, #37322F 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Full-Screen Gradient Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent blur-[120px] rounded-full" />
      </div>

      {/* Gradient Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#E8E3DF] rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-[float_6s_ease-in-out_infinite]" />
      <div
        className="absolute bottom-[-20%] right-1/4 w-96 h-96 bg-[#DED9D5] rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-[float_6s_ease-in-out_infinite]"
        style={{ animationDelay: "2s" }}
      />

      <div className="relative flex flex-col justify-start items-center w-full">
        {/* Main container with proper margins */}
        <div className="w-full max-w-none px-4 sm:px-6 md:px-8 lg:px-0 lg:max-w-[1060px] lg:w-[1060px] relative flex flex-col justify-start items-start">
          {/* Left vertical line */}
          <div className="w-[1px] h-full absolute left-4 sm:left-6 md:left-8 lg:left-0 top-0 bg-[rgba(55,50,47,0.12)] shadow-[1px_0px_0px_white] z-0"></div>

          {/* Right vertical line */}
          <div className="w-[1px] h-full absolute right-4 sm:right-6 md:right-8 lg:right-0 top-0 bg-[rgba(55,50,47,0.12)] shadow-[1px_0px_0px_white] z-0"></div>

          <div className="self-stretch pt-[9px] overflow-hidden border-b border-[rgba(55,50,47,0.06)] flex flex-col justify-center items-center gap-4 sm:gap-6 md:gap-8 lg:gap-[66px] relative z-10">
            {/* Fixed Navbar */}
            <Navbar />

            {/* Hero Section */}
            <div className="pt-[160px] pb-[80px] lg:pt-[240px] lg:pb-[140px] flex flex-col justify-center items-center px-4 md:px-8 w-full relative z-10 text-center">
              <h1
                className="w-full max-w-[900px] text-[#0a0a0a] text-[48px] md:text-[64px] lg:text-[88px] font-light leading-[1.05] tracking-[-0.04em] mb-6 animate-fade-in-up"
                style={{
                  animationDelay: "0.1s",
                  fontFamily: "var(--font-inter)",
                }}
              >
                The interview edge,
                <br className="hidden md:block" />
                <span
                  className="italic font-light text-black/60"
                  style={{ fontFamily: "var(--font-instrument-serif)" }}
                >
                  {" "}
                  available today.
                </span>
              </h1>

              <p
                className="w-full max-w-[600px] text-[#0a0a0a]/60 text-[16px] md:text-[20px] leading-relaxed tracking-[-0.01em] mb-10 font-normal animate-fade-in-up"
                style={{
                  animationDelay: "0.2s",
                  fontFamily: "var(--font-inter)",
                }}
              >
                Practice with AI-native interviewers tailored to your dream
                roles. Gain actionable feedback and elevate your confidence{" "}
                <span
                  className="italic"
                  style={{
                    fontFamily: "var(--font-instrument-serif)",
                    fontSize: "1.05em",
                  }}
                >
                  instantly.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-[100vw] flex flex-col justify-start items-center relative bg-transparent m-0 p-0 overflow-hidden z-10">
        <AgentTypesSection />
        <WorkflowSection />
        <FeaturesGridSection />
        <DeveloperExperienceSection />
        <MarqueeSection />
        <EnterpriseSection />
        <PricingSection />
        <CTASection />
        <FooterSection />
      </div>
    </div>
  );
}
