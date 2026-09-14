import { useTranslation } from 'react-i18next';
import { getAppLanguage, setAppLanguage } from '@/i18n';

export default function LanguageSwitcher() {
  const { t } = useTranslation();
  const language = getAppLanguage();
  const nextLanguage = language === 'ar' ? 'en' : 'ar';

  return (
    <button
      type="button"
      onClick={() => void setAppLanguage(nextLanguage)}
      aria-label={t('actions.changeLanguage')}
      className="rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/15"
    >
      {nextLanguage === 'en' ? t('switchToEnglish') : t('switchToArabic')}
    </button>
  );
}
