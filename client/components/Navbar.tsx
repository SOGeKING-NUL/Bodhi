"use client";

import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const LANDING_LINKS = [
  { href: "/#platform", label: "Platform" },
  { href: "/#agents", label: "Interviews" },
  { href: "/#workflow", label: "Workflow" },
  { href: "/#pricing", label: "Pricing" },
];

const APP_LINKS = [
  { href: "/interview", label: "Interview" },
  { href: "/companies", label: "Companies" },
  { href: "/roles", label: "Roles" },
  { href: "/resumes", label: "Resumes" },
];

export default function Navbar() {
  const { isSignedIn } = useAuth();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const isLanding = pathname === "/";
  const links = isLanding ? LANDING_LINKS : APP_LINKS;

  const isActive = (href: string) =>
    !isLanding && (pathname === href || pathname.startsWith(`${href}/`));

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
            <Link
              href="/"
              className="text-[#0a0a0a] text-[15px] font-bold tracking-[0.25em] hover:opacity-70 transition-opacity duration-200 shrink-0 uppercase"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              BODHI
            </Link>

            <div className="hidden md:flex items-center gap-6">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-[13px] font-medium transition-colors duration-200 ${
                    isActive(link.href)
                      ? "text-[#0a0a0a]"
                      : "text-[#0a0a0a]/60 hover:text-[#0a0a0a]"
                  }`}
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {isSignedIn ? (
                <>
                  {isLanding && (
                    <Link
                      href="/interview"
                      className="h-[34px] px-5 hidden sm:flex items-center justify-center border border-[#0a0a0a]/20 text-[#0a0a0a] text-[11px] uppercase tracking-[0.05em] font-medium rounded-full transition-all duration-300 hover:border-[#0a0a0a]/40 hover:bg-black/[0.02] active:scale-95"
                      style={{ fontFamily: "var(--font-inter)" }}
                    >
                      START PRACTICING
                    </Link>
                  )}
                  <UserButton
                    appearance={{ elements: { avatarBox: "w-8 h-8" } }}
                  />
                </>
              ) : (
                <SignInButton mode="modal">
                  <div
                    className="h-[34px] px-5 hidden sm:flex items-center justify-center border border-[#0a0a0a]/20 text-[#0a0a0a] text-[11px] uppercase tracking-[0.05em] font-medium rounded-full transition-all duration-300 hover:border-[#0a0a0a]/40 hover:bg-black/[0.02] active:scale-95 cursor-pointer"
                    style={{ fontFamily: "var(--font-inter)" }}
                  >
                    START PRACTICING
                  </div>
                </SignInButton>
              )}

              <button
                type="button"
                aria-label="Toggle navigation menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
                className="md:hidden w-9 h-9 flex items-center justify-center rounded-full text-[#0a0a0a] hover:bg-black/[0.04] transition-colors duration-200"
              >
                {menuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>

          {menuOpen && (
            <div
              className="md:hidden fixed inset-0 -z-10"
              aria-hidden
              onClick={() => setMenuOpen(false)}
            />
          )}

          {menuOpen && (
            <div className="md:hidden absolute top-[calc(100%+8px)] left-0 right-0 rounded-2xl border border-black/[0.08] bg-white/95 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] p-2 flex flex-col">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`px-4 py-3 rounded-xl text-[14px] font-medium transition-colors duration-200 ${
                    isActive(link.href)
                      ? "bg-black/[0.04] text-[#0a0a0a]"
                      : "text-[#0a0a0a]/70 hover:bg-black/[0.03] hover:text-[#0a0a0a]"
                  }`}
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {link.label}
                </Link>
              ))}

              {isSignedIn && isLanding && (
                <Link
                  href="/interview"
                  onClick={() => setMenuOpen(false)}
                  className="mt-1 px-4 py-3 rounded-xl text-[14px] font-medium text-[#0a0a0a] bg-black/[0.04] hover:bg-black/[0.06] transition-colors duration-200"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  Start practicing
                </Link>
              )}
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
