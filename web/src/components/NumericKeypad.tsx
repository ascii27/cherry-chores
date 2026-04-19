import React from 'react';

interface NumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  /** Show dots for entered digits */
  showDots?: boolean;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export default function NumericKeypad({
  value,
  onChange,
  maxLength = 6,
  showDots = true,
}: NumericKeypadProps) {
  function handleKey(key: string) {
    if (key === '⌫') {
      onChange(value.slice(0, -1));
    } else if (key === '') {
      // empty slot — no-op
    } else if (value.length < maxLength) {
      onChange(value + key);
    }
  }

  return (
    <div className="kp-root">
      {showDots && (
        <div className="kp-dots" aria-label={`${value.length} digits entered`}>
          {Array.from({ length: maxLength }).map((_, i) => (
            <span
              key={i}
              className={`kp-dot${i < value.length ? ' kp-dot--filled' : ''}`}
            />
          ))}
        </div>
      )}

      <div className="kp-grid" role="group" aria-label="Numeric keypad">
        {KEYS.map((key, i) => {
          const isEmpty = key === '';
          const isBackspace = key === '⌫';
          return (
            <button
              key={i}
              type="button"
              className={`kp-key${isEmpty ? ' kp-key--empty' : ''}${isBackspace ? ' kp-key--back' : ''}`}
              onClick={() => handleKey(key)}
              disabled={isEmpty}
              aria-label={isBackspace ? 'Delete last digit' : isEmpty ? undefined : key}
              tabIndex={isEmpty ? -1 : 0}
            >
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
}
