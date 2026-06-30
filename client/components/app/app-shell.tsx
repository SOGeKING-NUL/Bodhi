"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  ChevronDownIcon,
  CompanyIcon,
  DashboardIcon,
  type IconType,
  InterviewIcon,
  LibraryIcon,
  MenuIcon,
  ProfileIcon,
  ResumeIcon,
  RoleIcon,
  SettingsIcon,
} from "@/components/app/ui/icons";
import { listCompanies, listRoles } from "@/lib/api";
import { cn } from "@/lib/utils";


type LeafItem = {
  href: string;
  label: string;
  icon: IconType;
  countKey?: "companies" | "roles";
};

type NavNode =
  | (LeafItem & { kind: "item" })
  | { kind: "group"; label: string; icon: IconType; match: string[]; children: LeafItem[] };

const NAV: NavNode[] = [
  { kind: "item", href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
  { kind: "item", href: "/interview", label: "New interview", icon: InterviewIcon },
  {
    kind: "group",
    label: "Library",
    icon: LibraryIcon,
    match: ["/companies", "/roles", "/resumes"],
    children: [
      { href: "/companies", label: "Companies", icon: CompanyIcon, countKey: "companies" },
      { href: "/roles", label: "Roles", icon: RoleIcon, countKey: "roles" },
      { href: "/resumes", label: "Resume", icon: ResumeIcon },
    ],
  },
  { kind: "item", href: "/profile", label: "Profile", icon: ProfileIcon },
];

const RAIL: { href: string; label: string; icon: IconType; match: string[] }[] = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon, match: ["/dashboard"] },
  { href: "/interview", label: "Interview", icon: InterviewIcon, match: ["/interview"] },
  {
    href: "/companies",
    label: "Library",
    icon: LibraryIcon,
    match: ["/companies", "/roles", "/resumes"],
  },
  { href: "/profile", label: "Profile", icon: ProfileIcon, match: ["/profile", "/report"] },
];

type Counts = { companies?: number; roles?: number };

function matchActive(pathname: string, patterns: string[]) {
  return patterns.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}


function BodhiMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-xl bg-white font-serif text-neutral-900 shadow-sm",
        className,
      )}
      aria-hidden
    >
      <span className="-mt-0.5 text-xl leading-none">B</span>
    </span>
  );
}


