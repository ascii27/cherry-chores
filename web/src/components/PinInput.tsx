import React, { useRef } from 'react';

interface PinInputProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}

/**
 * Compact numeric PIN input for parent-facing forms.
 * Accepts only digit characters, displays as dots.
 */
export default function PinInput({ value, onChange, maxLength = 6 }: PinInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, maxLength);
    onChange(digits);
  }

  return (
    <div className="pin-input-wrap" onClick={() => inputRef.current?.focus()}>
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={handleChange}
        maxLength={maxLength}
        className="pin-input-hidden"
        aria-label="Numeric PIN"
        autoComplete="off"
      />
      <div className="pin-input-dots" aria-hidden>
        {Array.from({ length: maxLength }).map((_, i) => (
          <span key={i} className={`pin-dot${i < value.length ? ' pin-dot--filled' : ''}`} />
        ))}
      </div>
      <span className="pin-input-hint">{value.length}/{maxLength} digits</span>
    </div>
  );
}
