import { useState } from 'react';
import { AlertCircle, Brain, CheckCircle, Users, HeartHandshake } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Page3Data {
  readiness_level: number;
  decision_factor: string;
  referral_source: string;
  followup_importance: number;
}

interface Page3BehavioralProfileProps {
  sessionId: string;
  initialData?: Partial<Page3Data> | undefined;
  onNext: (data: Page3Data) => void;
  onBack: () => void;
}

const READINESS_OPTIONS = [
  { value: 1, label: 'أستكشف فقط' },
  { value: 2, label: 'أفكر في البدء' },
  { value: 3, label: 'أقترب من القرار' },
  { value: 4, label: 'جاهز للبدء' },
  { value: 5, label: 'أريد البدء قريباً' },
];

const FOLLOWUP_OPTIONS = [
  { value: 1, label: 'غير مهم' },
  { value: 2, label: 'مهم إلى حد ما' },
  { value: 3, label: 'مهم' },
  { value: 4, label: 'مهم جداً' },
];

export default function Page3BehavioralProfile({ sessionId, initialData, onNext, onBack }: Page3BehavioralProfileProps) {
  const [data, setData] = useState<Page3Data>({
    readiness_level: initialData?.readiness_level ?? 3,
    decision_factor: initialData?.decision_factor ?? '',
    referral_source: initialData?.referral_source ?? '',
    followup_importance: initialData?.followup_importance ?? 3,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = <K extends keyof Page3Data>(field: K, value: Page3Data[K]) => {
    setData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!data.decision_factor.trim()) next.decision_factor = 'يرجى اختيار العامل الأهم في اتخاذ القرار';
    if (!data.referral_source.trim()) next.referral_source = 'يرجى اختيار مصدر معرفتك بالعيادة';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6" dir="rtl">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Brain className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">الصفحة 3 من 5 — الاستعداد ومؤشرات القرار</CardTitle>
              <p className="text-sm text-slate-500 mt-0.5">رقم الجلسة: {sessionId.slice(0, 8)}...</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-7">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-slate-400" /> مدى استعدادك للبدء
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {READINESS_OPTIONS.map((option) => (
                <button key={option.value} type="button" onClick={() => update('readiness_level', option.value)} className={`p-3 rounded-xl border-2 text-xs font-medium transition-all ${data.readiness_level === option.value ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
                  <span className="block text-base font-bold mb-1">{option.value}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-800 flex items-center gap-2"><HeartHandshake className="h-4 w-4 text-slate-400" /> ما العامل الأهم بالنسبة لك عند اتخاذ القرار؟ <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {['النتيجة المتوقعة', 'الأمان والثقة', 'السعر والتكلفة', 'الوقت والموعد'].map((value) => (
                <button key={value} type="button" onClick={() => update('decision_factor', value)} className={`p-3 rounded-xl border text-sm text-right transition-all ${data.decision_factor === value ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}>{value}</button>
              ))}
            </div>
            {errors.decision_factor && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.decision_factor}</p>}
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-800 flex items-center gap-2"><Users className="h-4 w-4 text-slate-400" /> كيف عرفت عن العيادة؟ <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {['إحالة من شخص', 'بحث على الإنترنت', 'وسائل التواصل الاجتماعي', 'إعلان أو حملة'].map((value) => (
                <button key={value} type="button" onClick={() => update('referral_source', value)} className={`p-3 rounded-xl border text-sm text-right transition-all ${data.referral_source === value ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}>{value}</button>
              ))}
            </div>
            {errors.referral_source && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.referral_source}</p>}
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-800">ما مدى أهمية المتابعة والتواصل بعد الزيارة؟</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FOLLOWUP_OPTIONS.map((option) => (
                <button key={option.value} type="button" onClick={() => update('followup_importance', option.value)} className={`p-3 rounded-xl border text-xs transition-all ${data.followup_importance === option.value ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>{option.label}</button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={onBack} className="border-slate-300 text-slate-700">العودة</Button>
            <span className="text-xs text-slate-400">الصفحة 3 من 5</span>
            <Button onClick={() => validate() && onNext(data)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6">التالي — الصفحة 4</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
