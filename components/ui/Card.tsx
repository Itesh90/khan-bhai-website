import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className = "", ...props }, ref) => {
    return (
      <div ref={ref} className={`kb-card ${className}`} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
export default Card;
