'use client';

import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion';
import { ChevronDownIcon } from 'lucide-react';
import type React from 'react';
import { cn } from '@/lib/utils';

export function Accordion(props: AccordionPrimitive.Root.Props): React.ReactElement {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />;
}

export function AccordionItem({
  className,
  ...props
}: AccordionPrimitive.Item.Props): React.ReactElement {
  return (
    <AccordionPrimitive.Item
      className={cn('border-b last:border-b-0', className)}
      data-slot="accordion-item"
      {...props}
    />
  );
}

export function AccordionTrigger({
  className,
  children,
  ...props
}: AccordionPrimitive.Trigger.Props): React.ReactElement {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          'focus-visible:ring-ring disabled:opacity-64 data-panel-open:*:data-[slot=accordion-indicator]:rotate-180 flex flex-1 cursor-pointer items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium outline-none transition-all focus-visible:ring-[3px] disabled:pointer-events-none',
          className,
        )}
        data-slot="accordion-trigger"
        {...props}
      >
        {children}
        <ChevronDownIcon
          className="pointer-events-none size-4 shrink-0 translate-y-0.5 opacity-80 transition-transform duration-200 ease-in-out"
          data-slot="accordion-indicator"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionPanel({
  className,
  children,
  ...props
}: AccordionPrimitive.Panel.Props): React.ReactElement {
  return (
    <AccordionPrimitive.Panel
      className="h-(--accordion-panel-height) text-muted-foreground data-ending-style:h-0 data-starting-style:h-0 overflow-hidden text-sm transition-[height] duration-200 ease-in-out"
      data-slot="accordion-panel"
      {...props}
    >
      <div className={cn('pb-4 pt-0', className)}>{children}</div>
    </AccordionPrimitive.Panel>
  );
}

export { AccordionPrimitive, AccordionPanel as AccordionContent };
