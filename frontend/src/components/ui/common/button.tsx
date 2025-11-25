import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "default"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive";

export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  as?: "button" | "a";
  href?: string;
}

const variantClass: Record<ButtonVariant, string> = {
  default:
    "bg-foreground text-background hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30",
  secondary:
    "bg-foreground/10 text-foreground hover:bg-foreground/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
  outline:
    "border border-foreground/20 text-foreground hover:bg-foreground/5",
  ghost: "text-foreground hover:bg-foreground/10",
  destructive:
    "bg-red-600 text-white hover:bg-red-600/90 focus-visible:ring-2 focus-visible:ring-red-400",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
  lg: "h-10 px-5 text-base",
  icon: "h-9 w-9",
};

export const Button = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  ({ className, variant = "default", size = "md", as = "button", href, ...props }, ref) => {
    const commonClass = cn(
      "inline-flex items-center justify-center rounded-md font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none",
      variantClass[variant],
      sizeClass[size],
      className
    );

    if (as === "a") {
      // Render anchor element for hash links or navigation
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          className={commonClass}
          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        />
      );
    }

    return (
      // @ts-expect-error: ref type is compatible for button here
      <button ref={ref} className={commonClass} {...props} />
    );
  }
);

Button.displayName = "Button";

export default Button;
