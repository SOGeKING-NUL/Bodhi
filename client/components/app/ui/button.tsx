import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-[#1a1a1a] text-white hover:bg-black border border-transparent shadow-sm",
  secondary:
    "bg-white text-[#1a1a1a] border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300",
  ghost:
    "bg-transparent text-neutral-600 border border-transparent hover:bg-neutral-100 hover:text-[#1a1a1a]",
  danger:
    "bg-white text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px] rounded-lg gap-1.5",
  md: "h-10 px-5 text-sm rounded-lg gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      disabled,
      className,
      children,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-200 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-black/15 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      )}
      {children}
    </button>
  ),
);

Button.displayName = "Button";
