'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface NativeSelectOption {
  readonly value: string;
  readonly label: string;
}

interface NativeSelectProps extends Omit<React.ComponentProps<'select'>, 'children'> {
  readonly options: readonly NativeSelectOption[];
  readonly placeholder?: string;
}

export function NativeSelect({
  className,
  options,
  placeholder,
  ...props
}: NativeSelectProps): React.ReactElement {
  return (
    <select
      className={cn(
        'border-input bg-background shadow-xs focus-visible:ring-ring/24 focus-visible:border-ring flex h-9 w-full rounded-lg border px-3 py-1 text-base transition-colors focus-visible:outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm',
        className,
      )}
      data-slot="native-select"
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
