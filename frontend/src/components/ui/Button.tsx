import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { FiLoader } from "react-icons/fi";
import { cn } from "../../lib/cn";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "success";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: "bg-navy-800 text-white hover:bg-navy-700 focus-visible:ring-navy-600",
  secondary: "border border-slate-300 bg-white text-black hover:bg-slate-50 focus-visible:ring-navy-600",
  danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
  success: "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500",
  ghost: "text-slate-700 hover:bg-slate-100 focus-visible:ring-navy-600",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, icon, children, className, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? <FiLoader className="animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});
