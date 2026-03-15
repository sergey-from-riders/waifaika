import { Map, NotebookTabs, Plus, Wifi } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

import { cn } from "@/lib/utils";

type BottomNavProps = {
  activePath: string;
  addActive: boolean;
  onOpenAdd: () => void;
};

export function BottomNav({ activePath, addActive, onOpenAdd }: BottomNavProps) {
  return (
    <nav
      data-testid="bottom-nav"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.45rem)] z-40 flex justify-center px-3"
    >
      <div className="flex w-full max-w-[30rem] items-end justify-center gap-1.5">
        <BottomNavLink
          to="/"
          label="Карта"
          icon={<Map className="h-5 w-5" strokeWidth={2.2} />}
          active={activePath === "/" || activePath.startsWith("/place/") || activePath === "/about"}
        />
        <button
          type="button"
          aria-label="Добавить Wi-Fi"
          onClick={onOpenAdd}
          className={cn(
            "pointer-events-auto inline-flex min-h-[3.85rem] min-w-[8.65rem] items-center justify-center gap-2 rounded-[1.4rem] border px-4 py-3 text-center text-sm font-semibold text-white transition-all duration-300 ease-out active:scale-[0.98]",
            addActive
              ? "border-sky-300 bg-[linear-gradient(180deg,#38bdf8,#2563eb)] shadow-[0_16px_34px_rgba(37,99,235,0.34)]"
              : "border-sky-400/60 bg-[linear-gradient(180deg,#3b82f6,#1d4ed8)] shadow-[0_16px_30px_rgba(37,99,235,0.28)]",
          )}
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/14">
            <Wifi className="h-5 w-5" strokeWidth={2.4} />
          </span>
          <span className="flex items-center gap-1 text-[0.98rem] leading-none">
            <Plus className="h-4 w-4" strokeWidth={2.6} />
            Wi-Fi
          </span>
        </button>
        <BottomNavLink
          to="/activity"
          label="Мои точки"
          icon={<NotebookTabs className="h-5 w-5" strokeWidth={2.2} />}
          active={activePath === "/activity"}
        />
      </div>
    </nav>
  );
}

function BottomNavLink({
  to,
  label,
  icon,
  active,
}: {
  to: string;
  label: string;
  icon: ReactNode;
  active: boolean;
}) {
  return (
    <NavLink
      to={to}
      className={cn(
        "pointer-events-auto flex min-h-[3.85rem] min-w-[5.25rem] flex-col items-center justify-center gap-1 rounded-[1rem] px-2 py-2 text-center text-[11px] font-semibold leading-tight transition-all duration-300 drop-shadow-[0_10px_18px_rgba(15,23,42,0.18)]",
        active
          ? "text-brand-500"
          : "text-[color:color-mix(in_srgb,var(--app-fg)_78%,transparent)]",
      )}
    >
      <span
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center transition-transform duration-300",
          active ? "scale-110" : "scale-100",
        )}
      >
        {icon}
      </span>
      <span>{label}</span>
    </NavLink>
  );
}
