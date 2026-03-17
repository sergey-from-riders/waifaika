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
  const dragActiveRef = useRef(false);
  const dragStartRef = useRef<number | null>(null);
  const dragOffsetRef = useRef(0);

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

  const resetDrag = () => {
    dragActiveRef.current = false;
    dragOffsetRef.current = 0;
    setDragY(0);
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const releasePointer = (event: ReactPointerEvent<HTMLElement>) => {
    if (
      typeof event.currentTarget.hasPointerCapture === "function" &&
      typeof event.currentTarget.releasePointerCapture === "function" &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const dragHandlers = {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
      dragStartRef.current = event.clientY;
      dragActiveRef.current = true;
      setIsDragging(true);
      if (typeof event.currentTarget.setPointerCapture === "function") {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    },
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => {
      if (!dragActiveRef.current || dragStartRef.current == null) {
        return;
      }
      const delta = Math.max(0, event.clientY - dragStartRef.current);
      dragOffsetRef.current = delta;
      setDragY(delta);
    },
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => {
      if (dragOffsetRef.current > CLOSE_THRESHOLD) {
        onClose();
      }
      resetDrag();
      releasePointer(event);
    },
    onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => {
      resetDrag();
      releasePointer(event);
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
        <div
          data-testid="bottom-sheet-drag-zone"
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-5 touch-none"
          {...dragHandlers}
        />

        <div className="flex items-center justify-between gap-3 px-4 pb-1 pt-5">
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
