import { type ButtonHTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", loading, disabled, children, className, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center rounded-full font-medium transition-all cursor-pointer select-none disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.97]";

    const variants: Record<ButtonVariant, string> = {
      primary:
        "bg-indigo-400 text-slate-950 hover:bg-indigo-300 focus-visible:ring-2 focus-visible:ring-indigo-400/60",
      secondary:
        "border border-white/10 text-white hover:border-white/30 hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/20",
      danger:
        "border border-rose-400/30 text-rose-200 hover:bg-rose-400/10 focus-visible:ring-2 focus-visible:ring-rose-400/40",
      ghost:
        "text-slate-300 hover:text-white hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/20",
    };

    const sizes: Record<ButtonSize, string> = {
      sm: "px-3 py-1.5 text-xs gap-1.5",
      md: "px-4 py-2 text-sm gap-2",
      lg: "px-6 py-2.5 text-sm gap-2",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading ? (
          <>
            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            {children}
          </>
        ) : (
          children
        )}
      </button>
    );
  },
);

Button.displayName = "Button";
