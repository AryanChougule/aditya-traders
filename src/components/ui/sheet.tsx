"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Bottom sheet on phones, centred dialog from `sm` up. Radix handles focus trap, Esc and scroll lock. */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-scrim animate-fade-in" />
        <Dialog.Content
          className={cn(
            "fixed z-50 flex max-h-[88dvh] flex-col bg-surface text-fg shadow-2xl outline-none animate-sheet-up",
            "inset-x-0 bottom-0 rounded-t-3xl",
            "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl",
            className,
          )}
        >
          <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-border sm:hidden" aria-hidden />
          <div className="flex items-start gap-3 px-5 pb-2 pt-3">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="font-display text-lg font-semibold">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-0.5 text-sm text-muted">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              className="-mr-2 grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-muted hover:bg-surface-2"
              aria-label="Close"
            >
              <X className="size-5" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>
          {footer ? (
            <div className="border-t border-border px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">{footer}</div>
          ) : (
            <div className="pb-[env(safe-area-inset-bottom)]" />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
