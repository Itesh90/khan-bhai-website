"use client";

import { motion, useInView, type HTMLMotionProps } from "framer-motion";
import { useRef, type ReactNode } from "react";

type RevealAs = "div" | "section" | "article" | "li";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: RevealAs;
  once?: boolean;
  yOffset?: number;
}

/**
 * Scroll-triggered fade-in + slide-up wrapper using Framer Motion's `useInView`.
 * Honors `prefers-reduced-motion` via the global CSS reset and supports a few
 * common semantic tags via the `as` prop.
 */
export default function Reveal({
  children,
  delay = 0,
  className = "",
  as = "div",
  once = true,
  yOffset = 18,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once, margin: "-80px" });

  const transition = { duration: 0.9, delay, ease: [0.2, 0.7, 0.2, 1] as const };
  const initial = { opacity: 0, y: yOffset };
  const animate = inView ? { opacity: 1, y: 0 } : initial;

  // Type-cast ref to the appropriate element type for each tag
  const sharedProps: HTMLMotionProps<"div"> = {
    className,
    initial,
    animate,
    transition,
  };

  if (as === "section") {
    return (
      <motion.section
        ref={ref as React.RefObject<HTMLElement>}
        {...(sharedProps as HTMLMotionProps<"section">)}
      >
        {children}
      </motion.section>
    );
  }
  if (as === "article") {
    return (
      <motion.article
        ref={ref as React.RefObject<HTMLElement>}
        {...(sharedProps as HTMLMotionProps<"article">)}
      >
        {children}
      </motion.article>
    );
  }
  if (as === "li") {
    return (
      <motion.li
        ref={ref as React.RefObject<HTMLLIElement>}
        {...(sharedProps as HTMLMotionProps<"li">)}
      >
        {children}
      </motion.li>
    );
  }
  return (
    <motion.div ref={ref as React.RefObject<HTMLDivElement>} {...sharedProps}>
      {children}
    </motion.div>
  );
}
