import { useTranslation } from 'react-i18next';

interface SurveyProgressBarProps {
  currentPage: 1 | 2 | 3 | 4 | 5;
}

const STEPS = [1, 2, 3, 4, 5] as const;

export default function SurveyProgressBar({ currentPage }: SurveyProgressBarProps) {
  const { t } = useTranslation('survey');
  const total = STEPS.length;

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 pt-2 pb-4" aria-label={t('progress.label')}>
      <div className="flex items-center gap-1.5" role="list">
        {STEPS.map((step, index) => {
          const completed = step < currentPage;
          const active = step === currentPage;
          const status = active ? t('progress.current') : completed ? t('progress.completed') : '';
          return (
            <div key={step} className="flex items-center flex-1" role="listitem">
              <div
                className={`h-2 w-full rounded-full transition-colors ${
                  completed || active ? 'bg-emerald-500' : 'bg-slate-200'
                }`}
                aria-label={`${t('progress.pageOf', { current: step, total })}${status ? ` — ${status}` : ''}`}
              />
              {index < STEPS.length - 1 && <span className="w-1.5 shrink-0" aria-hidden="true" />}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
        <span>{t('progress.pageOf', { current: currentPage, total })}</span>
        <span>{currentPage === total ? t('progress.last') : t('progress.continue')}</span>
      </div>
    </div>
  );
}
