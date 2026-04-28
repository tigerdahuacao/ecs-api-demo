/**
 * @file src/components/common/icons/IconWrapper.tsx
 * 统一图标包装组件 / Unified icon wrapper component
 *
 * 作用 / Purpose:
 *   提供一个统一的接口，兼容 Lucide 图标和自定义 SVG 组件。
 *   当需要将 Lucide 图标替换为自定义 SVG 时，只需修改传入的 prop，
 *   无需改动所有使用方的代码。
 *
 *   Provides a unified interface that accepts both Lucide icons and custom SVG components.
 *   To swap a Lucide icon for a custom SVG, change the prop at the call site —
 *   no need to modify consumer code.
 *
 * 被引用于 / Imported by: 当前项目暂未广泛使用，保留供扩展
 *                          Not widely used yet; retained for extensibility
 */
"use client";

import { type LucideIcon } from "lucide-react";
import { type SVGProps } from "react";

interface IconWrapperProps {
  /** Lucide 图标组件（与 customSvg 二选一）/ Lucide icon component (mutually exclusive with customSvg) */
  icon?: LucideIcon;
  /** 自定义 SVG 组件（与 icon 二选一）/ Custom SVG component (mutually exclusive with icon) */
  customSvg?: React.FC<SVGProps<SVGSVGElement>>;
  /** 图标尺寸（px），默认 20 / Icon size (px), default 20 */
  size?: number;
  /** 额外 CSS 类 / Additional CSS classes */
  className?: string;
  /** 无障碍标签（有则设置 aria-label，无则 aria-hidden）
   *  Accessibility label (sets aria-label if provided, aria-hidden otherwise) */
  label?: string;
}

/**
 * IconWrapper — 统一图标包装组件
 * IconWrapper — unified icon wrapper component
 *
 * @param icon Lucide 图标组件 / Lucide icon component
 * @param customSvg 自定义 SVG 组件 / Custom SVG component
 * @param size 图标尺寸 px / Icon size in px
 * @param className 额外 CSS 类 / Extra CSS classes
 * @param label 无障碍标签文本 / Accessibility label text
 * @returns 渲染图标，若两者均未传则返回 null / Renders icon, returns null if neither is provided
 */
export function IconWrapper({
  icon: LucideIconComponent,
  customSvg: CustomSvg,
  size = 20,
  className = "",
  label,
}: IconWrapperProps) {
  // 有 label → 图标有语义，设置 aria-label + role="img"
  // Has label → icon is semantic; set aria-label + role="img"
  // 无 label → 图标仅装饰用，设置 aria-hidden 对屏幕阅读器隐藏
  // No label → icon is decorative; hide from screen readers with aria-hidden
  const ariaProps = label
    ? { "aria-label": label, role: "img" as const }
    : { "aria-hidden": true as const };

  // 优先渲染自定义 SVG / Custom SVG takes priority
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

  // 其次渲染 Lucide 图标 / Fall back to Lucide icon
  if (LucideIconComponent) {
    return (
      <LucideIconComponent size={size} className={className} {...ariaProps} />
    );
  }

  // 两者均未传则不渲染 / Render nothing if neither is provided
  return null;
}
