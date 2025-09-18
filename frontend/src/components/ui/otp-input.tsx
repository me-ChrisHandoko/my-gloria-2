"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface OTPInputProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  error?: boolean;
}

export function OTPInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = false,
  error = false,
  className,
  ...props
}: OTPInputProps) {
  const [focusedIndex, setFocusedIndex] = React.useState<number | null>(null);
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  // Convert string value to array of digits
  const digits = React.useMemo(() => {
    const arr = value.split("").slice(0, length);
    while (arr.length < length) {
      arr.push("");
    }
    return arr;
  }, [value, length]);

  // Auto-focus first input on mount if autoFocus is true
  React.useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  // Handle single digit input
  const handleChange = (index: number, digit: string) => {
    if (digit.length > 1) {
      // Handle paste or multiple characters
      handlePaste(index, digit);
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = digit;
    const newValue = newDigits.join("");
    onChange(newValue);

    // Move to next input if digit was entered
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if all digits are filled
    if (digit && index === length - 1 && newValue.length === length) {
      onComplete?.(newValue);
    }
  };

  // Handle paste
  const handlePaste = (startIndex: number, pastedValue: string) => {
    const pastedDigits = pastedValue
      .replace(/\D/g, "")
      .slice(0, length - startIndex);
    const newDigits = [...digits];

    for (let i = 0; i < pastedDigits.length; i++) {
      if (startIndex + i < length) {
        newDigits[startIndex + i] = pastedDigits[i];
      }
    }

    const newValue = newDigits.join("");
    onChange(newValue);

    // Focus last filled input or last input if all filled
    const lastFilledIndex = Math.min(
      startIndex + pastedDigits.length - 1,
      length - 1
    );
    inputRefs.current[lastFilledIndex]?.focus();

    // Check if complete
    if (newValue.length === length) {
      onComplete?.(newValue);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    switch (e.key) {
      case "Backspace":
        e.preventDefault();
        if (digits[index]) {
          // Clear current digit
          const newDigits = [...digits];
          newDigits[index] = "";
          onChange(newDigits.join(""));
        } else if (index > 0) {
          // Move to previous input and clear it
          const newDigits = [...digits];
          newDigits[index - 1] = "";
          onChange(newDigits.join(""));
          inputRefs.current[index - 1]?.focus();
        }
        break;

      case "Delete":
        e.preventDefault();
        const newDigits = [...digits];
        newDigits[index] = "";
        onChange(newDigits.join(""));
        break;

      case "ArrowLeft":
        e.preventDefault();
        if (index > 0) {
          inputRefs.current[index - 1]?.focus();
        }
        break;

      case "ArrowRight":
        e.preventDefault();
        if (index < length - 1) {
          inputRefs.current[index + 1]?.focus();
        }
        break;

      case "Enter":
        e.preventDefault();
        if (value.length === length) {
          onComplete?.(value);
        }
        break;

      case " ":
        e.preventDefault();
        break;

      default:
        // Allow only digits
        if (!/^\d$/.test(e.key) && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
        }
        break;
    }
  };

  // Handle paste event
  const handlePasteEvent = (
    index: number,
    e: React.ClipboardEvent<HTMLInputElement>
  ) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    handlePaste(index, pastedText);
  };

  // Handle focus
  const handleFocus = (index: number) => {
    setFocusedIndex(index);
    // Select text on focus for easy replacement
    inputRefs.current[index]?.select();
  };

  // Handle blur
  const handleBlur = () => {
    setFocusedIndex(null);
  };

  return (
    <div className={cn("flex gap-2 sm:gap-3", className)} {...props}>
      {Array.from({ length }, (_, index) => (
        <div key={index} className="relative">
          <input
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="\d*"
            maxLength={1}
            value={digits[index]}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={(e) => handlePasteEvent(index, e)}
            onFocus={() => handleFocus(index)}
            onBlur={handleBlur}
            disabled={disabled}
            className={cn(
              "w-10 h-12 sm:w-12 sm:h-14",
              "text-center text-lg sm:text-xl font-semibold",
              "border-2 rounded-lg",
              "transition-all duration-200",
              "outline-none",
              // Default border
              "border-input",
              // Focus state
              "focus:border-primary focus:ring-2 focus:ring-primary/20",
              // Filled state
              digits[index] && "border-primary/40",
              // Error state
              error &&
                "border-destructive focus:border-destructive focus:ring-destructive/20",
              // Disabled state
              disabled && "opacity-50 cursor-not-allowed bg-muted",
              // Active/focused visual feedback
              focusedIndex === index && "transform scale-105 shadow-sm"
            )}
            aria-label={`OTP digit ${index + 1}`}
            aria-invalid={error}
            autoComplete="one-time-code"
          />
        </div>
      ))}
    </div>
  );
}
