const BRASILIA_TIME_ZONE = 'America/Sao_Paulo';
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const toDateInstance = (value?: Date | string): Date | null => {
  if (!value) {
    return new Date();
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const trimmed = value.trim();
  const dateOnlyMatch = ISO_DATE_PATTERN.exec(trimmed);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getDateParts = (value?: Date | string) => {
  const date = toDateInstance(value);
  if (!date) return null;

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BRASILIA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!Number.isFinite(year) || !month || !day) return null;

  return { year, month, day };
};

export const getBrasiliaISODate = (value?: Date | string): string => {
  const parts = getDateParts(value);
  if (!parts) return '';
  return `${parts.year}-${parts.month}-${parts.day}`;
};

export const getBrasiliaYear = (value?: Date | string): number => {
  const parts = getDateParts(value);
  if (parts?.year) return parts.year;

  const nowParts = getDateParts(new Date());
  return nowParts?.year ?? new Date().getFullYear();
};

export const formatBrasiliaDate = (
  value: Date | string,
  options?: Intl.DateTimeFormatOptions,
): string => {
  const date = toDateInstance(value);
  if (!date) return '';

  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRASILIA_TIME_ZONE,
    ...(options ?? { dateStyle: 'short' }),
  }).format(date);
};

export const formatBrasiliaDateTime = (
  value: Date | string,
  options?: Intl.DateTimeFormatOptions,
): string => {
  const date = toDateInstance(value);
  if (!date) return '';

  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRASILIA_TIME_ZONE,
    ...(options ?? { dateStyle: 'short', timeStyle: 'short' }),
  }).format(date);
};

export const getCurrentBrasiliaYear = (): number => getBrasiliaYear(new Date());
