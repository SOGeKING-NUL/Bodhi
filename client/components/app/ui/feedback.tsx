import type { ReactNode } from "react";
import { AlertIcon, CheckIcon, type IconType } from "@/components/app/ui/icons";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-16", className)}>
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-600" />
    </div>
  );
}

export function Alert({
  type = "error",
  children,
}: {
  type?: "success" | "error";
  children: ReactNode;
}) {
  const success = type === "success";
  const Icon = success ? CheckIcon : AlertIcon;
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm",
        success
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-700",
      )}
    >
      <Icon size={16} className="mt-0.5 shrink-0" />
      <span className="leading-relaxed">{children}</span>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: IconType;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-bodhi-line bg-bodhi-surface/60 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
        <Icon size={22} />
      </div>
      <h3 className="mt-4 text-base font-semibold text-[#1a1a1a]">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-neutral-500">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
