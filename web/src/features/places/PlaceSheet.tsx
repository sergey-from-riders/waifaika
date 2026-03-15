import {
  CheckCircledIcon,
  CopyIcon,
  CrossCircledIcon,
  Pencil2Icon,
  Share1Icon,
} from "@radix-ui/react-icons";
import type { ReactNode } from "react";

import type { DecoratedPlace } from "@/app/ui-models";
import { accessTypeLabel, venueTypeLabel } from "@/lib/labels";
import type { Place, VoteType } from "@/lib/types";
import { VoteType as VoteTypeEnum } from "@/lib/types";
import { cn, formatDate, formatDistance, normalizeDegrees } from "@/lib/utils";

type PlaceSheetProps = {
  place: DecoratedPlace;
  canEdit: boolean;
  originLabel: string;
  onEdit: () => void;
  onVote: (placeId: string, vote: VoteType) => void;
  onShare: (place: Place) => void;
  onCopyCoordinates: (place: Place) => void;
};

export function PlaceSheet(props: PlaceSheetProps) {
  const worksActive = props.place.local_vote?.vote === VoteTypeEnum.Works;
  const notWorksActive = props.place.local_vote?.vote === VoteTypeEnum.NotWorks;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm uppercase tracking-[0.16em] text-brand-500">{venueTypeLabel[props.place.venue_type]}</p>
          <h3 className="truncate text-[2rem] font-bold leading-none">{props.place.place_name}</h3>
          <p className="mt-2 truncate text-[1.02rem] text-[var(--app-muted)]">{props.place.wifi_name}</p>
          {props.place.description ? <p className="mt-2 text-sm text-[var(--app-muted)]">{props.place.description}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => props.onShare(props.place)}
          aria-label="Поделиться точкой"
          className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--panel-border)] bg-[var(--panel-muted)] text-[var(--app-fg)] transition-transform duration-300 ease-out active:scale-95"
        >
          <Share1Icon />
        </button>
      </div>

      <button
        type="button"
        onClick={() => props.onCopyCoordinates(props.place)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-[1.2rem] border border-[var(--panel-border)] bg-[var(--panel-muted)] px-4 py-4 text-base font-semibold text-[var(--app-fg)]"
      >
        <CopyIcon />
        Скопировать координаты
      </button>

      <div className="rounded-[1.75rem] border border-[var(--panel-border)] bg-[var(--panel-solid)] p-4">
        <div className="flex items-center gap-4">
          <DirectionBadge degrees={props.place.direction_degrees ?? 0} />
          <div className="min-w-0">
            <p className="text-sm uppercase tracking-[0.16em] text-brand-500">Направление</p>
            <p className="mt-1 text-[2.5rem] font-bold leading-none">{formatDistance(props.place.distance_meters)}</p>
            <p className="mt-2 text-[1.02rem] text-[var(--app-muted)]">Точка находится {props.originLabel}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <VoteButton
          tone="positive"
          active={worksActive}
          icon={<CheckCircledIcon />}
          title="Работает"
          count={props.place.works_count}
          onClick={() => props.onVote(props.place.place_id, VoteTypeEnum.Works)}
        />
        <VoteButton
          tone="negative"
          active={notWorksActive}
          icon={<CrossCircledIcon />}
          title="Не работает"
          count={props.place.not_works_count}
          onClick={() => props.onVote(props.place.place_id, VoteTypeEnum.NotWorks)}
        />
      </div>

      {props.place.promo_text ? (
        <div className="rounded-[1.5rem] bg-[var(--panel-muted)] p-4">
          <p className="text-sm uppercase tracking-[0.16em] text-[var(--app-muted)]">Что взять</p>
          <p className="mt-2 text-lg font-medium">{props.place.promo_text}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Metric title="Доступ" value={accessTypeLabel[props.place.access_type]} />
        <Metric title="Обновлено" value={formatDate(props.place.last_verified_at)} />
      </div>

      {props.canEdit ? (
        <div className="pt-1">
          <button type="button" onClick={props.onEdit} className="inline-flex items-center gap-2 text-base font-semibold text-brand-500">
            <Pencil2Icon />
            Редактировать
          </button>
        </div>
      ) : null}
    </div>
  );
}

function VoteButton(props: {
  title: string;
  count: number;
  icon: ReactNode;
  active: boolean;
  tone: "positive" | "negative";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-pressed={props.active}
      className={cn(
        "rounded-[1.35rem] border px-4 py-4 text-left transition-transform duration-300 ease-out active:scale-[0.98]",
        props.active
          ? props.tone === "positive"
            ? "border-emerald-400 bg-emerald-500/12 text-emerald-400"
            : "border-rose-400 bg-rose-500/12 text-rose-400"
          : "border-[var(--panel-border)] bg-[var(--panel-solid)] text-[var(--app-fg)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-[1.02rem] font-semibold">
          {props.icon}
          {props.title}
        </div>
        <span className="rounded-full bg-black/10 px-3 py-1 text-sm font-semibold">{props.count}</span>
      </div>
    </button>
  );
}

function DirectionBadge({ degrees }: { degrees: number }) {
  const rotation = Number.isFinite(degrees) ? normalizeDegrees(degrees) : 0;

  return (
    <div className="relative h-[9.5rem] w-[9.5rem] shrink-0 overflow-hidden rounded-full border border-[var(--panel-border)] bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.18),transparent_60%)]">
      <div className="absolute inset-[0.7rem] rounded-full border border-[var(--panel-border)]" />
      <div className="absolute inset-[1.5rem] rounded-full border border-brand-500/25" />
      <div className="absolute inset-0 flex items-start justify-center pt-3 text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--app-muted)]">
        N
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="h-[7.2rem] w-[7.2rem] transition-transform duration-300 ease-out"
          style={{ transform: `rotate(${rotation}deg)`, transformOrigin: "50% 50%" }}
        >
          <svg viewBox="0 0 160 160" className="h-full w-full" aria-hidden="true">
            <path d="M80 26V114" fill="none" stroke="#2563EB" strokeWidth="12" strokeLinecap="round" />
            <path d="M46 60L80 26L114 60" fill="none" stroke="#2563EB" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M64 114H96" fill="none" stroke="#2563EB" strokeWidth="12" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[1.35rem] bg-[var(--panel-muted)] p-4">
      <p className="text-sm uppercase tracking-[0.16em] text-[var(--app-muted)]">{title}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}
