import React from "react";

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export default function Container({
  children,
  className = "",
  as: Tag = "div",
}: ContainerProps): JSX.Element {
  const Component = Tag as React.ElementType;
  return <Component className={`kb-container ${className}`}>{children}</Component>;
}
