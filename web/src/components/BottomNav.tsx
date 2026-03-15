import { Info, Map, NotebookTabs, Plus, Wifi } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

import { cn } from "@/lib/utils";

type BottomNavProps = {
  activePath: string;
  isMapRoute: boolean;
  addActive: boolean;
  onOpenAdd: () => void;
};

type BottomNavLinkProps = {
  to: string;
  label: ReactNode;
  icon: ReactNode;
  active: boolean;
};

export function BottomNav({ activePath, isMapRoute, addActive, onOpenAdd }: BottomNavProps) {
  return (
    <nav className={cn("fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40 mx-auto max-w-[34rem]", isMapRoute ? "" : "")}>
      <button
        type="button"
        aria-label="Добавить Wi-Fi"
        onClick={onOpenAdd}
        className={cn(
          "glass-panel absolute left-1/2 top-0 inline-flex min-h-[4.5rem] min-w-[13rem] -translate-x-1/2 -translate-y-[58%] items-center gap-3 rounded-[1.6rem] border px-4 py-3 text-left transition-all duration-300 ease-out active:scale-[0.98]",
          addActive
            ? "border-brand-500 bg-brand-500 text-white shadow-[0_18px_40px_rgba(37,99,235,0.28)]"
            : "border-[var(--panel-border)] bg-[color:color-mix(in_srgb,var(--panel-solid)_94%,transparent)] text-[var(--app-fg)]",
        )}
      >
        <span
          className={cn(
            "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
            addActive ? "bg-white/16 text-white" : "bg-brand-500 text-white",
          )}
        >
          <Wifi className="h-5 w-5" strokeWidth={2.4} />
        </span>
        <span className="min-w-0">
          <span className={cn("block text-[10px] font-bold uppercase tracking-[0.18em]", addActive ? "text-white/72" : "text-[var(--app-muted)]")}>
            Новый Wi-Fi
          </span>
          <span className="mt-1 flex items-center gap-2 text-base font-semibold">
            <Plus className="h-4 w-4" strokeWidth={2.4} />
            Добавить Wi-Fi
          </span>
        </span>
      </button>
      <div className="glass-panel grid grid-cols-3 gap-3 rounded-[2rem] border border-[var(--panel-border)] px-3 pb-3 pt-8">
        <BottomNavLink to="/" label="Карта" icon={<Map className="h-5 w-5" strokeWidth={2.2} />} active={activePath === "/" || activePath.startsWith("/place/")} />
        <BottomNavLink
          to="/activity"
          label={
            <>
              <span>Мои точки</span>
              <span>и голоса</span>
            </>
          }
          icon={<NotebookTabs className="h-5 w-5" strokeWidth={2.2} />}
          active={activePath === "/activity"}
        />
        <BottomNavLink to="/about" label="О нас" icon={<Info className="h-5 w-5" strokeWidth={2.2} />} active={activePath === "/about"} />
      </div>
    </nav>
  );
}

export function BottomNavLink({ to, label, icon, active }: BottomNavLinkProps) {
  return (
    <NavLink
      to={to}
      className={cn(
        "flex min-h-[4.15rem] min-w-0 flex-col items-center justify-center gap-2 rounded-[1.35rem] border px-3 py-3 text-center text-[11px] font-semibold leading-tight transition-all duration-300",
        active
          ? "border-brand-500/30 bg-[color:color-mix(in_srgb,var(--panel-solid)_98%,transparent)] text-brand-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
          : "border-[var(--panel-border)] bg-[color:color-mix(in_srgb,var(--panel-solid)_82%,transparent)] text-[var(--app-muted)]",
      )}
    >
      <span
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-full",
          active ? "bg-brand-500/10" : "bg-[var(--panel-muted)]",
        )}
      >
        {icon}
      </span>
      <span className="flex flex-col items-center text-center">{label}</span>
    </NavLink>
  );
}
