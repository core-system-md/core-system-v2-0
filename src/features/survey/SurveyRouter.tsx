import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import Page1Identity from './Page1Identity';

type SurveyPage = 1 | 2 | 3 | 4 | 5;

interface SurveyFormData {
  page1: {
    visit_type_selection: 'first_time' | 'returning' | '';
    service_reason: string;
    procedures_requested: string[];
    consent_accepted: boolean;
  } | null;
}

export default function SurveyRouter() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [currentPage, setCurrentPage] = useState<SurveyPage>(1);
  const [formData, setFormData] = useState<SurveyFormData>({ page1: null });

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
        <div className="max-w-2xl mx-auto p-4 md:p-6" dir="rtl">
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex items-center gap-4 pt-6">
              <AlertCircle className="h-8 w-8 text-amber-600 shrink-0" />
              <div>
                <p className="font-bold text-amber-900">الصفحة 2 — قيد التطوير</p>
                <p className="text-sm text-amber-700 mt-1">سيتم إضافة الصفحة 2 (النوايا السريرية) في المرحلة التالية.</p>
                <button
                  onClick={() => setCurrentPage(1)}
                  className="mt-3 text-sm text-amber-800 underline hover:text-amber-900"
                >
                  العودة للصفحة 1
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
