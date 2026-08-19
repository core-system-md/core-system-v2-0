import { useState } from 'react';
import { AlertCircle, ClipboardList, Target, FileText, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Page2Data {
  service_interest: string;
  visit_goal: string;
  consideration_period: string;
}

interface Page2ClinicalIntentProps {
  sessionId: string;
  initialData?: Partial<Page2Data> | undefined;
  onNext: (data: Page2Data) => void;
  onBack: () => void;
}

export default function Page2ClinicalIntent({ sessionId, initialData, onNext, onBack }: Page2ClinicalIntentProps) {
  const [data, setData] = useState<Page2Data>({
    service_interest: initialData?.service_interest ?? '',
    visit_goal: initialData?.visit_goal ?? '',
    consideration_period: initialData?.consideration_period ?? '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = <K extends keyof Page2Data>(field: K, value: Page2Data[K]) => {
    setData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
    }
  };

  const validate = (): boolean => {
    setErrors({});
    return true;
  };

  const handleNext = () => {
    if (!validate()) return;
    onNext(data);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-5" dir="rtl">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">الصفحة 2 من 5 — النوايا السريرية</CardTitle>
              <p className="text-sm text-slate-500 mt-0.5">رقم الجلسة: {sessionId.slice(0, 8)}...</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Target className="h-4 w-4 text-slate-400" />
              الاهتمام بالخدمة
            </label>
            <input
              type="text"
              value={data.service_interest}
              onChange={(e) => updateField('service_interest', e.target.value)}
              placeholder="ما الخدمة التي تهمك؟"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            {errors.service_interest && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />{errors.service_interest}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-400" />
              هدف الزيارة
            </label>
            <textarea
              value={data.visit_goal}
              onChange={(e) => updateField('visit_goal', e.target.value)}
              placeholder="ما هو هدفك من هذه الزيارة؟"
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
            />
            {errors.visit_goal && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />{errors.visit_goal}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              فترة التفكير
            </label>
            <input
              type="text"
              value={data.consideration_period}
              onChange={(e) => updateField('consideration_period', e.target.value)}
              placeholder="منذ متى تفكر في هذه الخدمة؟"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            {errors.consideration_period && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />{errors.consideration_period}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={onBack}
              className="border-slate-300 text-slate-700 hover:bg-slate-50 px-6"
            >
              العودة
            </Button>
            <span className="text-xs text-slate-400">الصفحة 2 من 5</span>
            <Button
              onClick={handleNext}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6"
            >
              التالي — الصفحة 3
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-[10px] text-slate-400 text-center leading-relaxed">
        البيانات تُحفظ محلياً فقط في هذه المرحلة — لا يوجد اتصال بقاعدة البيانات (P43-B UI Foundation)
      </p>
    </div>
  );
}