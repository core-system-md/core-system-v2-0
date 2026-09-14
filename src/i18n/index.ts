import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import arCommon from '@/locales/ar/common.json';
import arAuth from '@/locales/ar/auth.json';
import arDoctor from '@/locales/ar/doctor.json';
import enCommon from '@/locales/en/common.json';
import enAuth from '@/locales/en/auth.json';
import enDoctor from '@/locales/en/doctor.json';

export const SUPPORTED_LANGUAGES = ['ar', 'en'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_DIRECTIONS: Record<AppLanguage, 'rtl' | 'ltr'> = {
  ar: 'rtl',
  en: 'ltr',
};

function applyDocumentLanguage(language: string): void {
  if (typeof document === 'undefined') return;

  const normalized: AppLanguage = language.toLowerCase().startsWith('en') ? 'en' : 'ar';
  document.documentElement.lang = normalized;
  document.documentElement.dir = LANGUAGE_DIRECTIONS[normalized];
}

void i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ar: {
        common: arCommon,
        auth: arAuth,
        doctor: arDoctor,
      },
      en: {
        common: enCommon,
        auth: enAuth,
        doctor: enDoctor,
      },
    },
    fallbackLng: 'ar',
    supportedLngs: [...SUPPORTED_LANGUAGES],
    load: 'languageOnly',
    defaultNS: 'common',
    ns: ['common', 'auth', 'doctor'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'htmlTag'],
      lookupLocalStorage: 'core-system-language',
      caches: ['localStorage'],
    },
    react: {
      useSuspense: false,
    },
  });

i18next.on('initialized', () => applyDocumentLanguage(i18next.resolvedLanguage ?? i18next.language));
i18next.on('languageChanged', (language) => applyDocumentLanguage(language));

export function getAppLanguage(): AppLanguage {
  return i18next.resolvedLanguage?.toLowerCase().startsWith('en') ? 'en' : 'ar';
}

export function getAppLocale(): string {
  return getAppLanguage() === 'en' ? 'en-US' : 'ar-JO';
}

export function getAppDirection(): 'rtl' | 'ltr' {
  return LANGUAGE_DIRECTIONS[getAppLanguage()];
}

export async function setAppLanguage(language: AppLanguage): Promise<void> {
  await i18next.changeLanguage(language);
  applyDocumentLanguage(language);
}

export default i18next;
