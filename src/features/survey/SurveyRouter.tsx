import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { savePatientIntakePage } from '@/infrastructure/supabase/client';
import type { Json } from '@/infrastructure/supabase/database.types';
import Page1Identity from './Page1Identity';
import Page2ClinicalIntent from './Page2ClinicalIntent';
import Page3BehavioralProfile from './Page3BehavioralProfile';
import Page4Expectations from './Page4Expectations';
import Page5ConsentSign from './Page5ConsentSign';

type SurveyPage = 1 | 2 | 3 | 4 | 5;
type SurveyFormData = {
  page1: { visit_type_selection: 'first_time' | 'returning' | ''; service_reason: string; procedures_requested: string[]; consent_accepted: boolean } | null;
  page2: { service_interest: string; visit_goal: string; consideration_period: string } | null;
  page3: { readiness_level: number; decision_factor: string; referral_source: string; followup_importance: number } | null;
  page4: { top_priorities: string[]; main_concern: string; openness_to_proceed: number } | null;
  page5: { digital_signature_svg: string; signature_timestamp: string } | null;
};

export default function SurveyRouter() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [currentPage, setCurrentPage] = useState<SurveyPage>(1);
  const [formData, setFormData] = useState<SurveyFormData>({ page1: null, page2: null, page3: null, page4: null, page5: null });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  if (!sessionId) return <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir="rtl"><Card className="border-red-200 bg-red-50 max-w-md"><CardContent className="flex items-center gap-4 pt-6"><AlertCircle className="h-8 w-8 text-red-600 shrink-0" /><div><p className="font-bold text-red-900">رقم الجلسة مطلوب</p><p className="text-sm text-red-700 mt-1">لا يمكن الوصول إلى الاستبيان بدون رقم جلسة صالح.</p></div></CardContent></Card></div>;

  const savePage = async (page: SurveyPage, payload: Json) => {
    setSaving(true); setError(null);
    const { error: saveError } = await savePatientIntakePage(sessionId, page, payload);
    setSaving(false);
    if (saveError) { setError(saveError.message || 'تعذر حفظ البيانات. يرجى المحاولة مرة أخرى.'); return false; }
    return true;
  };

  const handlePage1Next = async (data: NonNullable<SurveyFormData['page1']>) => { if (await savePage(1, data)) { setFormData((prev) => ({ ...prev, page1: data })); setCurrentPage(2); } };
  const handlePage2Next = async (data: NonNullable<SurveyFormData['page2']>) => { if (await savePage(2, data)) { setFormData((prev) => ({ ...prev, page2: data })); setCurrentPage(3); } };
  const handlePage3Next = async (data: NonNullable<SurveyFormData['page3']>) => { if (await savePage(3, data)) { setFormData((prev) => ({ ...prev, page3: data })); setCurrentPage(4); } };
  const handlePage4Next = async (data: NonNullable<SurveyFormData['page4']>) => { if (await savePage(4, data)) { setFormData((prev) => ({ ...prev, page4: data })); setCurrentPage(5); } };
  const handlePage5Complete = async (data: NonNullable<SurveyFormData['page5']>) => { if (await savePage(5, data)) { setFormData((prev) => ({ ...prev, page5: data })); setCompleted(true); } };
  const handleBack = (page: SurveyPage) => { setError(null); setCurrentPage(page); };

  if (completed) return <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir="rtl"><Card className="max-w-md border-emerald-200 shadow-sm"><CardContent className="pt-8 pb-8 text-center space-y-4"><CheckCircle2 className="h-14 w-14 text-emerald-600 mx-auto" /><h1 className="text-xl font-bold text-slate-900">تم إكمال الاستبيان بنجاح</h1><p className="text-sm text-slate-600 leading-6">تم حفظ إجاباتك وتوقيعك الإلكتروني بنجاح. شكراً لوقتك.</p></CardContent></Card></div>;

  return <div className="min-h-screen bg-slate-50 py-6" dir="rtl">
    {saving && <div className="max-w-2xl mx-auto px-4 mb-3"><div className="flex items-center justify-center gap-2 text-xs text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> جارٍ حفظ البيانات...</div></div>}
    {error && <div className="max-w-2xl mx-auto px-4 mb-3"><div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div></div>}
    {currentPage === 1 && <Page1Identity sessionId={sessionId} initialData={formData.page1 ?? undefined} onNext={handlePage1Next} />}
    {currentPage === 2 && <Page2ClinicalIntent sessionId={sessionId} initialData={formData.page2 ?? undefined} onNext={handlePage2Next} onBack={() => handleBack(1)} />}
    {currentPage === 3 && <Page3BehavioralProfile sessionId={sessionId} initialData={formData.page3 ?? undefined} onNext={handlePage3Next} onBack={() => handleBack(2)} />}
    {currentPage === 4 && <Page4Expectations sessionId={sessionId} initialData={formData.page4 ?? undefined} onNext={handlePage4Next} onBack={() => handleBack(3)} />}
    {currentPage === 5 && <Page5ConsentSign sessionId={sessionId} initialData={formData.page5 ?? undefined} onComplete={handlePage5Complete} onBack={() => handleBack(4)} />}
  </div>;
}
