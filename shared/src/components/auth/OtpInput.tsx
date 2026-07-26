import React, { useRef, useState, KeyboardEvent } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function OtpInput({ length = 6, value, onChange, className }: OtpInputProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) return;

    const char = val[val.length - 1]; // get the last character
    const newValue = value.split('');
    newValue[index] = char;
    
    onChange(newValue.join(''));

    // Move focus forward
    if (index < length - 1 && inputs.current[index + 1]) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      const newValue = value.split('');
      if (newValue[index]) {
        newValue[index] = '';
        onChange(newValue.join(''));
      } else if (index > 0 && inputs.current[index - 1]) {
        inputs.current[index - 1]?.focus();
        newValue[index - 1] = '';
        onChange(newValue.join(''));
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(pastedData);
    
    // Focus the next empty input or the last one
    const nextIndex = Math.min(pastedData.length, length - 1);
    inputs.current[nextIndex]?.focus();
  };

  const arr = Array.from({ length });

  return (
    <div className={twMerge('flex gap-2 justify-center', className)}>
      {arr.map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onPaste={handlePaste}
          className="w-12 h-14 text-center text-2xl font-semibold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-black"
        />
      ))}
    </div>
  );
}
