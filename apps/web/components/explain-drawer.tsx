"use client";

import { Info, X } from "lucide-react";
import { useId, useRef, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

/**
 * A slide-over explanation built on the native modal dialog: focus moves in
 * on open, Escape closes it, and focus returns to the trigger.
 */
export function ExplainDrawer({
  triggerLabel,
  title,
  children,
}: {
  triggerLabel: string;
  title: string;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
      >
        <Info aria-hidden="true" className="size-4" />
        {triggerLabel}
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby={headingId}
        // A click on the backdrop lands on the dialog element itself.
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current.close();
        }}
        className="fixed inset-y-0 right-0 left-auto m-0 h-full max-h-none w-full max-w-md bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/40"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <h2 id={headingId} className="text-lg font-semibold">
              {title}
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Close explanation"
              onClick={() => dialog.current?.close()}
            >
              <X aria-hidden="true" className="size-5" />
            </Button>
          </div>
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 text-sm leading-6 text-slate-700">
            {children}
          </div>
        </div>
      </dialog>
    </>
  );
}
