import { Cross2Icon } from "@radix-ui/react-icons";
import { type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

type BottomSheetProps = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  headerSlot?: ReactNode;
};

const CLOSE_THRESHOLD = 96;

export function BottomSheet({
  open,
  title,
  onClose,
  children,
  className,
  contentClassName,
  headerSlot,
}: BottomSheetProps) {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      setDragY(0);
      setIsDragging(false);
      dragStartRef.current = null;
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  const sheetStyle: CSSProperties = {
    transform: `translateY(${dragY}px)`,
    transition: isDragging ? "none" : "transform 280ms cubic-bezier(0.22, 1, 0.36, 1), opacity 280ms ease",
  };

  const dragHandlers = {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
      dragStartRef.current = event.clientY;
      setIsDragging(true);
      if (typeof event.currentTarget.setPointerCapture === "function") {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    },
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => {
      if (!isDragging || dragStartRef.current == null) {
        return;
      }
      const delta = Math.max(0, event.clientY - dragStartRef.current);
      setDragY(delta);
    },
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => {
      if (dragY > CLOSE_THRESHOLD) {
        onClose();
      }
      setDragY(0);
      setIsDragging(false);
      dragStartRef.current = null;
      if (
        typeof event.currentTarget.hasPointerCapture === "function" &&
        typeof event.currentTarget.releasePointerCapture === "function" &&
        event.currentTarget.hasPointerCapture(event.pointerId)
      ) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => {
      setDragY(0);
      setIsDragging(false);
      dragStartRef.current = null;
      if (
        typeof event.currentTarget.hasPointerCapture === "function" &&
        typeof event.currentTarget.releasePointerCapture === "function" &&
        event.currentTarget.hasPointerCapture(event.pointerId)
      ) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
  };

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Закрыть панель"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      <section
        className={cn(
          "absolute inset-x-0 bottom-0 mx-auto flex max-h-[86dvh] w-full max-w-[30rem] flex-col overflow-hidden rounded-t-[2rem] border border-[var(--panel-border)] bg-[var(--sheet-bg)] text-[var(--app-fg)]",
          className,
        )}
        style={sheetStyle}
      >
        <div className="flex justify-center px-4 pt-3">
          <div
            data-testid="bottom-sheet-grip"
            aria-hidden="true"
            className="flex h-10 w-16 items-center justify-center rounded-full bg-[var(--panel-muted)] text-[var(--app-muted)]"
            {...dragHandlers}
          >
            <div className="h-1.5 w-9 rounded-full bg-current/70" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-4 pb-1 pt-1">
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              {title ? <h2 className="truncate text-lg font-semibold">{title}</h2> : null}
              {headerSlot ? <div className="mt-0.5 text-sm text-[var(--app-muted)]">{headerSlot}</div> : null}
            </div>
          </div>
          <button
            type="button"
            aria-label="Закрыть"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--panel-muted)] text-[var(--app-fg)]"
          >
            <Cross2Icon />
          </button>
        </div>

        <div className={cn("scroll-safe overflow-y-auto px-4 pb-7 pt-4", contentClassName)}>{children}</div>
      </section>
    </div>,
    document.body,
  );
}
