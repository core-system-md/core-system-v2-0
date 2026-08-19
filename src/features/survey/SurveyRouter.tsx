import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import Page1Identity from './Page1Identity';
import Page2ClinicalIntent from './Page2ClinicalIntent';

type SurveyPage = 1 | 2 | 3 | 4 | 5;

interface SurveyFormData {
  page1: {
    visit_type_selection: 'first_time' | 'returning' | '';
    service_reason: string;
    procedures_requested: string[];
    consent_accepted: boolean;
  } | null;
  page2: {
    service_interest: string;
    visit_goal: string;
    consideration_period: string;
  } | null;
}

export default function SurveyRouter() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [currentPage, setCurrentPage] = useState<SurveyPage>(1);
  const [formData, setFormData] = useState<SurveyFormData>({ page1: null, page2: null });

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir="rtl">
        <Card className="border-red-200 bg-red-50 max-w-md">
          <CardContent className="flex items-center gap-4 pt-6">
            <AlertCircle className="h-8 w-8 text-red-600 shrink-0" />
            <div>
              <p className="font-bold text-red-900">رقم الجلسة مطلوب</p>
              <p className="text-sm text-red-700 mt-1">لا يمكن الوصول إلى الاستبيان بدون رقم جلسة صالح.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handlePage1Next = (data: SurveyFormData['page1']) => {
    setFormData((prev) => ({ ...prev, page1: data }));
    setCurrentPage(2);
  };

  const handlePage2Next = (data: SurveyFormData['page2']) => {
    setFormData((prev) => ({ ...prev, page2: data }));
    setCurrentPage(3);
  };

  const handlePage2Back = () => {
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-6" dir="rtl">
      {currentPage === 1 && (
        <Page1Identity
          sessionId={sessionId}
          initialData={formData.page1 ?? undefined}
          onNext={handlePage1Next}
        />
      )}
      {currentPage === 2 && (
        <Page2ClinicalIntent
          sessionId={sessionId}
          initialData={formData.page2 ?? undefined}
          onNext={handlePage2Next}
          onBack={handlePage2Back}
        />
      )}
    </div>
  );
}