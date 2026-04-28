"use client";

import { type LucideIcon } from "lucide-react";
import { type SVGProps } from "react";

interface IconWrapperProps {
  icon?: LucideIcon;
  customSvg?: React.FC<SVGProps<SVGSVGElement>>;
  size?: number;
  className?: string;
  label?: string;
}

/**
 * Unified icon wrapper that accepts a lucide icon or a custom SVG component.
 * Swap the SVG slot without touching consumer code.
 */
export function IconWrapper({
  icon: LucideIconComponent,
  customSvg: CustomSvg,
  size = 20,
  className = "",
  label,
}: IconWrapperProps) {
  const ariaProps = label
    ? { "aria-label": label, role: "img" as const }
    : { "aria-hidden": true as const };

  if (CustomSvg) {
    return (
      <CustomSvg
        width={size}
        height={size}
        className={className}
        {...ariaProps}
      />
    );
  }

  if (LucideIconComponent) {
    return (
      <LucideIconComponent size={size} className={className} {...ariaProps} />
    );
  }

  return null;
}
