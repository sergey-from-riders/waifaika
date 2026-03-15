import { ChevronDownIcon } from "@radix-ui/react-icons";
import { useEffect, useState } from "react";

import type { AddDraft } from "@/app/ui-models";
import { accessTypeOptions, venueTypeOptions } from "@/lib/labels";
import type { AccessType, LocalPlace, PlaceInput, VenueType } from "@/lib/types";
import {
  AccessType as AccessTypeEnum,
  VenueType as VenueTypeEnum,
} from "@/lib/types";

type PlaceFormProps = {
  initial: LocalPlace | null;
  draft: AddDraft | null;
  onSubmit: (input: PlaceInput) => void;
  onCancel: () => void;
};

export function PlaceForm({ initial, draft, onSubmit, onCancel }: PlaceFormProps) {
  const [venueType, setVenueType] = useState<VenueType>(initial?.venue_type ?? VenueTypeEnum.Cafe);
  const [placeName, setPlaceName] = useState(initial?.place_name ?? "");
  const [wifiName, setWifiName] = useState(initial?.wifi_name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [promoText, setPromoText] = useState(initial?.promo_text ?? "");
  const [accessType, setAccessType] = useState<AccessType>(initial?.access_type ?? AccessTypeEnum.Free);

  useEffect(() => {
    const nextDraftDescription = [draft?.title, draft?.subtitle].filter(Boolean).join(", ");
    setVenueType(initial?.venue_type ?? VenueTypeEnum.Cafe);
    setPlaceName(initial?.place_name ?? "");
    setWifiName(initial?.wifi_name ?? "");
    setDescription(initial?.description ?? nextDraftDescription);
    setPromoText(initial?.promo_text ?? "");
    setAccessType(initial?.access_type ?? AccessTypeEnum.Free);
  }, [draft?.subtitle, draft?.title, initial]);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!draft) {
          return;
        }
        onSubmit({
          venue_type: venueType,
          place_name: placeName,
          wifi_name: wifiName,
          description: description || null,
          promo_text: promoText || null,
          access_type: accessType,
          lat: draft.lat,
          lng: draft.lng,
        });
      }}
    >
      <div className="rounded-[1.25rem] bg-[var(--panel-muted)] p-4">
        <p className="text-sm uppercase tracking-[0.16em] text-[var(--app-muted)]">Адрес</p>
        <p className="mt-2 text-lg font-semibold">{draft?.title ?? "Точка на карте"}</p>
        <p className="mt-1 text-sm text-[var(--app-muted)]">{draft?.subtitle ?? "Сочи"}</p>
      </div>

      <TextField
        label="Адрес / ориентир"
        value={description}
        onChange={setDescription}
        placeholder="Можно уточнить адрес или заметный ориентир"
      />

      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Тип места" value={venueType} onChange={(value) => setVenueType(value as VenueType)} options={venueTypeOptions} />
        <SelectField label="Доступ" value={accessType} onChange={(value) => setAccessType(value as AccessType)} options={accessTypeOptions} />
      </div>

      <TextField label="Название места" value={placeName} onChange={setPlaceName} placeholder="Например, Surf Coffee" />
      <TextField label="Название Wi-Fi" value={wifiName} onChange={setWifiName} placeholder="guest_wifi" />
      <TextAreaField label="Промо" value={promoText} onChange={setPromoText} placeholder="Булочки за 140 рублей и кофе" />

      <div className="grid grid-cols-2 gap-3 pt-2">
        <button type="button" onClick={onCancel} className="rounded-[1.2rem] border border-[var(--panel-border)] bg-[var(--panel-muted)] px-4 py-4 text-lg font-semibold text-[var(--app-fg)]">
          Отмена
        </button>
        <button type="submit" className="rounded-[1.2rem] bg-brand-500 px-4 py-4 text-lg font-semibold text-white">
          Сохранить
        </button>
      </div>
    </form>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-base font-semibold">{label}</span>
      <input
        className="w-full rounded-[1.1rem] border border-[var(--panel-border)] bg-[var(--panel-muted)] px-4 py-4 text-base text-[var(--app-fg)]"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-base font-semibold">{label}</span>
      <textarea
        rows={4}
        className="w-full resize-none rounded-[1.1rem] border border-[var(--panel-border)] bg-[var(--panel-muted)] px-4 py-4 text-base text-[var(--app-fg)]"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SelectField<TValue extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: TValue;
  onChange: (value: TValue) => void;
  options: ReadonlyArray<{ value: TValue; label: string }>;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-base font-semibold">{label}</span>
      <div className="relative">
        <select
          className="w-full appearance-none rounded-[1.1rem] border border-[var(--panel-border)] bg-[var(--panel-muted)] px-4 py-4 text-base text-[var(--app-fg)]"
          value={value}
          onChange={(event) => onChange(event.target.value as TValue)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--app-muted)]" />
      </div>
    </label>
  );
}
