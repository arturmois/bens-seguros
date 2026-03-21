'use client';

import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverPopup } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  readonly value?: Date;
  readonly onChange: (date: Date | undefined) => void;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly className?: string;
}

function formatDatePtBR(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(date);
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Selecione uma data',
  disabled,
  className,
}: DatePickerProps): React.ReactElement {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          'border-input bg-background shadow-xs focus-visible:ring-ring/24 focus-visible:border-ring inline-flex h-9 w-full items-center justify-start gap-2 rounded-lg border px-3 py-1 text-left text-base font-normal transition-colors focus-visible:outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm',
          !value && 'text-muted-foreground',
          className,
        )}
        disabled={disabled}
      >
        <CalendarIcon className="size-4 shrink-0" />
        {value ? formatDatePtBR(value) : placeholder}
      </PopoverTrigger>
      <PopoverPopup className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            onChange(date);
            setOpen(false);
          }}
          locale={ptBR}
          defaultMonth={value}
        />
      </PopoverPopup>
    </Popover>
  );
}
