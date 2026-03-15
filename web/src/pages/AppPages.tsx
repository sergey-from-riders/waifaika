import { ArrowLeftIcon, EnvelopeClosedIcon, Pencil2Icon } from "@radix-ui/react-icons";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { syncStatusLabel, userTypeLabel, voteTypeLabel } from "@/lib/labels";
import { getInstallState, triggerInstall } from "@/lib/pwa";
import type { LocalPlace, LocalVote, MeResponse, SyncStatus, UserType } from "@/lib/types";
import { SyncStatus as SyncStatusEnum } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

type ActivityPageProps = {
  myPlaces: LocalPlace[];
  myVotes: Array<LocalVote & { place_name: string }>;
  onEdit: (localId: string) => void;
};

type AboutPageProps = {
  me: MeResponse | null;
  bindEmail: string;
  setBindEmail: (value: string) => void;
  bindConsent: boolean;
  setBindConsent: (value: boolean) => void;
  bindStatus: string | null;
  onStartBind: () => void;
  loginEmail: string;
  setLoginEmail: (value: string) => void;
  onStartLogin: () => void;
  onLogout: () => void;
  installState: ReturnType<typeof getInstallState>;
};

export function ActivityPage({ myPlaces, myVotes, onEdit }: ActivityPageProps) {
  return (
    <section className="space-y-5">
      <div className="rounded-[2rem] border border-[var(--panel-border)] bg-[var(--panel-solid)] p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--app-muted)]">Личное</p>
        <h1 className="mt-2 text-[1.9rem] font-bold leading-none">Мои точки и голоса</h1>
        <p className="mt-3 text-base text-[var(--app-muted)]">
          Здесь только ваши места и оценки. Всё, что связано с почтой, входом и документами, лежит в разделе «О нас».
        </p>
      </div>
      <section className="rounded-[1.75rem] border border-[var(--panel-border)] bg-[var(--panel-solid)] p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Мои точки</h2>
          <span className="text-sm text-[var(--app-muted)]">{myPlaces.length}</span>
        </div>
        <div className="mt-4 space-y-3">
          {myPlaces.length === 0 ? <EmptyState text="Точек пока нет." /> : null}
          {myPlaces.map((place) => (
            <div key={place.local_id} className="rounded-[1.25rem] bg-[var(--panel-muted)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">{place.place_name}</p>
                  <p className="truncate text-sm text-[var(--app-muted)]">{place.wifi_name}</p>
                </div>
                <StatusChip status={place.sync_status} />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-[var(--app-muted)]">{formatDate(place.updated_at_client)}</span>
                <button type="button" onClick={() => onEdit(place.local_id)} className="inline-flex items-center gap-2 text-base font-semibold text-brand-500">
                  <Pencil2Icon />
                  Править
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-[var(--panel-border)] bg-[var(--panel-solid)] p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Мои голоса</h2>
          <span className="text-sm text-[var(--app-muted)]">{myVotes.length}</span>
        </div>
        <div className="mt-4 space-y-3">
          {myVotes.length === 0 ? <EmptyState text="Голосов пока нет." /> : null}
          {myVotes.map((vote) => (
            <div key={vote.local_id} className="rounded-[1.25rem] bg-[var(--panel-muted)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{vote.place_name}</p>
                  <p className="text-sm text-[var(--app-muted)]">{vote.is_deleted ? "Голос снят" : voteTypeLabel[vote.vote]}</p>
                </div>
                <StatusChip status={vote.sync_status} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="pb-8" />
    </section>
  );
}

export function PlainPage({ title, backTo, children }: { title: string; backTo: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to={backTo} className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--panel-solid)] text-[var(--app-fg)]">
          <ArrowLeftIcon />
        </Link>
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>
      <div className="rounded-[1.75rem] border border-[var(--panel-border)] bg-[var(--panel-solid)] p-5">{children}</div>
    </section>
  );
}

export function AboutPage(props: AboutPageProps) {
  const openapiUrl = "https://wifi.eval.su/openapi.yaml";
  const apiBaseUrl = "https://wifi.eval.su/api/v1";

  return (
    <section className="space-y-5 text-base leading-7">
      <div className="rounded-[1.75rem] border border-[var(--panel-border)] bg-[var(--panel-solid)] p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--app-muted)]">Сервис</p>
        <h2 className="mt-2 text-[1.9rem] font-bold leading-none">О Вайфайке</h2>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-base text-[var(--app-muted)]">
            Вайфайка помогает быстро найти живой Wi-Fi рядом и поделиться рабочей точкой ссылкой.
          </p>
          <span className="rounded-full bg-[var(--panel-muted)] px-3 py-2 text-sm font-semibold text-[var(--app-muted)]">
            {props.me ? userTypeLabel[props.me.user.user_type as UserType] : "Профиль"}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Вайфайка помогает быстро найти живой Wi-Fi рядом</h2>
        <p className="text-[var(--app-muted)]">
          Люди отмечают точки на карте, голосуют «работает / не работает», а приложение сохраняет карту и ближайшие места локально.
        </p>
      </div>
      <section className="rounded-[1.75rem] border border-[var(--panel-border)] bg-[var(--panel-solid)] p-5">
        <div className="flex items-center gap-3">
          <EnvelopeClosedIcon />
          <h2 className="text-xl font-semibold">Привязать почту</h2>
        </div>
        <p className="mt-3 text-base text-[var(--app-muted)]">
          Почта нужна для восстановления доступа и входа на новом устройстве. Без неё анонимный аккаунт можно потерять вместе с телефоном.
        </p>
        <input
          className="mt-4 w-full rounded-[1.1rem] border border-[var(--panel-border)] bg-[var(--panel-muted)] px-4 py-4 text-base text-[var(--app-fg)]"
          placeholder="ceo@eval.su"
          value={props.bindEmail}
          onChange={(event) => props.setBindEmail(event.target.value)}
        />
        <label className="mt-4 flex items-start gap-3 rounded-[1.1rem] bg-[var(--panel-muted)] p-4 text-sm text-[var(--app-fg)]">
          <input type="checkbox" checked={props.bindConsent} onChange={(event) => props.setBindConsent(event.target.checked)} className="mt-1" />
          <span>
            Согласен на обработку email. Перед отправкой проверьте <Link to="/privacy" className="text-brand-500">политику</Link> и{" "}
            <Link to="/consent/personal-data-email" className="text-brand-500">отдельное согласие</Link>.
          </span>
        </label>
        <button
          type="button"
          disabled={!props.bindConsent || !props.bindEmail}
          onClick={props.onStartBind}
          className="mt-4 w-full rounded-[1.2rem] bg-brand-500 px-4 py-4 text-lg font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-500"
        >
          Привязать почту
        </button>
        {props.bindStatus ? <p className="mt-3 text-sm text-[var(--app-muted)]">{props.bindStatus}</p> : null}
      </section>

      <section className="rounded-[1.75rem] border border-[var(--panel-border)] bg-[var(--panel-solid)] p-5">
        <h2 className="text-xl font-semibold">Войти на другом устройстве</h2>
        <p className="mt-2 text-base text-[var(--app-muted)]">
          Если телефон новый, просто введите почту и мы пришлём ссылку для входа в этот же аккаунт.
        </p>
        <input
          className="mt-4 w-full rounded-[1.1rem] border border-[var(--panel-border)] bg-[var(--panel-muted)] px-4 py-4 text-base text-[var(--app-fg)]"
          placeholder="email для входа"
          value={props.loginEmail}
          onChange={(event) => props.setLoginEmail(event.target.value)}
        />
        <button type="button" onClick={props.onStartLogin} className="mt-4 w-full rounded-[1.2rem] border border-[var(--panel-border)] bg-[var(--panel-muted)] px-4 py-4 text-lg font-semibold text-[var(--app-fg)]">
          Получить ссылку
        </button>
      </section>

      {!props.installState.isStandalone ? (
        <section className="rounded-[1.75rem] border border-[var(--panel-border)] bg-[var(--panel-solid)] p-5">
          <h2 className="text-xl font-semibold">Установить на экран</h2>
          <p className="mt-2 text-base text-[var(--app-muted)]">
            Так приложение быстрее открывается и лучше держит офлайн-кэш карты и точек.
          </p>
          <button
            type="button"
            onClick={() => {
              if (props.installState.canInstall) {
                void triggerInstall();
              }
            }}
            className="mt-4 rounded-[1.2rem] bg-brand-500 px-4 py-4 text-lg font-semibold text-white"
          >
            {props.installState.canInstall ? "Добавить на экран" : props.installState.isIOS ? "Открыть в Safari и добавить" : "Установить приложение"}
          </button>
        </section>
      ) : null}

      <div className="rounded-[1.5rem] bg-[var(--panel-muted)] p-4">
        <p className="text-lg font-semibold">Что здесь можно сделать</p>
        <p className="mt-2 text-[var(--app-muted)]">
          Открыть ближайшую точку, проложить направление по стрелке, добавить своё место и привязать почту для восстановления доступа.
        </p>
      </div>
      <div className="rounded-[1.5rem] bg-[var(--panel-muted)] p-4">
        <p className="text-lg font-semibold">Документы</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link to="/privacy" className="rounded-full bg-[var(--panel-solid)] px-4 py-3 font-semibold text-brand-500">
            Политика
          </Link>
          <Link to="/consent/personal-data-email" className="rounded-full bg-[var(--panel-solid)] px-4 py-3 font-semibold text-brand-500">
            Согласие на email
          </Link>
        </div>
      </div>

      <section className="rounded-[1.5rem] bg-[var(--panel-muted)] p-4">
        <p className="text-lg font-semibold">API</p>
        <p className="mt-2 text-[var(--app-muted)]">
          Публичный API и актуальная OpenAPI-спецификация доступны прямо с продового домена.
        </p>
        <div className="mt-3 space-y-3">
          <a href={apiBaseUrl} target="_blank" rel="noreferrer" className="block rounded-[1rem] bg-[var(--panel-solid)] px-4 py-3 text-sm font-semibold text-brand-500">
            {apiBaseUrl}
          </a>
          <div className="flex flex-wrap gap-3">
            <a href={openapiUrl} target="_blank" rel="noreferrer" className="rounded-full bg-[var(--panel-solid)] px-4 py-3 font-semibold text-brand-500">
              openapi.yaml
            </a>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(openapiUrl);
                } catch (error) {
                  console.error(error);
                }
              }}
              className="rounded-full bg-[var(--panel-solid)] px-4 py-3 font-semibold text-[var(--app-fg)]"
            >
              Скопировать ссылку
            </button>
          </div>
        </div>
      </section>

      <section className="pb-8">
        <button type="button" onClick={props.onLogout} className="text-base font-semibold text-rose-500">
          Выйти
        </button>
      </section>
    </section>
  );
}

function StatusChip({ status }: { status: SyncStatus }) {
  const tone: Record<SyncStatus, string> = {
    [SyncStatusEnum.Synced]: "bg-emerald-500/12 text-emerald-400",
    [SyncStatusEnum.Pending]: "bg-amber-500/12 text-amber-400",
    [SyncStatusEnum.Failed]: "bg-rose-500/12 text-rose-400",
    [SyncStatusEnum.Conflict]: "bg-orange-500/12 text-orange-400",
  };
  return <span className={cn("rounded-full px-3 py-2 text-xs font-semibold", tone[status])}>{syncStatusLabel[status]}</span>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-[1.25rem] border border-dashed border-[var(--panel-border)] bg-[var(--panel-muted)] p-5 text-base text-[var(--app-muted)]">{text}</div>;
}
