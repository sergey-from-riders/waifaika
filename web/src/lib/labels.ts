import { AccessType, ReportReason, SyncStatus, UserType, VenueType, VoteType } from "@/lib/types";

export const venueTypeOptions = [
  { value: VenueType.Cafe, label: "Кафе" },
  { value: VenueType.Library, label: "Библиотека" },
  { value: VenueType.Coworking, label: "Коворкинг" },
  { value: VenueType.Park, label: "Парк" },
  { value: VenueType.Other, label: "Другое" },
] as const;

export const accessTypeOptions = [
  { value: AccessType.Free, label: "Свободный вход" },
  { value: AccessType.CustomerOnly, label: "Только клиентам" },
  { value: AccessType.Unknown, label: "Непонятно" },
] as const;

export const voteTypeOptions = [
  { value: VoteType.Works, label: "Работает" },
  { value: VoteType.NotWorks, label: "Не работает" },
] as const;

export const reportReasonOptions = [
  { value: ReportReason.Spam, label: "Спам" },
  { value: ReportReason.Double, label: "Дубль" },
  { value: ReportReason.WrongLocation, label: "Не та локация" },
  { value: ReportReason.Closed, label: "Закрыто" },
  { value: ReportReason.Other, label: "Другое" },
] as const;

export const venueTypeLabel: Record<VenueType, string> = Object.fromEntries(
  venueTypeOptions.map((item) => [item.value, item.label]),
) as Record<VenueType, string>;

export const accessTypeLabel: Record<AccessType, string> = Object.fromEntries(
  accessTypeOptions.map((item) => [item.value, item.label]),
) as Record<AccessType, string>;

export const voteTypeLabel: Record<VoteType, string> = Object.fromEntries(
  voteTypeOptions.map((item) => [item.value, item.label]),
) as Record<VoteType, string>;

export const syncStatusLabel: Record<SyncStatus, string> = {
  [SyncStatus.Synced]: "Синхронизировано",
  [SyncStatus.Pending]: "Ждёт отправки",
  [SyncStatus.Failed]: "Ошибка",
  [SyncStatus.Conflict]: "Конфликт",
};

export const userTypeLabel: Record<UserType, string> = {
  [UserType.Anonymous]: "Анонимный аккаунт",
  [UserType.EmailLinked]: "Почта привязана",
  [UserType.Moderator]: "Модератор",
  [UserType.Admin]: "Админ",
};
