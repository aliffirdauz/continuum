"use client";

import { Info } from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

const TIP_WIDTH = 256;

/**
 * A definition shown on hover or keyboard focus, dismissible with Escape. On
 * narrow screens it docks to the bottom of the viewport so it can never widen
 * the page; on wider screens it opens toward whichever side has room.
 */
export function InfoTip({
  term,
  children,
}: {
  term: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  const show = () => {
    const left = button.current?.getBoundingClientRect().left ?? 0;
    setAlignRight(left + TIP_WIDTH > window.innerWidth - 16);
    setOpen(true);
  };
  return (
    <span
      className="relative inline-flex align-middle"
      onMouseEnter={show}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        ref={button}
        type="button"
        aria-label={`About ${term}`}
        aria-describedby={id}
        aria-expanded={open}
        onFocus={show}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        className="grid size-6 place-items-center rounded-full text-slate-500 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:outline-none"
      >
        <Info aria-hidden="true" className="size-3.5" />
      </button>
      <span
        role="tooltip"
        id={id}
        hidden={!open}
        className={cn(
          "fixed inset-x-4 bottom-4 z-50 rounded-lg bg-slate-950 px-3 py-2 text-xs leading-5 font-normal text-white shadow-lg",
          "sm:absolute sm:inset-x-auto sm:top-full sm:bottom-auto sm:mt-1 sm:w-64",
          alignRight ? "sm:right-0" : "sm:left-0",
        )}
      >
        {children}
      </span>
    </span>
  );
}
