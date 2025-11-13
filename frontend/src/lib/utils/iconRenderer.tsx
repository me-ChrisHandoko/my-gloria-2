import React from "react";
import {
  Building2,
  Building,
  School,
  Briefcase,
  Users,
  UserCircle,
  Settings,
  BarChart,
  FileText,
  Folder,
  Home,
  Menu,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Star,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ExternalLink,
  Box,
  Dot,
  Shield,
  type LucideProps,
} from "lucide-react";

/**
 * Icon Renderer Utility
 *
 * Renders Lucide icons dynamically from string names
 * Supports kebab-case (building-2) and direct imports
 * Falls back to Box icon if icon not found
 */

// Icon registry - mapping string names to components
const ICON_REGISTRY: Record<string, React.ComponentType<LucideProps>> = {
  "building-2": Building2,
  Shield: Shield,
  Building2: Building2,
  building: Building,
  Building: Building,
  school: School,
  School: School,
  briefcase: Briefcase,
  Briefcase: Briefcase,
  users: Users,
  Users: Users,
  "user-circle": UserCircle,
  UserCircle: UserCircle,
  settings: Settings,
  Settings: Settings,
  "chart-bar": BarChart,
  "bar-chart": BarChart,
  BarChart: BarChart,
  "file-text": FileText,
  FileText: FileText,
  folder: Folder,
  Folder: Folder,
  home: Home,
  Home: Home,
  menu: Menu,
  Menu: Menu,
  "check-circle": CheckCircle,
  CheckCircle: CheckCircle,
  "x-circle": XCircle,
  XCircle: XCircle,
  "alert-triangle": AlertTriangle,
  AlertTriangle: AlertTriangle,
  info: Info,
  Info: Info,
  star: Star,
  Star: Star,
  "arrow-right": ArrowRight,
  ArrowRight: ArrowRight,
  "arrow-left": ArrowLeft,
  ArrowLeft: ArrowLeft,
  "chevron-down": ChevronDown,
  ChevronDown: ChevronDown,
  "external-link": ExternalLink,
  ExternalLink: ExternalLink,
  box: Box,
  Box: Box,
};

// Check if string is an emoji (actual emoji characters, not icon names)
function isEmoji(str: string): boolean {
  // Only match strings that contain actual emoji characters
  // Exclude strings that contain letters, numbers, or hyphens (which are icon names)
  const emojiRegex = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]+$/u;
  return emojiRegex.test(str);
}

interface IconRendererProps {
  icon?: string | null;
  className?: string;
  size?: number;
}

/**
 * Render icon from string name or emoji
 *
 * @param icon - Icon name (e.g., "building-2", "Building2") or emoji (e.g., "🏢")
 * @param className - CSS classes
 * @param size - Icon size (default: 16)
 */
export function renderIcon({
  icon,
  className = "",
  size = 16,
}: IconRendererProps): React.ReactNode {
  // Return Dot if no icon provided
  if (!icon) {
    return <Dot className={className} size={size} />;
  }

  // If it's an emoji, render as text
  if (isEmoji(icon)) {
    return (
      <span className={className} style={{ fontSize: size }}>
        {icon}
      </span>
    );
  }

  // Try to find the icon in registry (case-insensitive)
  const IconComponent =
    ICON_REGISTRY[icon] || ICON_REGISTRY[icon.toLowerCase()];

  // If icon found, render it
  if (IconComponent) {
    return <IconComponent className={className} size={size} />;
  }

  // Fallback to Dot icon if not found
  console.warn(`[IconRenderer] Icon not found: "${icon}", using Dot fallback`);
  return <Dot className={className} size={size} />;
}

/**
 * Icon component wrapper
 */
export function ModuleIcon({ icon, className, size = 16 }: IconRendererProps) {
  return <>{renderIcon({ icon, className, size })}</>;
}

/**
 * Get list of available icon names
 */
export function getAvailableIcons(): string[] {
  return Object.keys(ICON_REGISTRY).filter((key) => key.includes("-"));
}
