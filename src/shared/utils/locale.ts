import i18n, { getAppLocale } from '@/i18n';

export type LocaleDateOptions = Intl.DateTimeFormatOptions;

export function getCurrentLocale(): string {
  return getAppLocale();
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(getCurrentLocale(), options).format(value);
}

export function formatDateLocale(
  value: Date | string | number,
  options?: LocaleDateOptions,
): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(getCurrentLocale(), options).format(date);
}

export function formatTimeLocale(
  value: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(getCurrentLocale(), options).format(date);
}

export function formatDateTimeLocale(
  value: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(getCurrentLocale(), options).format(date);
}

export function subscribeToLocaleChange(listener: (language: string) => void): () => void {
  const handler = (language: string) => listener(language);
  i18n.on('languageChanged', handler);
  return () => i18n.off('languageChanged', handler);
}
