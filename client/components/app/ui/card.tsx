import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export function Card({ interactive, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[rgba(55,50,47,0.08)] bg-bodhi-surface shadow-[0_1px_2px_rgba(55,50,47,0.04),0_20px_48px_-16px_rgba(55,50,47,0.14)]",
        interactive &&
          "transition-all duration-200 hover:border-[rgba(55,50,47,0.24)] hover:shadow-[0_1px_2px_rgba(55,50,47,0.04),0_24px_56px_-16px_rgba(55,50,47,0.2)] cursor-pointer",
        className,
      )}
      {...props}
    />
  );
}
