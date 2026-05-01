"use client";

import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="kb-label">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`kb-input ${error ? "border-red-500" : ""} ${className}`}
          {...props}
        />
        {error && (
          <p style={{ color: "#ff6b6b", fontSize: 12, marginTop: 6, fontFamily: "var(--kb-mono)" }}>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
