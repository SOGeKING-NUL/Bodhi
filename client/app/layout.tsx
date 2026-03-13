import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bodhi — Test Client",
  description: "Minimal frontend to test all Bodhi API endpoints",
};

const NAV = [
  { href: "/", label: "Home" },
  { href: "/roles", label: "Roles" },
  { href: "/companies", label: "Companies" },
  { href: "/documents", label: "Documents" },
  { href: "/interview", label: "Interview" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <nav className="sticky top-0 z-50 flex items-center gap-1 border-b border-[var(--border)] bg-[var(--card)] px-6 py-3">
          <span className="mr-4 text-lg font-bold text-white">
            Bodhi
          </span>
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded px-3 py-1.5 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
