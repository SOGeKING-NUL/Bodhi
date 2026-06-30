"use client";

import { useEffect, type ReactNode } from "react";
import { CloseIcon } from "@/components/app/ui/icons";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidthClassName?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidthClassName = "max-w-xl",
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.2)] animate-scale-in flex flex-col max-h-[88vh]",
          maxWidthClassName,
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-5 border-b border-neutral-100">
            <div className="min-w-0">
              {title && (
                <h2 className="text-lg font-semibold tracking-tight text-[#1a1a1a]">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-neutral-500 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 -mt-1 -mr-1 flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
            >
              <CloseIcon size={18} />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <div className="border-t border-neutral-100 px-6 py-4">{footer}</div>
        )}
      </div>
    </div>
  );
}
