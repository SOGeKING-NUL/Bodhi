import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export function Card({ interactive, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-bodhi-line bg-bodhi-surface",
        interactive &&
          "transition-all duration-200 hover:border-[rgba(55,50,47,0.24)] hover:shadow-[0_4px_24px_rgba(55,50,47,0.08)] cursor-pointer",
        className,
      )}
      {...props}
    />
  );
}
