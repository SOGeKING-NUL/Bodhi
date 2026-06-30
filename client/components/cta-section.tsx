"use client";

import { SignInButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function CTASection() {
  const { isSignedIn } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.3 },
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="w-full py-24 md:py-32 px-4 md:px-8 border-b border-black/4"
    >
      <div className="max-w-4xl mx-auto relative z-10">
        <div
          className="text-center"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <h2
            className="text-[#0a0a0a] text-[40px] md:text-[56px] font-light leading-[1.05] tracking-[-0.03em] mb-4"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Start your mock
            <br />
            interviews today.
          </h2>

          <p
            className="text-[#0a0a0a]/40 text-sm md:text-[15px] leading-relaxed max-w-lg mx-auto mb-10 font-medium"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Upload your resume, pick a role, and run your first AI-powered mock
            interview in minutes — with feedback that works around the clock.
          </p>

          <div className="flex items-center justify-center">
            {isSignedIn ? (
              <Link
                href="/interview"
                className="h-[46px] px-8 flex items-center bg-[#0a0a0a] text-white text-[12px] uppercase tracking-[0.05em] font-semibold rounded-md transition-all duration-300 hover:bg-[#1a1a1a] hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] active:scale-[0.98]"
                style={{ fontFamily: "'Inter', sans-serif", borderRadius: "8px" }}
              >
                Start an interview
              </Link>
            ) : (
              <SignInButton mode="modal">
                <button
                  className="h-[46px] px-8 bg-[#0a0a0a] text-white text-[12px] uppercase tracking-[0.05em] font-semibold rounded-md transition-all duration-300 hover:bg-[#1a1a1a] hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] active:scale-[0.98]"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    borderRadius: "8px",
                  }}
                >
                  Start practicing free
                </button>
              </SignInButton>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