function IconRail({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-16 flex-col items-center bg-neutral-900 py-4">
      <Link href="/" onClick={onNavigate} aria-label="Bodhi home">
        <BodhiMark className="h-9 w-9" />
      </Link>

      <nav className="mt-6 flex flex-1 flex-col items-center gap-1.5">
        {RAIL.map(({ href, label, icon: Icon, match }) => {
          const active = matchActive(pathname, match);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-label={label}
              title={label}
              className={cn(
                "relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                active
                  ? "bg-white/10 text-white"
                  : "text-neutral-500 hover:bg-white/5 hover:text-neutral-200",
              )}
            >
              {active && (
                <span className="absolute -left-[10px] h-5 w-1 rounded-r-full bg-white" />
              )}
              <Icon size={20} />
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col items-center gap-3">
        <Link
          href="/profile"
          onClick={onNavigate}
          aria-label="Settings"
          title="Settings"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-neutral-500 transition-colors hover:bg-white/5 hover:text-neutral-200"
        >
          <SettingsIcon size={19} />
        </Link>
        <UserButton appearance={{ elements: { avatarBox: "w-8 h-8" } }} />
      </div>
    </div>
  );
}


function CountBadge({ value, active }: { value: number; active: boolean }) {
  return (
    <span
      className={cn(
        "ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-md px-1.5 text-[11px] font-semibold tabular-nums",
        active ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500",
      )}
    >
      {value}
    </span>
  );
}


function NavPanel({
  counts,
  onNavigate,
}: {
  counts: Counts;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const libraryActive = matchActive(pathname, ["/companies", "/roles", "/resumes"]);
  const [openLibrary, setOpenLibrary] = useState(true);

  useEffect(() => {
    if (libraryActive) setOpenLibrary(true);
  }, [libraryActive]);

  return (
    <div className="flex h-full w-60 flex-col border-r border-neutral-200 bg-white">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <span className="text-[15px] font-bold uppercase tracking-[0.2em] text-[#1a1a1a]">
          Bodhi
        </span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {NAV.map((node) => {
          if (node.kind === "item") {
            const active = matchActive(pathname, [node.href]);
            return (
              <Link
                key={node.href}
                href={node.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-neutral-100 text-[#1a1a1a]"
                    : "text-neutral-500 hover:bg-neutral-50 hover:text-[#1a1a1a]",
                )}
              >
                <node.icon
                  size={18}
                  className={active ? "text-[#1a1a1a]" : "text-neutral-400"}
                />
                {node.label}
              </Link>
            );
          }

          const Icon = node.icon;
          return (
            <div key={node.label} className="pt-1">
              <button
                type="button"
                onClick={() => setOpenLibrary((o) => !o)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  libraryActive
                    ? "text-[#1a1a1a]"
                    : "text-neutral-500 hover:bg-neutral-50 hover:text-[#1a1a1a]",
                )}
                aria-expanded={openLibrary}
              >
                <Icon
                  size={18}
                  className={libraryActive ? "text-[#1a1a1a]" : "text-neutral-400"}
                />
                {node.label}
                <ChevronDownIcon
                  size={16}
                  className={cn(
                    "ml-auto text-neutral-400 transition-transform",
                    openLibrary && "rotate-180",
                  )}
                />
              </button>

              {openLibrary && (
                <div className="relative mt-1 ml-[22px] space-y-0.5 border-l border-neutral-200 pl-3">
                  {node.children.map((child) => {
                    const active = matchActive(pathname, [child.href]);
                    const count = child.countKey ? counts[child.countKey] : undefined;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onNavigate}
                        className={cn(
                          "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                          active
                            ? "bg-neutral-100 text-[#1a1a1a]"
                            : "text-neutral-500 hover:bg-neutral-50 hover:text-[#1a1a1a]",
                        )}
                      >
                        {active && (
                          <span className="absolute -left-[15px] top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-neutral-900" />
                        )}
                        {child.label}
                        {typeof count === "number" && count > 0 && (
                          <CountBadge value={count} active={active} />
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="px-5 py-4 text-xs text-neutral-400">
        Bodhi — AI Mock Interviewer
      </div>
    </div>
  );
}


function Sidebar({ counts, onNavigate }: { counts: Counts; onNavigate?: () => void }) {
  return (
    <div className="flex h-full">
      <IconRail onNavigate={onNavigate} />
      <NavPanel counts={counts} onNavigate={onNavigate} />
    </div>
  );
}


export default function AppShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [counts, setCounts] = useState<Counts>({});
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([listCompanies(), listRoles()]).then(([c, r]) => {
      if (cancelled) return;
      setCounts({
        companies: c.status === "fulfilled" ? c.value.length : undefined,
        roles: r.status === "fulfilled" ? r.value.length : undefined,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#1a1a1a]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden md:block">
        <Sidebar counts={counts} />
      </aside>

      {drawerOpen && (
        <div className="md:hidden">
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <aside className="fixed inset-y-0 left-0 z-50 animate-scale-in">
            <Sidebar counts={counts} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="md:pl-[304px]">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-neutral-200 bg-white/85 px-4 backdrop-blur-md sm:px-6 md:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100"
            >
              <MenuIcon size={18} />
            </button>
            <Link
              href="/dashboard"
              className="text-[14px] font-bold uppercase tracking-[0.25em] text-[#1a1a1a]"
            >
              BODHI
            </Link>
          </div>

          <UserButton appearance={{ elements: { avatarBox: "w-8 h-8" } }} />
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
