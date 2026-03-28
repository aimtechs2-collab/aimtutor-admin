"use client";

import { useId } from "react";

export type AimTutorLogoProps = {
  className?: string;
  variant?: "default" | "onDark";
  size?: "sm" | "md" | "lg";
};

const sizeClass: Record<NonNullable<AimTutorLogoProps["size"]>, string> = {
  sm: "text-base sm:text-lg",
  md: "text-lg sm:text-xl",
  lg: "text-xl sm:text-2xl lg:text-3xl",
};

/**
 * Wordmark: custom vector “A” (open crossbar, rounded strokes, gradient) + “imTutor.ai”.
 */
export default function AimTutorLogo({
  className = "",
  variant = "default",
  size = "md",
}: AimTutorLogoProps) {
  const reactId = useId();
  const gid = `aimtutor-grad-${reactId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  const tailClass = variant === "onDark" ? "text-white" : "text-neutral-950";

  const svgWrap =
    variant === "onDark"
      ? "[&_svg]:drop-shadow-[0_0_14px_rgba(56,189,248,0.45)] [&_svg]:drop-shadow-[0_0_28px_rgba(192,38,211,0.2)]"
      : "[&_svg]:drop-shadow-[0_2px_10px_rgba(37,99,235,0.2)]";

  return (
    <span
      className={`inline-flex items-baseline gap-x-[0.04em] font-sans font-extrabold tracking-[-0.045em] leading-none select-none ${sizeClass[size]} ${className}`}
      aria-label="AimTutor.ai"
    >
      <span className={`inline-flex shrink-0 ${svgWrap}`} aria-hidden>
        <svg
          className="h-[1em] w-[0.86em] translate-y-[0.06em]"
          viewBox="-8 -8 104 116"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={gid} x1="-4" y1="52" x2="92" y2="52" gradientUnits="userSpaceOnUse">
              <stop stopColor="#38bdf8" />
              <stop offset="0.45" stopColor="#2563eb" />
              <stop offset="1" stopColor="#c026d3" />
            </linearGradient>
          </defs>
          <path
            d="M 10 90 L 44 12 L 78 90"
            stroke={`url(#${gid})`}
            strokeWidth="18"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 22 58 L 50 58"
            stroke={`url(#${gid})`}
            strokeWidth="13"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className={tailClass}>imTutor.ai</span>
    </span>
  );
}
