import type { LocalVote, Place } from "@/lib/types";

export type UiTheme = "light" | "dark";

export type Toast = {
  tone: "info" | "success" | "error";
  message: string;
};

export type DecoratedPlace = Place & {
  distance_meters?: number;
  direction_degrees?: number;
  local_vote?: LocalVote | null;
};

export type AddDraft = {
  lat: number;
  lng: number;
  title: string;
  subtitle: string;
  isResolving: boolean;
  error?: string | null;
};

export type AddFlow =
  | {
      step: "pick";
      draft: AddDraft;
    }
  | {
      step: "form";
      draft: AddDraft;
    }
  | null;
