import React from 'react';

interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Placeholder Rich Text Editor component
 * TODO: Implement actual rich text editor functionality
 */
export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value = '',
  onChange,
  placeholder = 'Enter text...',
  className = '',
  disabled = false,
}) => {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className={`w-full min-h-[200px] p-3 border rounded-lg ${className}`}
      disabled={disabled}
    />
  );
};

export default RichTextEditor;