// ═══════════════════════════════════════════════════════════════════
// AllergyGate.tsx — P42-C-D: Mandatory allergy confirmation wall
// Location: src/features/doctor/AllergyGate.tsx
// Purpose: Blocking safety gate until doctor confirms allergy review
// Created: 2026-08-12 | Status: Production Ready
// ═══════════════════════════════════════════════════════════════════

import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AllergyGateProps {
  allergies: string;
  onConfirm: () => void;
}

export default function AllergyGate({ allergies, onConfirm }: AllergyGateProps) {
  const { t } = useTranslation('doctor');

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-6 shadow-sm">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-amber-900">{t('allergyAlertTitle')}</h2>
            <p className="text-sm text-amber-700">
              {t('allergyAlertDescription')}
            </p>
          </div>
        </div>

        {/* Allergy Content */}
        <div className="bg-white border border-amber-200 rounded-lg p-4 mb-5">
          <p className="text-sm text-amber-600 font-medium mb-1">{t('recordedAllergy')}</p>
          <p className="text-base text-slate-900 font-semibold leading-relaxed">
            {allergies}
          </p>
        </div>

        {/* Confirmation */}
        <button
          onClick={onConfirm}
          className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <ShieldCheck className="w-5 h-5" />
          {t('confirmAllergyReview')}
        </button>

        {/* Blocking indicator */}
        <p className="text-center text-xs text-amber-500 mt-3">
          {t('clinicalActionsBlocked')}
        </p>
      </div>
    </div>
  );
}
