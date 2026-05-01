"use client";

import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
  showArrow?: boolean;
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", showArrow = false, children, className = "", ...props }, ref) => {
    const variantClass = variant === "primary" ? "kb-btn--primary" : "kb-btn--ghost";
    return (
      <button ref={ref} className={`kb-btn ${variantClass} ${className}`} {...props}>
        {children}
        {showArrow && <span className="arr" aria-hidden />}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
