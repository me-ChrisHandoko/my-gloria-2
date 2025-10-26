import React from 'react';
import * as LucideIcons from 'lucide-react';

interface ModuleIconProps {
  icon?: string;
  className?: string;
  size?: number;
}

/**
 * Smart icon component that supports both emoji and Lucide React icons
 *
 * Usage:
 * - Emoji: <ModuleIcon icon="📚" />
 * - Lucide: <ModuleIcon icon="GraduationCap" />
 */
export default function ModuleIcon({ icon, className = '', size = 20 }: ModuleIconProps) {
  if (!icon) return null;

  // Check if it's an emoji (1-2 characters, non-alphabetic)
  const isEmoji = icon.length <= 4 && !/^[A-Z][a-z]+/.test(icon);

  if (isEmoji) {
    // Render emoji
    return (
      <span
        className={`inline-block ${className}`}
        style={{ fontSize: size }}
      >
        {icon}
      </span>
    );
  }

  // Try to render as Lucide icon
  const IconComponent = LucideIcons[icon as keyof typeof LucideIcons] as React.ComponentType<any>;

  if (IconComponent) {
    return <IconComponent className={className} size={size} />;
  }

  // Fallback: render as text
  return <span className={className}>{icon}</span>;
}
