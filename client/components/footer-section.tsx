"use client";

import Link from "next/link";

export default function FooterSection() {
  const centerLinks = [
    { label: "Platform", href: "#" },
    { label: "Interviews", href: "#" },
    { label: "Feedback", href: "#" },
    { label: "Resources", href: "#" },
    { label: "Live Practice", href: "#live" },
    { label: "Pricing", href: "#pricing" },
  ];

  const rightLinks = [
    { label: "Privacy", href: "#" },
    { label: "Terms", href: "#" },
    { label: "Docs", href: "#" },
    { label: "Help", href: "#" },
  ];

  return (
    <footer className="w-full px-4 md:px-12 py-12 bg-[#F7F5F3]">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-16">
          {/* Logo */}
          <div className="w-full md:w-auto flex justify-center md:justify-start">
            <Link
              href="/"
              className="text-[#0a0a0a] text-[11px] font-semibold tracking-[0.3em] uppercase"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              B O D H I
            </Link>
          </div>

          {/* Center Links */}
          <div className="w-full md:flex-1 flex justify-center">
            <ul className="flex flex-wrap justify-center gap-6 md:gap-8">
              {centerLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-[#0a0a0a]/40 text-[12px] font-medium hover:text-[#0a0a0a]/80 transition-colors duration-200"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Right Links */}
          <div className="w-full md:w-auto flex justify-center md:justify-end">
            <ul className="flex flex-wrap justify-center gap-6">
              {rightLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-[#0a0a0a]/30 text-[12px] font-medium hover:text-[#0a0a0a]/60 transition-colors duration-200"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="flex justify-center md:justify-start">
          <div
            className="text-[#0a0a0a]/30 text-[11px] font-medium"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            &copy; 2026 Bodhi. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
