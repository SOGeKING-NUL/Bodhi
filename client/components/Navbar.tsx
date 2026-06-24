"use client";

import { SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const landingLinks = [
    { href: "#platform", label: "Platform" },
    { href: "#agents", label: "Interviews" },
    { href: "#workflow", label: "Workflow" },
    { href: "#pricing", label: "Pricing" },
  ];

  return (
    <>
      <div className="fixed top-0 left-0 right-0 h-[10px] bg-white z-50 transition-all duration-500" />
      <nav className="fixed top-[10px] left-0 right-0 flex justify-center items-start px-4 transition-all duration-500 z-50">
        <div
          className="relative w-full max-w-[960px] h-[56px] px-8 flex justify-between items-center transition-all duration-500 shadow-[0_8px_32px_rgba(0,0,0,0.06)] rounded-b-2xl border-b border-black/[0.08] border-l border-r"
          style={{
            background: scrolled
              ? "rgba(255, 255, 255, 0.95)"
              : "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
          }}
        >
          {/* Left Flange (Outward Top Corner) */}
          <div
            className="absolute top-[0px] left-[-16px] w-[16px] h-[16px] pointer-events-none"
            style={{
              background: scrolled
                ? "rgba(255, 255, 255, 0.95)"
                : "rgba(255, 255, 255, 0.8)",
              backdropFilter: "blur(24px) saturate(180%)",
              WebkitBackdropFilter: "blur(24px) saturate(180%)",
              maskImage:
                "radial-gradient(circle at 0% 100%, transparent 16px, black 16.5px)",
              WebkitMaskImage:
                "radial-gradient(circle at 0% 100%, transparent 16px, black 16.5px)",
            }}
          >
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 16 16"
              preserveAspectRatio="none"
            >
              <path
                d="M0 0 C 0 8.836 7.163 16 16 16"
                fill="none"
                stroke="rgba(0,0,0,0.08)"
                strokeWidth="1"
              />
            </svg>
          </div>

          {/* Right Flange (Outward Top Corner) */}
          <div
            className="absolute top-[0px] right-[-16px] w-[16px] h-[16px] pointer-events-none"
            style={{
              background: scrolled
                ? "rgba(255, 255, 255, 0.95)"
                : "rgba(255, 255, 255, 0.8)",
              backdropFilter: "blur(24px) saturate(180%)",
              WebkitBackdropFilter: "blur(24px) saturate(180%)",
              maskImage:
                "radial-gradient(circle at 100% 100%, transparent 16px, black 16.5px)",
              WebkitMaskImage:
                "radial-gradient(circle at 100% 100%, transparent 16px, black 16.5px)",
            }}
          >
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 16 16"
              preserveAspectRatio="none"
            >
              <path
                d="M16 0 C 16 8.836 8.837 16 0 16"
                fill="none"
                stroke="rgba(0,0,0,0.08)"
                strokeWidth="1"
              />
            </svg>
          </div>

          <div className="relative z-10 flex items-center justify-between w-full">
            {/* Logo */}
            <Link
              href="/"
              className="text-[#0a0a0a] text-[15px] font-bold tracking-[0.25em] hover:opacity-70 transition-opacity duration-200 shrink-0 uppercase"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              BODHI
            </Link>

            {/* Links */}
            <div className="hidden md:flex items-center gap-6">
              {landingLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-[13px] font-medium transition-colors duration-200 text-[#0a0a0a]/60 hover:text-[#0a0a0a]"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* CTA Button */}
            <div className="flex items-center gap-2 shrink-0">
              <SignInButton mode="modal">
                <div
                  className="h-[34px] px-5 flex items-center justify-center border border-[#0a0a0a]/20 text-[#0a0a0a] text-[11px] uppercase tracking-[0.05em] font-medium rounded-full transition-all duration-300 hover:border-[#0a0a0a]/40 hover:bg-black/[0.02] active:scale-95 cursor-pointer"
                  style={{ fontFamily: "var(--font-inter)" }}
                >
                  START PRACTICING
                </div>
              </SignInButton>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
