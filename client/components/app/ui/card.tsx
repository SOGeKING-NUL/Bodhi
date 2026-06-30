import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export function Card({ interactive, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-neutral-200 bg-white",
        interactive &&
          "transition-all duration-200 hover:border-neutral-300 hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)] cursor-pointer",
        className,
      )}
      {...props}
    />
  );
}
